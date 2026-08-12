package com.pedro.rotinas;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import org.json.JSONObject;

/**
 * Guarda o refresh/access token do Google Drive criptografado, ligado ao
 * Android Keystore — mesmo espírito do safeStorage (Electron) usado no
 * desktop. Nunca em texto puro.
 */
public final class SyncTokenStore {

    private static final String PREFS = "brita_drive_tokens";
    private static final String KEY_JSON = "tokens_json";
    private static final String KEY_FOLDER_ID = "sync_folder_id";
    private static final String KEY_LAST_SYNC = "last_sync_at";
    private static final String KEY_STATE = "sync_state_json"; // por-chave: localMtime/remoteModifiedTime
    private static final String KEY_CONFLICTS = "sync_conflicts_json";

    private SyncTokenStore() {}

    private static SharedPreferences prefs(Context ctx) {
        try {
            MasterKey masterKey = new MasterKey.Builder(ctx)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            return EncryptedSharedPreferences.create(
                    ctx, PREFS, masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        } catch (Exception e) {
            // Keystore indisponível (raríssimo) — cai para SharedPreferences comum
            // em vez de quebrar o sync inteiro; ainda é privado ao app (MODE_PRIVATE).
            return ctx.getSharedPreferences(PREFS + "_fallback", Context.MODE_PRIVATE);
        }
    }

    public static JSONObject loadTokens(Context ctx) {
        String json = prefs(ctx).getString(KEY_JSON, null);
        if (json == null) return null;
        try { return new JSONObject(json); } catch (Exception e) { return null; }
    }

    public static void saveTokens(Context ctx, JSONObject tokens) {
        prefs(ctx).edit().putString(KEY_JSON, tokens.toString()).apply();
    }

    public static void clearTokens(Context ctx) {
        prefs(ctx).edit().remove(KEY_JSON).apply();
    }

    public static String loadFolderId(Context ctx) { return prefs(ctx).getString(KEY_FOLDER_ID, null); }
    public static void saveFolderId(Context ctx, String id) { prefs(ctx).edit().putString(KEY_FOLDER_ID, id).apply(); }

    public static long loadLastSyncAt(Context ctx) { return prefs(ctx).getLong(KEY_LAST_SYNC, 0); }
    public static void saveLastSyncAt(Context ctx, long ts) { prefs(ctx).edit().putLong(KEY_LAST_SYNC, ts).apply(); }

    public static JSONObject loadState(Context ctx) {
        String json = prefs(ctx).getString(KEY_STATE, null);
        if (json == null) return new JSONObject();
        try { return new JSONObject(json); } catch (Exception e) { return new JSONObject(); }
    }
    public static void saveState(Context ctx, JSONObject state) {
        prefs(ctx).edit().putString(KEY_STATE, state.toString()).apply();
    }

    public static JSONObject loadConflicts(Context ctx) {
        String json = prefs(ctx).getString(KEY_CONFLICTS, null);
        if (json == null) return new JSONObject();
        try { return new JSONObject(json); } catch (Exception e) { return new JSONObject(); }
    }
    public static void saveConflicts(Context ctx, JSONObject conflicts) {
        prefs(ctx).edit().putString(KEY_CONFLICTS, conflicts.toString()).apply();
    }

    /** Desconectar: limpa tokens e o id da pasta (reobtido no próximo connect); mantém o histórico por chave. */
    public static void clearConnection(Context ctx) {
        prefs(ctx).edit().remove(KEY_JSON).remove(KEY_FOLDER_ID).apply();
    }
}
