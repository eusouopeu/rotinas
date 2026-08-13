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
 * Metas recorrentes DIÁRIAS (aba Metas → Recorrentes, tipo "ao dia") e as
 * metas de PRAZO mais próximas (aba Metas → Prazos), lidas direto de
 * Directory.Data/brita/rotinas_v2_templates.json — mesmo padrão do
 * RoutineStore/StreakStore. As duas listas dividem o mesmo widget (até 4
 * linhas): recorrentes primeiro, prazos preenchendo o que sobrar.
 *
 * O progresso das recorrentes vive num único doc type:"countdown"
 * (doc.recorrentes), o mesmo container das Metas com prazo (doc.targets).
 * "Lazy reset": se o período guardado no progresso não é o de hoje, a meta
 * ainda não foi tocada hoje — mesma leitura que metaRecProgresso() faz no JS,
 * sem precisar reescrever nada aqui.
 */
public final class DailyGoalStore {

    public static class Goal {
        public final String titulo;
        public final int feitas;
        public final int vezes;
        public final boolean negativa;
        public final boolean countdown;
        public final int diasRestantes;

        Goal(String titulo, int feitas, int vezes, boolean negativa) {
            this.titulo = titulo; this.feitas = feitas; this.vezes = vezes; this.negativa = negativa;
            this.countdown = false; this.diasRestantes = 0;
        }

        Goal(String titulo, int diasRestantes) {
            this.titulo = titulo; this.diasRestantes = diasRestantes;
            this.countdown = true; this.feitas = 0; this.vezes = 0; this.negativa = false;
        }

        /** "2/4" (positiva), "1 de no máx. 2" (negativa) ou "faltam Xd" (prazo) */
        public String progresso() {
            if (countdown) {
                if (diasRestantes == 0) return "hoje";
                if (diasRestantes < 0) return "atrasada";
                return "faltam " + diasRestantes + "d";
            }
            return negativa ? (feitas + " de no máx. " + vezes) : (feitas + "/" + vezes);
        }

        public boolean completa() {
            if (countdown) return false;
            return negativa ? feitas > vezes : feitas >= vezes;
        }
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
            // metas de prazo mais próximas, preenchendo as linhas que sobrarem
            // (o provider já corta em MAX_ROWS — inútil ordenar/limitar de mais aqui)
            JSONArray targets = countdown.optJSONArray("targets");
            if (targets != null) {
                List<Goal> prazos = new ArrayList<>();
                for (int i = 0; i < targets.length(); i++) {
                    JSONObject t = targets.optJSONObject(i);
                    if (t == null) continue;
                    String titulo = t.optString("title", "");
                    String date = t.optString("date", "");
                    if (titulo.isEmpty() || date.isEmpty()) continue;
                    Integer dias = daysUntil(date);
                    if (dias == null || dias < 0) continue;
                    prazos.add(new Goal(titulo, dias));
                }
                java.util.Collections.sort(prazos, new java.util.Comparator<Goal>() {
                    public int compare(Goal a, Goal b) { return a.diasRestantes - b.diasRestantes; }
                });
                out.addAll(prazos);
            }
        } catch (Exception ignored) {}
        return out;
    }

    /** Dias entre hoje e "YYYY-MM-DD" — mesma conta de daysUntil() no JS. */
    private static Integer daysUntil(String dateStr) {
        try {
            String[] p = dateStr.split("-");
            Calendar alvo = Calendar.getInstance();
            alvo.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 0, 0, 0);
            alvo.set(Calendar.MILLISECOND, 0);
            Calendar hoje = Calendar.getInstance();
            hoje.set(Calendar.HOUR_OF_DAY, 0); hoje.set(Calendar.MINUTE, 0);
            hoje.set(Calendar.SECOND, 0); hoje.set(Calendar.MILLISECOND, 0);
            long diffMs = alvo.getTimeInMillis() - hoje.getTimeInMillis();
            return (int) Math.round(diffMs / 86400000.0);
        } catch (Exception e) {
            return null;
        }
    }
}
