// Dispatcher das tools do servidor MCP embutido (desktop) — porta do bridge
// britaMCP do legado (index.html:14524-14633), religado em 13/09/2026
// (recomendação 5). O servidor (mcp-server/server.js, main process) valida o
// modo leitura/escrita e só repassa a chamada; aqui cada tool lê o estado da
// store e escreve pelas MESMAS ações da UI (setDiarioTexto,
// upsertDiaKanbanCard, addNote, updateNote) — nada de regra de pontuação ou
// storage paralelo. Diferença deliberada: get_today_agenda devolve também a
// agenda mesclada (itensAgendaDoDia, com iCal), que o legado não tinha.
import type { AppState } from "../store/useAppStore";
import { rotinasOrdenadas } from "./routines";
import { computeSchedule, formatHM, rotinaAgendadaEm } from "./schedule";
import { inicioSemanaISO, isoToDate, localKey } from "./gamificacao";
import { itensAgendaDoDia } from "./agenda";
import { getIcalCache } from "./ical";
import { daysUntil } from "./metas";
import { notaSemanaAtual, pontosPorAreaSemana, ritmoInfo } from "./boletim";
import { stripMdForSnippet } from "./notes";
import type { CountdownDoc, Tag } from "./types";

export type McpEstado = Pick<
  AppState,
  | "routines"
  | "notes"
  | "templates"
  | "diario"
  | "diaKanban"
  | "compromissos"
  | "history"
  | "gam"
  | "weekStart"
  | "setDiarioTexto"
  | "upsertDiaKanbanCard"
  | "addNote"
  | "updateNote"
>;
type Args = Record<string, unknown>;

const TAGS: Tag[] = ["nenhum", "baixo", "medio", "alto"];

/** Porta de diarioChave (index.html:12627-12632), com o início de semana explícito. */
export function diarioChave(escopo: unknown, iso: string, weekStart: number): string {
  if (escopo === "semana") return "semana:" + inicioSemanaISO(isoToDate(iso), weekStart);
  if (escopo === "mes") return "mes:" + iso.slice(0, 7);
  if (escopo === "ano") return "ano:" + iso.slice(0, 4);
  return "dia:" + iso;
}

function isoArg(a: Args): string {
  return typeof a.iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.iso) ? a.iso : localKey();
}

function textoArg(a: Args, campo = "texto"): string {
  const v = a[campo];
  if (typeof v !== "string" || !v.trim()) throw new Error(`"${campo}" é obrigatório`);
  return v;
}

/** Acrescenta ao fim, garantindo uma quebra de linha entre o antigo e o novo. */
function acrescentar(atual: string, texto: string): string {
  return atual ? atual.replace(/\n*$/, "\n") + texto : texto;
}

export function criarDispatcherMcp(get: () => McpEstado) {
  const tools: Record<string, (a: Args) => unknown> = {
    list_routines(a) {
      const hoje = new Date();
      return rotinasOrdenadas(get().routines)
        .filter((r) => !a.apenas_hoje || rotinaAgendadaEm(r, hoje))
        .map((r) => ({
          id: r.id,
          name: r.name,
          icon: r.icon || "",
          agendada: !!r.schedule?.enabled,
          dias: r.schedule?.days || [],
          horario: computeSchedule(r)?.startStr ?? null,
          passos: r.steps.length,
        }));
    },

    get_today_agenda() {
      const s = get();
      const iso = localKey();
      const hoje = isoToDate(iso);
      return {
        data: iso,
        rotinas_hoje: rotinasOrdenadas(s.routines)
          .filter((r) => rotinaAgendadaEm(r, hoje))
          .map((r) => ({ id: r.id, name: r.name, horario: computeSchedule(r)?.startStr ?? null })),
        agenda: itensAgendaDoDia(
          iso,
          hoje,
          s.routines,
          s.gam,
          s.history,
          s.diaKanban,
          s.compromissos,
          getIcalCache()
        ).map((it) => ({
          tipo: it.tipo,
          texto: it.texto,
          inicio: it.ini == null ? null : formatHM(it.ini),
          fim: it.fim == null ? null : formatHM(it.fim),
          feito: it.feito,
        })),
        diario: s.diario["dia:" + iso] || "",
        kanban: s.diaKanban
          .filter((c) => c.per === "dia:" + iso)
          .map((c) => ({ id: c.id, texto: c.text, col: c.col, tagValor: c.tagValor || "nenhum" })),
      };
    },

    list_metas() {
      return (get().templates as Array<{ type?: string }>)
        .filter((t) => t.type === "countdown")
        .flatMap((d) => (d as CountdownDoc).targets || [])
        .map((t) => ({
          id: t.id,
          title: t.title,
          date: t.date,
          diasRestantes: daysUntil(t.date),
          topics: t.topics ?? null,
          done: t.done || 0,
          unit: t.unit || "",
          tagValor: t.tagValor || "alto",
        }));
    },

    read_note(a) {
      const n = get().notes.find((x) => x.id === a.id);
      if (!n) throw new Error("nota não encontrada");
      return { id: n.id, title: n.title, content: n.content, createdAt: n.createdAt, updatedAt: n.updatedAt };
    },

    search_notes(a) {
      const q = String(a.query ?? "")
        .trim()
        .toLowerCase();
      if (!q) return [];
      return get()
        .notes.filter((n) => (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q))
        .sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))
        .map((n) => ({ id: n.id, title: n.title, snippet: stripMdForSnippet(n.content || "") }));
    },

    read_diario(a) {
      const chave = diarioChave(a.escopo, isoArg(a), get().weekStart);
      return { chave, texto: get().diario[chave] || "" };
    },

    get_gamificacao_status() {
      const { gam, weekStart } = get();
      const sem = gam.semanaAtual;
      if (!sem) return { notaSemana: null, ritmo: null, pontosPorArea: null };
      return {
        notaSemana: notaSemanaAtual(sem),
        ritmo: ritmoInfo(sem, gam.config, new Date(), weekStart),
        pontosPorArea: pontosPorAreaSemana(sem, gam.config),
      };
    },

    append_diario(a) {
      const texto = textoArg(a);
      const s = get();
      const chave = diarioChave(a.escopo, isoArg(a), s.weekStart);
      s.setDiarioTexto(chave, acrescentar(s.diario[chave] || "", texto));
      return { chave };
    },

    add_kanban_card(a) {
      const texto = textoArg(a);
      const antes = new Set(get().diaKanban.map((c) => c.id));
      const tag = TAGS.includes(a.tag_valor as Tag) ? (a.tag_valor as Tag) : "baixo";
      get().upsertDiaKanbanCard(localKey(), {
        text: texto,
        tagValor: tag,
        eixo: typeof a.eixo === "string" ? a.eixo : null,
      });
      const novo = get().diaKanban.find((c) => !antes.has(c.id));
      if (!novo) throw new Error("não foi possível criar o cartão");
      return { id: novo.id };
    },

    create_note(a) {
      const title = typeof a.title === "string" && a.title.trim() ? a.title : "(sem título)";
      const n = get().addNote(title, typeof a.content === "string" ? a.content : "");
      return { id: n.id };
    },

    append_note(a) {
      const texto = textoArg(a);
      const n = get().notes.find((x) => x.id === a.id);
      if (!n) throw new Error("nota não encontrada");
      get().updateNote(n.id, { content: acrescentar(n.content || "", texto) });
      return { id: n.id };
    },
  };

  return async (tool: string, args: unknown): Promise<unknown> => {
    const fn = tools[tool];
    if (!fn) throw new Error("tool desconhecida: " + tool);
    return fn(args && typeof args === "object" ? (args as Args) : {});
  };
}
