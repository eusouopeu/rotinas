// Porta de checarNudgeRitmo/checarNudgeMetas/checarNudgeStreak e da entrega
// compartilhada dispararNudge (index.html:13579-13665). Até 11/09/2026 as
// chaves K_NUDGE*/o switch "Aviso de ritmo" em Ajustes existiam no React sem
// nenhum consumidor — ligar o interruptor não fazia nada.
//
// Diferença deliberada em relação ao legado: lá os três avisos compartilham o
// único interruptor K_NUDGE; aqui cada um tem o seu (K_NUDGE = ritmo,
// K_NUDGEMETAS, K_NUDGESTREAK), porque a UI de Ajustes passou a expor os três
// separadamente. Chaves novas nascem `true`, então quem já usava o legado
// mantém o comportamento de antes.
//
// O motor NÃO é reativo: é chamado no boot e nas voltas do app ao primeiro
// plano, exatamente como o legado (index.html:3767 e o listener de
// appStateChange). Cada aviso tem sua própria marca de "já avisei" no
// storage, então chamar em excesso é barato e idempotente.
import {
  K_NUDGE,
  K_NUDGEDAYS,
  K_NUDGEDONE,
  K_NUDGEMETAS,
  K_NUDGEMETASDONE,
  K_NUDGESTREAK,
  K_NUDGESTREAKDONE,
} from "./constants";
import { ritmoInfo } from "./boletim";
import { localKey } from "./gamificacao";
import { daysUntil, metaConcluida } from "./metas";
import { notifIdFor } from "./notifications";
import { rotinaAgendadaEm } from "./schedule";
import { computeStreakFor } from "./stats";
import { isDesktop, isNative, load, save } from "./storage";
import type { HistoryEntry } from "./history";
import type { GamificacaoState, MetaTarget, Routine } from "./types";

/** Porta de nudgeDias (index.html:13580-13583) — sexta por padrão. */
export function nudgeDias(): number[] {
  const v = load<number[] | null>(K_NUDGEDAYS, null);
  return Array.isArray(v) && v.length ? v : [5];
}

/** Entrega compartilhada pelos três avisos (index.html:13588-13596): nativo
 * agenda notificação local imediata; desktop/navegador usam a Notification
 * API (service worker quando houver); sem permissão, degrada para o banner
 * in-app, que a store injeta em `onBanner`. */
export function dispararNudge(title: string, body: string, tag: string, onBanner: (texto: string) => void): void {
  if (isNative) {
    try {
      window.Capacitor?.Plugins.LocalNotifications?.schedule({
        notifications: [{ id: notifIdFor(tag, 0), title, body, extra: { brita: "nudge" } }],
      }).catch(() => {});
    } catch {
      /* plugin ausente — silencioso, como o legado */
    }
    return;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    onBanner(body);
    return;
  }
  if (isDesktop) {
    try {
      new Notification(title, { body });
    } catch {
      onBanner(body);
    }
    return;
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, { body, tag }).catch(() => {
        try {
          new Notification(title, { body });
        } catch {
          onBanner(body);
        }
      });
    });
  } else {
    try {
      new Notification(title, { body });
    } catch {
      onBanner(body);
    }
  }
}

export interface NudgeCtx {
  routines: Routine[];
  history: HistoryEntry[];
  gam: GamificacaoState;
  metas: MetaTarget[];
  weekStart: number;
  onBanner: (texto: string) => void;
  agora?: Date;
}

/** Porta de checarNudgeRitmo (index.html:13598-13614) — nos dias escolhidos,
 * a partir das 9h, no máximo uma vez por dia, e só quando o saldo da semana
 * está abaixo de -5 (no ritmo ou adiantado não incomoda). */
export function checarNudgeRitmo(ctx: NudgeCtx): boolean {
  if (!load<boolean>(K_NUDGE, true)) return false;
  const hoje = ctx.agora || new Date();
  if (!nudgeDias().includes(hoje.getDay()) || hoje.getHours() < 9) return false;
  const sem = ctx.gam.semanaAtual;
  if (!sem) return false; // semana ainda não aberta (boot antes de avancarGamificacao)
  const marca = sem.inicioISO + ":" + hoje.getDay();
  if (load<string>(K_NUDGEDONE, "") === marca) return false;
  if (sem.dispensada) return false;
  if (!sem.totalBrutoAgendado) return false;
  const r = ritmoInfo(sem, ctx.gam.config, hoje, ctx.weekStart);
  if (r.saldo >= -5) return false;
  save(K_NUDGEDONE, marca);
  const title = r.diasRestantes > 1 ? "⏱ Faltam " + r.diasRestantes + " dias na semana" : "⏱ Último dia da semana";
  const body = "Nota " + r.nota.toFixed(0) + "/100 · " + r.porDia60.toFixed(1) + " pontos/dia para aprovar";
  dispararNudge(title, body, "nudge-ritmo", ctx.onBanner);
  return true;
}

/** Porta de checarNudgeMetas (index.html:13620-13638) — no máximo 1x por dia
 * quando alguma meta com prazo está a 0-2 dias do vencimento e ainda não foi
 * concluída. */
export function checarNudgeMetas(ctx: NudgeCtx): boolean {
  if (!load<boolean>(K_NUDGEMETAS, true)) return false;
  const hojeKey = localKey(ctx.agora);
  if (load<string>(K_NUDGEMETASDONE, "") === hojeKey) return false;
  const proximas = ctx.metas
    .filter((t) => !metaConcluida(t) && daysUntil(t.date) >= 0 && daysUntil(t.date) <= 2)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  if (!proximas.length) return false;
  save(K_NUDGEMETASDONE, hojeKey);
  const perto = proximas[0];
  const d = daysUntil(perto.date);
  const title = d === 0 ? "🎯 Meta vence hoje" : "🎯 Meta perto do prazo";
  const quando = d === 0 ? "hoje" : "em " + d + " dia" + (d > 1 ? "s" : "");
  const body =
    proximas.length > 1
      ? perto.title + " vence " + quando + " e mais " + (proximas.length - 1) + " meta(s) perto do prazo"
      : perto.title + " vence " + quando;
  dispararNudge(title, body, "nudge-metas", ctx.onBanner);
  return true;
}

/** Porta de checarNudgeStreak (index.html:13644-13665) — a partir das 18h, no
 * máximo 1x por dia, quando uma rotina de hoje ainda não foi feita e sua
 * sequência já está perto do limiar de hábito consolidado. */
export function checarNudgeStreak(ctx: NudgeCtx): boolean {
  if (!load<boolean>(K_NUDGESTREAK, true)) return false;
  const hoje = ctx.agora || new Date();
  if (hoje.getHours() < 18) return false;
  const hojeKey = localKey(hoje);
  if (load<string>(K_NUDGESTREAKDONE, "") === hojeKey) return false;
  const min = ctx.gam.config.habito.streakMin || 21;
  const limiar = Math.max(3, min - 3);
  const streakDe = (id: string) => computeStreakFor(id, ctx.routines, ctx.history);
  const emRisco = ctx.routines.filter((r) => {
    if (!rotinaAgendadaEm(r, hoje)) return false;
    if (ctx.history.some((h) => h.routineId === r.id && h.date === hojeKey)) return false;
    return streakDe(r.id) >= limiar;
  });
  if (!emRisco.length) return false;
  save(K_NUDGESTREAKDONE, hojeKey);
  const r0 = [...emRisco].sort((a, b) => streakDe(b.id) - streakDe(a.id))[0];
  const s0 = streakDe(r0.id);
  const body =
    emRisco.length > 1
      ? r0.name + " está em " + s0 + " dia(s) seguidos e mais " + (emRisco.length - 1) + " rotina(s) ainda não feita(s) hoje"
      : r0.name + " está em " + s0 + " dia(s) seguidos — não quebre hoje";
  dispararNudge("🔥 Sequência em risco", body, "nudge-streak", ctx.onBanner);
  return true;
}

/** Ponto único chamado pela store (boot e volta ao primeiro plano). */
export function checarNudges(ctx: NudgeCtx): void {
  checarNudgeRitmo(ctx);
  checarNudgeMetas(ctx);
  checarNudgeStreak(ctx);
}
