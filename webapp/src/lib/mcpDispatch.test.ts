import { describe, expect, it } from "vitest";
import { criarDispatcherMcp, diarioChave, type McpEstado } from "./mcpDispatch";
import { criarEstadoGamificacaoInicial, localKey } from "./gamificacao";
import type { DiaKanbanCard, Note } from "./types";

function estado(): McpEstado {
  const s = {
    routines: [
      {
        id: "r1",
        name: "Leitura",
        steps: [{ id: "s1", name: "Ler", type: "timer", seconds: 900 }],
        schedule: { enabled: true, anchor: "start", time: "21:00", days: [0, 1, 2, 3, 4, 5, 6] },
      },
    ],
    notes: [{ id: "n1", title: "Compras", content: "leite", subjects: [], createdAt: 1, updatedAt: 1 }] as Note[],
    templates: [{ id: "cd", type: "countdown", title: "Metas", targets: [{ id: "m1", title: "Curso", date: "2099-01-01", createdAt: 0, topics: 10, done: 3 }], createdAt: 0, updatedAt: 0 }],
    diario: {} as Record<string, string>,
    diaKanban: [] as DiaKanbanCard[],
    compromissos: [],
    history: [],
    gam: criarEstadoGamificacaoInicial(),
    weekStart: 1,
    setDiarioTexto(chave: string, texto: string) {
      s.diario = { ...s.diario, [chave]: texto };
    },
    upsertDiaKanbanCard(iso: string, card: { text: string; tagValor?: DiaKanbanCard["tagValor"] }) {
      s.diaKanban = [...s.diaKanban, { id: "k" + s.diaKanban.length, text: card.text, col: "todo", per: "dia:" + iso, ord: 0, tagValor: card.tagValor }];
    },
    addNote(title: string, content: string) {
      const n = { id: "n" + (s.notes.length + 1), title, content, subjects: [], createdAt: 2, updatedAt: 2 } as Note;
      s.notes = [...s.notes, n];
      return n;
    },
    updateNote(id: string, patch: Partial<Note>) {
      s.notes = s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    },
  };
  return s as unknown as McpEstado;
}

describe("diarioChave", () => {
  it("usa o formato de chave do diário do legado", () => {
    expect(diarioChave("dia", "2026-09-10", 1)).toBe("dia:2026-09-10");
    expect(diarioChave("semana", "2026-09-10", 1)).toBe("semana:2026-09-07");
    expect(diarioChave("mes", "2026-09-10", 1)).toBe("mes:2026-09");
    expect(diarioChave("ano", "2026-09-10", 1)).toBe("ano:2026");
  });
});

describe("criarDispatcherMcp", () => {
  it("lê rotinas, metas e notas", async () => {
    const s = estado();
    const call = criarDispatcherMcp(() => s);
    expect(await call("list_routines", { apenas_hoje: true })).toMatchObject([{ id: "r1", horario: "21:00", passos: 1 }]);
    expect(await call("list_metas", {})).toMatchObject([{ id: "m1", done: 3, topics: 10 }]);
    expect(await call("search_notes", { query: "LEI" })).toMatchObject([{ id: "n1" }]);
    const agenda = (await call("get_today_agenda", undefined)) as { data: string; agenda: unknown[] };
    expect(agenda.data).toBe(localKey());
    expect(agenda.agenda).toHaveLength(1);
  });

  it("escreve pelas ações da store", async () => {
    const s = estado();
    const call = criarDispatcherMcp(() => s);
    await call("append_diario", { texto: "linha 1" });
    await call("append_diario", { texto: "linha 2" });
    expect(s.diario["dia:" + localKey()]).toBe("linha 1\nlinha 2");
    expect(await call("add_kanban_card", { texto: "Ligar", tag_valor: "alto" })).toEqual({ id: "k0" });
    expect(s.diaKanban[0]).toMatchObject({ text: "Ligar", tagValor: "alto" });
    await call("append_note", { id: "n1", texto: "pão" });
    expect(s.notes[0].content).toBe("leite\npão");
    expect(await call("create_note", { title: "Nova" })).toEqual({ id: "n2" });
  });

  it("rejeita tool desconhecida e argumento obrigatório ausente", async () => {
    const call = criarDispatcherMcp(() => estado());
    await expect(call("apagar_tudo", {})).rejects.toThrow("tool desconhecida");
    await expect(call("append_diario", {})).rejects.toThrow("obrigatório");
  });
});
