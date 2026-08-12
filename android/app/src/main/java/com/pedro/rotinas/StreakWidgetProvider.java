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
 * Widget sem configuração: mostra a sequência de dias seguidos com rotina
 * concluída (mesmo número que aparece no chip da home). Um toque abre o app.
 */
public class StreakWidgetProvider extends AppWidgetProvider {

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, StreakWidgetProvider.class));
        if (ids == null) return;
        for (int id : ids) render(ctx, mgr, id);
    }

    static void render(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_streak);
        int streak = StreakStore.compute(ctx);
        v.setTextViewText(R.id.streakNumber, String.valueOf(streak));
        v.setTextViewText(R.id.streakLabel, streak == 1 ? "dia seguido" : "dias seguidos");

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
