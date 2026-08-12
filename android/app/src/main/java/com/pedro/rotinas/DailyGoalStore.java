package com.pedro.rotinas;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Metas recorrentes DIÁRIAS (aba Metas → Recorrentes, tipo "ao dia") e o
 * progresso de hoje, lidos direto de Directory.Data/brita/rotinas_v2_templates.json
 * — mesmo padrão do RoutineStore/StreakStore.
 *
 * O progresso vive num único doc type:"countdown" (doc.recorrentes), o mesmo
 * container das Metas com prazo. "Lazy reset": se o período guardado no
 * progresso não é o de hoje, a meta ainda não foi tocada hoje — mesma leitura
 * que metaRecProgresso() faz no JS, sem precisar reescrever nada aqui.
 */
public final class DailyGoalStore {

    public static class Goal {
        public final String titulo;
        public final int feitas;
        public final int vezes;
        public final boolean negativa;

        Goal(String titulo, int feitas, int vezes, boolean negativa) {
            this.titulo = titulo; this.feitas = feitas; this.vezes = vezes; this.negativa = negativa;
        }

        /** "2/4" (positiva) ou "1 de no máx. 2" (negativa) */
        public String progresso() {
            return negativa ? (feitas + " de no máx. " + vezes) : (feitas + "/" + vezes);
        }

        public boolean completa() { return negativa ? feitas > vezes : feitas >= vezes; }
    }

    private DailyGoalStore() {}

    private static String readFile(Context ctx) {
        File f = new File(ctx.getFilesDir(), "brita/rotinas_v2_templates.json");
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

    private static String todayKey() {
        Calendar c = Calendar.getInstance();
        return String.format(java.util.Locale.US, "dia:%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    public static List<Goal> todayGoals(Context ctx) {
        List<Goal> out = new ArrayList<>();
        String json = readFile(ctx);
        if (json == null) return out;
        try {
            JSONArray arr = new JSONArray(json);
            // pode haver mais de um doc "countdown" (legado) — o mais recente é o
            // que o app usa (getOrCreateCountdownDoc pega o de maior updatedAt)
            JSONObject countdown = null;
            long best = -1;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null && "countdown".equals(o.optString("type", ""))) {
                    long ua = o.optLong("updatedAt", 0);
                    if (ua >= best) { best = ua; countdown = o; }
                }
            }
            if (countdown == null) return out;
            JSONArray recs = countdown.optJSONArray("recorrentes");
            if (recs == null) return out;
            String hoje = todayKey();
            for (int i = 0; i < recs.length(); i++) {
                JSONObject r = recs.optJSONObject(i);
                if (r == null || !"diaria".equals(r.optString("tipo", ""))) continue;
                String titulo = r.optString("titulo", "");
                if (titulo.isEmpty()) continue;
                int vezes = Math.max(1, r.optInt("vezes", 1));
                boolean negativa = r.optBoolean("negativa", false);
                JSONObject prog = r.optJSONObject("progresso");
                int feitas = 0;
                if (prog != null && hoje.equals(prog.optString("periodo", ""))) {
                    feitas = prog.optInt("feitas", 0);
                }
                out.add(new Goal(titulo, feitas, vezes, negativa));
            }
        } catch (Exception ignored) {}
        return out;
    }
}
