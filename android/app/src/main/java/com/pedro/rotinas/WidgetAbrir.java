package com.pedro.rotinas;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

/**
 * Toque nos widgets (01/10/2026): abre o app direto na tela do widget. Usa o
 * mesmo extra dos atalhos do launcher (britaStartRoutine, lido pelo
 * ShortcutsPlugin) com ids de ação "acao:..." que o App.tsx entende.
 */
final class WidgetAbrir {
    static final String ROTINAS = "acao:rotinas";
    static final String BOLETIM = "acao:boletim";
    static final String METAS = "acao:metas";

    private WidgetAbrir() {}

    static PendingIntent em(Context ctx, int widgetId, String acao) {
        Intent open = new Intent(ctx, MainActivity.class);
        open.setAction(Intent.ACTION_MAIN);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("britaStartRoutine", acao);
        // data única por widget e ação: sem isso o Android reaproveita o PendingIntent
        open.setData(Uri.parse("brita://widget/" + acao.replace(':', '-') + "/" + widgetId));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, widgetId, open, flags);
    }
}
