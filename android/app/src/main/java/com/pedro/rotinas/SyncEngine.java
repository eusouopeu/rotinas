package com.pedro.rotinas;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Motor de sync com Google Drive — tradução direta de sync/engine.js
 * (desktop) para o Android: mesmo algoritmo last-write-wins por chave, mesma
 * pasta "brita-sync" no Drive, mesmo jeito de detectar conflito de verdade
 * (os dois lados mudaram desde o último ciclo). O que muda é só onde cada
 * coisa mora: chaves em Directory.Data/brita/<chave>.json (igual ao
 * storageBackend nativo do app), estado/tokens em SharedPreferences
 * criptografadas em vez de arquivos em disco.
 */
final class SyncEngine {

    // As 3 últimas chaves (tema, densidade, início da semana) são preferência
    // de UI, não dado de backup — ver o mesmo desvio deliberado documentado em
    // SYNCED_KEYS de sync/engine.js (desktop). Mantidas em paridade aqui pelo
    // mesmo motivo: last-write-wins é sempre correto para um escalar pequeno.
    static final String[] SYNCED_KEYS = {
            "rotinas_v2_routines", "rotinas_v2_notes", "rotinas_v2_history",
            "rotinas_v2_templates", "rotinas_v2_snoozes", "rotinas_v2_tarefas",
            "rotinas_v2_tarefas_hist", "rotinas_v2_diario", "rotinas_v2_diakanban",
            "rotinas_v2_theme", "rotinas_v2_densidade", "rotinas_v2_weekstart"
    };

    private static final String SYNC_FOLDER_NAME = "brita-sync";

    private SyncEngine() {}

    // ---- conexão / token ----

    static boolean isConnected(Context ctx) {
        JSONObject t = SyncTokenStore.loadTokens(ctx);
        return t != null && t.has("refresh_token") && !t.isNull("refresh_token");
    }

    private static String ensureAccessToken(Context ctx) throws Exception {
        JSONObject tokens = SyncTokenStore.loadTokens(ctx);
        if (tokens == null || !tokens.has("refresh_token")) throw new Exception("Google Drive não conectado");
        long expiresAt = tokens.optLong("expiresAt", 0);
        String access = tokens.optString("access_token", null);
        long skewMs = 60_000;
        if (access != null && expiresAt > 0 && System.currentTimeMillis() < expiresAt - skewMs) return access;
        JSONObject fresh = GoogleDriveApi.refreshAccessToken(tokens.getString("refresh_token"));
        tokens.put("access_token", fresh.getString("access_token"));
        tokens.put("expiresAt", System.currentTimeMillis() + fresh.optLong("expires_in", 3600) * 1000);
        SyncTokenStore.saveTokens(ctx, tokens);
        return tokens.getString("access_token");
    }

    /** BLOQUEANTE — chamar numa thread de fundo (abre o navegador e espera o redirect). */
    static void connect(Context ctx) throws Exception {
        GoogleDriveAuth.Result r = GoogleDriveAuth.run(ctx);
        JSONObject tok = GoogleDriveApi.exchangeCode(r.code, r.verifier, r.redirectUri);
        JSONObject stored = new JSONObject();
        stored.put("access_token", tok.getString("access_token"));
        stored.put("refresh_token", tok.getString("refresh_token"));
        stored.put("expiresAt", System.currentTimeMillis() + tok.optLong("expires_in", 3600) * 1000);
        SyncTokenStore.saveTokens(ctx, stored);
    }

    static void disconnect(Context ctx) {
        SyncTokenStore.clearConnection(ctx);
    }

    // ---- arquivos locais (mesmo caminho que o storageBackend nativo do app usa) ----

    private static File dataDir(Context ctx) { return new File(ctx.getFilesDir(), "brita"); }
    private static File keyFile(Context ctx, String key) { return new File(dataDir(ctx), key + ".json"); }

    private static String readTextFile(File f) throws Exception {
        FileInputStream in = new FileInputStream(f);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } finally {
            in.close();
        }
    }

    private static long writeTextFile(File f, String content) throws Exception {
        f.getParentFile().mkdirs();
        FileOutputStream out = new FileOutputStream(f);
        try {
            out.write(content.getBytes("UTF-8"));
        } finally {
            out.close();
        }
        return f.lastModified();
    }

    private static void writeConflictFile(Context ctx, String key, String content) throws Exception {
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'", Locale.US);
        fmt.setTimeZone(TimeZone.getTimeZone("UTC"));
        File f = new File(dataDir(ctx), key + ".conflict-" + fmt.format(new Date()) + ".json");
        writeTextFile(f, content);
    }

    // ---- ciclo de sync ----

    /** Resultado: { uploaded:[], downloaded:[], conflicts:[], skipped:[], errors:[{key,message}] } */
    static JSONObject syncOnce(Context ctx) throws Exception {
        if (!isConnected(ctx)) throw new Exception("Google Drive não conectado");
        String accessToken = ensureAccessToken(ctx);

        String folderId = SyncTokenStore.loadFolderId(ctx);
        if (folderId == null) {
            folderId = GoogleDriveApi.ensureSyncFolder(accessToken, SYNC_FOLDER_NAME);
            SyncTokenStore.saveFolderId(ctx, folderId);
        }

        JSONArray remoteFiles = GoogleDriveApi.listSyncFiles(accessToken, folderId);
        JSONObject remoteByName = new JSONObject();
        for (int i = 0; i < remoteFiles.length(); i++) {
            JSONObject f = remoteFiles.getJSONObject(i);
            remoteByName.put(f.getString("name"), f);
        }

        JSONObject state = SyncTokenStore.loadState(ctx);
        JSONObject conflicts = SyncTokenStore.loadConflicts(ctx);

        List<String> uploaded = new ArrayList<>(), downloaded = new ArrayList<>(),
                conflictList = new ArrayList<>(), skipped = new ArrayList<>();
        JSONArray errors = new JSONArray();

        for (String key : SYNCED_KEYS) {
            try {
                File local = keyFile(ctx, key);
                boolean localExists = local.exists();
                JSONObject remote = remoteByName.has(key + ".json") ? remoteByName.getJSONObject(key + ".json") : null;
                JSONObject prev = state.has(key) ? state.getJSONObject(key) : null;
                Long remoteModMs = remote != null ? parseIso(remote.getString("modifiedTime")) : null;

                if (!localExists && remote == null) { skipped.add(key); continue; }

                if (localExists && remote == null) {
                    String content = readTextFile(local);
                    JSONObject up = GoogleDriveApi.createFile(accessToken, folderId, key + ".json", content);
                    state.put(key, keyState(local.lastModified(), parseIso(up.getString("modifiedTime"))));
                    conflicts.remove(key);
                    uploaded.add(key);
                    continue;
                }
                if (!localExists) {
                    String content = GoogleDriveApi.downloadFileContent(accessToken, remote.getString("id"));
                    long mtime = writeTextFile(local, content);
                    state.put(key, keyState(mtime, remoteModMs));
                    conflicts.remove(key);
                    downloaded.add(key);
                    continue;
                }

                // os dois lados existem
                long localMtime = local.lastModified();
                boolean localChanged = prev == null || localMtime > prev.optLong("localMtime", 0);
                boolean remoteChanged = prev == null || remoteModMs > prev.optLong("remoteModifiedTime", 0);

                if (localChanged && remoteChanged) {
                    JSONObject already = conflicts.has(key) ? conflicts.getJSONObject(key) : null;
                    if (already != null && already.optLong("localMtimeAtDetect", -1) == localMtime
                            && already.optLong("remoteModifiedTimeAtDetect", -1) == remoteModMs) {
                        conflictList.add(key);
                        continue;
                    }
                    String remoteContent = GoogleDriveApi.downloadFileContent(accessToken, remote.getString("id"));
                    String localContent = readTextFile(local);
                    if (prev == null && localContent.trim().equals(remoteContent.trim())) {
                        state.put(key, keyState(localMtime, remoteModMs));
                        skipped.add(key);
                        continue;
                    }
                    writeConflictFile(ctx, key, remoteContent);
                    JSONObject c = new JSONObject();
                    c.put("localMtimeAtDetect", localMtime);
                    c.put("remoteModifiedTimeAtDetect", remoteModMs);
                    c.put("detectedAt", System.currentTimeMillis());
                    conflicts.put(key, c);
                    conflictList.add(key);
                    continue;
                }
                if (localChanged) {
                    String content = readTextFile(local);
                    JSONObject up = GoogleDriveApi.updateFileContent(accessToken, remote.getString("id"), content);
                    state.put(key, keyState(localMtime, parseIso(up.getString("modifiedTime"))));
                    conflicts.remove(key);
                    uploaded.add(key);
                    continue;
                }
                if (remoteChanged) {
                    String content = GoogleDriveApi.downloadFileContent(accessToken, remote.getString("id"));
                    long mtime = writeTextFile(local, content);
                    state.put(key, keyState(mtime, remoteModMs));
                    conflicts.remove(key);
                    downloaded.add(key);
                    continue;
                }
                skipped.add(key);
            } catch (Exception e) {
                JSONObject err = new JSONObject();
                err.put("key", key);
                err.put("message", e.getMessage() == null ? e.toString() : e.getMessage());
                errors.put(err);
            }
        }

        SyncTokenStore.saveState(ctx, state);
        SyncTokenStore.saveConflicts(ctx, conflicts);
        SyncTokenStore.saveLastSyncAt(ctx, System.currentTimeMillis());

        JSONObject result = new JSONObject();
        result.put("uploaded", new JSONArray(uploaded));
        result.put("downloaded", new JSONArray(downloaded));
        result.put("conflicts", new JSONArray(conflictList));
        result.put("skipped", new JSONArray(skipped));
        result.put("errors", errors);
        return result;
    }

    /** "local" mantém o conteúdo local e sobrescreve o remoto; "remote" aplica o conteúdo remoto por cima do local. */
    static void resolveConflict(Context ctx, String key, String choice) throws Exception {
        boolean known = false;
        for (String k : SYNCED_KEYS) if (k.equals(key)) known = true;
        if (!known) throw new Exception("chave desconhecida: " + key);
        if (!isConnected(ctx)) throw new Exception("Google Drive não conectado");
        String accessToken = ensureAccessToken(ctx);
        String folderId = SyncTokenStore.loadFolderId(ctx);
        JSONArray remoteFiles = folderId != null ? GoogleDriveApi.listSyncFiles(accessToken, folderId) : new JSONArray();
        JSONObject remote = null;
        for (int i = 0; i < remoteFiles.length(); i++) {
            JSONObject f = remoteFiles.getJSONObject(i);
            if ((key + ".json").equals(f.getString("name"))) { remote = f; break; }
        }
        File local = keyFile(ctx, key);
        JSONObject state = SyncTokenStore.loadState(ctx);
        JSONObject conflicts = SyncTokenStore.loadConflicts(ctx);

        if ("remote".equals(choice)) {
            if (remote == null) throw new Exception("arquivo remoto não encontrado");
            String content = GoogleDriveApi.downloadFileContent(accessToken, remote.getString("id"));
            long mtime = writeTextFile(local, content);
            state.put(key, keyState(mtime, parseIso(remote.getString("modifiedTime"))));
        } else if ("local".equals(choice)) {
            if (!local.exists()) throw new Exception("arquivo local não encontrado");
            String content = readTextFile(local);
            JSONObject up = remote != null
                    ? GoogleDriveApi.updateFileContent(accessToken, remote.getString("id"), content)
                    : GoogleDriveApi.createFile(accessToken, folderId, key + ".json", content);
            state.put(key, keyState(local.lastModified(), parseIso(up.getString("modifiedTime"))));
        } else {
            throw new Exception("escolha inválida: use \"local\" ou \"remote\"");
        }
        conflicts.remove(key);
        SyncTokenStore.saveState(ctx, state);
        SyncTokenStore.saveConflicts(ctx, conflicts);
    }

    static JSONObject getStatus(Context ctx) throws Exception {
        JSONObject conflicts = SyncTokenStore.loadConflicts(ctx);
        JSONObject status = new JSONObject();
        status.put("connected", isConnected(ctx));
        status.put("hasClientCreds", true); // credencial embutida — sempre presente no APK
        long lastSync = SyncTokenStore.loadLastSyncAt(ctx);
        status.put("lastSyncAt", lastSync > 0 ? lastSync : JSONObject.NULL);
        JSONArray pending = new JSONArray();
        java.util.Iterator<String> it = conflicts.keys();
        while (it.hasNext()) pending.put(it.next());
        status.put("pendingConflicts", pending);
        return status;
    }

    private static JSONObject keyState(long localMtime, Long remoteModifiedTime) throws Exception {
        JSONObject o = new JSONObject();
        o.put("localMtime", localMtime);
        o.put("remoteModifiedTime", remoteModifiedTime == null ? 0 : remoteModifiedTime);
        o.put("syncedAt", System.currentTimeMillis());
        return o;
    }

    /** RFC3339 (o modifiedTime que a Drive API devolve) -> epoch ms. */
    private static Long parseIso(String iso) {
        if (iso == null) return null;
        try {
            SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            fmt.setTimeZone(TimeZone.getTimeZone("UTC"));
            String norm = iso;
            // a Drive às vezes devolve sem millis ("...12:00:00Z") — completa com ".000"
            if (norm.matches(".*\\d{2}:\\d{2}:\\d{2}Z$")) norm = norm.substring(0, norm.length() - 1) + ".000Z";
            return fmt.parse(norm).getTime();
        } catch (Exception e) {
            return 0L;
        }
    }
}
