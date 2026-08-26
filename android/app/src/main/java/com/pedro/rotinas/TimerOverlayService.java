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
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Cronômetro em andamento", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Mantém o cronômetro visível sobre outros apps");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, piFlags);

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        Notification n = b
                .setContentTitle("Rotina em andamento")
                .setContentText(label.isEmpty() ? "Cronômetro ativo" : label)
                .setSmallIcon(android.R.drawable.ic_menu_recent_history)
                .setContentIntent(pi)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_ID, n);
        }
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
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = lastX == Integer.MIN_VALUE ? dp(16) : lastX;
        params.y = lastY == Integer.MIN_VALUE ? dp(120) : lastY;

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
                        try { windowManager.updateViewLayout(bubble, params); } catch (Exception ignored) {}
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
        int guard = 0;
        while (auto && !exhausted && System.currentTimeMillis() >= endTs && guard++ < 100) {
            if (queue.isEmpty()) { exhausted = true; return; }
            Etapa e = queue.remove(0);
            if (e.seconds <= 0) { auto = false; return; } // sem duração: quem resolve é o app
            endTs += e.seconds * 1000L;
            label = e.label;
            auto = e.auto;
        }
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
