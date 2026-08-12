package com.pedro.rotinas;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fluxo OAuth "installed app" via loopback (PKCE S256), igual ao que o
 * desktop faz em sync/google-drive.js runLoopbackAuth — só que aqui o
 * servidor HTTP temporário sobe no próprio Android em vez do processo do
 * Electron. Abre o navegador padrão do sistema (nunca uma webview embutida,
 * mesma razão do desktop: é o caminho recomendado pelo Google e o único em
 * que o usuário vê a barra de endereço de verdade antes de digitar a senha).
 *
 * Por que loopback funciona no Android igual no desktop: o client OAuth usado
 * (tipo "Desktop app") não tem redirect URIs pré-cadastradas — o Google aceita
 * qualquer http://127.0.0.1:<porta>/ em tempo de requisição, então o mesmo
 * client id/secret embutido serve os dois. Nenhum cadastro novo no Google
 * Cloud Console é necessário para o Android.
 */
final class GoogleDriveAuth {

    static final class Result {
        final String code, verifier, redirectUri;
        Result(String code, String verifier, String redirectUri) { this.code = code; this.verifier = verifier; this.redirectUri = redirectUri; }
    }

    private GoogleDriveAuth() {}

    private static String base64Url(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }

    /** Sobe o servidor loopback, abre o navegador, espera (até 5min) e devolve o code. Bloqueante — chamar fora da thread principal. */
    static Result run(Context ctx) throws IOException {
        SecureRandom rnd = new SecureRandom();
        byte[] verifierBytes = new byte[32];
        rnd.nextBytes(verifierBytes);
        String verifier = base64Url(verifierBytes);
        String challenge;
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            challenge = base64Url(sha256.digest(verifier.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception e) {
            throw new IOException("SHA-256 indisponível: " + e.getMessage());
        }
        byte[] stateBytes = new byte[16];
        rnd.nextBytes(stateBytes);
        String state = base64Url(stateBytes);

        ServerSocket server = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
        server.setSoTimeout(5 * 60 * 1000);
        int port = server.getLocalPort();
        String redirectUri = "http://127.0.0.1:" + port + "/";

        try {
            Uri authUrl = Uri.parse(GoogleDriveApi.AUTH_ENDPOINT).buildUpon()
                    .appendQueryParameter("client_id", GoogleDriveApi.CLIENT_ID)
                    .appendQueryParameter("redirect_uri", redirectUri)
                    .appendQueryParameter("response_type", "code")
                    .appendQueryParameter("scope", GoogleDriveApi.SCOPE)
                    .appendQueryParameter("access_type", "offline")
                    .appendQueryParameter("prompt", "consent")
                    .appendQueryParameter("code_challenge", challenge)
                    .appendQueryParameter("code_challenge_method", "S256")
                    .appendQueryParameter("state", state)
                    .build();
            Intent open = new Intent(Intent.ACTION_VIEW, authUrl);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(open);

            return acceptOnce(server, state, verifier, redirectUri);
        } finally {
            try { server.close(); } catch (Exception ignored) {}
        }
    }

    private static final Pattern REQUEST_LINE = Pattern.compile("GET\\s+/\\??([^\\s]*)\\s+HTTP");

    private static Result acceptOnce(ServerSocket server, String expectedState, String verifier, String redirectUri) throws IOException {
        while (true) {
            Socket sock;
            try {
                sock = server.accept();
            } catch (SocketTimeoutException e) {
                throw new IOException("tempo esgotado esperando a autorização");
            }
            try (Socket s = sock) {
                BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
                String firstLine = in.readLine();
                if (firstLine == null) continue;
                Matcher m = REQUEST_LINE.matcher(firstLine);
                if (!m.find()) { respond(s, "Resposta inválida", 400); continue; }
                String query = m.group(1);
                java.util.Map<String, String> params = parseQuery(query);
                String error = params.get("error");
                String code = params.get("code");
                String gotState = params.get("state");
                // requisição sem nada de OAuth (ex.: o navegador pedindo /favicon.ico
                // sozinho, em paralelo) não é o redirect — responde 404 e continua
                // esperando, em vez de derrubar o fluxo por engano.
                if (error == null && code == null && gotState == null) {
                    respond(s, "", 404);
                    continue;
                }
                if (error != null) {
                    respond(s, "Falha na autorização: " + error, 200);
                    throw new IOException("autorização recusada: " + error);
                }
                if (code == null || !expectedState.equals(gotState)) {
                    respond(s, "Resposta inválida (state não confere)", 200);
                    throw new IOException("resposta OAuth inválida (state não confere)");
                }
                respond(s, "Brita conectado ao Google Drive ✓ — pode fechar esta aba e voltar ao app.", 200);
                return new Result(code, verifier, redirectUri);
            }
        }
    }

    private static java.util.Map<String, String> parseQuery(String query) {
        java.util.Map<String, String> out = new java.util.HashMap<>();
        if (query == null) return out;
        for (String pair : query.split("&")) {
            int i = pair.indexOf('=');
            if (i < 0) continue;
            try {
                String k = java.net.URLDecoder.decode(pair.substring(0, i), "UTF-8");
                String v = java.net.URLDecoder.decode(pair.substring(i + 1), "UTF-8");
                out.put(k, v);
            } catch (Exception ignored) {}
        }
        return out;
    }

    private static void respond(Socket s, String message, int status) {
        try {
            String html = "<html><body style='font-family:sans-serif;padding:24px;'><h2>" + message + "</h2></body></html>";
            byte[] body = html.getBytes(StandardCharsets.UTF_8);
            OutputStream os = s.getOutputStream();
            String statusLine = status == 200 ? "HTTP/1.1 200 OK\r\n" : status == 404 ? "HTTP/1.1 404 Not Found\r\n" : "HTTP/1.1 400 Bad Request\r\n";
            os.write(statusLine.getBytes(StandardCharsets.US_ASCII));
            os.write(("Content-Type: text/html; charset=utf-8\r\n").getBytes(StandardCharsets.US_ASCII));
            os.write(("Content-Length: " + body.length + "\r\n").getBytes(StandardCharsets.US_ASCII));
            os.write("Connection: close\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
            os.write(body);
            os.flush();
        } catch (Exception ignored) {}
    }
}
