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
 * espaço de um widget 4x2 já cabe folgado. Um toque abre o app.
 */
public class DailyGoalWidgetProvider extends AppWidgetProvider {

    private static final int MAX_ROWS = 4;
    private static final int[] ROW_WRAP_IDS = { R.id.goalRow1, R.id.goalRow2, R.id.goalRow3, R.id.goalRow4 };
    private static final int[] ROW_TITLE_IDS = { R.id.goalTitle1, R.id.goalTitle2, R.id.goalTitle3, R.id.goalTitle4 };
    private static final int[] ROW_PROG_IDS = { R.id.goalProg1, R.id.goalProg2, R.id.goalProg3, R.id.goalProg4 };

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
                v.setTextColor(ROW_PROG_IDS[i], g.completa() ? 0xFF6B8F71 : 0xFF8A8478);
            } else {
                v.setViewVisibility(ROW_WRAP_IDS[i], android.view.View.GONE);
            }
        }

        Intent open = new Intent(ctx, MainActivity.class);
        open.setAction(Intent.ACTION_MAIN);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(ctx, widgetId, open, flags);
        v.setOnClickPendingIntent(R.id.widgetRoot, pi);

        mgr.updateAppWidget(widgetId, v);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] widgetIds) {
        for (int id : widgetIds) render(ctx, mgr, id);
    }
}
