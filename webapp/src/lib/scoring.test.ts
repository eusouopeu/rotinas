import { describe, expect, it } from "vitest";
import { criarEstadoGamificacaoInicial, inicioSemanaISO, localKey } from "./gamificacao";
import {
  avancarGamificacaoAteAgora,
  congelarSemana,
  desfazerConclusao,
  registrarConclusaoStep,
  simularDistribuicaoSemana,
  totalPlanejadoSegundos,
} from "./scoring";
import type { Routine } from "./types";

function rotinaDiariaTimer(minutos: number): Routine {
  return {
    id: "r1",
    name: "Rotina",
    tagValor: "medio",
    steps: [{ id: "s1", name: "Etapa", type: "timer", seconds: minutos * 60 }],
    schedule: { enabled: true, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] },
  };
}

describe("congelarSemana", () => {
  it("rotina agendada todo dia soma pontos > 0 e fecha em ~100 no total", () => {
    const gam = criarEstadoGamificacaoInicial();
    const inicio = inicioSemanaISO(new Date(), 0);
    const novoGam = congelarSemana([rotinaDiariaTimer(30)], gam, inicio);
    const sem = novoGam.semanaAtual!;
    expect(sem.totalBrutoAgendado).toBeGreaterThan(0);
    const totalPontos = sem.agendaCongelada.reduce((s, a) => s + a.pontos, 0);
    expect(totalPontos).toBeCloseTo(100, 0);
  });

  it("sem nada agendado usa a escala padrão (fator > 0, não quebra em 0)", () => {
    const gam = criarEstadoGamificacaoInicial();
    const inicio = inicioSemanaISO(new Date(), 0);
    const novoGam = congelarSemana([], gam, inicio);
    expect(novoGam.semanaAtual!.fatorNormalizacao).toBeGreaterThan(0);
  });
});

describe("registrarConclusaoStep", () => {
  it("credita o valor exato previsto na agenda congelada pra etapa agendada hoje", () => {
    const gam = criarEstadoGamificacaoInicial();
    const routine = rotinaDiariaTimer(30);
    const inicio = inicioSemanaISO(new Date(), 0);
    const congelado = congelarSemana([routine], gam, inicio);
    const hoje = new Date();
    const r = registrarConclusaoStep(
      [routine],
      congelado,
      { routineId: routine.id, stepId: "s1", tag: "medio", minutos: 30, area: "", rotulo: routine.name },
      hoje
    );
    expect(r.entry).not.toBeNull();
    const itemNaAgenda = r.gam.semanaAtual!.agendaCongelada.find((a) => a.itemId === "r1:s1");
    expect(r.entry!.pontos).toBeCloseTo(itemNaAgenda!.pontos);
  });

  it("creditar a MESMA etapa duas vezes no mesmo dia não credita de novo", () => {
    const gam = criarEstadoGamificacaoInicial();
    const routine = rotinaDiariaTimer(30);
    const inicio = inicioSemanaISO(new Date(), 0);
    const congelado = congelarSemana([routine], gam, inicio);
    const hoje = new Date();
    const dados = { routineId: routine.id, stepId: "s1", tag: "medio" as const, minutos: 30, area: "", rotulo: routine.name };
    const r1 = registrarConclusaoStep([routine], congelado, dados, hoje);
    const r2 = registrarConclusaoStep([routine], r1.gam, dados, hoje);
    expect(r2.entry).toBeNull();
    expect(r2.gam.semanaAtual!.concluidos).toHaveLength(1);
  });

  it("desfazerConclusao remove a entrada creditada", () => {
    const gam = criarEstadoGamificacaoInicial();
    const routine = rotinaDiariaTimer(30);
    const inicio = inicioSemanaISO(new Date(), 0);
    const congelado = congelarSemana([routine], gam, inicio);
    const r = registrarConclusaoStep(
      [routine],
      congelado,
      { routineId: routine.id, stepId: "s1", tag: "medio", minutos: 30, area: "", rotulo: routine.name },
      new Date()
    );
    const desfeito = desfazerConclusao(r.gam, r.entry!.itemId);
    expect(desfeito.semanaAtual!.concluidos).toHaveLength(0);
  });

  it("peso 'nenhum' não credita nada", () => {
    const gam = criarEstadoGamificacaoInicial();
    const routine = rotinaDiariaTimer(30);
    const congelado = congelarSemana([routine], gam, inicioSemanaISO(new Date(), 0));
    const r = registrarConclusaoStep(
      [routine],
      congelado,
      { routineId: routine.id, stepId: "s1", tag: "nenhum", minutos: 30, area: "", rotulo: routine.name },
      new Date()
    );
    expect(r.entry).toBeNull();
  });
});

describe("avancarGamificacaoAteAgora", () => {
  it("sem semanaAtual, congela a semana corrente", () => {
    const gam = criarEstadoGamificacaoInicial();
    const novo = avancarGamificacaoAteAgora([], gam);
    expect(novo.semanaAtual).not.toBeNull();
    expect(novo.semanaAtual!.inicioISO).toBe(inicioSemanaISO(new Date(), 0));
  });

  it("semana antiga fecha e uma nova é congelada, preservando o histórico", () => {
    const gam = criarEstadoGamificacaoInicial();
    const semanaPassada = inicioSemanaISO(new Date(Date.now() - 20 * 86400000), 0);
    const comSemanaVelha = congelarSemana([], gam, semanaPassada);
    const novo = avancarGamificacaoAteAgora([], comSemanaVelha);
    expect(novo.semanaAtual!.inicioISO).toBe(inicioSemanaISO(new Date(), 0));
    expect(novo.historico.semanas.length).toBeGreaterThan(0);
  });
});

describe("totalPlanejadoSegundos", () => {
  it("soma os segundos das etapas tempo, incluindo descanso entre elas", () => {
    const routine: Routine = {
      id: "r1",
      name: "x",
      restSeconds: 10,
      steps: [
        { id: "a", name: "A", type: "timer", seconds: 60 },
        { id: "b", name: "B", type: "timer", seconds: 60 },
      ],
    };
    expect(totalPlanejadoSegundos(routine)).toBe(60 + 10 + 60);
  });
});

describe("simularDistribuicaoSemana", () => {
  it("agrupa pontos por rotina e ordena do maior pro menor, sem congelar a semana", () => {
    const gam = criarEstadoGamificacaoInicial();
    const inicio = inicioSemanaISO(new Date(), 0);
    const grande = rotinaDiariaTimer(60);
    const pequena: Routine = { ...rotinaDiariaTimer(10), id: "r2", name: "Rotina 2", steps: [{ id: "s2", name: "Etapa", type: "timer", seconds: 600 }] };
    const sim = simularDistribuicaoSemana([grande, pequena], gam, inicio);
    expect(sim.map((s) => s.routineId)).toEqual(["r1", "r2"]);
    expect(sim[0].pontos).toBeGreaterThan(sim[1].pontos);
    expect(gam.semanaAtual).toBeNull();
  });

  it("sem rotina agendada devolve lista vazia", () => {
    const gam = criarEstadoGamificacaoInicial();
    expect(simularDistribuicaoSemana([], gam, inicioSemanaISO(new Date(), 0))).toEqual([]);
  });

  it("multiplicador maior aumenta a FATIA da rotina (a semana inteira é normalizada pra ~100, não a rotina isolada)", () => {
    const gam = criarEstadoGamificacaoInicial();
    const inicio = inicioSemanaISO(new Date(), 0);
    const rotinaMedio = rotinaDiariaTimer(30);
    const rotinaBaixo: Routine = { ...rotinaDiariaTimer(30), id: "r2", name: "Rotina 2", tagValor: "baixo", steps: [{ id: "s2", name: "Etapa", type: "timer", seconds: 1800 }] };
    const base = simularDistribuicaoSemana([rotinaMedio, rotinaBaixo], gam, inicio).find((s) => s.routineId === "r1")!.pontos;
    const gamHipotetico = { ...gam, config: { ...gam.config, multiplicadores: { ...gam.config.multiplicadores, medio: gam.config.multiplicadores.medio * 3 } } };
    const maior = simularDistribuicaoSemana([rotinaMedio, rotinaBaixo], gamHipotetico, inicio).find((s) => s.routineId === "r1")!.pontos;
    expect(maior).toBeGreaterThan(base);
  });
});

// smoke: localKey usado nos testes acima via import indireto
describe("sanity", () => {
  it("localKey formata hoje", () => {
    expect(localKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
