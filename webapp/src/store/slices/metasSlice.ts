// Slice de metas — com prazo (`targets`) e recorrentes (`recorrentes`), ambas
// dentro do mesmo CountdownDoc. Extraído de useAppStore.ts em 11/09/2026
// (recomendação 5 de docs/react-migration.md). Acopla com pontuação
// (sincronizarPontosMeta/MetaRec) e com o agendamento de notificação
// (syncMetaRecNotifications, hoje em store/shared.ts).
import type { StateCreator } from "zustand";
import { uid } from "../../lib/uid";
import {
  algumSnoozeAtivo,
  criarMetaDoc,
  isCountdownDoc,
  syncMetaRecNotifications,
} from "../shared";

import { save } from "../../lib/storage";
import {
  K_GAMIFICACAO,
  K_METASSUBVIEWSEL,
  K_TEMPLATES,
} from "../../lib/constants";
import {
  ajustarProgressoMetaRec,
  duplicarMetaRec,
  estornarMeta,
  metaRecExcesso,
  metaRecFeitas,
  sincronizarPontosMeta,
  toggleMetasSubview,
} from "../../lib/metas";
import {
  estornarPenalidadesMetaRec,
  sincronizarPenalidadeMetaRec,
  sincronizarPontosMetaRec,
} from "../../lib/scoring";
import type {
  CountdownDoc,
  MetaRecorrente,
  MetaTarget,
} from "../../lib/types";
import type { AppState } from "../useAppStore";

export type MetasSlice = Pick<
  AppState,
  | "setMetasSubview"
  | "toggleMetasSubviewState"
  | "metaDoc"
  | "addMeta"
  | "updateMeta"
  | "setMetaDone"
  | "deleteMeta"
  | "addMetaRec"
  | "updateMetaRec"
  | "ajustarMetaRec"
  | "duplicarMetaRec"
  | "deleteMetaRec"
  | "reorderMetaRec"
  | "reorderMetas"
>;

export const createMetasSlice: StateCreator<AppState, [], [], MetasSlice> = (set, get) => ({
  setMetasSubview: (metasSubview) => {
    save(K_METASSUBVIEWSEL, metasSubview);
    set({ metasSubview });
  },
  toggleMetasSubviewState: (view) => {
    const metasSubview = toggleMetasSubview(get().metasSubview, view);
    save(K_METASSUBVIEWSEL, metasSubview);
    set({ metasSubview });
  },

  // Metas (index.html:6403-6408, 8391+) — Prazos e Recorrentes (ver
  // lib/metas.ts). `metaDoc()` acha-ou-cria o doc "countdown" dentro de
  // `templates`, igual getOrCreateCountdownDoc, sem tocar nos outros tipos.
  metaDoc: () => {
    const existente = get()
      .templates.filter(isCountdownDoc)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (existente) {
      if (!existente.targets) existente.targets = [];
      if (!existente.recorrentes) existente.recorrentes = [];
      return existente;
    }
    const doc = criarMetaDoc();
    const templates = [...get().templates, doc];
    save(K_TEMPLATES, templates);
    set({ templates });
    return doc;
  },
  addMeta: (dados) => {
    const nome = dados.title.trim();
    if (!nome || !dados.date) return;
    const doc = get().metaDoc();
    const meta: MetaTarget = { tagValor: "alto", ...dados, id: uid(), title: nome, createdAt: Date.now() };
    const docNovo: CountdownDoc = { ...doc, targets: [...doc.targets, meta], updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  updateMeta: (id, patch) => {
    const doc = get().metaDoc();
    const alvo = doc.targets.find((t) => t.id === id);
    if (!alvo) return;
    let atualizado: MetaTarget = { ...alvo, ...patch };
    let gam = get().gam;
    if ("topics" in patch || "done" in patch || "tagValor" in patch || "date" in patch) {
      const r = sincronizarPontosMeta(atualizado, gam);
      atualizado = r.target;
      gam = r.gam;
    }
    const docNovo: CountdownDoc = {
      ...doc,
      targets: doc.targets.map((t) => (t.id === id ? atualizado : t)),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
  },
  setMetaDone: (id, done) => {
    const doc = get().metaDoc();
    const alvo = doc.targets.find((t) => t.id === id);
    if (!alvo) return;
    const clamped = Math.max(0, Math.min(alvo.topics ?? done, done));
    get().updateMeta(id, { done: clamped });
  },
  deleteMeta: (id) => {
    const doc = get().metaDoc();
    const alvo = doc.targets.find((t) => t.id === id);
    if (!alvo) return;
    const { gam } = estornarMeta(alvo, get().gam);
    const docNovo: CountdownDoc = { ...doc, targets: doc.targets.filter((t) => t.id !== id), updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
  },

  addMetaRec: (params) => {
    const titulo = params.titulo.trim();
    if (!titulo) return;
    const doc = get().metaDoc();
    const nova: MetaRecorrente = {
      id: uid(),
      titulo,
      tipo: params.tipo,
      vezes: Math.max(1, params.vezes || 1),
      area: params.area || null,
      notif: params.notif || null,
      negativa: !!params.negativa,
      pontua: !!params.pontua,
      tagValor: params.tagValor || "medio",
      criadoEm: Date.now(),
      progresso: null,
    };
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: [...(doc.recorrentes || []), nova],
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  updateMetaRec: (id, patch) => {
    const doc = get().metaDoc();
    const alvo = (doc.recorrentes || []).find((r) => r.id === id);
    if (!alvo) return;
    const excessoAntes = alvo.negativa ? metaRecExcesso(alvo) : 0;
    const feitasAntes = !alvo.negativa && alvo.pontua ? metaRecFeitas(alvo) : 0;

    let atualizado: MetaRecorrente = { ...alvo, ...patch };
    if (patch.vezes != null) atualizado.vezes = Math.max(1, patch.vezes);
    let gam = get().gam;
    const excessoDepois = atualizado.negativa ? metaRecExcesso(atualizado) : 0;
    gam = sincronizarPenalidadeMetaRec(gam, atualizado, excessoAntes, excessoDepois, new Date(), get().routines);
    const feitasDepois = !atualizado.negativa && atualizado.pontua ? metaRecFeitas(atualizado) : 0;
    gam = sincronizarPontosMetaRec(gam, atualizado, feitasAntes, feitasDepois, new Date(), get().routines);

    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: (doc.recorrentes || []).map((r) => (r.id === id ? atualizado : r)),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  ajustarMetaRec: (id, delta) => {
    const doc = get().metaDoc();
    const alvo = (doc.recorrentes || []).find((r) => r.id === id);
    if (!alvo) return;
    const { rec: atualizado, excessoAntes, excessoDepois, feitasAntes, feitasDepois } = ajustarProgressoMetaRec(alvo, delta);
    let gam = get().gam;
    if (atualizado.negativa) {
      gam = sincronizarPenalidadeMetaRec(gam, atualizado, excessoAntes, excessoDepois, new Date(), get().routines);
    }
    if (!atualizado.negativa && atualizado.pontua) {
      gam = sincronizarPontosMetaRec(gam, atualizado, feitasAntes, feitasDepois, new Date(), get().routines);
    }
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: (doc.recorrentes || []).map((r) => (r.id === id ? atualizado : r)),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
  },
  duplicarMetaRec: (id) => {
    const doc = get().metaDoc();
    const docNovo = duplicarMetaRec(doc, id, uid);
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  deleteMetaRec: (id) => {
    const doc = get().metaDoc();
    const alvo = (doc.recorrentes || []).find((r) => r.id === id);
    if (!alvo) return;
    const gam = estornarPenalidadesMetaRec(get().gam, id);
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: (doc.recorrentes || []).filter((r) => r.id !== id),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  reorderMetaRec: (fromIndex, toIndex) => {
    const doc = get().metaDoc();
    const recorrentes = [...(doc.recorrentes || [])];
    if (fromIndex < 0 || fromIndex >= recorrentes.length || toIndex < 0 || toIndex >= recorrentes.length) return;
    const [moved] = recorrentes.splice(fromIndex, 1);
    recorrentes.splice(toIndex, 0, moved);
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes,
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  reorderMetas: (ids) => {
    const doc = get().metaDoc();
    const pos = new Map(ids.map((id, i) => [id, i]));
    // ids fora da lista (não deveria acontecer) vão para o fim, sem perder nada
    const targets = [...doc.targets].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
    const docNovo: CountdownDoc = { ...doc, targets, ordemManual: true, updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
  },
});
