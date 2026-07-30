package com.pedro.rotinas;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Widget de tela inicial que inicia uma rotina específica com um toque.
 *
 * Cada instância guarda o id da rotina escolhida na tela de configuração
 * (RoutineWidgetConfigActivity), em SharedPreferences por appWidgetId. O toque
 * abre a MainActivity com o extra britaStartRoutine — o mesmo caminho já usado
 * pelos atalhos do launcher, então o lado JS não precisou de nada novo.
 */
public class RoutineWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "brita_widgets";
    private static final String KEY_PREFIX = "widget_routine_";
    private static final String EXTRA_ID = "britaStartRoutine";

    static void saveRoutineId(Context ctx, int widgetId, String routineId) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_PREFIX + widgetId, routineId).apply();
    }

    static String loadRoutineId(Context ctx, int widgetId) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_PREFIX + widgetId, null);
    }

    private static void deleteRoutineId(Context ctx, int widgetId) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(KEY_PREFIX + widgetId).apply();
    }

    /** Redesenha todos os widgets — chamado quando as rotinas mudam no app. */
    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(ctx, RoutineWidgetProvider.class));
        if (ids == null) return;
        for (int id : ids) render(ctx, mgr, id);
    }

    static void render(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_routine);
        String routineId = loadRoutineId(ctx, widgetId);
        RoutineStore.Routine r = RoutineStore.byId(ctx, routineId);

        if (r == null) {
            v.setTextViewText(R.id.widgetName, "Rotina removida");
            v.setTextViewText(R.id.widgetMeta, "toque para abrir o app");
        } else {
            v.setTextViewText(R.id.widgetName, r.name);
            v.setTextViewText(R.id.widgetMeta, r.meta());
        }

        Intent open = new Intent(ctx, MainActivity.class);
        open.setAction(Intent.ACTION_MAIN);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (r != null) open.putExtra(EXTRA_ID, r.id);
        // data única por widget: sem isso o Android reaproveita o PendingIntent
        // e todos os widgets acabariam iniciando a mesma rotina
        open.setData(android.net.Uri.parse("brita://widget/" + widgetId));

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

    @Override
    public void onDeleted(Context ctx, int[] widgetIds) {
        for (int id : widgetIds) deleteRoutineId(ctx, id);
    }
}
