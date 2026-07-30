package com.pedro.rotinas;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte JS -> bolha flutuante do cronômetro (TimerOverlayService).
 *
 * hasPermission()     -> {granted}
 * requestPermission() -> abre a tela do sistema e devolve {granted} na volta
 * show({endTs,label,paused,remainingMs,auto,visible,queue}) / update(...)
 *   -> sobe (ou atualiza) o serviço. `visible` decide se a bolha aparece:
 *      o serviço fica de pé durante toda a rotina, mas só mostra a janela
 *      quando o app sai de primeiro plano. `queue` é o JSON das etapas
 *      seguintes, para o serviço rolar os descansos sozinho.
 * hide()              -> encerra o serviço e remove a bolha
 */
@CapacitorPlugin(name = "TimerOverlay")
public class TimerOverlayPlugin extends Plugin {

    private boolean canDraw() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return Settings.canDrawOverlays(getContext());
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", canDraw());
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (canDraw()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
        startActivityForResult(call, i, "overlayPermissionResult");
    }

    @ActivityCallback
    private void overlayPermissionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        r.put("granted", canDraw()); // o resultCode não é confiável nesta tela
        call.resolve(r);
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!canDraw()) {
            call.reject("sem permissão de sobreposição");
            return;
        }
        Context ctx = getContext();
        Intent i = new Intent(ctx, TimerOverlayService.class);
        i.setAction(TimerOverlayService.ACTION_SHOW);
        /* optLong e não call.getLong(): o getLong do PluginCall só devolve o
           valor se ele já veio como Long do parser JSON. `remainingMs` é pequeno
           (cabe em int), então chegava como Integer e virava o default 0 — era o
           bug do cronômetro aparecendo zerado ao pausar. optLong converte. */
        i.putExtra(TimerOverlayService.EXTRA_END_TS, call.getData().optLong("endTs", 0L));
        i.putExtra(TimerOverlayService.EXTRA_LABEL, call.getString("label", ""));
        i.putExtra(TimerOverlayService.EXTRA_PAUSED, Boolean.TRUE.equals(call.getBoolean("paused", false)));
        i.putExtra(TimerOverlayService.EXTRA_REMAINING, call.getData().optLong("remainingMs", 0L));
        i.putExtra(TimerOverlayService.EXTRA_AUTO, Boolean.TRUE.equals(call.getBoolean("auto", false)));
        i.putExtra(TimerOverlayService.EXTRA_VISIBLE, Boolean.TRUE.equals(call.getBoolean("visible", false)));
        i.putExtra(TimerOverlayService.EXTRA_QUEUE, call.getString("queue", ""));
        // iniciar foreground service em segundo plano é bloqueado no Android 12+:
        // se falhar, o serviço já está de pé (subiu junto com a rotina) ou volta
        // na próxima vez que o app estiver na frente
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
            else ctx.startService(i);
        } catch (Exception e) {
            call.reject("não foi possível iniciar o cronômetro flutuante: " + e.getMessage());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        show(call);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, TimerOverlayService.class);
        i.setAction(TimerOverlayService.ACTION_HIDE);
        try {
            ctx.startService(i);
        } catch (Exception e) {
            ctx.stopService(new Intent(ctx, TimerOverlayService.class));
        }
        call.resolve();
    }
}
