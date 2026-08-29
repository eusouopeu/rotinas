// Extensão de gamificacao.ts que DEPENDE de rotinas+agenda (index.html:1279-
// 1585, 1740-1789) — separada do núcleo puro porque só faz sentido existir
// agora que Routine/computeSchedule/rotinaAgendadaEm já foram portados.
// Sem efeitos colaterais: cada função devolve o `gam` atualizado em vez de
// mutar+save() direto (quem chama, a store, decide o que persistir).
//
// Simplificação desta fase: o desconto de "hábito consolidado"
// (gam.config.habito) sempre usa mapaHab={} (nenhuma rotina é tratada como
// hábito) porque computeStreakFor depende de K_HISTORY com o formato de
// execução completo, que esta fase começa a gravar mas ainda não lê de volta
// para esse cálculo — capaz de vir na próxima fase, não é regressão: sem
// hábito consolidado a rotina só vale o peso cheio, nunca menos do que devia.
import {
  addDaysISO,
  anoMesDoFimDaSemana,
  badgeParaNota,
  fatoresPorArea,
  fatorNormalizacaoPara,
  fatorParaArea,
  inicioSemanaISO,
  isoToDate,
  localKey,
  offsetSemana,
  pesoBruto,
  trimestreDe,
} from "./gamificacao";
import { rotinaAgendadaEm } from "./schedule";
import { playbackSteps } from "./player";
import type { GamificacaoState, Routine, RoutineStep, SemanaAtual, Tag } from "./types";

export function areaDaRotina(r: Routine, gam: GamificacaoState): string {
  const id = r.eixo || "";
  return gam.config.roda.areas.some((a) => a.id === id) ? id : "";
}

// Porta de fillStyle/corDaRotina (index.html:2386-2395) — cor sólida de
// fallback quando a rotina não tem área própria (era gradiente).
export const FALLBACK_COR = "#6D28D9";
export function fillStyle(c: string | undefined | null): string {
  return !c || c === "grad" || c === "#C98A3E" ? FALLBACK_COR : c;
}
export function corDaRotina(r: Routine, gam: GamificacaoState): string {
  const area = areaDaRotina(r, gam);
  const a = area ? gam.config.roda.areas.find((x) => x.id === area) : null;
  return a ? a.color : "grad";
}

function stepTagEfetiva(s: RoutineStep, r: Routine): Tag {
  return (s.tagValor || r.tagValor || "medio") as Tag;
}

interface AgendaItem {
  itemId: string;
  dia: number;
  area: string;
  pesoBruto: number;
}

/** Porta de construirAgendaSemana (index.html:1306-1330) — mapaHab sempre {}
 * nesta fase (ver comentário no topo do arquivo). */
export function construirAgendaSemana(
  routines: Routine[],
  gam: GamificacaoState,
  inicioISO: string
): { itens: AgendaItem[]; totalBruto: number; porArea: Record<string, number> } {
  const itens: AgendaItem[] = [];
  let totalBruto = 0;
  const porArea: Record<string, number> = {};
  const base = isoToDate(inicioISO);
  for (let dia = 0; dia < 7; dia++) {
    const dataDia = new Date(base);
    dataDia.setDate(dataDia.getDate() + dia);
    routines.forEach((r) => {
      if (!rotinaAgendadaEm(r, dataDia)) return;
      const area = areaDaRotina(r, gam);
      r.steps.forEach((s) => {
        if (s.isRest || s.type !== "timer") return;
        const minutos = (s.seconds || 0) / 60;
        const tag = stepTagEfetiva(s, r);
        const pb = pesoBruto(tag, minutos, gam.config);
        if (pb <= 0) return;
        totalBruto += pb;
        porArea[area] = (porArea[area] || 0) + pb;
        itens.push({ itemId: r.id + ":" + s.id, dia, area, pesoBruto: pb });
      });
    });
  }
  return { itens, totalBruto, porArea };
}

/** Porta de congelarSemana (index.html:1410-1424). */
export function congelarSemana(routines: Routine[], gam: GamificacaoState, inicioISO: string): GamificacaoState {
  const { itens, totalBruto, porArea } = construirAgendaSemana(routines, gam, inicioISO);
  const fator = fatorNormalizacaoPara(totalBruto, gam.config);
  const fatoresArea = fatoresPorArea(porArea, gam.config);
  const semanaAtual: SemanaAtual = {
    inicioISO,
    fatorNormalizacao: fator,
    totalBrutoAgendado: totalBruto,
    fatoresArea,
    habitos: {},
    agendaCongelada: itens.map((it) => ({
      itemId: it.itemId,
      dia: it.dia,
      area: it.area,
      pontos: it.pesoBruto * fatorParaArea(it.area, fatoresArea, fator),
    })),
    concluidos: [],
  };
  return { ...gam, semanaAtual };
}

function pontosGanhosPorArea(sem: SemanaAtual): Record<string, number> {
  const out: Record<string, number> = {};
  (sem.concluidos || []).forEach((c) => {
    const k = c.area || "";
    out[k] = (out[k] || 0) + c.pontos;
  });
  return out;
}

/** Porta de fecharSemanaAtual (index.html:1485-1499) — sem "dispensada" (sem
 * UI ainda para marcar uma semana como tal). */
function fecharSemanaAtual(gam: GamificacaoState): GamificacaoState {
  const sem = gam.semanaAtual!;
  const nota = sem.concluidos.reduce((s, c) => s + c.pontos, 0);
  const badge = badgeParaNota(nota, gam.config);
  const porArea = pontosGanhosPorArea(sem);
  const semanas = [...gam.historico.semanas, { inicioISO: sem.inicioISO, nota, badge, porArea }];
  const badges = badge
    ? [...gam.badges, { escopo: "semanal", tipo: badge, periodo: sem.inicioISO, nota, emitidaEm: Date.now() }]
    : gam.badges;
  return { ...gam, historico: { ...gam.historico, semanas }, badges };
}

/** Porta de fecharMesesPendentes/fecharTrimestresPendentes/fecharAnosPendentes
 * (index.html:1512-1570), encadeados. */
function fecharPeriodosPendentes(gam: GamificacaoState, hojeISO: string): GamificacaoState {
  const hojeAnoMes = hojeISO.slice(0, 7);
  const porMes: Record<string, number[]> = {};
  gam.historico.semanas.forEach((s) => {
    const am = anoMesDoFimDaSemana(s.inicioISO);
    (porMes[am] = porMes[am] || []).push(s.nota);
  });
  let meses = gam.historico.meses;
  let badges = gam.badges;
  Object.keys(porMes)
    .sort()
    .forEach((am) => {
      if (am >= hojeAnoMes || meses.some((m) => m.anoMes === am)) return;
      const notas = porMes[am];
      const bonus = gam.metasPontos[am] || 0;
      const nota = notas.reduce((a, b) => a + b, 0) / notas.length + bonus;
      const badge = badgeParaNota(nota, gam.config);
      meses = [...meses, { anoMes: am, nota, badge, bonusMetas: bonus }];
      if (badge) badges = [...badges, { escopo: "mensal", tipo: badge, periodo: am, nota, emitidaEm: Date.now() }];
    });

  const atual = trimestreDe(hojeAnoMes);
  const porTri: Record<string, number[]> = {};
  meses.forEach((m) => {
    const t = trimestreDe(m.anoMes);
    (porTri[t] = porTri[t] || []).push(m.nota);
  });
  let trimestres = gam.historico.trimestres;
  Object.keys(porTri)
    .sort()
    .forEach((t) => {
      if (t >= atual || trimestres.some((x) => x.anoTri === t)) return;
      const notas = porTri[t];
      const bonus = gam.metasPontos[t] || 0;
      const nota = notas.reduce((a, b) => a + b, 0) / notas.length + bonus;
      const badge = badgeParaNota(nota, gam.config);
      trimestres = [...trimestres, { anoTri: t, nota, badge, bonusMetas: bonus }];
      if (badge) badges = [...badges, { escopo: "trimestral", tipo: badge, periodo: t, nota, emitidaEm: Date.now() }];
    });

  const hojeAno = +hojeISO.slice(0, 4);
  const porAno: Record<number, number[]> = {};
  meses.forEach((m) => {
    const ano = +m.anoMes.slice(0, 4);
    (porAno[ano] = porAno[ano] || []).push(m.nota);
  });
  let anos = gam.historico.anos;
  Object.keys(porAno)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((ano) => {
      if (ano >= hojeAno || anos.some((a) => a.ano === ano)) return;
      const notas = porAno[ano];
      const bonus = gam.metasPontos[String(ano)] || 0;
      const nota = notas.reduce((a, b) => a + b, 0) / notas.length + bonus;
      const badge = badgeParaNota(nota, gam.config);
      anos = [...anos, { ano, nota, badge, bonusMetas: bonus }];
      if (badge) badges = [...badges, { escopo: "anual", tipo: badge, periodo: String(ano), nota, emitidaEm: Date.now() }];
    });

  return { ...gam, historico: { semanas: gam.historico.semanas, meses, trimestres, anos }, badges };
}

/** Porta de avancarGamificacaoAteAgora (index.html:1573-1585) — roda no boot
 * e antes de creditar pontos: o app pode ter ficado dias fechado. */
export function avancarGamificacaoAteAgora(routines: Routine[], gam: GamificacaoState): GamificacaoState {
  let atual = gam.semanaAtual ? gam : { ...gam, semanaAtual: congelarSemana(routines, gam, inicioSemanaISO(new Date())).semanaAtual };
  const hojeISO = inicioSemanaISO(new Date());
  let guard = 0;
  while (atual.semanaAtual!.inicioISO < hojeISO && guard < 260) {
    atual = fecharSemanaAtual(atual);
    atual = congelarSemana(routines, atual, addDaysISO(atual.semanaAtual!.inicioISO, 7));
    guard++;
  }
  atual = fecharPeriodosPendentes(atual, hojeISO);
  return atual;
}

/** Porta de pesoBruto*fatorHabito + registrarConclusao(tipo:"step")
 * (index.html:1746-1778) — fatorHabito sempre 1 nesta fase (ver topo do
 * arquivo). Devolve null se já creditado ou sem peso (peso "nenhum" etc). */
export function registrarConclusaoStep(
  routines: Routine[],
  gam: GamificacaoState,
  dados: { routineId: string; stepId: string; tag: Tag; minutos: number; area: string; rotulo: string },
  data: Date = new Date()
): { gam: GamificacaoState; entry: SemanaAtual["concluidos"][number] | null } {
  let atual = avancarGamificacaoAteAgora(routines, gam);
  const dataISO = localKey(data);
  const dia = offsetSemana(data.getDay());
  const pbBase = pesoBruto(dados.tag, dados.minutos, atual.config);
  if (pbBase <= 0) return { gam: atual, entry: null };

  const baseStepId = dados.stepId.replace(/-c\d+$/, "");
  const itemId = dados.routineId + ":" + baseStepId + ":" + dataISO;
  if (atual.semanaAtual!.concluidos.some((c) => c.itemId === itemId)) return { gam: atual, entry: null };

  const agendaItem = atual.semanaAtual!.agendaCongelada.find(
    (a) => a.itemId === dados.routineId + ":" + baseStepId && a.dia === dia
  );
  let area = dados.area;
  let pontos: number;
  if (agendaItem) {
    pontos = agendaItem.pontos;
    if (agendaItem.area != null) area = agendaItem.area;
  } else {
    pontos = pbBase * fatorParaArea(area, atual.semanaAtual!.fatoresArea, atual.semanaAtual!.fatorNormalizacao);
  }
  const entry = { itemId, pontos, pb: pbBase, area, dataISO, rotulo: dados.rotulo };
  const semanaAtual = { ...atual.semanaAtual!, concluidos: [...atual.semanaAtual!.concluidos, entry] };
  return { gam: { ...atual, semanaAtual }, entry };
}

/** Porta de desfazerConclusao (index.html:1781-1788) — usado por goPrevStep. */
export function desfazerConclusao(gam: GamificacaoState, itemId: string | undefined): GamificacaoState {
  if (!itemId || !gam.semanaAtual) return gam;
  const concluidos = gam.semanaAtual.concluidos.filter((c) => c.itemId !== itemId);
  if (concluidos.length === gam.semanaAtual.concluidos.length) return gam;
  return { ...gam, semanaAtual: { ...gam.semanaAtual, concluidos } };
}

/** Duração planejada da rotina em segundos, incluindo descansos entre etapas
 * — mesma conta de finishRoutine (index.html:11836): soma dos segundos de
 * playbackSteps (que já intercala os descansos), usada pro registro de
 * histórico. */
export function totalPlanejadoSegundos(routine: Routine): number {
  return playbackSteps(routine).reduce((acc, s) => acc + (s.type === "timer" ? s.seconds || 0 : 0), 0);
}
