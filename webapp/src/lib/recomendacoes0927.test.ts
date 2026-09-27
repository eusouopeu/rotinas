// Testes das recomendações de 27/09/2026: visão Mês, atalhos do launcher,
// rotinas prontas e aviso de backup atrasado.
import { describe, expect, it } from "vitest";
import { celulasMes } from "./agenda";
import { ATALHO_DESPESA, ATALHO_NOTA, listaAtalhos } from "./atalhos";
import { diasSemBackup } from "./avisoBackup";
import { montarRotinaPronta, ROTINAS_PRONTAS } from "./rotinasProntas";
import type { Exercicio, Routine } from "./types";

const DIA = 86400000;

describe("celulasMes", () => {
  it("começa no dia que abre a semana e cobre o mês inteiro", () => {
    // setembro/2026 começa numa terça (dow 2)
    const dom = celulasMes(2026, 8, 0);
    expect(dom.slice(0, 3)).toEqual([null, null, "2026-09-01"]);
    expect(dom.filter(Boolean)).toHaveLength(30);
    const seg = celulasMes(2026, 8, 1);
    expect(seg.slice(0, 2)).toEqual([null, "2026-09-01"]);
    expect(seg[seg.length - 1]).toBe("2026-09-30");
  });
});

describe("listaAtalhos", () => {
  it("publica as duas ações e no máximo duas rotinas", () => {
    const rs = ["a", "b", "c"].map((id) => ({ id, name: "Rotina " + id, icon: "⭐", steps: [] }) as Routine);
    const l = listaAtalhos(rs);
    expect(l.map((x) => x.id)).toEqual([ATALHO_NOTA, ATALHO_DESPESA, "a", "b"]);
    expect(l[2].label).toBe("⭐ Rotina a");
  });
});

describe("montarRotinaPronta", () => {
  it("reaproveita exercício pelo nome e cria o que falta", () => {
    const treino = ROTINAS_PRONTAS.find((t) => t.name === "Treino de força A")!;
    const existentes: Exercicio[] = [{ id: "ex1", nome: "agachamento", grupos: [], pesoAtual: 60, composto: true }];
    const criados: string[] = [];
    const r = montarRotinaPronta(treino, existentes, (nome, grupo) => {
      criados.push(nome);
      return { id: "n" + criados.length, nome, grupos: [grupo], pesoAtual: 0, composto: true };
    });
    expect(r.steps[1]).toMatchObject({ type: "exercicio", exercicioId: "ex1", name: "agachamento", sets: 4 });
    expect(criados).toEqual(["Supino reto", "Remada curvada"]);
    expect(r.schedule?.enabled).toBe(false);
    expect(r.restSeconds).toBe(120);
  });
});

describe("diasSemBackup", () => {
  const agora = 100 * DIA;
  it("usa a marca mais recente e só avisa a partir de 7 dias", () => {
    expect(diasSemBackup({ marcas: [agora - 10 * DIA, agora - 3 * DIA, null], desde: 1, agora })).toBeNull();
    expect(diasSemBackup({ marcas: [agora - 10 * DIA, agora - 8 * DIA], desde: 1, agora })).toBe(8);
  });
  it("sem backup, conta desde o item mais antigo; sem dados, não avisa", () => {
    expect(diasSemBackup({ marcas: [null, 0], desde: agora - 2 * DIA, agora })).toBeNull();
    expect(diasSemBackup({ marcas: [null, 0], desde: agora - 9 * DIA, agora })).toBe(9);
    expect(diasSemBackup({ marcas: [], desde: null, agora })).toBeNull();
  });
});
