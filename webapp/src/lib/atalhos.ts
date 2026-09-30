// Atalhos do launcher Android (segurar o ícone do app) — porta de
// syncAppShortcuts (index.html:2898-2918), recomendação 3 de 27/09/2026. O
// plugin nativo `Shortcuts` (ShortcutsPlugin.java) publica até 4 atalhos e
// devolve o id tocado; o React não o chamava desde o corte. Além de "iniciar
// rotina" (o legado publicava só as 4 primeiras rotinas), dois atalhos de ação
// usam ids com o prefixo `acao:` — o nativo repassa o id como está.
import { isNative } from "./storage";
import type { Routine } from "./types";

export interface ShortcutsPlugin {
  set(opts: { shortcuts: Array<{ id: string; label: string }> }): Promise<void> | void;
  getLaunch(): Promise<{ routineId?: string }>;
  addListener(evento: "shortcut", cb: (d: { routineId?: string }) => void): unknown;
}

export const ATALHO_NOTA = "acao:nota";
export const ATALHO_DESPESA = "acao:despesa";

function plugin(): ShortcutsPlugin | null {
  return isNative ? window.Capacitor?.Plugins.Shortcuts || null : null;
}

/** Lista publicada: as duas ações fixas + as duas primeiras rotinas. */
export function listaAtalhos(routines: Routine[]): Array<{ id: string; label: string }> {
  return [
    { id: ATALHO_NOTA, label: "Nova nota" },
    { id: ATALHO_DESPESA, label: "Nova despesa" },
    ...routines.filter((r) => !r.arquivada).slice(0, 2).map((r) => ({ id: r.id, label: ((r.icon ? r.icon + " " : "") + r.name).slice(0, 25) })),
  ];
}

let ultimo = "";

/** Republica quando a lista muda (nome/ícone/ordem das rotinas). O set() nativo
 * também redesenha os widgets de rotina. */
export function publicarAtalhos(routines: Routine[]): void {
  const p = plugin();
  if (!p) return;
  const lista = listaAtalhos(routines);
  const chave = JSON.stringify(lista);
  if (chave === ultimo) return;
  ultimo = chave;
  try {
    const r = p.set({ shortcuts: lista }) as Promise<void> | undefined;
    r?.catch?.((e: unknown) => console.error("atalhos:", e));
  } catch (e) {
    console.error("atalhos:", e);
  }
}

/** Assina o toque num atalho (app aberto) e consome o que abriu o app. */
export function ouvirAtalhos(onAtalho: (id: string) => void): void {
  const p = plugin();
  if (!p) return;
  try {
    p.addListener("shortcut", (d) => d?.routineId && onAtalho(d.routineId));
    p.getLaunch()
      .then((d) => d?.routineId && onAtalho(d.routineId))
      .catch(() => {});
  } catch (e) {
    console.error("atalhos:", e);
  }
}
