package com.pedro.rotinas;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Cliente REST mínimo da Google Drive API v3 + troca/renovação de token OAuth,
 * via HttpURLConnection puro (sem OkHttp/Retrofit, pra não puxar dependência
 * nova). Espelha sync/google-drive.js do desktop função a função — mesmo
 * algoritmo, tradução direta pra Java.
 *
 * Client ID/Secret: o MESMO client "Desktop app" já cadastrado no Google Cloud
 * Console para o app desktop (ver sync/oauth-client.js). Reaproveitável aqui
 * porque, para esse tipo de client, o Google não pré-registra redirect URIs —
 * aceita qualquer loopback http://127.0.0.1:<porta>/ ou http://localhost:<porta>/
 * em tempo de requisição, então o mesmo client funciona tanto rodando no
 * processo do Electron quanto aqui no Android (o Google não distingue de onde
 * a requisição HTTP partiu). Client secret de app instalado não é tratado como
 * segredo de verdade pelo próprio Google (ver nota em oauth-client.js).
 */
final class GoogleDriveApi {

    static final String CLIENT_ID = "383472864188-3vajbc6p95fm8pp1tn64jvdmroijsr3n.apps.googleusercontent.com";
    static final String CLIENT_SECRET = "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";
    static final String SCOPE = "https://www.googleapis.com/auth/drive.file";
    static final String AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
    private static final String DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

    private GoogleDriveApi() {}

    private static String urlEncode(String s) {
        try { return URLEncoder.encode(s, "UTF-8"); } catch (Exception e) { return s; }
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toString("UTF-8");
    }

    private static JSONObject postForm(String url, String formBody) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        c.setConnectTimeout(20000);
        c.setReadTimeout(20000);
        try (OutputStream os = c.getOutputStream()) {
            os.write(formBody.getBytes(StandardCharsets.UTF_8));
        }
        int code = c.getResponseCode();
        InputStream is = code >= 200 && code < 300 ? c.getInputStream() : c.getErrorStream();
        String body = is != null ? readAll(is) : "";
        JSONObject json;
        try { json = new JSONObject(body); } catch (Exception e) { json = new JSONObject(); }
        if (code < 200 || code >= 300) {
            String msg = json.optString("error_description", json.optString("error", "HTTP " + code));
            throw new IOException("token endpoint: " + msg);
        }
        return json;
    }

    /** Requisição autenticada à Drive API. `method` GET/POST/PATCH; `body` null para GET. */
    private static HttpURLConnection driveConn(String accessToken, String url, String method, String contentType) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setRequestProperty("Authorization", "Bearer " + accessToken);
        if (contentType != null) c.setRequestProperty("Content-Type", contentType);
        c.setConnectTimeout(20000);
        c.setReadTimeout(30000);
        return c;
    }

    private static String driveRequestText(String accessToken, String url, String method, String contentType, byte[] body) throws IOException {
        HttpURLConnection c = driveConn(accessToken, url, method, contentType);
        if (body != null) {
            c.setDoOutput(true);
            try (OutputStream os = c.getOutputStream()) { os.write(body); }
        }
        int code = c.getResponseCode();
        InputStream is = code >= 200 && code < 300 ? c.getInputStream() : c.getErrorStream();
        String text = is != null ? readAll(is) : "";
        if (code < 200 || code >= 300) {
            String msg = "HTTP " + code;
            try { JSONObject j = new JSONObject(text); JSONObject err = j.optJSONObject("error"); if (err != null) msg = err.optString("message", msg); } catch (Exception ignored) {}
            IOException ex = new IOException("Drive API: " + msg);
            throw ex;
        }
        return text;
    }

    private static JSONObject driveRequestJson(String accessToken, String url, String method, String contentType, byte[] body) throws IOException {
        String text = driveRequestText(accessToken, url, method, contentType, body);
        try { return new JSONObject(text); } catch (Exception e) { throw new IOException("resposta inesperada da Drive API"); }
    }

    // ---- OAuth ----

    static JSONObject exchangeCode(String code, String verifier, String redirectUri) throws Exception {
        String form = "client_id=" + urlEncode(CLIENT_ID)
                + "&client_secret=" + urlEncode(CLIENT_SECRET)
                + "&code=" + urlEncode(code)
                + "&code_verifier=" + urlEncode(verifier)
                + "&grant_type=authorization_code"
                + "&redirect_uri=" + urlEncode(redirectUri);
        return postForm(TOKEN_ENDPOINT, form);
    }

    static JSONObject refreshAccessToken(String refreshToken) throws Exception {
        String form = "client_id=" + urlEncode(CLIENT_ID)
                + "&client_secret=" + urlEncode(CLIENT_SECRET)
                + "&refresh_token=" + urlEncode(refreshToken)
                + "&grant_type=refresh_token";
        return postForm(TOKEN_ENDPOINT, form);
    }

    // ---- Drive ----

    static String ensureSyncFolder(String accessToken, String name) throws Exception {
        String q = urlEncode("mimeType='application/vnd.google-apps.folder' and name='" + name + "' and trashed=false");
        JSONObject list = driveRequestJson(accessToken, DRIVE_FILES + "?q=" + q + "&fields=files(id,name)&spaces=drive", "GET", null, null);
        JSONArray files = list.optJSONArray("files");
        if (files != null && files.length() > 0) return files.getJSONObject(0).getString("id");
        JSONObject body = new JSONObject();
        try {
            body.put("name", name);
            body.put("mimeType", "application/vnd.google-apps.folder");
        } catch (Exception ignored) {}
        JSONObject created = driveRequestJson(accessToken, DRIVE_FILES, "POST", "application/json", body.toString().getBytes(StandardCharsets.UTF_8));
        return created.getString("id");
    }

    /** [{id,name,modifiedTime}] */
    static JSONArray listSyncFiles(String accessToken, String folderId) throws Exception {
        String q = urlEncode("'" + folderId + "' in parents and trashed=false");
        JSONObject data = driveRequestJson(accessToken, DRIVE_FILES + "?q=" + q + "&fields=files(id,name,modifiedTime)&pageSize=200&spaces=drive", "GET", null, null);
        JSONArray files = data.optJSONArray("files");
        return files != null ? files : new JSONArray();
    }

    static String downloadFileContent(String accessToken, String fileId) throws Exception {
        return driveRequestText(accessToken, DRIVE_FILES + "/" + fileId + "?alt=media", "GET", null, null);
    }

    /** { id, modifiedTime } */
    static JSONObject updateFileContent(String accessToken, String fileId, String content) throws Exception {
        return driveRequestJson(accessToken, DRIVE_UPLOAD + "/" + fileId + "?uploadType=media&fields=id,modifiedTime", "PATCH", "application/json", content.getBytes(StandardCharsets.UTF_8));
    }

    /** { id, modifiedTime } */
    static JSONObject createFile(String accessToken, String folderId, String name, String content) throws Exception {
        JSONObject body = new JSONObject();
        try {
            body.put("name", name);
            body.put("parents", new JSONArray().put(folderId));
        } catch (Exception ignored) {}
        JSONObject created = driveRequestJson(accessToken, DRIVE_FILES, "POST", "application/json", body.toString().getBytes(StandardCharsets.UTF_8));
        return updateFileContent(accessToken, created.getString("id"), content);
    }
}
