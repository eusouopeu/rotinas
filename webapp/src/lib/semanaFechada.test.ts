import { describe, it, expect, beforeEach } from "vitest";
import {
  semanaFechadaPendente,
  marcarSemanaVista,
  calcularDeltaSemana,
  calcularCorSemana,
  formatarPeriodoSemana,
  tituloNotaReflexao,
  type HistoricoSemana,
} from "./semanaFechada";
import { save } from "./storage";
import { K_GAMIFICACAO } from "./constants";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import type { GamificacaoState } from "./types";

function mockGam(overrides: Partial<GamificacaoState> = {}): GamificacaoState {
  const base = criarEstadoGamificacaoInicial();
  return {
    ...base,
    ...overrides,
    historico: {
      ...base.historico,
      ...(overrides.historico || {}),
    },
  };
}

describe("semanaFechada", () => {
  beforeEach(() => {
    // Limpa storage
    save(K_GAMIFICACAO, null);
  });

  describe("semanaFechadaPendente", () => {
    it("retorna null quando não há semanas fechadas no histórico", () => {
      const gam = mockGam();
      expect(semanaFechadaPendente(gam)).toBeNull();
    });

    it("retorna null quando gam é nulo ou indefinido", () => {
      expect(semanaFechadaPendente(null)).toBeNull();
    });

    it("retorna a última semana quando ela ainda não foi vista", () => {
      const ultima: HistoricoSemana = {
        inicioISO: "2026-08-24",
        nota: 75.5,
        badge: "prata",
      };
      const gam = mockGam({
        historico: {
          semanas: [
            { inicioISO: "2026-08-17", nota: 60, badge: "bronze" },
            ultima,
          ],
          meses: [],
          trimestres: [],
          anos: [],
        },
        ultimaSemanaVista: "2026-08-17",
      });

      expect(semanaFechadaPendente(gam)).toEqual(ultima);
    });

    it("retorna a última semana quando ultimaSemanaVista for undefined", () => {
      const ultima: HistoricoSemana = {
        inicioISO: "2026-08-24",
        nota: 80,
        badge: "ouro",
      };
      const gam = mockGam({
        historico: {
          semanas: [ultima],
          meses: [],
          trimestres: [],
          anos: [],
        },
      });

      expect(semanaFechadaPendente(gam)).toEqual(ultima);
    });

    it("retorna null quando a última semana já foi vista", () => {
      const ultima: HistoricoSemana = {
        inicioISO: "2026-08-24",
        nota: 80,
        badge: "ouro",
      };
      const gam = mockGam({
        historico: {
          semanas: [ultima],
          meses: [],
          trimestres: [],
          anos: [],
        },
        ultimaSemanaVista: "2026-08-24",
      });

      expect(semanaFechadaPendente(gam)).toBeNull();
    });
  });

  describe("marcarSemanaVista", () => {
    it("grava ultimaSemanaVista com o inicioISO da última semana e persiste", () => {
      const sem1: HistoricoSemana = { inicioISO: "2026-08-17", nota: 65, badge: "bronze" };
      const sem2: HistoricoSemana = { inicioISO: "2026-08-24", nota: 85, badge: "ouro" };
      const gam = mockGam({
        historico: { semanas: [sem1, sem2], meses: [], trimestres: [], anos: [] },
      });

      const atualizado = marcarSemanaVista(gam);
      expect(atualizado?.ultimaSemanaVista).toBe("2026-08-24");
      expect(semanaFechadaPendente(atualizado)).toBeNull();
    });

    it("não quebra quando histórico de semanas está vazio", () => {
      const gam = mockGam();
      const atualizado = marcarSemanaVista(gam);
      expect(atualizado?.ultimaSemanaVista).toBeUndefined();
    });
  });

  describe("calcularDeltaSemana", () => {
    it("calcula delta positivo em relação à semana anterior", () => {
      const semAnterior: HistoricoSemana = { inicioISO: "2026-08-17", nota: 70, badge: "prata" };
      const semAtual: HistoricoSemana = { inicioISO: "2026-08-24", nota: 85.5, badge: "ouro" };
      const semanas = [semAnterior, semAtual];

      const delta = calcularDeltaSemana(semAtual, semanas);
      expect(delta).toBeCloseTo(15.5);
    });

    it("calcula delta negativo em relação à semana anterior", () => {
      const semAnterior: HistoricoSemana = { inicioISO: "2026-08-17", nota: 80, badge: "ouro" };
      const semAtual: HistoricoSemana = { inicioISO: "2026-08-24", nota: 65, badge: "bronze" };
      const semanas = [semAnterior, semAtual];

      const delta = calcularDeltaSemana(semAtual, semanas);
      expect(delta).toBeCloseTo(-15);
    });

    it("retorna null quando não há semana anterior", () => {
      const semAtual: HistoricoSemana = { inicioISO: "2026-08-24", nota: 70, badge: "prata" };
      const delta = calcularDeltaSemana(semAtual, [semAtual]);
      expect(delta).toBeNull();
    });

    it("ignora semanas anteriores dispensadas ao buscar a semana base para delta", () => {
      const sem1: HistoricoSemana = { inicioISO: "2026-08-10", nota: 60, badge: "bronze" };
      const semDispensada: HistoricoSemana = { inicioISO: "2026-08-17", nota: 10, badge: null, dispensada: true };
      const semAtual: HistoricoSemana = { inicioISO: "2026-08-24", nota: 75, badge: "prata" };
      const semanas = [sem1, semDispensada, semAtual];

      const delta = calcularDeltaSemana(semAtual, semanas);
      expect(delta).toBeCloseTo(15); // 75 - 60, pulou a dispensada
    });
  });

  describe("calcularCorSemana", () => {
    const notaMinima = 60;

    it("retorna var(--sub) quando a semana é dispensada", () => {
      expect(calcularCorSemana({ nota: 80, dispensada: true }, notaMinima)).toBe("var(--sub)");
      expect(calcularCorSemana({ nota: 40, dispensada: true }, notaMinima)).toBe("var(--sub)");
    });

    it("retorna var(--ok) quando nota >= notaMinima (aprovado)", () => {
      expect(calcularCorSemana({ nota: 60, dispensada: false }, notaMinima)).toBe("var(--ok)");
      expect(calcularCorSemana({ nota: 85.5 }, notaMinima)).toBe("var(--ok)");
    });

    it("retorna var(--erro) quando nota < notaMinima (reprovado)", () => {
      expect(calcularCorSemana({ nota: 59.9, dispensada: false }, notaMinima)).toBe("var(--erro)");
      expect(calcularCorSemana({ nota: 30 }, notaMinima)).toBe("var(--erro)");
    });
  });

  describe("formatação e títulos", () => {
    it("formata período de 7 dias com dd/mm a dd/mm", () => {
      // 2026-08-24 é segunda-feira, +6 dias = 2026-08-30 (domingo)
      const res = formatarPeriodoSemana("2026-08-24");
      expect(res.iniStr).toBe("24/08");
      expect(res.fimStr).toBe("30/08");
      expect(res.label).toBe("24/08 a 30/08");
    });

    it("gera o título da nota de reflexão no padrão do legado", () => {
      const titulo = tituloNotaReflexao("2026-08-24", 82.34);
      expect(titulo).toBe("Semana 24/08–30/08 · nota 82.3");
    });
  });
});
