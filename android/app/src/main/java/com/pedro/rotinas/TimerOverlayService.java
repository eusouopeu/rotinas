package com.pedro.rotinas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Bolha flutuante com o tempo restante da etapa, visível por cima de outros apps
 * (como o timer nativo da Samsung). Precisa ser foreground service: sem isso o
 * Android encerra o processo assim que o app sai de primeiro plano e a bolha
 * some junto.
 *
 * A janela usa TYPE_APPLICATION_OVERLAY, que exige a permissão
 * "Sobrepor a outros apps" (SYSTEM_ALERT_WINDOW), concedida em tela do sistema.
 *
 * Duas responsabilidades que estão aqui e não no JS, de propósito:
 *
 * - VISIBILIDADE. O serviço sobe junto com a rotina (com o app ainda em
 *   primeiro plano, porque o Android 12+ proíbe iniciar foreground service em
 *   segundo plano) mas só mostra a bolha quando EXTRA_VISIBLE chega true. Dentro
 *   do app a bolha fica oculta — o serviço continua de pé.
 *
 * - AVANÇO DAS ETAPAS. Com o WebView suspenso o JS não roda, então o serviço
 *   recebe em EXTRA_QUEUE a fila do que vem depois e consome sozinho as etapas
 *   marcadas como automáticas (os descansos). É o mesmo critério do
 *   catchUpSteps() do JS. Sem isso a bolha ficava presa na etapa anterior
 *   contando tempo negativo.
 */
public class TimerOverlayService extends Service {

    public static final String ACTION_SHOW = "com.pedro.rotinas.OVERLAY_SHOW";
    public static final String ACTION_HIDE = "com.pedro.rotinas.OVERLAY_HIDE";
    public static final String EXTRA_END_TS = "endTs";        // epoch ms do fim da etapa
    public static final String EXTRA_LABEL = "label";         // nome da etapa
    public static final String EXTRA_PAUSED = "paused";
    public static final String EXTRA_REMAINING = "remainingMs"; // usado quando pausado
    public static final String EXTRA_AUTO = "auto";           // etapa atual avança sozinha
    public static final String EXTRA_VISIBLE = "visible";     // app em segundo plano
    public static final String EXTRA_QUEUE = "queue";         // JSON das etapas seguintes
    public static final String EXTRA_MODO = "modo";           // "barra" | "bolha" (preferencia do usuario)

    private static final String CHANNEL_ID = "brita_overlay";
    private static final int NOTIF_ID = 4771;

    /** Etapa da fila: rótulo, duração e se o app a avançaria sozinha ao zerar. */
    private static final class Etapa {
        final String label;
        final long seconds;
        final boolean auto;
        Etapa(String label, long seconds, boolean auto) {
            this.label = label; this.seconds = seconds; this.auto = auto;
        }
    }

    private WindowManager windowManager;
    private View bubble;
    private TextView clock;
    private TextView caption;
    private WindowManager.LayoutParams params;
    private int lastX = Integer.MIN_VALUE, lastY = Integer.MIN_VALUE;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long endTs = 0;
    private boolean paused = false;
    private long remainingMs = 0;
    private String label = "";
    private boolean auto = false;
    private boolean visible = false;
    private boolean exhausted = false;   // fila acabou: só o app resolve daqui
    private String modo = "barra";       // preferência de Ajustes: "barra" ou "bolha"
    /* startForeground uma única vez por serviço. Repetir a chamada a cada
       show() reposta a notificação inteira — no Android 16 isso faz o chip da
       Now Bar reanimar a cada alt-tab, que era o "aparece múltiplas vezes". */
    private boolean emPrimeiroPlano = false;
    /* Só reposta quando o conteúdo realmente muda (mesma razão acima). */
    private String ultimaAssinatura = null;
    /* Com a tela apagada a bolha não é visível; aí a contagem tem que ir para
       a barra/Now Bar mesmo no modo "bolha" (pedido do Pedro, 22/09/2026). */
    /* "Em uso" = tela acesa E desbloqueada. A tela de bloqueio acesa conta
       como fora de uso: é nela que a Now Bar aparece, então a contagem tem
       que continuar promovida ali (26/09/2026 — antes SCREEN_ON rebaixava a
       notificação mesmo com o aparelho ainda bloqueado). */
    private boolean emUso = true;

    private boolean calcularEmUso() {
        android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
        android.app.KeyguardManager km = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        boolean acesa = pm == null || pm.isInteractive();
        boolean bloqueada = km != null && km.isKeyguardLocked();
        return acesa && !bloqueada;
    }

    private final android.content.BroadcastReceiver telaReceiver = new android.content.BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            emUso = Intent.ACTION_SCREEN_OFF.equals(i.getAction()) ? false : calcularEmUso();
            refreshNotification();
        }
    };
    private final java.util.List<Etapa> queue = new java.util.ArrayList<>();

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            render();
            handler.postDelayed(this, 500);
        }
    };

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_HIDE.equals(intent.getAction())) {
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        endTs = intent.getLongExtra(EXTRA_END_TS, 0);
        paused = intent.getBooleanExtra(EXTRA_PAUSED, false);
        remainingMs = intent.getLongExtra(EXTRA_REMAINING, 0);
        auto = intent.getBooleanExtra(EXTRA_AUTO, false);
        visible = intent.getBooleanExtra(EXTRA_VISIBLE, false);
        String l = intent.getStringExtra(EXTRA_LABEL);
        label = l == null ? "" : l;
        parseQueue(intent.getStringExtra(EXTRA_QUEUE));
        String m = intent.getStringExtra(EXTRA_MODO);
        modo = (m == null || m.isEmpty()) ? "barra" : m;
        exhausted = false;

        startForegroundCompat();
        if (visible) ensureBubble(); else removeBubble();
        render();
        handler.removeCallbacks(tick);
        handler.postDelayed(tick, 500);
        return START_STICKY;
    }

    private void parseQueue(String json) {
        queue.clear();
        if (json == null || json.isEmpty()) return;
        try {
            org.json.JSONArray arr = new org.json.JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                org.json.JSONObject o = arr.getJSONObject(i);
                queue.add(new Etapa(o.optString("label", ""), o.optLong("seconds", 0), o.optBoolean("auto", false)));
            }
        } catch (org.json.JSONException ignored) {
            queue.clear();
        }
    }

    private void startForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Cronômetro em andamento", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Mantém o cronômetro visível sobre outros apps");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        if (emPrimeiroPlano) {
            /* Já somos foreground service: atualizar em vez de repostar. */
            refreshNotification();
            return;
        }
        Notification n = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_ID, n);
        }
        emPrimeiroPlano = true;
        emUso = calcularEmUso();
        ultimaAssinatura = assinaturaNotificacao();
        android.content.IntentFilter f = new android.content.IntentFilter();
        f.addAction(Intent.ACTION_SCREEN_OFF);
        f.addAction(Intent.ACTION_SCREEN_ON);
        f.addAction(Intent.ACTION_USER_PRESENT);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(telaReceiver, f, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(telaReceiver, f);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Notificação persistente do cronômetro. Usa setUsesChronometer +
     * setChronometerCountDown (API 24+, mesmo mínimo do app) para a contagem
     * regressiva aparecer sozinha na barra de notificação/lock screen sem
     * precisarmos atualizar a cada segundo — o mesmo mecanismo do timer
     * nativo do relógio da Samsung. Pausado ou com a fila esgotada, cai para
     * texto estático (chronometer não tem estado "pausado").
     */
    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, piFlags);

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        b.setContentTitle(label.isEmpty() ? "Rotina em andamento" : label)
                .setSmallIcon(android.R.drawable.ic_menu_recent_history)
                .setContentIntent(pi)
                .setOngoing(true)
                // atualizações (troca de etapa, bloquear/desbloquear) nunca
                // voltam a tocar/vibrar/abrir heads-up: só o primeiro post alerta.
                .setOnlyAlertOnce(true);
        /* Android 12+ posta a notificação de foreground service só depois de 10s
           (janela de tolerância para serviços curtos). Era exatamente o "só
           aparece depois de 10 segundos" — IMMEDIATE desliga essa espera. */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }

        /* A notificação de foreground service é obrigatória (sem ela o Android
           mata o serviço e a bolha some), mas no modo "bolha" ela não deve
           competir com a bolha: fica muda, sem cronômetro, fora da tela de
           bloqueio e sem chip na Now Bar. A exceção é a tela apagada — aí a
           bolha não é visível e a contagem precisa ir para a Now Bar. */
        boolean naBarra = "barra".equals(modo) || !emUso;

        if (exhausted) {
            b.setContentText("Toque para continuar");
        } else if (paused) {
            b.setContentText("Pausado");
        } else if (naBarra) {
            b.setContentText("Em andamento")
                    .setUsesChronometer(true)
                    .setChronometerCountDown(true)
                    .setShowWhen(true)
                    .setWhen(endTs);
        } else {
            b.setContentText("Cronômetro na bolha flutuante").setShowWhen(false);
        }
        // fora da barra: some da tela de bloqueio (o canal já é IMPORTANCE_LOW,
        // então não há som nem heads-up em nenhum dos dois modos)
        if (!naBarra) b.setVisibility(Notification.VISIBILITY_SECRET);
        // Android 16+: pede promoção a "Live Update" — o sistema mostra um chip
        // com o cronômetro na barra de status/Now Bar, logo depois da hora. Sem
        // isso a contagem só aparecia puxando a gaveta de notificações.
        if (Build.VERSION.SDK_INT >= 36 && naBarra) {
            b.setCategory(Notification.CATEGORY_STOPWATCH);
            // = setRequestPromotedOngoing(true) (EXTRA_REQUEST_PROMOTED_ONGOING);
            // via extra porque o SDK 36 instalado não expõe o setter.
            android.os.Bundle promo = new android.os.Bundle();
            promo.putBoolean("android.requestPromotedOngoing", true);
            b.addExtras(promo);
            if (paused) b.setShortCriticalText("Pausado");
        }
        return b.build();
    }

    /** Identidade do que a notificação mostra — só o que muda o conteúdo dela,
     *  nunca o tempo corrente (o chronometer conta sozinho). Sem isso cada
     *  alt-tab repostava a mesma notificação e o chip da Now Bar reanimava. */
    private String assinaturaNotificacao() {
        boolean naBarra = "barra".equals(modo) || !emUso;
        // endTs em segundos: o JS recalcula o fim a cada troca de plano e um
        // milissegundo de diferença repostava a notificação a cada bloqueio.
        return label + "|" + (endTs / 1000) + "|" + paused + "|" + exhausted + "|" + naBarra;
    }

    private void refreshNotification() {
        String assinatura = assinaturaNotificacao();
        if (assinatura.equals(ultimaAssinatura)) return;
        ultimaAssinatura = assinatura;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        try { nm.notify(NOTIF_ID, buildNotification()); } catch (Exception ignored) {}
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private void ensureBubble() {
        if (bubble != null) return;
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(14), dp(9), dp(14), dp(9));

        // Bolha fica sempre escura, mesmo com o app no tema claro (padrão desde
        // 2026-08-26): ela flutua sobre QUALQUER app, não só o rotinas, e um
        // fundo translúcido escuro com texto claro é o que segue legível sobre
        // conteúdo arbitrário — a mesma razão pela qual overlays desse tipo
        // (chat heads, PIP) tendem a não seguir o tema do app anfitrião. As
        // cores vêm do --card/--line/--ink/--sub/--erro do tema ESCURO
        // (app.css, body.dark), não do claro que é o padrão do app agora.
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#F21D2226"));   // var(--card), escuro, quase opaco
        bg.setCornerRadius(dp(18));
        bg.setStroke(dp(1), Color.parseColor("#33383D")); // var(--line), escuro
        box.setBackground(bg);
        box.setElevation(dp(8));

        clock = new TextView(this);
        clock.setTextColor(Color.parseColor("#E9EAE5"));  // var(--ink), escuro
        clock.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        clock.setTypeface(android.graphics.Typeface.MONOSPACE);
        clock.setGravity(Gravity.CENTER);
        box.addView(clock);

        caption = new TextView(this);
        caption.setTextColor(Color.parseColor("#98A0A6"));  // var(--sub), escuro
        caption.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        caption.setGravity(Gravity.CENTER);
        caption.setMaxWidth(dp(150));
        caption.setSingleLine(true);
        caption.setEllipsize(android.text.TextUtils.TruncateAt.END);
        box.addView(caption);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                // sem FLAG_LAYOUT_NO_LIMITS: com ele a bolha podia ficar metade
                // fora da tela à direita (a largura real passa dos 96dp de recuo)
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        // Ponto de partida: borda direita, meio da tela verticalmente — a posição
        // "chat head" clássica. Evita a faixa de cima (barra de status, título/
        // deck do Anki, título de vídeo) e a faixa de baixo (botões de resposta
        // do Anki, controles do YouTube), que é onde ficava no canto superior e
        // incomodava. Gravity continua TOP|START (mesma referência usada pelo
        // arraste em ACTION_MOVE); a posição da borda direita/meio é obtida a
        // partir das métricas reais da tela, não por gravity, porque o arraste
        // assume x crescendo para a direita e y para baixo a partir do topo.
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = lastX == Integer.MIN_VALUE ? dm.widthPixels - dp(96) : lastX;
        params.y = lastY == Integer.MIN_VALUE ? (dm.heightPixels / 2) - dp(36) : lastY;

        box.setOnTouchListener(new View.OnTouchListener() {
            private int startX, startY;
            private float touchX, touchY;
            private boolean dragged;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        startX = params.x; startY = params.y;
                        touchX = e.getRawX(); touchY = e.getRawY();
                        dragged = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (e.getRawX() - touchX);
                        int dy = (int) (e.getRawY() - touchY);
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) dragged = true;
                        params.x = startX + dx;
                        params.y = startY + dy;
                        clampBubble();
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!dragged) {
                            Intent open = new Intent(TimerOverlayService.this, MainActivity.class);
                            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            startActivity(open);
                        }
                        return true;
                }
                return false;
            }
        });

        // Mantém a bolha inteira dentro da tela sempre que o tamanho muda
        // (texto do rótulo/relógio cresce) — clampa x/y pela largura real.
        box.addOnLayoutChangeListener((v, l, t, r, bt, ol, ot, or, ob) -> clampBubble());

        bubble = box;
        try {
            windowManager.addView(bubble, params);
        } catch (Exception e) {
            bubble = null; // permissão revogada no meio do caminho
        }
    }

    /**
     * Consome as etapas automáticas que já venceram, para a bolha nunca ficar
     * mostrando a etapa anterior. Espelha catchUpSteps() do JS: só descansos
     * avançam sozinhos; etapa comum estoura o tempo e espera o toque.
     */
    private void rollForward() {
        if (paused) return;
        boolean advanced = false;
        int guard = 0;
        while (auto && !exhausted && System.currentTimeMillis() >= endTs && guard++ < 100) {
            if (queue.isEmpty()) { exhausted = true; advanced = true; break; }
            Etapa e = queue.remove(0);
            if (e.seconds <= 0) { auto = false; break; } // sem duração: quem resolve é o app
            endTs += e.seconds * 1000L;
            label = e.label;
            auto = e.auto;
            advanced = true;
        }
        if (advanced) refreshNotification();
    }

    private void render() {
        rollForward();
        if (clock == null) return;
        if (exhausted) {
            clock.setText("00:00");
            clock.setTextColor(Color.parseColor("#E9EAE5"));
            caption.setText("toque para continuar");
            return;
        }
        long remaining = paused ? remainingMs : (endTs - System.currentTimeMillis());
        boolean over = remaining < 0;
        long totalSec = Math.abs(remaining) / 1000;
        long mm = totalSec / 60, ss = totalSec % 60;
        clock.setText((over ? "+" : "") + String.format("%02d:%02d", mm, ss));
        clock.setTextColor(over ? Color.parseColor("#E2776A") : Color.parseColor("#E9EAE5"));
        caption.setText(paused ? "pausado" : label);
    }

    private void clampBubble() {
        if (bubble == null || params == null || windowManager == null) return;
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        params.x = Math.max(0, Math.min(params.x, dm.widthPixels - bubble.getWidth()));
        params.y = Math.max(0, Math.min(params.y, dm.heightPixels - bubble.getHeight()));
        try { windowManager.updateViewLayout(bubble, params); } catch (Exception ignored) {}
    }

    /** Remove só a view: o serviço continua de pé para poder reaparecer depois. */
    private void removeBubble() {
        if (bubble == null || windowManager == null) return;
        if (params != null) { lastX = params.x; lastY = params.y; } // devolve a bolha onde o usuário deixou
        try { windowManager.removeView(bubble); } catch (Exception ignored) {}
        bubble = null;
        clock = null;
        caption = null;
    }

    private void stopSelfSafely() {
        handler.removeCallbacks(tick);
        if (emPrimeiroPlano) {
            try { unregisterReceiver(telaReceiver); } catch (Exception ignored) {}
            emPrimeiroPlano = false;
        }
        ultimaAssinatura = null;
        removeBubble();
        try { stopForeground(true); } catch (Exception ignored) {}
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopSelfSafely();
        super.onDestroy();
    }
}
