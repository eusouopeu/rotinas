package com.pedro.rotinas;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import java.util.List;

/**
 * Widget sem configuração: lista as metas recorrentes diárias (aba Metas →
 * Recorrentes → "ao dia") com o progresso de hoje. Até 4 linhas — o mesmo
 * espaço de um widget 4x2 já cabe folgado. Um toque abre a aba Metas; o "+"
 * de cada recorrente (02/10/2026) soma 1 sem abrir o app (fila em
 * WidgetToques, aplicada pelo app ao abrir).
 */
public class DailyGoalWidgetProvider extends AppWidgetProvider {

    private static final int MAX_ROWS = 4;
    private static final int[] ROW_WRAP_IDS = { R.id.goalRow1, R.id.goalRow2, R.id.goalRow3, R.id.goalRow4 };
    private static final int[] ROW_TITLE_IDS = { R.id.goalTitle1, R.id.goalTitle2, R.id.goalTitle3, R.id.goalTitle4 };
    private static final int[] ROW_PROG_IDS = { R.id.goalProg1, R.id.goalProg2, R.id.goalProg3, R.id.goalProg4 };
    private static final int[] ROW_PLUS_IDS = { R.id.goalPlus1, R.id.goalPlus2, R.id.goalPlus3, R.id.goalPlus4 };
    static final String ACAO_MAIS1 = "com.pedro.rotinas.META_MAIS1";
    static final String EXTRA_META = "metaId";

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, DailyGoalWidgetProvider.class));
        if (ids == null) return;
        for (int id : ids) render(ctx, mgr, id);
    }

    static void render(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_daily_goal);
        List<DailyGoalStore.Goal> goals = DailyGoalStore.todayGoals(ctx);

        v.setViewVisibility(R.id.goalEmpty, goals.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);

        for (int i = 0; i < MAX_ROWS; i++) {
            if (i < goals.size()) {
                DailyGoalStore.Goal g = goals.get(i);
                v.setViewVisibility(ROW_WRAP_IDS[i], android.view.View.VISIBLE);
                v.setTextViewText(ROW_TITLE_IDS[i], g.titulo);
                v.setTextViewText(ROW_PROG_IDS[i], g.progresso());
                v.setTextColor(ROW_PROG_IDS[i], g.cor(ctx));
                if (!g.countdown && !g.id.isEmpty()) {
                    Intent mais = new Intent(ctx, DailyGoalWidgetProvider.class);
                    mais.setAction(ACAO_MAIS1);
                    mais.putExtra(EXTRA_META, g.id);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT
                            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
                    PendingIntent piMais = PendingIntent.getBroadcast(ctx, (widgetId * 31 + g.id.hashCode()) & 0x7fffffff, mais, flags);
                    v.setViewVisibility(ROW_PLUS_IDS[i], android.view.View.VISIBLE);
                    v.setOnClickPendingIntent(ROW_PLUS_IDS[i], piMais);
                } else {
                    v.setViewVisibility(ROW_PLUS_IDS[i], android.view.View.GONE);
                }
            } else {
                v.setViewVisibility(ROW_WRAP_IDS[i], android.view.View.GONE);
            }
        }

        PendingIntent pi = WidgetAbrir.em(ctx, widgetId, WidgetAbrir.METAS);
        v.setOnClickPendingIntent(R.id.widgetRoot, pi);

        mgr.updateAppWidget(widgetId, v);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] widgetIds) {
        for (int id : widgetIds) render(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (intent != null && ACAO_MAIS1.equals(intent.getAction())) {
            String id = intent.getStringExtra(EXTRA_META);
            if (id != null && !id.isEmpty()) {
                WidgetToques.adicionar(ctx, id);
                refreshAll(ctx);
            }
            return;
        }
        super.onReceive(ctx, intent);
    }
}
