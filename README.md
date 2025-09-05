# Imersão 21 Dias com Luiz Zech – Site estático

Este repositório contém os arquivos necessários para hospedar a página de vendas da
**Imersão 21 Dias com Luiz Zech**. A página foi desenvolvida com HTML e CSS
puros, seguindo as melhores práticas de páginas de vendas de alto desempenho.

## Visão geral dos arquivos

| Arquivo        | Descrição                                              |
|----------------|--------------------------------------------------------|
| `index.html`   | Arquivo principal contendo a estrutura do site, o       |
|                | formulário de captação de leads e uma pequena rotina   |
|                | JavaScript para enviar os dados via HTTP POST.         |
| `style.css`    | Folha de estilos que define cores, tipografia e layout. |

## Como hospedar gratuitamente

1. **GitHub Pages (recomendado para site estático):**
   - Crie um repositório público no GitHub (ex.: `imersao-21dias`).
   - Faça upload de `index.html` e `style.css` para o repositório.
   - Acesse o menu *Settings* → *Pages* no repositório e escolha a opção
     *Deploy from a branch*. Selecione a branch `main` e a pasta `/(root)`.
   - Após alguns minutos, o GitHub Pages disponibilizará uma URL para
     visualizar o site.

2. **Netlify ou Vercel (alternativas):**
   - Crie uma conta gratuita em uma dessas plataformas.
   - Faça o upload dos arquivos ou conecte o seu repositório GitHub.
   - A plataforma irá gerar automaticamente uma URL pública para o site.

## Configurando o envio de dados para o Google Sheets

Este projeto já está preparado para gravar os dados do formulário diretamente
em sua planilha usando uma **conta de serviço do Google Cloud**. Você não
precisa de Apps Script, pois um pequeno servidor Node.js é responsável por
obter um token OAuth 2.0 e enviar os dados para a API do Google Sheets.

### Pré‑requisitos

* **Arquivo de credenciais JSON**: o arquivo com o nome
  `massive-dryad-171019-77c26aafba04.json` deve estar na mesma pasta do
  `server.js`. Ele contém `client_email` e `private_key` da sua conta de
  serviço. **Não compartilhe este arquivo publicamente.**
* **Planilha compartilhada com a conta de serviço**: abra a planilha (ID
  `1bQd-wL3I4W2dBu68TNeuhwSxlLwePIPdmZtl7a6lI8U`) e compartilhe com o e‑mail da
  conta de serviço (por exemplo,
  `luiz-736@massive-dryad-171019.iam.gserviceaccount.com`) concedendo permissão
  de edição.
* **Node.js 18 ou superior** instalado, pois o script utiliza o `fetch`
  global disponível a partir dessa versão.

### Executando localmente

1. Copie `index.html`, `style.css`, `server.js` e o arquivo JSON de
   credenciais para uma pasta local.
2. No terminal, navegue até essa pasta e execute:

   ```bash
   node server.js
   ```

   O servidor iniciará na porta 3000 e servirá tanto o site quanto o
   endpoint `/submit` para receber o formulário. Os dados serão enviados
   diretamente para a planilha.

3. Abra o navegador em `http://localhost:3000`. Caso seu navegador bloqueie
   `localhost`, desative extensões que possam restringir o acesso ou utilize
   outro navegador.

### Implantação em hospedagem gratuita

Para disponibilizar o site em um domínio público e permitir que seu cliente
acesse e teste o formulário, você pode utilizar serviços de hospedagem
gratuita como **Vercel**, **Render** ou **Railway**:

1. Crie um repositório no GitHub com todos os arquivos do projeto.
2. Importe esse repositório na plataforma escolhida e configure a linguagem
   como Node.js.
3. Defina a porta de escuta (geralmente 3000) e, se preferir, armazene as
   credenciais JSON em variáveis de ambiente (`SHEET_ID`, `client_email` e
   `private_key`). Ajuste `server.js` para ler essas variáveis caso não
   queira versionar o arquivo de chave.
4. A plataforma gerará uma URL pública; compartilhe‑a com seu cliente para
   que ele visualize a página e teste os envios.

### Customizações no front‑end

Na seção de captura de dados, os campos do formulário foram renomeados para
`name`, `surname`, `birthdate`, `whatsapp` e `email`, e receberam um
realce visual quando focados, melhorando a experiência do usuário. O
JavaScript no final de `index.html` intercepta o envio do formulário e
envia os dados via `fetch` para o endpoint `/submit`. Caso você opte por
outro backend (por exemplo, um Apps Script), basta substituir a variável
`WEB_APP_URL` pelo endpoint desejado.