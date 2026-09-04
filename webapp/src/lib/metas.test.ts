import { describe, expect, it } from "vitest";
import { criarEstadoGamificacaoInicial, inicioSemanaISO, localKey } from "./gamificacao";
import {
  ajustarProgressoMetaRec,
  daysUntil,
  duplicarMetaRec,
  loadMetasSubviewSel,
  metaConcluida,
  metaEscopo,
  metaPontosTotais,
  metaRecCompleta,
  metaRecExcedida,
  metaRecExcesso,
  metaRecFeitas,
  metaRecPeriodoAtual,
  metaRecProgresso,
  sincronizarPontosMeta,
  toggleMetasSubview,
} from "./metas";
import {
  estornarPenalidadesMetaRec,
  metaRecItemId,
  metaRecItemIdPos,
  metaRecPenalidadeUnidade,
  metaRecPontosUnidade,
  sincronizarPenalidadeMetaRec,
  sincronizarPontosMetaRec,
} from "./scoring";
import type { CountdownDoc, MetaRecorrente, MetaTarget } from "./types";

describe("metaEscopo", () => {
  // meia-noite local fixa (não Date.now(), que carrega hora do dia e desalinha
  // o cálculo de dias perto da fronteira — new Date("YYYY-MM-DD") sempre
  // parseia meia-noite)
  const hoje = new Date(2026, 6, 1).getTime();
  it("prazo de 10 dias -> mensal", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 10) })).toBe("mensal");
  });
  it("prazo de 29 dias -> mensal", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 29) })).toBe("mensal");
  });
  it("prazo de 30 dias -> trimestral", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 30) })).toBe("trimestral");
  });
  it("prazo de 90 dias -> trimestral", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 90) })).toBe("trimestral");
  });
  it("prazo de 91 dias -> anual", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 91) })).toBe("anual");
  });
});

describe("metaConcluida", () => {
  it("done >= topics conclui", () => {
    expect(metaConcluida({ topics: 10, done: 10 })).toBe(true);
    expect(metaConcluida({ topics: 10, done: 9 })).toBe(false);
  });
  it("sem topics nunca conclui", () => {
    expect(metaConcluida({ topics: null, done: 5 })).toBe(false);
  });
});

describe("metaPontosTotais", () => {
  it("peso alto (padrão) vale 3x o multiplicador do escopo", () => {
    const gam = criarEstadoGamificacaoInicial();
    const t: MetaTarget = { id: "1", title: "x", date: iso(Date.now(), 10), createdAt: Date.now() };
    expect(metaPontosTotais(t, gam)).toBeCloseTo(gam.config.pontosMeta.mensal * 3.0);
  });
});

describe("sincronizarPontosMeta", () => {
  it("credita proporcional ao progresso, no período corrente", () => {
    const gam = criarEstadoGamificacaoInicial();
    const t: MetaTarget = {
      id: "1",
      title: "Meta",
      date: iso(Date.now(), 10),
      createdAt: Date.now(),
      topics: 10,
      done: 5,
    };
    const r = sincronizarPontosMeta(t, gam);
    expect(r.delta).toBeGreaterThan(0);
    expect(r.target.creditos && Object.values(r.target.creditos)[0]).toBeCloseTo(r.delta);
    expect(Object.values(r.gam.metasPontos)[0]).toBeCloseTo(r.delta);
  });

  it("reduzir o progresso estorna (delta negativo) sem deixar resíduo", () => {
    const gam = criarEstadoGamificacaoInicial();
    let t: MetaTarget = {
      id: "1",
      title: "Meta",
      date: iso(Date.now(), 10),
      createdAt: Date.now(),
      topics: 10,
      done: 10,
    };
    const cheio = sincronizarPontosMeta(t, gam);
    t = cheio.target;
    const menos = sincronizarPontosMeta({ ...t, done: 0 }, cheio.gam);
    expect(menos.delta).toBeLessThan(0);
    expect(Object.keys(menos.target.creditos || {})).toHaveLength(0);
    expect(Object.keys(menos.gam.metasPontos)).toHaveLength(0);
  });

  it("ruído de arredondamento (<0.05) não credita nada", () => {
    const gam = criarEstadoGamificacaoInicial();
    const t: MetaTarget = {
      id: "1",
      title: "Meta",
      date: iso(Date.now(), 10),
      createdAt: Date.now(),
      topics: 1000,
      done: 0,
      creditos: {},
    };
    const r = sincronizarPontosMeta(t, gam);
    expect(r.delta).toBe(0);
  });
});

describe("daysUntil", () => {
  it("hoje é 0", () => {
    expect(daysUntil(iso(Date.now(), 0))).toBe(0);
  });
  it("amanhã é 1", () => {
    expect(daysUntil(iso(Date.now(), 1))).toBe(1);
  });
});

function iso(base: number, addDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

describe("metas recorrentes: período e progresso", () => {
  const hoje = new Date(2026, 8, 4); // 2026-09-04 (sexta-feira)
  it("metaRecPeriodoAtual gera chave correta para diaria e semanal", () => {
    const diaria: Pick<MetaRecorrente, "tipo"> = { tipo: "diaria" };
    const semanal: Pick<MetaRecorrente, "tipo"> = { tipo: "semanal" };
    expect(metaRecPeriodoAtual(diaria, hoje)).toBe("dia:" + localKey(hoje));
    expect(metaRecPeriodoAtual(semanal, hoje)).toBe("semana:" + inicioSemanaISO(hoje));
  });

  it("metaRecProgresso mantém progresso do mesmo período e reseta quando vira", () => {
    const rec: MetaRecorrente = {
      id: "r1",
      titulo: "Água",
      tipo: "diaria",
      vezes: 4,
      criadoEm: hoje.getTime(),
      progresso: { periodo: "dia:2026-09-03", feitas: 3 },
    };
    // Período anterior -> lazy reset
    const pHoje = metaRecProgresso(rec, hoje);
    expect(pHoje.periodo).toBe("dia:2026-09-04");
    expect(pHoje.feitas).toBe(0);

    // Mesmo período -> preserva
    pHoje.feitas = 2;
    expect(metaRecProgresso(rec, hoje).feitas).toBe(2);
  });

  it("metaRecCompleta, metaRecExcesso e metaRecExcedida calculam corretamente", () => {
    const pos: MetaRecorrente = {
      id: "r1",
      titulo: "Exercício",
      tipo: "semanal",
      vezes: 3,
      criadoEm: hoje.getTime(),
      progresso: { periodo: "semana:" + inicioSemanaISO(hoje), feitas: 2 },
    };
    expect(metaRecCompleta(pos, hoje)).toBe(false);
    expect(metaRecExcesso(pos, hoje)).toBe(0);
    expect(metaRecExcedida(pos, hoje)).toBe(false);

    pos.progresso!.feitas = 3;
    expect(metaRecFeitas(pos, hoje)).toBe(3);
    expect(metaRecCompleta(pos, hoje)).toBe(true);
    expect(metaRecExcesso(pos, hoje)).toBe(0);

    const neg: MetaRecorrente = {
      id: "r2",
      titulo: "Delivery",
      tipo: "semanal",
      vezes: 2,
      negativa: true,
      criadoEm: hoje.getTime(),
      progresso: { periodo: "semana:" + inicioSemanaISO(hoje), feitas: 2 },
    };
    expect(metaRecExcesso(neg, hoje)).toBe(0);
    expect(metaRecExcedida(neg, hoje)).toBe(false);

    neg.progresso!.feitas = 3;
    expect(metaRecExcesso(neg, hoje)).toBe(1);
    expect(metaRecExcedida(neg, hoje)).toBe(true);
  });
});

describe("metas recorrentes: CRUD e duplicação", () => {
  it("duplicarMetaRec clona meta, altera id/título, reseta progresso e atualiza timestamp", () => {
    const doc: CountdownDoc = {
      id: "cd1",
      type: "countdown",
      title: "Metas",
      targets: [],
      recorrentes: [
        {
          id: "rec1",
          titulo: "Alongamento",
          tipo: "diaria",
          vezes: 2,
          criadoEm: 1000,
          negativa: false,
          pontua: true,
          tagValor: "baixo",
          progresso: { periodo: "dia:2026-09-04", feitas: 2 },
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const docNovo = duplicarMetaRec(doc, "rec1", () => "rec2");
    expect(docNovo.recorrentes).toHaveLength(2);
    const copia = docNovo.recorrentes![1];
    expect(copia.id).toBe("rec2");
    expect(copia.titulo).toBe("Alongamento (cópia)");
    expect(copia.progresso).toBeNull();
    expect(copia.criadoEm).toBeGreaterThan(1000);
    expect(docNovo.updatedAt).toBeGreaterThan(1000);
  });
});

describe("metas recorrentes: ajuste de progresso", () => {
  const hoje = new Date(2026, 8, 4);

  it("meta positiva clampa feitas entre 0 e vezes", () => {
    const rec: MetaRecorrente = {
      id: "r1",
      titulo: "Leitura",
      tipo: "diaria",
      vezes: 3,
      criadoEm: hoje.getTime(),
      pontua: true,
      progresso: { periodo: "dia:" + localKey(hoje), feitas: 2 },
    };

    const a1 = ajustarProgressoMetaRec(rec, 1, hoje);
    expect(a1.rec.progresso!.feitas).toBe(3);
    expect(a1.feitasAntes).toBe(2);
    expect(a1.feitasDepois).toBe(3);

    // Acima de vezes -> clampa em 3
    const a2 = ajustarProgressoMetaRec(a1.rec, 1, hoje);
    expect(a2.rec.progresso!.feitas).toBe(3);
    expect(a2.feitasDepois).toBe(3);

    // Abaixo de zero -> clampa em 0
    const a3 = ajustarProgressoMetaRec(a1.rec, -5, hoje);
    expect(a3.rec.progresso!.feitas).toBe(0);
    expect(a3.feitasDepois).toBe(0);
  });

  it("meta negativa permite feitas ultrapassar vezes calculando excesso", () => {
    const rec: MetaRecorrente = {
      id: "r2",
      titulo: "Refrigerante",
      tipo: "semanal",
      vezes: 2,
      negativa: true,
      criadoEm: hoje.getTime(),
      progresso: { periodo: "semana:" + inicioSemanaISO(hoje), feitas: 2 },
    };

    const a1 = ajustarProgressoMetaRec(rec, 1, hoje);
    expect(a1.rec.progresso!.feitas).toBe(3);
    expect(a1.excessoAntes).toBe(0);
    expect(a1.excessoDepois).toBe(1);

    const a2 = ajustarProgressoMetaRec(a1.rec, 1, hoje);
    expect(a2.rec.progresso!.feitas).toBe(4);
    expect(a2.excessoAntes).toBe(1);
    expect(a2.excessoDepois).toBe(2);
  });
});

describe("metas recorrentes: crédito de pontos e penalidades", () => {
  const hoje = new Date(2026, 8, 4);

  it("sincronizarPontosMetaRec credita pontos para meta positiva e estorna ao reduzir", () => {
    let gam = criarEstadoGamificacaoInicial();
    // Inicia semana atual vazia
    gam = {
      ...gam,
      semanaAtual: {
        inicioISO: inicioSemanaISO(hoje),
        fatorNormalizacao: 1,
        totalBrutoAgendado: 10,
        fatoresArea: {},
        habitos: {},
        agendaCongelada: [],
        concluidos: [],
      },
    };

    const rec: MetaRecorrente = {
      id: "r1",
      titulo: "Academia",
      tipo: "semanal",
      vezes: 3,
      criadoEm: hoje.getTime(),
      pontua: true,
      tagValor: "alto",
    };
    expect(metaRecPontosUnidade(rec, gam.config)).toBeGreaterThan(0);

    // Feitas 0 -> 2
    gam = sincronizarPontosMetaRec(gam, rec, 0, 2, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(2);
    expect(gam.semanaAtual!.concluidos[0].tipo).toBe("metaRec");
    expect(gam.semanaAtual!.concluidos[0].itemId).toBe(metaRecItemIdPos(rec.id, "semana:" + inicioSemanaISO(hoje), 1));
    expect(gam.semanaAtual!.concluidos[0].pontos).toBeGreaterThan(0);

    // Feitas 2 -> 1 (estorno parcial)
    gam = sincronizarPontosMetaRec(gam, rec, 2, 1, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(1);
    expect(gam.semanaAtual!.concluidos[0].itemId).toBe(metaRecItemIdPos(rec.id, "semana:" + inicioSemanaISO(hoje), 1));

    // Feitas 1 -> 0 (estorno total)
    gam = sincronizarPontosMetaRec(gam, rec, 1, 0, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(0);
  });

  it("sincronizarPenalidadeMetaRec debita penalidade negativa por excesso e remove ao desfazer", () => {
    let gam = criarEstadoGamificacaoInicial();
    gam = {
      ...gam,
      semanaAtual: {
        inicioISO: inicioSemanaISO(hoje),
        fatorNormalizacao: 1,
        totalBrutoAgendado: 10,
        fatoresArea: {},
        habitos: {},
        agendaCongelada: [],
        concluidos: [],
      },
    };

    const rec: MetaRecorrente = {
      id: "r2",
      titulo: "Fumar",
      tipo: "diaria",
      vezes: 1,
      negativa: true,
      criadoEm: hoje.getTime(),
      tagValor: "medio",
    };
    expect(metaRecPenalidadeUnidade(rec, gam.config)).toBeLessThan(0);

    // Excesso 0 -> 2
    gam = sincronizarPenalidadeMetaRec(gam, rec, 0, 2, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(2);
    expect(gam.semanaAtual!.concluidos[0].tipo).toBe("metaRecNeg");
    expect(gam.semanaAtual!.concluidos[0].itemId).toBe(metaRecItemId(rec.id, "dia:" + localKey(hoje), 1));
    expect(gam.semanaAtual!.concluidos[0].pontos).toBeLessThan(0);
    expect(gam.semanaAtual!.concluidos[0].pb).toBeLessThan(0);

    // Excesso 2 -> 1
    gam = sincronizarPenalidadeMetaRec(gam, rec, 2, 1, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(1);
    expect(gam.semanaAtual!.concluidos[0].itemId).toBe(metaRecItemId(rec.id, "dia:" + localKey(hoje), 1));

    // Excesso 1 -> 0
    gam = sincronizarPenalidadeMetaRec(gam, rec, 1, 0, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(0);
  });

  it("peso 'nenhum' não credita nem penaliza", () => {
    let gam = criarEstadoGamificacaoInicial();
    gam = {
      ...gam,
      semanaAtual: {
        inicioISO: inicioSemanaISO(hoje),
        fatorNormalizacao: 1,
        totalBrutoAgendado: 10,
        fatoresArea: {},
        habitos: {},
        agendaCongelada: [],
        concluidos: [],
      },
    };

    const recNenhum: MetaRecorrente = {
      id: "r3",
      titulo: "Lembrete sem ponto",
      tipo: "diaria",
      vezes: 2,
      criadoEm: hoje.getTime(),
      pontua: true,
      tagValor: "nenhum",
    };

    gam = sincronizarPontosMetaRec(gam, recNenhum, 0, 2, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(0);

    const negNenhum: MetaRecorrente = {
      ...recNenhum,
      negativa: true,
    };
    gam = sincronizarPenalidadeMetaRec(gam, negNenhum, 0, 2, hoje);
    expect(gam.semanaAtual!.concluidos).toHaveLength(0);
  });

  it("estornarPenalidadesMetaRec remove todos os créditos e penalidades daquela meta", () => {
    let gam = criarEstadoGamificacaoInicial();
    const recId = "r99";
    gam = {
      ...gam,
      semanaAtual: {
        inicioISO: inicioSemanaISO(hoje),
        fatorNormalizacao: 1,
        totalBrutoAgendado: 10,
        fatoresArea: {},
        habitos: {},
        agendaCongelada: [],
        concluidos: [
          { itemId: metaRecItemId(recId, "dia:2026-09-04", 1), pontos: -2, pb: -2, rotulo: "x" },
          { itemId: metaRecItemIdPos(recId, "dia:2026-09-04", 1), pontos: 3, pb: 3, rotulo: "x" },
          { itemId: "rotina:step:2026-09-04", pontos: 5, pb: 5, rotulo: "Rotina" },
        ],
      },
    };

    const estornado = estornarPenalidadesMetaRec(gam, recId);
    expect(estornado.semanaAtual!.concluidos).toHaveLength(1);
    expect(estornado.semanaAtual!.concluidos[0].itemId).toBe("rotina:step:2026-09-04");
  });
});

describe("toggleMetasSubview e loadMetasSubviewSel", () => {
  it("loadMetasSubviewSel usa fallback 'recorrentes'", () => {
    const res = loadMetasSubviewSel((_k, fb) => fb);
    expect(res).toEqual(["recorrentes"]);
  });

  it("loadMetasSubviewSel migra legado 'prazos' para array", () => {
    const res = loadMetasSubviewSel(<T>(k: string, fb: T): T => (k === "rotinas_v2_metas_subview" ? ("prazos" as unknown as T) : fb));
    expect(res).toEqual(["prazos"]);
  });

  it("toggleMetasSubview permite ativar ambos e impede desmarcar ambos", () => {
    let sub = toggleMetasSubview(["recorrentes"], "prazos");
    expect(sub).toEqual(["recorrentes", "prazos"]);

    sub = toggleMetasSubview(sub, "recorrentes");
    expect(sub).toEqual(["prazos"]);

    // Tentativa de desmarcar o único ativo é ignorada
    const naoMuda = toggleMetasSubview(sub, "prazos");
    expect(naoMuda).toEqual(["prazos"]);
  });
});
