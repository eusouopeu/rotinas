// Guarda o refresh/access token do Google Drive criptografado com safeStorage
// (ligado ao keychain do SO) — nunca em texto puro. Ver seção 5.4 do plano:
// keytar está descontinuado, safeStorage é a API atual do próprio Electron.
"use strict";

const fs = require("fs");
const path = require("path");
const { app, safeStorage } = require("electron");

function encPath() { return path.join(app.getPath("userData"), "google-drive-tokens.enc"); }
function plainFallbackPath() { return path.join(app.getPath("userData"), "google-drive-tokens.json"); }

function saveTokens(tokens) {
  const json = JSON.stringify(tokens);
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(encPath(), safeStorage.encryptString(json));
    try { fs.unlinkSync(plainFallbackPath()); } catch (e) { /* não existia */ }
  } else {
    // sem keychain/keyring disponível no sistema: último recurso, texto puro
    fs.writeFileSync(plainFallbackPath(), json, "utf8");
  }
}

function loadTokens() {
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(encPath())) {
      return JSON.parse(safeStorage.decryptString(fs.readFileSync(encPath())));
    }
    if (fs.existsSync(plainFallbackPath())) {
      return JSON.parse(fs.readFileSync(plainFallbackPath(), "utf8"));
    }
  } catch (e) { return null; }
  return null;
}

function clearTokens() {
  try { fs.unlinkSync(encPath()); } catch (e) { /* já não existia */ }
  try { fs.unlinkSync(plainFallbackPath()); } catch (e) { /* já não existia */ }
}

module.exports = { saveTokens, loadTokens, clearTokens };
