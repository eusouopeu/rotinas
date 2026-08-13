// Cliente REST mínimo da Google Drive API v3 + fluxo OAuth loopback para apps desktop.
// Sem dependência do pacote `googleapis` (enorme) — só `fetch` nativo do Node/Electron.
"use strict";

const crypto = require("crypto");
const http = require("http");
const { shell } = require("electron");

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function pkcePair() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/* Sobe um servidor HTTP temporário em 127.0.0.1 numa porta livre, abre o navegador
   PADRÃO DO SISTEMA (shell.openExternal — nunca uma webview embutida, é o caminho
   recomendado pelo Google para apps desktop) e resolve com o "code" de autorização.
   PKCE (S256) é usado mesmo sem exigência estrita, por segurança extra. */
function runLoopbackAuth(clientId) {
  return new Promise((resolve, reject) => {
    const { verifier, challenge } = pkcePair();
    const state = base64url(crypto.randomBytes(16));
    let redirectUri = "";
    let settled = false;

    const server = http.createServer((req, res) => {
      let url;
      try { url = new URL(req.url, "http://127.0.0.1"); } catch (e) { res.writeHead(400).end(); return; }
      if (url.pathname !== "/") { res.writeHead(404).end(); return; }
      const code = url.searchParams.get("code");
      const gotState = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      if (error) {
        res.end(`<html><body><h2>Falha na autorização: ${error}</h2><p>Pode fechar esta aba.</p></body></html>`);
        finish(() => reject(new Error("autorização recusada: " + error)));
        return;
      }
      if (!code || gotState !== state) {
        res.end("<html><body><h2>Resposta inválida</h2><p>Pode fechar esta aba e tentar de novo.</p></body></html>");
        finish(() => reject(new Error("resposta OAuth inválida (state não confere)")));
        return;
      }
      res.end("<html><body><h2>Brita conectado ao Google Drive ✓</h2><p>Pode fechar esta aba e voltar ao app.</p></body></html>");
      finish(() => resolve({ code, verifier, redirectUri }));
    });

    const timer = setTimeout(() => finish(() => reject(new Error("tempo esgotado esperando a autorização"))), 5 * 60 * 1000);
    function finish(action) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      action();
    }

    server.on("error", (e) => finish(() => reject(e)));
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      redirectUri = `http://127.0.0.1:${port}/`;
      const authUrl = new URL(AUTH_ENDPOINT);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPE);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      shell.openExternal(authUrl.toString());
    });
  });
}

async function exchangeCode({ clientId, clientSecret, code, verifier, redirectUri }) {
  const body = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret || "", code,
    code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri
  });
  const r = await fetch(TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await r.json();
  if (!r.ok) throw new Error("troca do código por token falhou: " + (data.error_description || data.error || r.status));
  return data; // { access_token, refresh_token, expires_in, ... }
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret || "", refresh_token: refreshToken, grant_type: "refresh_token" });
  const r = await fetch(TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await r.json();
  if (!r.ok) throw new Error("renovação do token falhou: " + (data.error_description || data.error || r.status));
  return data; // { access_token, expires_in, ... } — refresh_token normalmente não vem de novo
}

async function driveFetch(accessToken, url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) {
    let msg = r.status + " " + r.statusText;
    try { const j = await r.json(); if (j.error && j.error.message) msg = j.error.message; } catch (e) { /* corpo não era JSON */ }
    const err = new Error("Drive API: " + msg);
    err.status = r.status;
    throw err;
  }
  return r;
}

async function ensureSyncFolder(accessToken, name = "brita-sync") {
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`);
  const r = await driveFetch(accessToken, `${DRIVE_FILES}?q=${q}&fields=files(id,name)&spaces=drive`);
  const data = await r.json();
  if (data.files && data.files[0]) return data.files[0].id;
  const created = await driveFetch(accessToken, DRIVE_FILES, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" })
  });
  const j = await created.json();
  return j.id;
}

async function listSyncFiles(accessToken, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const r = await driveFetch(accessToken, `${DRIVE_FILES}?q=${q}&fields=files(id,name,modifiedTime)&pageSize=200&spaces=drive`);
  const data = await r.json();
  return data.files || []; // [{id, name, modifiedTime}]
}

async function downloadFileContent(accessToken, fileId) {
  const r = await driveFetch(accessToken, `${DRIVE_FILES}/${fileId}?alt=media`);
  return r.text();
}

async function updateFileContent(accessToken, fileId, content) {
  const r = await driveFetch(accessToken, `${DRIVE_UPLOAD}/${fileId}?uploadType=media&fields=id,modifiedTime`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: content
  });
  return r.json(); // { id, modifiedTime }
}

async function createFile(accessToken, folderId, name, content) {
  const created = await driveFetch(accessToken, DRIVE_FILES, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, parents: [folderId] })
  });
  const { id } = await created.json();
  return updateFileContent(accessToken, id, content);
}

module.exports = {
  SCOPE,
  runLoopbackAuth,
  exchangeCode,
  refreshAccessToken,
  ensureSyncFolder,
  listSyncFiles,
  downloadFileContent,
  createFile,
  updateFileContent
};
