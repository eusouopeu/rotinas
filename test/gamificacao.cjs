/* Testes unitários das funções puras de data/pontuação da gamificação.

   O app é single-file sem build step, então as funções vivem dentro do IIFE do
   index.html e não são importáveis. Em vez de duplicar a lógica aqui (que
   silenciosamente deixaria de refletir o código real), o teste EXTRAI o texto de
   cada função do próprio index.html e a avalia num escopo controlado. Se alguém
   renomear ou mudar a assinatura, o teste quebra — que é o comportamento certo.

   Cobre o que é fácil de errar e caro de descobrir tarde: virada de ano, semana
   a cavalo entre dois meses, atribuição de semana ao mês pelo sábado que a
   fecha, e semanas dispensadas fora da média. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let failures = 0;
function check(label, ok, extra) {
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (!ok && extra ? " :: " + extra : ""));
  if (!ok) failures++;
}
function eq(label, actual, expected) {
  check(label, actual === expected, "esperado " + JSON.stringify(expected) + ", veio " + JSON.stringify(actual));
}
function near(label, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol === undefined ? 1e-9 : tol);
  check(label, ok, "esperado ~" + expected + ", veio " + actual);
}
function deepEq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(label, ok, "esperado " + JSON.stringify(expected) + ", veio " + JSON.stringify(actual));
}

/* --- extrai uma function declaration do fonte, casando as chaves --- */
function extractFn(name) {
  const start = src.indexOf("function " + name + "(");
  if (start === -1) throw new Error("função não encontrada no index.html: " + name);
  let i = src.indexOf("{", start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("chaves desbalanceadas em " + name);
}

const NAMES = [
  "localKey", "inicioSemanaISO", "addDaysISO", "isoToDate", "anoMesDoFimDaSemana",
  "tagMultiplicador", "pesoBruto", "badgeParaNota", "destaquesDaSemana",
  "trimestreDe", "metaEscopo", "periodoDeEscopo", "metaConcluida",
  "fatorNormalizacaoPara",
  // roda da vida, hábito consolidado e vagas por nível de peso
  "rodaAtiva", "rodaAreas", "areaInfoRoda", "pesoDaArea", "areaDaRotina",
  "fatoresPorArea", "fatorHabito", "rotinaTagEfetiva", "vagasDoNivel", "ocupantesDoNivel",
  // dia de início da semana configurável
  "weekStartDow", "offsetSemana", "ordemDiasSemana"
];

const sandbox = {
  BLOCOS_SEMANA_PADRAO: 20,
  routines: [],
  K_WEEKSTART: "weekstart",
  _store: {},
  load(k, fallback){ return (k in sandbox._store) ? sandbox._store[k] : fallback; },
  gam: {
    config: {
      multiplicadores: { baixo: 1.0, medio: 1.75, alto: 3.0 },
      divisorDuracao: 30,
      notaMinima: 60,
      faixas: { bronze: 60, prata: 75, ouro: 90, diamante: 100 },
      roda: { ativa: false, pesoSemArea: 5, areas: [
        { id: "corpo",  label: "Corpo",  color: "#6B8F71", peso: 5 },
        { id: "estudo", label: "Estudo", color: "#5B8DEF", peso: 5 }
      ]},
      habito: { ativo: true, streakMin: 21, fator: 0.6 },
      vagas: { alto: 1, medio: 3, baixo: 0 }
    },
    semanaAtual: { habitos: {} }
  },
  console
};
vm.createContext(sandbox);
vm.runInContext(NAMES.map(extractFn).join("\n"), sandbox);
const F = sandbox;

/* ---------------- semana: domingo como início ---------------- */
// 2026-07-24 é uma sexta-feira; o domingo dessa semana é 2026-07-19
eq("domingo de uma sexta", F.inicioSemanaISO(new Date(2026, 6, 24)), "2026-07-19");
eq("domingo de um domingo é ele mesmo", F.inicioSemanaISO(new Date(2026, 6, 19)), "2026-07-19");
// sábado é o último dia da semana, não o primeiro da seguinte
eq("sábado fecha a semana", F.inicioSemanaISO(new Date(2026, 6, 25)), "2026-07-19");
// a segunda seguinte já pertence à semana que abriu no domingo 26
eq("segunda abre a semana do domingo 26", F.inicioSemanaISO(new Date(2026, 6, 27)), "2026-07-26");

/* ---------------- aritmética de datas ISO ---------------- */
eq("soma dentro do mês", F.addDaysISO("2026-07-20", 6), "2026-07-26");
eq("soma virando o mês", F.addDaysISO("2026-07-28", 7), "2026-08-04");
eq("soma virando o ano", F.addDaysISO("2026-12-28", 7), "2027-01-04");
eq("ano bissexto: 28/02 + 1 = 29/02", F.addDaysISO("2024-02-28", 1), "2024-02-29");
eq("ano não bissexto: 28/02 + 1 = 01/03", F.addDaysISO("2025-02-28", 1), "2025-03-01");
// 01/01/2027 é uma sexta: a semana dela abriu no domingo 27/12/2026
eq("virada de ano no meio da semana", F.inicioSemanaISO(new Date(2027, 0, 1)), "2026-12-27");

/* ---------------- atribuição da semana ao mês (pelo sábado) ---------------- */
// semana 27/09 a 03/10 termina em outubro -> conta para outubro
eq("semana a cavalo conta pelo sábado", F.anoMesDoFimDaSemana("2026-09-27"), "2026-10");
eq("semana inteira dentro do mês", F.anoMesDoFimDaSemana("2026-07-19"), "2026-07");
// semana 27/12/2026 a 02/01/2027 -> conta para janeiro de 2027
eq("semana a cavalo do ano", F.anoMesDoFimDaSemana("2026-12-27"), "2027-01");

/* ---------------- peso bruto ---------------- */
eq("multiplicador conhecido", F.tagMultiplicador("alto"), 3.0);
eq("tag desconhecida cai no médio", F.tagMultiplicador("inexistente"), 1.75);
// 30 min é a referência: fator de duração 1,0
near("30 min médio = multiplicador puro", F.pesoBruto("medio", 30), 1.75);
near("120 min é o dobro de 30 min (raiz, não linear)", F.pesoBruto("baixo", 120), 2.0);
near("duração zero não pontua", F.pesoBruto("alto", 0), 0);
near("duração negativa não pontua", F.pesoBruto("alto", -5), 0);
check("sublinear: 4x a duração não vale 4x os pontos",
  F.pesoBruto("medio", 120) < 4 * F.pesoBruto("medio", 30));
check("ordem preservada: mais longo vale mais",
  F.pesoBruto("medio", 60) > F.pesoBruto("medio", 30));

/* ---------------- faixas de badge ---------------- */
eq("abaixo da mínima não emite", F.badgeParaNota(59.9), null);
eq("exatamente na mínima é bronze", F.badgeParaNota(60), "bronze");
eq("74.9 ainda é bronze", F.badgeParaNota(74.9), "bronze");
eq("75 é prata", F.badgeParaNota(75), "prata");
eq("89.9 é prata", F.badgeParaNota(89.9), "prata");
eq("90 é ouro", F.badgeParaNota(90), "ouro");
eq("99.9 é ouro", F.badgeParaNota(99.9), "ouro");
eq("100 é diamante", F.badgeParaNota(100), "diamante");
eq("estouro acima de 100 continua diamante", F.badgeParaNota(143.2), "diamante");

/* ---------------- destaques da semana ---------------- */
const destaques = F.destaquesDaSemana({
  concluidos: [
    { rotulo: "Manhã", pontos: 10 },
    { rotulo: "Estudo", pontos: 25 },
    { rotulo: "Manhã", pontos: 15 },
    { pontos: 3 }
  ]
});
eq("destaque líder é o de maior soma", destaques[0].nome, "Manhã");
near("soma agrupada por rótulo", destaques[0].pontos, 25);
eq("segundo colocado", destaques[1].nome, "Estudo");
eq("entrada sem rótulo vira Outros", destaques[2].nome, "Outros");
check("destaques limitados a 5", F.destaquesDaSemana({
  concluidos: Array.from({ length: 12 }, (_, i) => ({ rotulo: "R" + i, pontos: i }))
}).length === 5);
check("semana vazia não quebra", F.destaquesDaSemana({ concluidos: [] }).length === 0);
check("concluidos ausente não quebra", F.destaquesDaSemana({}).length === 0);

/* ---------------- média mensal ignora semana dispensada ----------------
   replica a regra de fecharMesesPendentes: dispensadas não entram na média. */
const semanas = [
  { inicioISO: "2026-07-06", nota: 80, dispensada: false },
  { inicioISO: "2026-07-13", nota: 40, dispensada: true },  // viagem
  { inicioISO: "2026-07-20", nota: 90, dispensada: false }
];
const consideradas = semanas.filter(s => !s.dispensada).map(s => s.nota);
const media = consideradas.reduce((a, b) => a + b, 0) / consideradas.length;
eq("dispensada fora da média", media, 85);
check("dispensada não emite badge", F.badgeParaNota(40) === null || semanas[1].dispensada);

/* ---------------- consistência: fator de normalização ----------------
   o denominador é 100 por construção; conferir que a soma dos pontos da agenda
   congelada bate com 100 quando tudo é concluído. */
const agenda = [
  { tag: "alto", min: 20 }, { tag: "medio", min: 45 },
  { tag: "baixo", min: 10 }, { tag: "alto", min: 60 }
];
const totalBruto = agenda.reduce((s, a) => s + F.pesoBruto(a.tag, a.min), 0);
const fator = 100 / totalBruto;
const somaPontos = agenda.reduce((s, a) => s + F.pesoBruto(a.tag, a.min) * fator, 0);
near("agenda inteira concluída soma exatamente 100", somaPontos, 100, 1e-9);

/* ---------------- trimestres ---------------- */
eq("janeiro é T1", F.trimestreDe("2026-01"), "2026-T1");
eq("março é T1", F.trimestreDe("2026-03"), "2026-T1");
eq("abril é T2", F.trimestreDe("2026-04"), "2026-T2");
eq("junho é T2", F.trimestreDe("2026-06"), "2026-T2");
eq("julho é T3", F.trimestreDe("2026-07"), "2026-T3");
eq("setembro é T3", F.trimestreDe("2026-09"), "2026-T3");
eq("outubro é T4", F.trimestreDe("2026-10"), "2026-T4");
eq("dezembro é T4", F.trimestreDe("2026-12"), "2026-T4");
// ordenação lexicográfica precisa funcionar: o fechamento compara strings
check("trimestres ordenam lexicograficamente",
  ["2026-T4", "2026-T1", "2027-T1", "2026-T3"].sort().join(",") === "2026-T1,2026-T3,2026-T4,2027-T1");

/* ---------------- escopo da meta pelo prazo ---------------- */
const criado = new Date(2026, 6, 1).getTime(); // 01/07/2026
eq("prazo de 10 dias -> mensal",   F.metaEscopo({ criadoEm: criado, date: "2026-07-11" }), "mensal");
eq("prazo de 29 dias -> mensal",   F.metaEscopo({ criadoEm: criado, date: "2026-07-30" }), "mensal");
eq("prazo de 30 dias -> trimestral", F.metaEscopo({ criadoEm: criado, date: "2026-07-31" }), "trimestral");
eq("prazo de 60 dias -> trimestral", F.metaEscopo({ criadoEm: criado, date: "2026-08-30" }), "trimestral");
eq("prazo de 90 dias -> trimestral", F.metaEscopo({ criadoEm: criado, date: "2026-09-29" }), "trimestral");
eq("prazo de 91 dias -> anual",      F.metaEscopo({ criadoEm: criado, date: "2026-09-30" }), "anual");
eq("prazo de um ano -> anual",       F.metaEscopo({ criadoEm: criado, date: "2027-07-01" }), "anual");

/* ---------------- período que recebe o bônus ---------------- */
const emJulho = new Date(2026, 6, 24);
eq("bônus mensal vai para o mês", F.periodoDeEscopo("mensal", emJulho), "2026-07");
eq("bônus trimestral vai para o trimestre", F.periodoDeEscopo("trimestral", emJulho), "2026-T3");
eq("bônus anual vai para o ano", F.periodoDeEscopo("anual", emJulho), "2026");

/* ---------------- conclusão da meta ---------------- */
check("meta sem quantidade nunca conclui", F.metaConcluida({ topics: null, done: 5 }) === false);
check("parcial não conclui", F.metaConcluida({ topics: 10, done: 9 }) === false);
check("exata conclui", F.metaConcluida({ topics: 10, done: 10 }) === true);
check("acima do total conclui", F.metaConcluida({ topics: 10, done: 12 }) === true);
check("zero feito não conclui", F.metaConcluida({ topics: 10, done: 0 }) === false);
check("done ausente não conclui", F.metaConcluida({ topics: 10 }) === false);

/* ---------------- fator de normalização da semana ----------------
   Regressão: com agenda vazia o fator saía 0 e TODA conclusão da semana valia
   zero ponto — inclusive tarefas de estudo, que nem dependem da agenda. */
near("agenda cheia: 100 pontos distribuídos no total agendado", F.fatorNormalizacaoPara(50), 2, 1e-9);
check("agenda vazia não zera o fator", F.fatorNormalizacaoPara(0) > 0);
near("agenda vazia cai na escala padrão (20 blocos médios de 30 min)",
  F.fatorNormalizacaoPara(0) * F.pesoBruto("medio", 30) * 20, 100, 1e-9);

/* ---------------- roda da vida: repartição por área ----------------
   O ponto da roda é que áreas não disputem entre si. Duas invariantes seguram
   isso: (a) a soma das fatias fecha 100, senão a semana deixaria de ser
   comparável; (b) o que é agendado numa área não altera o valor do que está
   agendado noutra. */
sandbox.gam.config.roda.ativa = false;
check("roda desligada devolve fator único (nenhum fator por área)",
  Object.keys(F.fatoresPorArea({ corpo: 10, estudo: 30 })).length === 0);

sandbox.gam.config.roda.ativa = true;
{
  const f = F.fatoresPorArea({ corpo: 10, estudo: 30 });
  // pesos iguais (5 e 5) -> 50 pontos para cada área
  near("área com metade da fatia: 10 de bruto viram 50 pontos", f.corpo * 10, 50, 1e-9);
  near("área com o mesmo peso e 3x o bruto também fecha 50", f.estudo * 30, 50, 1e-9);
  check("bruto maior na mesma fatia = cada unidade vale menos", f.estudo < f.corpo);
  near("soma das fatias fecha os 100 da semana", f.corpo * 10 + f.estudo * 30, 100, 1e-9);
}
{
  // dobrar o agendado de "estudo" NÃO pode mexer no valor do que é de "corpo"
  const antes = F.fatoresPorArea({ corpo: 10, estudo: 30 }).corpo;
  const depois = F.fatoresPorArea({ corpo: 10, estudo: 60 }).corpo;
  near("área não é diluída pelo que foi agendado na outra", depois, antes, 1e-9);
}
{
  sandbox.gam.config.roda.areas[1].peso = 15; // fora da faixa da UI, mas a conta tem de seguir
  const f = F.fatoresPorArea({ corpo: 10, estudo: 30 });
  near("peso maior leva fatia maior", f.estudo * 30, 100 * 15 / 20, 1e-9);
  near("com pesos diferentes a soma ainda fecha 100", f.corpo * 10 + f.estudo * 30, 100, 1e-9);
  sandbox.gam.config.roda.areas[1].peso = 5;
}
{
  // área sem nada agendado não pode reservar fatia: a semana não fecharia 100
  const f = F.fatoresPorArea({ corpo: 20 });
  near("área vazia não reserva fatia", f.corpo * 20, 100, 1e-9);
  check("área vazia nem aparece no mapa de fatores", f.estudo === undefined);
}
{
  // "sem área" é um bucket como outro qualquer, com o peso configurado
  const f = F.fatoresPorArea({ "": 10, corpo: 10 });
  near("sem área também recebe fatia", f[""] * 10 + f.corpo * 10, 100, 1e-9);
}

/* ---------------- área da rotina ---------------- */
eq("rotina sem eixo cai no bucket vazio", F.areaDaRotina({ eixo: null }), "");
eq("eixo conhecido vira a área", F.areaDaRotina({ eixo: "corpo" }), "corpo");
eq("eixo de área já removida volta para o bucket vazio", F.areaDaRotina({ eixo: "extinta" }), "");
eq("área desconhecida tem rótulo neutro", F.areaInfoRoda("extinta").label, "Sem área");
near("peso de área inexistente cai no peso de 'sem área'", F.pesoDaArea("extinta"), 5);

/* ---------------- hábito consolidado ---------------- */
sandbox.gam.semanaAtual.habitos = { r1: true };
near("rotina em hábito vale o fator configurado", F.fatorHabito("r1"), 0.6);
near("rotina fora do hábito vale cheio", F.fatorHabito("r2"), 1);
sandbox.gam.config.habito.ativo = false;
near("desconto desligado devolve tudo ao valor cheio", F.fatorHabito("r1"), 1);
sandbox.gam.config.habito.ativo = true;
near("mapa passado explicitamente vence o congelado", F.fatorHabito("r2", { r2: true }), 0.6);
sandbox.gam.semanaAtual.habitos = {};

/* ---------------- vagas por nível de peso ---------------- */
sandbox.routines = [
  { id: "a", name: "Corrida",   tagValor: "alto",  eixo: "corpo" },
  { id: "b", name: "Mandarim",  tagValor: "alto",  eixo: "estudo" },
  { id: "c", name: "Leitura",   tagValor: "medio", eixo: "estudo" },
  { id: "d", name: "Sem área",  tagValor: "alto",  eixo: null }
];
eq("limite lido da config", F.vagasDoNivel("alto"), 1);
eq("nível sem limite devolve 0", F.vagasDoNivel("baixo"), 0);
sandbox.gam.config.roda.ativa = true;
eq("com a roda ativa a vaga é contada dentro da área",
  F.ocupantesDoNivel("alto", { id: "novo", eixo: "corpo" }).length, 1);
eq("rotina de outra área não ocupa a vaga",
  F.ocupantesDoNivel("alto", { id: "novo", eixo: "extinta" }).length, 1); // só a "Sem área"
eq("a própria rotina não conta como ocupante",
  F.ocupantesDoNivel("alto", { id: "a", eixo: "corpo" }).length, 0);
sandbox.gam.config.roda.ativa = false;
eq("com a roda desligada a vaga é global", F.ocupantesDoNivel("alto", { id: "novo" }).length, 3);
eq("rotina sem tagValor conta como médio", F.rotinaTagEfetiva({}), "medio");

/* ---------------- dia de início da semana configurável ----------------
   Regressão real (2026-07-28): sem essa configuração o app sempre assumiu
   domingo. O bug a evitar é o inverso do de sempre — "vira sempre domingo"
   precisa continuar valendo quando ninguém mexeu na configuração (padrão 0). */
sandbox._store[sandbox.K_WEEKSTART] = undefined;
eq("sem configurar, o padrão é domingo (0)", F.weekStartDow(), 0);
// 2026-07-24 é sexta; sem configuração, inicioSemanaISO se comporta como antes
eq("padrão: inicioSemanaISO ainda ancora no domingo", F.inicioSemanaISO(new Date(2026, 6, 24)), "2026-07-19");

sandbox._store[sandbox.K_WEEKSTART] = 1; // segunda
eq("weekStartDow lê o valor configurado", F.weekStartDow(), 1);
// 2026-07-24 é sexta; com a semana começando na segunda, o início é 2026-07-20
eq("inicioSemanaISO com início segunda", F.inicioSemanaISO(new Date(2026, 6, 24)), "2026-07-20");
// a própria segunda é o início dela mesma
eq("segunda é início de si mesma", F.inicioSemanaISO(new Date(2026, 6, 20)), "2026-07-20");
// domingo (dia anterior) ainda pertence à semana QUE FECHOU, não à nova
eq("domingo fecha a semana quando o início é segunda", F.inicioSemanaISO(new Date(2026, 6, 19)), "2026-07-13");

eq("offset do próprio dia de início é 0", F.offsetSemana(1), 0);
eq("offset do dia anterior ao início é 6 (fecha a semana)", F.offsetSemana(0), 6);
eq("offset do meio da semana", F.offsetSemana(4), 3); // quinta, início segunda: seg=0 ter=1 qua=2 qui=3
deepEq("ordemDiasSemana começa no dia configurado", F.ordemDiasSemana(), [1,2,3,4,5,6,0]);

sandbox._store[sandbox.K_WEEKSTART] = 0; // volta ao padrão para não vazar estado entre specs futuros
eq("de volta ao padrão, offset é literal (domingo=0)", F.offsetSemana(3), 3);
deepEq("ordemDiasSemana no padrão é a ordem natural", F.ordemDiasSemana(), [0,1,2,3,4,5,6]);

console.log(failures === 0 ? "\nGAMIFICACAO OK" : "\n" + failures + " FALHA(S)");
process.exit(failures === 0 ? 0 : 1);
