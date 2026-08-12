package com.pedro.rotinas;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

/**
 * Sequência de dias seguidos com pelo menos uma rotina concluída, lida direto
 * do arquivo que o app grava via Capacitor Filesystem
 * (Directory.Data/brita/rotinas_v2_history.json) — mesmo padrão do
 * RoutineStore, pro widget não depender do WebView.
 *
 * Mesma lógica de computeStreak() no index.html: o dia de hoje em curso (ainda
 * sem nenhuma conclusão) não quebra a sequência — só ontem pra trás conta.
 */
public final class StreakStore {

    private StreakStore() {}

    private static String readFile(Context ctx) {
        File f = new File(ctx.getFilesDir(), "brita/rotinas_v2_history.json");
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

    private static String fmt(Calendar c) {
        return String.format(java.util.Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    public static int compute(Context ctx) {
        String json = readFile(ctx);
        if (json == null) return 0;
        Set<String> days = new HashSet<>();
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                String date = o.optString("date", "");
                if (!date.isEmpty()) days.add(date);
            }
        } catch (Exception e) {
            return 0;
        }
        if (days.isEmpty()) return 0;

        Calendar cal = Calendar.getInstance();
        String todayKey = fmt(cal);
        int streak = 0;
        for (int guard = 0; guard < 3700; guard++) {
            String key = fmt(cal);
            if (days.contains(key)) {
                streak++;
                cal.add(Calendar.DAY_OF_MONTH, -1);
            } else if (key.equals(todayKey)) {
                cal.add(Calendar.DAY_OF_MONTH, -1);
            } else {
                break;
            }
        }
        return streak;
    }
}
