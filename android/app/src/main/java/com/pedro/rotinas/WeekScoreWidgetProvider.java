package com.pedro.rotinas;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Widget sem configuração: mostra a nota do boletim da semana (mesmo número do
 * card "Boletim da semana" na home) e se está adiantado/no ritmo/atrasado.
 * Um toque abre o app.
 */
public class WeekScoreWidgetProvider extends AppWidgetProvider {

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, WeekScoreWidgetProvider.class));
        if (ids == null) return;
        for (int id : ids) render(ctx, mgr, id);
    }

    static void render(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_week_score);
        WeekScoreStore.Resultado r = WeekScoreStore.compute(ctx);

        v.setViewVisibility(R.id.weekScoreEmpty, r.temSemana ? android.view.View.GONE : android.view.View.VISIBLE);
        v.setViewVisibility(R.id.weekScoreNumero, r.temSemana ? android.view.View.VISIBLE : android.view.View.GONE);
        v.setViewVisibility(R.id.weekScoreLabel, r.temSemana ? android.view.View.VISIBLE : android.view.View.GONE);
        if (r.temSemana) {
            v.setTextViewText(R.id.weekScoreNumero, String.valueOf(Math.round(r.nota)));
            v.setTextColor(R.id.weekScoreLabel, r.corLabel);
            String diasTxt = r.diasRestantes == 1 ? "1 dia restante" : (r.diasRestantes + " dias restantes");
            v.setTextViewText(R.id.weekScoreLabel, r.label + " · " + diasTxt);
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
