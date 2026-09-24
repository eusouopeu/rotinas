// Dados fixos para os screenshots de regressão visual (npm run visual).
// Entram pelo caminho de migração do localStorage legado (K_PREFIX) — ver
// bootStorage() em src/lib/storage.ts — então não dependem de IndexedDB.
// A data "hoje" é congelada em HOJE (quarta, 23/09/2026) pelo roteiro.
export const HOJE = "2026-09-23T10:00:00-03:00";

const DIA = 86400000;
const t0 = new Date(HOJE).getTime();
const iso = (offset) => new Date(t0 + offset * DIA).toISOString().slice(0, 10);

const passo = (id, name, seconds, type = "timer") => ({ id, name, type, seconds });

const routines = [
  {
    id: "r-manha",
    name: "Manhã",
    eixo: "ar-saude",
    weeklyGoalTimes: 5,
    steps: [passo("s1", "Alongar", 300), passo("s2", "Meditar", 600), passo("s3", "Diário", 180)],
    restSeconds: 0,
    tagValor: "medio",
    createdAt: t0 - 40 * DIA,
    schedule: { enabled: true, anchor: "start", time: "06:30", days: [1, 2, 3, 4, 5] },
  },
  {
    id: "r-treino",
    name: "Treino A",
    eixo: "ar-saude",
    weeklyGoalTimes: 3,
    steps: [passo("s1", "Aquecimento", 420), passo("s2", "Supino", 900), passo("s3", "Remada", 900), passo("s4", "Alongar", 300)],
    restSeconds: 45,
    tagValor: "alto",
    createdAt: t0 - 40 * DIA,
    schedule: { enabled: true, anchor: "start", time: "18:00", days: [1, 3, 5] },
  },
  {
    id: "r-leitura",
    name: "Leitura",
    eixo: "ar-estudos",
    steps: [passo("s1", "Ler 20 páginas", 1500)],
    restSeconds: 0,
    tagValor: "baixo",
    createdAt: t0 - 40 * DIA,
    schedule: { enabled: true, anchor: "end", time: "22:00", days: [0, 1, 2, 3, 4, 5, 6] },
  },
  {
    id: "r-faxina",
    name: "Faxina rápida",
    steps: [passo("s1", "Cozinha", 600), passo("s2", "Sala", 600)],
    restSeconds: 0,
    tagValor: "nenhum",
    createdAt: t0 - 40 * DIA,
    schedule: null,
  },
];

function entrada(r, offset, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const atraso = (Math.abs(offset) * 3) % 18; // minutos depois do horário agendado
  const base = new Date(iso(offset) + "T00:00:00-03:00").getTime() + (h * 60 + m + atraso) * 60000;
  const planned = r.steps.reduce((a, s) => a + (s.seconds || 0), 0);
  // etapa "Meditar"/"Supino" estoura um pouco em dias alternados
  const real = (s) => (s.name === "Meditar" || s.name === "Supino" ? s.seconds + (Math.abs(offset) % 3) * 45 : s.seconds);
  const actual = r.steps.reduce((a, s) => a + real(s), 0);
  return {
    date: iso(offset),
    ts: base + actual * 1000,
    startedTs: base,
    routineId: r.id,
    routineName: r.name,
    plannedSec: planned,
    actualSec: actual,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    schedDelayMin: atraso,
    steps: r.steps.map((s) => ({
      id: s.id, tag: r.tagValor, name: s.name, isRest: false, planned: s.seconds, actual: real(s), skipped: false,
    })),
  };
}

const history = [];
for (let d = -119; d <= 0; d++) {
  const dow = new Date(t0 + d * DIA).getDay();
  if (dow >= 1 && dow <= 5 && d % 7 !== -3 && d !== -3) history.push(entrada(routines[0], d, "06:30"));
  if ((dow === 1 || dow === 3 || dow === 5) && d < 0 && d % 5 !== -2) history.push(entrada(routines[1], d, "18:00"));
  if (d < 0 && d % 6 !== -5) history.push(entrada(routines[2], d, "21:30"));
}

const notes = [
  {
    id: "n1", title: "Compras da semana", pinned: true, subjects: ["casa"], updatedAt: t0 - 2 * 3600000, createdAt: t0 - 5 * DIA,
    content: "# Compras da semana #casa\n\n- [x] Arroz\n- [ ] Feijão\n- [ ] Café\n\n**Lembrar:** conferir a validade do azeite.\n",
  },
  {
    id: "n2", title: "Ideias de projeto", subjects: ["trabalho", "ideias"], updatedAt: t0 - DIA, createdAt: t0 - 9 * DIA,
    content: "# Ideias de projeto\n\n1. Painel de metas\n2. Revisão semanal guiada\n\nVer [[Compras da semana]].\n",
  },
  {
    id: "n3", title: "Leitura: hábitos atômicos", subjects: ["estudo"], updatedAt: t0 - 4 * DIA, createdAt: t0 - 20 * DIA,
    content: "## Capítulo 3 #estudo\n\nPequenas mudanças, grandes resultados.\n\n> O ambiente molda o comportamento.\n",
  },
  {
    id: "n4", title: "Rascunho antigo", subjects: [], arquivada: true, updatedAt: t0 - 30 * DIA, createdAt: t0 - 40 * DIA,
    content: "Nota arquivada, fora da lista principal.\n",
  },
];

const templates = [
  {
    id: "t-metas", type: "countdown", title: "Metas", createdAt: t0 - 30 * DIA, updatedAt: t0 - DIA,
    targets: [
      { id: "m1", title: "Terminar o curso de inglês", date: iso(60), createdAt: t0 - 20 * DIA, unit: "aulas", topics: 24, done: 9, tagValor: "alto", areas: ["Estudos"] },
      { id: "m2", title: "Correr 10 km", date: iso(21), createdAt: t0 - 10 * DIA, tagValor: "medio", areas: ["Saúde"] },
    ],
    recorrentes: [
      { id: "mr1", titulo: "Beber 2 L de água", tipo: "diaria", vezes: 1, area: "Saúde", tagValor: "baixo", criadoEm: t0 - 15 * DIA, pontua: true },
      { id: "mr2", titulo: "Treinar", tipo: "semanal", vezes: 3, area: "Saúde", tagValor: "medio", criadoEm: t0 - 15 * DIA, pontua: true },
      { id: "mr3", titulo: "Redes sociais", tipo: "diaria", vezes: 2, area: "Foco", negativa: true, criadoEm: t0 - 15 * DIA },
    ],
  },
  {
    id: "t-kanban2", type: "kanban", title: "Viagem de fim de ano", createdAt: t0 - 6 * DIA, updatedAt: t0 - 3 * DIA,
    cols: [
      { title: "A fazer", items: [{ id: "k5", text: "Reservar hotel" }] },
      { title: "Fazendo", items: [] },
      { title: "Feito", items: [{ id: "k6", text: "Comprar passagens" }, { id: "k7", text: "Renovar passaporte" }] },
    ],
  },
  {
    id: "t-kanban", type: "kanban", title: "Projeto Casa", createdAt: t0 - 12 * DIA, updatedAt: t0 - DIA,
    cols: [
      { title: "A fazer", items: [{ id: "k1", text: "Trocar lâmpada da sala" }, { id: "k2", text: "Comprar prateleira" }] },
      { title: "Fazendo", items: [{ id: "k3", text: "Pintar o quarto" }] },
      { title: "Feito", items: [{ id: "k4", text: "Consertar a torneira" }] },
    ],
  },
];

// Gamificação: roda da vida com três áreas e quatro semanas fechadas (a
// semana atual é calculada pelo app a partir das rotinas, com a data fixa).
// A última semana fechada NÃO foi vista, então a Home mostra o aviso e a tela
// "Semana fechada" abre por ele.
const gamificacao = {
  config: {
    multiplicadores: { nenhum: 0, baixo: 1.0, medio: 1.75, alto: 3.0 },
    divisorDuracao: 30,
    notaMinima: 60,
    faixas: { bronze: 60, prata: 75, ouro: 90, diamante: 100 },
    pontosMeta: { mensal: 10, trimestral: 20, anual: 40 },
    roda: {
      ativa: true,
      areas: [
        { id: "ar-saude", label: "Saúde", color: "#157A45", peso: 5 },
        { id: "ar-estudos", label: "Estudos", color: "#2F6BE0", peso: 4 },
        { id: "ar-foco", label: "Foco", color: "#C2631A", peso: 3 },
      ],
      pesoSemArea: 5,
    },
    habito: { ativo: true, streakMin: 21, fator: 0.6 },
    vagas: { alto: 1, medio: 3, baixo: 0 },
  },
  semanaAtual: null,
  historico: {
    semanas: [
      { inicioISO: "2026-08-23", nota: 78.4, badge: "prata", porArea: { "ar-saude": 34, "ar-estudos": 28, "ar-foco": 16.4 }, destaques: [{ nome: "Treino A", pontos: 24 }, { nome: "Manhã", pontos: 18 }] },
      { inicioISO: "2026-08-30", nota: 91.2, badge: "ouro", porArea: { "ar-saude": 40, "ar-estudos": 31, "ar-foco": 20.2 }, destaques: [{ nome: "Treino A", pontos: 27 }, { nome: "Leitura", pontos: 20 }] },
      { inicioISO: "2026-09-06", nota: 64.0, badge: "bronze", porArea: { "ar-saude": 25, "ar-estudos": 22, "ar-foco": 17 }, destaques: [{ nome: "Manhã", pontos: 19 }] },
      { inicioISO: "2026-09-13", nota: 83.6, badge: "prata", porArea: { "ar-saude": 36, "ar-estudos": 30, "ar-foco": 17.6 }, destaques: [{ nome: "Treino A", pontos: 25 }, { nome: "Leitura", pontos: 21 }, { nome: "Manhã", pontos: 17 }] },
    ],
    meses: [{ anoMes: "2026-08", nota: 78.4, badge: "prata", bonusMetas: 0 }],
    trimestres: [],
    anos: [],
  },
  metasPontos: {},
  badges: [
    { escopo: "mensal", tipo: "prata", periodo: "2026-08", nota: 78.4, emitidaEm: new Date("2026-09-01T08:00:00-03:00").getTime() },
    { escopo: "semanal", tipo: "prata", periodo: "2026-08-23", nota: 78.4, emitidaEm: new Date("2026-08-30T08:00:00-03:00").getTime() },
    { escopo: "semanal", tipo: "ouro", periodo: "2026-08-30", nota: 91.2, emitidaEm: new Date("2026-09-06T08:00:00-03:00").getTime() },
    { escopo: "semanal", tipo: "bronze", periodo: "2026-09-06", nota: 64.0, emitidaEm: new Date("2026-09-13T08:00:00-03:00").getTime() },
    { escopo: "semanal", tipo: "prata", periodo: "2026-09-13", nota: 83.6, emitidaEm: new Date("2026-09-20T08:00:00-03:00").getTime() },
  ],
};

// Agenda: bloco escrito na nota do dia, cartões do kanban do dia e compromissos
const diario = {
  "dia:2026-09-23": "- [x] 09:00-10:00 Reunião de alinhamento\n- [ ] 14:00 Estudar inglês\n- [>] 16:30-17:30 Dentista (adiado)\n",
};
const diaKanban = [
  { id: "dk1", text: "Comprar presente", col: "todo", per: "dia:2026-09-23", ord: 0, hIni: "11:00", hFim: "11:45", tagValor: "baixo" },
  { id: "dk2", text: "Ligar para o contador", col: "done", per: "dia:2026-09-23", ord: 1, hIni: "", hFim: "", tagValor: "medio" },
  { id: "dk3", text: "Revisar contrato", col: "todo", per: "dia:2026-09-24", ord: 0, hIni: "10:00", hFim: "", tagValor: "alto" },
];
const compromissos = [
  { id: "cp1", title: "Consulta médica", date: "2026-09-23", time: "15:30", notify: "nodia", createdAt: t0 - 5 * DIA },
  { id: "cp2", title: "Aniversário da Ana", date: "2026-09-25", time: "", notify: "nenhuma", createdAt: t0 - 5 * DIA },
];

// chaves do localStorage legado: K_PREFIX + nome (src/lib/constants.ts)
export const seedLocalStorage = {
  rotinas_v2_routines: routines,
  rotinas_v2_history: history,
  rotinas_v2_notes: notes,
  rotinas_v2_templates: templates,
  rotinas_v2_gamificacao: gamificacao,
  rotinas_v2_diario: diario,
  rotinas_v2_diakanban: diaKanban,
  rotinas_v2_compromissos: compromissos,
};
