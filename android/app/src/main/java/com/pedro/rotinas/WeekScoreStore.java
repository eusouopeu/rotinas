package com.pedro.rotinas;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Calendar;

/**
 * Nota da semana (boletim), lida direto de
 * Directory.Data/brita/rotinas_v2_gamificacao.json — mesmo padrão do
 * RoutineStore/StreakStore/DailyGoalStore, pro widget não depender do WebView.
 *
 * Mesma conta de ritmoInfo() no index.html: nota = soma de
 * semanaAtual.concluidos[].pontos; esperado = soma de
 * semanaAtual.agendaCongelada[].pontos com dia &lt;= diaIdx de hoje (offset
 * dentro da semana configurada, não o dia literal — por isso lê
 * rotinas_v2_weekstart.json também). saldo = nota - esperado, mesmos limiares
 * de rótulo (Adiantado/No ritmo/Levemente atrasado/Atrasado).
 */
public final class WeekScoreStore {

    public static class Resultado {
        public final double nota;
        public final double esperado;
        public final String label;
        public final int corLabel; // ARGB — mesma paleta das variáveis --good/--muted/--accent/--danger
        public final int diasRestantes;
        public final boolean temSemana;

        Resultado(double nota, double esperado, String label, int corLabel, int diasRestantes, boolean temSemana) {
            this.nota = nota; this.esperado = esperado; this.label = label; this.corLabel = corLabel;
            this.diasRestantes = diasRestantes; this.temSemana = temSemana;
        }
    }

    private WeekScoreStore() {}

    private static String readFile(Context ctx, String nome) {
        File f = new File(ctx.getFilesDir(), "brita/" + nome);
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

    private static int weekStartDow(Context ctx) {
        String raw = readFile(ctx, "rotinas_v2_weekstart.json");
        if (raw == null) return 0;
        try {
            int v = Integer.parseInt(raw.trim());
            return (v >= 0 && v <= 6) ? v : 0;
        } catch (Exception e) { return 0; }
    }

    public static Resultado compute(Context ctx) {
        String json = readFile(ctx, "rotinas_v2_gamificacao.json");
        if (json == null) return new Resultado(0, 0, "", 0, 7, false);
        try {
            JSONObject gam = new JSONObject(json);
            JSONObject semana = gam.optJSONObject("semanaAtual");
            if (semana == null) return new Resultado(0, 0, "", 0, 7, false);

            double nota = 0;
            JSONArray concluidos = semana.optJSONArray("concluidos");
            if (concluidos != null) {
                for (int i = 0; i < concluidos.length(); i++) {
                    JSONObject c = concluidos.optJSONObject(i);
                    if (c != null) nota += c.optDouble("pontos", 0);
                }
            }

            int weekStart = weekStartDow(ctx);
            Calendar hoje = Calendar.getInstance();
            int dowLiteral = hoje.get(Calendar.DAY_OF_WEEK) - 1; // Calendar: 1=domingo..7=sábado -> 0..6
            int diaIdx = ((dowLiteral - weekStart) % 7 + 7) % 7;

            double esperado = 0;
            JSONArray agenda = semana.optJSONArray("agendaCongelada");
            if (agenda != null) {
                for (int i = 0; i < agenda.length(); i++) {
                    JSONObject a = agenda.optJSONObject(i);
                    if (a != null && a.optInt("dia", 99) <= diaIdx) esperado += a.optDouble("pontos", 0);
                }
            }

            double saldo = nota - esperado;
            String label; int cor;
            // cores = tokens do app (--ok/--sub/--caneta/--erro), claro ou escuro
            if (saldo >= 5) { label = "adiantado"; cor = ctx.getColor(R.color.widget_ok); }
            else if (saldo >= -5) { label = "no ritmo"; cor = ctx.getColor(R.color.widget_sub); }
            else if (saldo >= -15) { label = "levemente atrasado"; cor = ctx.getColor(R.color.widget_caneta); }
            else { label = "atrasado"; cor = ctx.getColor(R.color.widget_erro); }

            int diasRestantes = 7 - diaIdx;
            return new Resultado(nota, esperado, label, cor, diasRestantes, true);
        } catch (Exception e) {
            return new Resultado(0, 0, "", 0, 7, false);
        }
    }
}
