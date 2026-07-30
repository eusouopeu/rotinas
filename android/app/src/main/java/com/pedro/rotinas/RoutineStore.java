package com.pedro.rotinas;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Leitura das rotinas direto do arquivo que o app grava via Capacitor Filesystem
 * (Directory.Data/brita/rotinas_v2_routines.json). O widget e a tela de
 * configuração precisam dos nomes das rotinas sem abrir o WebView, então leem o
 * mesmo JSON em vez de depender da ponte JS.
 */
public final class RoutineStore {

    public static class Routine {
        public final String id;
        public final String name;
        public final int steps;
        public final int seconds;

        Routine(String id, String name, int steps, int seconds) {
            this.id = id; this.name = name; this.steps = steps; this.seconds = seconds;
        }

        /** "3 etapas · 12 min" — vazio quando a rotina não tem tempo fixo. */
        public String meta() {
            String s = steps + (steps == 1 ? " etapa" : " etapas");
            if (seconds > 0) {
                int min = Math.round(seconds / 60f);
                s += " · " + (min > 0 ? min + " min" : seconds + "s");
            }
            return s;
        }
    }

    private RoutineStore() {}

    private static String readFile(Context ctx) {
        File f = new File(ctx.getFilesDir(), "brita/rotinas_v2_routines.json");
        if (!f.exists()) return null;
        FileInputStream in = null;
        try {
            in = new FileInputStream(f);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return null;
        } finally {
            if (in != null) try { in.close(); } catch (Exception ignored) {}
        }
    }

    public static List<Routine> all(Context ctx) {
        List<Routine> list = new ArrayList<>();
        String json = readFile(ctx);
        if (json == null) return list;
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                String id = o.optString("id", "");
                String name = o.optString("name", "");
                if (id.isEmpty() || name.isEmpty()) continue;
                JSONArray steps = o.optJSONArray("steps");
                int count = steps == null ? 0 : steps.length();
                int secs = 0;
                for (int j = 0; j < count; j++) {
                    JSONObject st = steps.optJSONObject(j);
                    if (st != null && "timer".equals(st.optString("type"))) secs += st.optInt("seconds", 0);
                }
                list.add(new Routine(id, name, count, secs));
            }
        } catch (Exception ignored) {}
        return list;
    }

    public static Routine byId(Context ctx, String id) {
        if (id == null) return null;
        for (Routine r : all(ctx)) if (r.id.equals(id)) return r;
        return null;
    }
}
