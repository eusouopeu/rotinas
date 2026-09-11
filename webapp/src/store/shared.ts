// Helpers compartilhados pelos slices da store — extraídos de useAppStore.ts
// (recomendação 5 de docs/react-migration.md, 11/09/2026). Eram o que travava
// a divisão dos domínios mais acoplados: player, metas e backup chamavam as
// mesmas funções de notificação/auto-backup declaradas no meio do arquivo da
// store. Módulo neutro: não importa nenhum slice, só `lib/` e o TIPO AppState
// (import type, sem ciclo em runtime).
import { localKey } from "../lib/gamificacao";
import { autoBackupsParaApagar, nomeAutoBackup } from "../lib/autoBackup";
import {
  planoNotificacaoCompromissos,
  planoNotificacaoMetaRec,
  planoNotificacaoRotinas,
} from "../lib/notifications";
import { novoDraftSchedule } from "../lib/schedule";
import { isNative, load, save } from "../lib/storage";
import { uid } from "../lib/uid";
import { K_AUTOBAK, K_DATAFOLDER } from "../lib/constants";
import type { AnyTemplateDoc, Compromisso, CountdownDoc, MetaRecorrente, Routine, Snooze } from "../lib/types";
import type { AppState } from "./useAppStore";

/** Alguma pausa de agenda (K_SNOOZES) cobre o instante `agora`? Porta de
 * agendaSnoozed (index.html:5259-5265). */
export function algumSnoozeAtivo(snoozes: Snooze[], agora = Date.now()): boolean {
  return snoozes.some((s) => agora >= s.from && agora <= s.to);
}

export function isCountdownDoc(d: AnyTemplateDoc): d is CountdownDoc {
  return d.type === "countdown";
}

/** Lê `recorrentes` do doc de metas mais recente sem criar um doc vazio
 * (diferente de `metaDoc()`, que cria) — usado só para (re)sincronizar
 * notificação, onde nada precisa existir se o usuário não tem metas. */
export function recorrentesAtuais(templates: AnyTemplateDoc[]): MetaRecorrente[] {
  const doc = templates.filter(isCountdownDoc).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  return doc?.recorrentes || [];
}

export function criarMetaDoc(): CountdownDoc {
  return {
    id: uid(),
    type: "countdown",
    title: "Metas",
    targets: [],
    recorrentes: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
}


/** Pede POST_NOTIFICATIONS pelo plugin LocalNotifications (mesma ponte já usada
 * pelas notificações agendadas). Fora do Android, ou sem o plugin de pé, deixa
 * passar: quem decide se algo aparece é o próprio sistema. */
export async function pedirPermissaoNotificacao(): Promise<boolean> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return true;
  try {
    const atual = await LN.checkPermissions();
    if (atual.display === "granted") return true;
    const r = await LN.requestPermissions?.();
    return !r || r.display === "granted";
  } catch {
    return true;
  }
}


export function novoDraft(): Routine {
  return {
    id: uid(),
    name: "",
    sound: "mudo",
    steps: [{ id: uid(), name: "", seconds: 60, type: "timer" }],
    schedule: novoDraftSchedule(),
    restSeconds: 0,
    tagValor: "medio",
    createdAt: Date.now(),
  };
}

/** Porta de autoBackupNative (index.html:10785-10800) — sem-op fora do
 * Android/Capacitor (mesmo status de SyncCard/McpCard: fiel ao legado, mas
 * inerte até o build React ser o que roda lá). A cada 3 dias grava um JSON
 * em Documentos/<pasta>/Backups e mantém só os 5 mais recentes. */
export async function autoBackupNative(state: AppState): Promise<void> {
  if (!isNative || !window.Capacitor) return;
  if (state.routines.length + state.notes.length + state.templates.length === 0) return;
  if (Date.now() - load(K_AUTOBAK, 0) < 3 * 86400000) return;
  const FS = window.Capacitor.Plugins.Filesystem;
  const pasta = load(K_DATAFOLDER, "Rotinas") + "/Backups";
  try {
    const filename = nomeAutoBackup(localKey(new Date()));
    await FS.writeFile({
      path: pasta + "/" + filename,
      directory: "DOCUMENTS",
      encoding: "utf8",
      data: JSON.stringify(state.backupSnapshot(), null, 2),
      recursive: true,
    });
    save(K_AUTOBAK, Date.now());
    const r = await FS.readdir({ path: pasta, directory: "DOCUMENTS" });
    const nomes = (r.files || []).map((f) => (typeof f === "string" ? f : f.name));
    for (const old of autoBackupsParaApagar(nomes)) {
      try {
        await FS.deleteFile({ path: pasta + "/" + old, directory: "DOCUMENTS" });
      } catch {
        /* ok deixar órfão */
      }
    }
  } catch (e) {
    console.error("Auto-backup falhou:", e);
  }
}

/** Porta de syncNativeSchedules para compromissos avulsos (index.html:2779-
 * 2865, ver lib/notifications.ts). Mesmo status de autoBackupNative: fiel ao
 * legado, inerte fora do Android/Capacitor. Reagenda do zero a cada
 * chamada — cancela as próprias notificações antigas (tag "sched-cp") antes
 * de recriar. */
export async function syncCompromissoNotifications(compromissos: Compromisso[], snoozed: boolean): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === "sched-cp");
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (snoozed) return; // agenda pausada: nada é reagendado até o próximo uso do app
    const plano = planoNotificacaoCompromissos(compromissos, Date.now());
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        extra: { brita: "sched-cp" },
        schedule: { at: new Date(p.when), allowWhileIdle: true },
      })),
    });
  } catch (e) {
    console.error("Sincronização de notificação de compromisso falhou:", e);
  }
}

/** Porta de syncNativeSchedules para rotinas agendadas (index.html:2779-
 * 2828, ver lib/notifications.ts) — mesmo padrão de syncCompromissoNotifications,
 * tag própria ("sched-rt") pra cancelar/recriar sem mexer nas notificações
 * de compromisso. */
export async function syncRoutineNotifications(routines: Routine[], snoozed: boolean): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === "sched-rt");
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (snoozed) return;
    const plano = planoNotificacaoRotinas(routines, Date.now());
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        extra: { brita: "sched-rt" },
        schedule: p.at != null ? { at: new Date(p.at), allowWhileIdle: true } : { on: { weekday: p.weekday, hour: p.hour!, minute: p.minute! } },
      })),
    });
  } catch (e) {
    console.error("Sincronização de notificação de rotina falhou:", e);
  }
}

/** Porta do trecho de metas recorrentes de syncNativeSchedules
 * (index.html:2866-2883, ver lib/notifications.ts) — mesmo padrão das duas
 * funções acima, tag própria ("sched-mr"). Cada alarme usa `schedule.on`
 * só com hour/minute (sem weekday), repetindo todo dia. */
export async function syncMetaRecNotifications(recorrentes: MetaRecorrente[], snoozed: boolean): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === "sched-mr");
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (snoozed) return;
    const plano = planoNotificacaoMetaRec(recorrentes);
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        extra: { brita: "sched-mr" },
        schedule: { on: { hour: p.hour, minute: p.minute } },
      })),
    });
  } catch (e) {
    console.error("Sincronização de notificação de meta recorrente falhou:", e);
  }
}

