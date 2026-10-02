package com.pedro.rotinas;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Fila dos "+1" tocados no widget de metas (02/10/2026). O widget não grava
 * na store do app (Directory.Data/brita) — escrita concorrente com o app
 * aberto perderia dados. O toque entra aqui (SharedPreferences, fora de
 * backup/sync), o widget soma a fila ao que lê da store para mostrar a
 * contagem nova na hora, e o app consome a fila ao abrir/voltar à frente
 * (WidgetsPlugin.consumirToques → lib/widgets.ts) aplicando cada toque como
 * o "+" do cartão da meta.
 */
public final class WidgetToques {

    private static final String PREFS = "brita_widget_toques";
    private static final String FILA = "fila";

    private WidgetToques() {}

    /** "AAAA-MM-DD" de hoje, no fuso do aparelho. */
    static String hoje() {
        Calendar c = Calendar.getInstance();
        return String.format(java.util.Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONArray ler(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(FILA, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static synchronized void adicionar(Context ctx, String id) {
        JSONArray fila = ler(ctx);
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            o.put("dia", hoje());
            o.put("delta", 1);
            o.put("ts", System.currentTimeMillis());
            fila.put(o);
        } catch (Exception ignored) {}
        prefs(ctx).edit().putString(FILA, fila.toString()).apply();
    }

    /** Soma dos toques ainda não aplicados pelo app para a meta no dia. */
    static int pendentes(Context ctx, String id, String dia) {
        JSONArray fila = ler(ctx);
        int n = 0;
        for (int i = 0; i < fila.length(); i++) {
            JSONObject o = fila.optJSONObject(i);
            if (o != null && id.equals(o.optString("id")) && dia.equals(o.optString("dia"))) n += o.optInt("delta", 1);
        }
        return n;
    }

    /** Devolve a fila inteira e a esvazia (o app aplica). */
    static synchronized JSONArray consumir(Context ctx) {
        JSONArray fila = ler(ctx);
        prefs(ctx).edit().remove(FILA).commit();
        return fila;
    }
}
