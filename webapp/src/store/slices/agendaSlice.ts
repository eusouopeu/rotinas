// Slice da agenda do dia — texto do diário por chave, compromissos avulsos,
// pausas de agenda (snoozes) e cartões do kanban do dia. Extraído de
// useAppStore.ts em 11/09/2026 (recomendação 5 de docs/react-migration.md).
// São as coleções que a visão Semana/Dia da aba Rotinas lê.
import type { StateCreator } from "zustand";
import { uid } from "../../lib/uid";
import {
  algumSnoozeAtivo,
  recorrentesAtuais,
  syncCompromissoNotifications,
  syncMetaRecNotifications,
  syncRoutineNotifications,
} from "../shared";

import { save } from "../../lib/storage";
import { sincronizarPontosCartao, descreditarCartao } from "../../lib/scoring";
import {
  K_COMPROMISSOS,
  K_DIAKANBAN,
  K_DIARIO,
  K_GAMIFICACAO,
  K_SNOOZES,
} from "../../lib/constants";
import type {
  DiaKanbanCard,
} from "../../lib/types";
import type { AppState } from "../useAppStore";

export type AgendaSlice = Pick<
  AppState,
  | "setDiarioTexto"
  | "addCompromisso"
  | "toggleCompromisso"
  | "deleteCompromisso"
  | "addSnooze"
  | "resumeAgenda"
  | "addDiaKanbanCard"
  | "upsertDiaKanbanCard"
  | "toggleDiaKanbanCard"
  | "deleteDiaKanbanCard"
>;

export const createAgendaSlice: StateCreator<AppState, [], [], AgendaSlice> = (set, get) => ({
  // Diário (index.html K_DIARIO) — um texto por chave "escopo:período"
  // (diarioChave). Só o texto simples nesta fase.
  setDiarioTexto: (chave, texto) => {
    const diario = { ...get().diario, [chave]: texto };
    save(K_DIARIO, diario);
    set({ diario });
  },

  addCompromisso: (title, date, time) => {
    const t = title.trim();
    if (!t) return;
    const compromissos = [...get().compromissos, { id: uid(), title: t, date, time, notify: "nenhuma" as const, createdAt: Date.now() }];
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
    syncCompromissoNotifications(compromissos, algumSnoozeAtivo(get().snoozes));
  },
  toggleCompromisso: (id) => {
    const compromissos = get().compromissos.map((c) => (c.id === id ? { ...c, feito: !c.feito } : c));
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
    syncCompromissoNotifications(compromissos, algumSnoozeAtivo(get().snoozes));
  },
  deleteCompromisso: (id) => {
    const compromissos = get().compromissos.filter((c) => c.id !== id);
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
    syncCompromissoNotifications(compromissos, algumSnoozeAtivo(get().snoozes));
  },

  addSnooze: (dias) => {
    const from = Date.now();
    const snoozes = [...get().snoozes, { from, to: from + dias * 86400000 }];
    save(K_SNOOZES, snoozes);
    set({ snoozes });
    const snoozed = algumSnoozeAtivo(snoozes);
    syncCompromissoNotifications(get().compromissos, snoozed);
    syncRoutineNotifications(get().routines, snoozed);
    syncMetaRecNotifications(recorrentesAtuais(get().templates), snoozed);
  },
  resumeAgenda: () => {
    const agora = Date.now();
    const snoozes = get().snoozes.filter((s) => !(agora >= s.from && agora <= s.to));
    save(K_SNOOZES, snoozes);
    set({ snoozes });
    syncCompromissoNotifications(get().compromissos, false);
    syncRoutineNotifications(get().routines, false);
    syncMetaRecNotifications(recorrentesAtuais(get().templates), false);
  },

  addDiaKanbanCard: (iso, text, hIni, hFim) => {
    const t = text.trim();
    if (!t) return;
    const per = "dia:" + iso;
    const ord = get().diaKanban.filter((c) => c.per === per).length;
    const diaKanban = [...get().diaKanban, { id: uid(), text: t, col: "todo" as const, per, ord, hIni, hFim }];
    save(K_DIAKANBAN, diaKanban);
    set({ diaKanban });
  },
  upsertDiaKanbanCard: (iso, card) => {
    const per = "dia:" + iso;
    const text = card.text.trim();
    if (!text) return;
    // fim sem início não descreve nada; fim antes do início é engano
    const hIni = card.hIni || "";
    const hFim = hIni && card.hFim && card.hFim > hIni ? card.hFim : "";
    let gam = get().gam;
    let diaKanban;
    if (card.id) {
      const existente = get().diaKanban.find((c) => c.id === card.id);
      let alvo: DiaKanbanCard | null = existente ? { ...existente, text, hIni, hFim, tagValor: card.tagValor, eixo: card.eixo ?? null } : null;
      // cartão já concluído que muda de peso/área precisa estornar antes: o
      // crédito antigo foi calculado com os valores velhos (index.html:5229-5235)
      const mudouPeso = existente && existente.col === "done" && (existente.tagValor !== card.tagValor || (existente.eixo ?? null) !== (card.eixo ?? null));
      if (mudouPeso && existente) {
        const desc = descreditarCartao(gam, existente);
        gam = desc.gam;
        alvo = { ...desc.card, text, hIni, hFim, tagValor: card.tagValor, eixo: card.eixo ?? null };
      }
      if (alvo) {
        const sinc = sincronizarPontosCartao(gam, alvo);
        gam = sinc.gam;
        alvo = sinc.card;
      }
      diaKanban = get().diaKanban.map((c) => (c.id === card.id ? (alvo as DiaKanbanCard) : c));
    } else {
      const ord = get().diaKanban.filter((c) => c.per === per).length;
      diaKanban = [...get().diaKanban, { id: uid(), text, col: "todo" as const, per, ord, hIni, hFim, tagValor: card.tagValor, eixo: card.eixo ?? null }];
    }
    save(K_DIAKANBAN, diaKanban);
    save(K_GAMIFICACAO, gam);
    set({ diaKanban, gam });
  },
  toggleDiaKanbanCard: (id) => {
    const card = get().diaKanban.find((c) => c.id === id);
    if (!card) return;
    const toggled = { ...card, col: card.col === "done" ? ("todo" as const) : ("done" as const) };
    const { gam, card: novoCard } = sincronizarPontosCartao(get().gam, toggled);
    const diaKanban = get().diaKanban.map((c) => (c.id === id ? novoCard : c));
    save(K_DIAKANBAN, diaKanban);
    save(K_GAMIFICACAO, gam);
    set({ diaKanban, gam });
  },
  deleteDiaKanbanCard: (id) => {
    const card = get().diaKanban.find((c) => c.id === id);
    const gam = card ? descreditarCartao(get().gam, card).gam : get().gam;
    const diaKanban = get().diaKanban.filter((c) => c.id !== id);
    save(K_DIAKANBAN, diaKanban);
    save(K_GAMIFICACAO, gam);
    set({ diaKanban, gam });
  },
});
