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
 *      quando o app sai de primeiro plano E a preferência é a bolha (no modo
 *      "barra" só a notificação com chronometer aparece, e aí `visible` chega
 *      sempre false — por isso a permissão de sobreposição só é exigida
 *      quando visible=true). `queue` é o JSON das etapas
 *      seguintes, para o serviço rolar os descansos sozinho.
 * hide()              -> encerra o serviço e remove a bolha
 *
 * App aberto não mostra notificação própria (pedido do Pedro, 03/10/2026):
 * com a Activity em primeiro plano o `show` só guarda o último pedido; o
 * serviço sobe em handleOnPause (a Activity ainda está visível, então o
 * Android 12+ deixa iniciar o foreground service) e desce em handleOnResume.
 * Enquanto o app está na frente, qualquer notificação do app que chegue
 * (alarme de rotina, lembrete) é retirada da bandeja e repassada ao JS pelo
 * evento "notificacaoNoApp", que vira um banner dentro do app.
 */
@CapacitorPlugin(name = "TimerOverlay")
public class TimerOverlayPlugin extends Plugin {

    /** Último `show` recebido (null depois de `hide`). */
    private Intent ultimoShow = null;
    private boolean naFrente = true;
    private final android.os.Handler vigia = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable varrer = new Runnable() {
        @Override
        public void run() {
            if (!naFrente) return;
            recolherNotificacoes(true);
            vigia.postDelayed(this, 400);
        }
    };

    @Override
    public void load() {
        naFrente = true;
        vigia.post(varrer);
    }

    @Override
    protected void handleOnResume() {
        naFrente = true;
        pararServico();
        recolherNotificacoes(false);
        vigia.removeCallbacks(varrer);
        vigia.post(varrer);
    }

    @Override
    protected void handleOnPause() {
        naFrente = false;
        vigia.removeCallbacks(varrer);
        if (ultimoShow == null) return;
        Intent i = new Intent(ultimoShow);
        // saindo da frente: no modo bolha a janela já pode aparecer
        boolean bolha = "bolha".equals(i.getStringExtra(TimerOverlayService.EXTRA_MODO));
        i.putExtra(TimerOverlayService.EXTRA_VISIBLE, bolha && canDraw());
        iniciarServico(i);
    }

    /** Tira da bandeja as notificações do app (menos a do cronômetro, que só
     * existe fora da frente). `avisar` repassa título/texto ao JS. */
    private void recolherNotificacoes(boolean avisar) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        android.app.NotificationManager nm =
                (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try {
            for (android.service.notification.StatusBarNotification sbn : nm.getActiveNotifications()) {
                if (sbn.getId() == TimerOverlayService.NOTIF_ID) continue;
                if ((sbn.getNotification().flags & android.app.Notification.FLAG_FOREGROUND_SERVICE) != 0) continue;
                nm.cancel(sbn.getTag(), sbn.getId());
                if (!avisar) continue;
                android.os.Bundle ex = sbn.getNotification().extras;
                JSObject r = new JSObject();
                CharSequence t = ex == null ? null : ex.getCharSequence(android.app.Notification.EXTRA_TITLE);
                CharSequence b = ex == null ? null : ex.getCharSequence(android.app.Notification.EXTRA_TEXT);
                r.put("titulo", t == null ? "" : t.toString());
                r.put("texto", b == null ? "" : b.toString());
                notifyListeners("notificacaoNoApp", r);
            }
        } catch (Exception ignored) {}
    }

    private void pararServico() {
        Context ctx = getContext();
        Intent i = new Intent(ctx, TimerOverlayService.class);
        i.setAction(TimerOverlayService.ACTION_HIDE);
        try {
            ctx.startService(i);
        } catch (Exception e) {
            ctx.stopService(new Intent(ctx, TimerOverlayService.class));
        }
    }

    private boolean iniciarServico(Intent i) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
            else ctx.startService(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

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
        boolean visible = Boolean.TRUE.equals(call.getBoolean("visible", false));
        /* Só a bolha desenha por cima de outros apps. Com visible=false o
           serviço sobe apenas para a notificação em primeiro plano com
           chronometer (modo "barra" das configurações), que não precisa de
           permissão de sobreposição — recusar aqui deixaria esse modo mudo
           em quem nunca concedeu a permissão. */
        if (visible && !canDraw()) {
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
        i.putExtra(TimerOverlayService.EXTRA_VISIBLE, visible);
        i.putExtra(TimerOverlayService.EXTRA_QUEUE, call.getString("queue", ""));
        // "barra" | "bolha": no modo bolha a notificação fica discreta (sem
        // cronômetro, sem chip na Now Bar) enquanto a tela estiver ligada
        i.putExtra(TimerOverlayService.EXTRA_MODO, call.getString("modo", "barra"));
        ultimoShow = i;
        // app na frente: nada na bandeja, o serviço sobe em handleOnPause
        if (naFrente) {
            call.resolve();
            return;
        }
        // fora da frente o serviço já está de pé (subiu no handleOnPause);
        // iniciar foreground service em segundo plano é bloqueado no Android 12+
        if (!iniciarServico(i)) {
            call.reject("não foi possível iniciar o cronômetro flutuante");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        show(call);
    }

    /**
     * Diagnóstico do cronômetro (Ajustes, 27/09/2026): o que o sistema deixa
     * o app mostrar. `promovidas` é null abaixo do Android 16 ou quando o
     * método não existe no aparelho (chamado por reflexão, como o extra de
     * promoção no serviço, porque o SDK instalado não expõe a API).
     */
    @PluginMethod
    public void status(PluginCall call) {
        Context ctx = getContext();
        android.app.NotificationManager nm =
                (android.app.NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("notificacoes", nm != null && (Build.VERSION.SDK_INT < 24 || nm.areNotificationsEnabled()));
        r.put("sobreposicao", canDraw());
        Object promovidas = null;
        if (nm != null && Build.VERSION.SDK_INT >= 36) {
            try {
                promovidas = nm.getClass().getMethod("canPostPromotedNotifications").invoke(nm);
            } catch (Exception ignored) {}
        }
        r.put("promovidas", promovidas == null ? JSObject.NULL : promovidas);
        // a notificação do cronômetro ativa agora foi de fato promovida a Live
        // Update (FLAG_PROMOTED_ONGOING)? null = não há cronômetro na barra
        Object promovida = JSObject.NULL;
        if (nm != null && Build.VERSION.SDK_INT >= 36) {
            try {
                for (android.service.notification.StatusBarNotification sbn : nm.getActiveNotifications()) {
                    if (sbn.getId() == 4771) {
                        promovida = (sbn.getNotification().flags & android.app.Notification.FLAG_PROMOTED_ONGOING) != 0;
                    }
                }
            } catch (Exception ignored) {}
        }
        r.put("promovidaAgora", promovida);
        Boolean promovivel = TimerOverlayService.ultimaPromovivel;
        r.put("promovivel", promovivel == null ? JSObject.NULL : promovivel);
        call.resolve(r);
    }

    /** Abre a tela de notificações do app (onde fica "notificações em tempo real"). */
    @PluginMethod
    public void abrirAjustesNotificacao(PluginCall call) {
        Context ctx = getContext();
        Intent i;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.getPackageName()));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { ctx.startActivity(i); } catch (Exception e) { call.reject(e.getMessage()); return; }
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        ultimoShow = null;
        pararServico();
        call.resolve();
    }
}
