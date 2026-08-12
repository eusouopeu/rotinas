package com.pedro.rotinas;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Redesenha os widgets de tela inicial sob demanda. O JS chama refresh() ao
 * ir para segundo plano (mesmo gancho de marcarSegundoPlano/appStateChange
 * que já existe para a bolha do cronômetro) — é o momento em que o usuário
 * está prestes a ver a tela inicial de verdade. Os widgets também se
 * atualizam sozinhos a cada 30min (updatePeriodMillis), então isto é só o
 * empurrão pra não esperar até meia hora depois de uma conclusão.
 */
@CapacitorPlugin(name = "Widgets")
public class WidgetsPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        Context ctx = getContext();
        RoutineWidgetProvider.refreshAll(ctx);
        StreakWidgetProvider.refreshAll(ctx);
        DailyGoalWidgetProvider.refreshAll(ctx);
        call.resolve();
    }
}
