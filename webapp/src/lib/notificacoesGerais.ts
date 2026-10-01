// Chave geral das notificações do app (01/10/2026, pedido do Pedro): desligada,
// nenhuma notificação do sistema sai do app — nem o aviso que desce na tela e
// some (heads-up), nem o que fica na gaveta. Em vez de espalhar um `if` em cada
// lugar que agenda (rotinas, compromissos, metas, avisos, lembrete de gastos,
// fim de etapa em segundo plano, resumo da semana), o `schedule` do plugin
// LocalNotifications é embrulhado uma vez no boot e passa a descartar os
// pedidos enquanto a chave estiver desligada. Preferência do aparelho: fica
// fora do backup e do sync. O cronômetro na barra/bolha tem ajuste próprio
// ("Fora do app") e não passa por aqui.
import { K_NOTIFSDESLIGADAS } from "./constants";
import { isNative, load, save } from "./storage";

export function notificacoesDesligadas(): boolean {
  return load<boolean>(K_NOTIFSDESLIGADAS, false);
}

let instalada = false;

/** Embrulha `LocalNotifications.schedule` (idempotente). */
export function instalarChaveNotificacoes(): void {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN || instalada) return;
  instalada = true;
  const original = LN.schedule.bind(LN);
  LN.schedule = ((args: Parameters<typeof original>[0]) =>
    notificacoesDesligadas() ? Promise.resolve() : original(args)) as typeof LN.schedule;
}

/** Liga/desliga. Desligar cancela tudo o que já estava agendado; religar
 *  chama `reagendar` para a store refazer as agendas. */
export async function definirNotificacoes(ligadas: boolean, reagendar: () => void): Promise<void> {
  save(K_NOTIFSDESLIGADAS, !ligadas);
  if (ligadas) {
    reagendar();
    return;
  }
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const { notifications } = await LN.getPending();
    if (notifications.length) await LN.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
  } catch {
    /* plugin indisponível: a chave já impede os próximos agendamentos */
  }
}
