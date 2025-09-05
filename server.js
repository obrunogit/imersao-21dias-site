/*
 * Simple Node.js HTTP server to serve the static sales page and handle form
 * submissions, writing them to a Google Sheet via the Google Sheets API.
 *
 * This implementation avoids external dependencies like express or
 * googleapis, which may not be available in the execution environment. It
 * instead uses Node's built-in http and crypto modules to build a tiny
 * server and manually performs a JWT-based OAuth 2.0 flow to obtain
 * access tokens for the service account. The service account
 * credentials are loaded from the JSON file uploaded by the user.
 *
 * To run the server, execute `node server.js` from the project root. The
 * server will listen on port 3000 by default (configurable via the
 * PORT environment variable). You can then access the site at
 * http://localhost:3000/ and test the form submission. The CORS headers
 * allow the frontend to communicate with the backend even when hosted
 * separately.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Load service account credentials from the JSON key file. The path
// defaults to the file provided by the user; you can override via
// SERVICE_ACCOUNT_KEY_FILE environment variable.
const KEY_PATH = process.env.SERVICE_ACCOUNT_KEY_FILE || path.join(__dirname, 'massive-dryad-171019-77c26aafba04.json');
const credentials = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
const { client_email, private_key } = credentials;
const SHEET_ID = process.env.SHEET_ID || '1bQd-wL3I4W2dBu68TNeuhwSxlLwePIPdmZtl7a6lI8U';
// Define the range (sheet name and columns) to which new rows will be appended.
// Adjust as needed (e.g., 'Página1!A:F').
const RANGE = process.env.RANGE || 'Página1!A:F';

// Helper: Base64URL encode a Buffer or string. Node >= 14 supports
// base64url encoding via the encoding option.
function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

// Obtain an access token by creating and signing a JWT. The token is
// cached in memory until shortly before expiry to avoid unnecessary
// requests to Google's OAuth server.
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  // Return cached token if valid for at least 5 seconds
  if (cachedToken && tokenExpiry - 5 > now) {
    return cachedToken;
  }
  // Header and claim set for the JWT
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(private_key, 'base64url');
  const signedJwt = `${unsignedToken}.${signature}`;
  // Exchange JWT for access token
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', signedJwt);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  }
  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in;
  return cachedToken;
}

// Append a row to the Google Sheet. Accepts an array of values.
async function appendToSheet(values) {
  const token = await getAccessToken();
  const body = { values: [values] };
  const rangeEncoded = encodeURIComponent(RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${rangeEncoded}:append?valueInputOption=RAW`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Sheets append failed: ${JSON.stringify(data)}`);
  }
  return data;
}

// Serve static files from the project root (index.html, style.css, etc.). If
// the requested file doesn't exist, fallback to index.html (SPA
// behaviour). This keeps the server simple and avoids third-party
// dependencies.
function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // fallback to index.html for unknown routes
      const indexPath = path.join(__dirname, 'index.html');
      fs.readFile(indexPath, (error, indexContent) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      });
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  // Enable CORS for all routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.method === 'POST' && parsedUrl.pathname === '/submit') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { name, surname, birthdate, whatsapp, email } = data;
        if (!name || !surname || !email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Nome, sobrenome e email são obrigatórios.' }));
        }
        const timestamp = new Date().toISOString();
        const row = [timestamp, name, surname, birthdate || '', whatsapp || '', email];
        await appendToSheet(row);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Dados enviados com sucesso!' }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Erro ao processar a solicitação.' }));
      }
    });
  } else {
    // Serve static file
    let filePath = path.join(__dirname, parsedUrl.pathname);
    // default root to index.html
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
      filePath = path.join(__dirname, 'index.html');
    }
    serveStaticFile(filePath, res);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});