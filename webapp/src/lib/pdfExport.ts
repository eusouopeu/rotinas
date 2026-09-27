// Porta dos construtores de HTML de PDF (matrixPdfHtml index.html:7407-7419,
// kbPdf index.html:7888-7892, tvPdf index.html:9673-9682) — cada função
// devolve o `innerHtml` que exportPdfView (lib/exportFile.ts) empacota e
// exporta. Escapa manualmente (o resultado vira `document.write`/arquivo
// .html, não passa pelo escape automático do JSX).
import type {
  KanbanDoc,
  MatrixDoc,
  TravelDoc,
  GamificacaoState,
  Routine,
  MetaTarget,
  CountdownDoc,
  ProsConsDoc,
  MetaRecorrente,
  Snooze,
} from "./types";
import type { HistoryEntry } from "./history";
import { localKey, anoMesDoFimDaSemana, addDaysISO, isoToDate } from "./gamificacao";
import { notaSemanaAtual, pontosPorAreaSemana } from "./boletim";
import { computeStreak } from "./stats";
import {
  metaConcluida,
  cdPace,
  cdUnit,
  daysUntil,
  metaRecCumprido,
  metaRecSequencia,
  virarPeriodoMetaRec,
} from "./metas";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function matrixPdfHtml(doc: MatrixDoc): string {
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  if (doc.axisX || doc.axisY)
    inner += `<p class="meta">Eixos: ${escapeHtml(doc.axisX || "—")} × ${escapeHtml(doc.axisY || "—")}</p>`;
  inner += `<div class="mxgrid">`;
  doc.quadrants.forEach((q) => {
    inner += `<div class="mxq" style="border-color:${q.color}"><h2 style="color:${q.color}">${escapeHtml(q.title)} (${q.items.length})</h2><ul>`;
    q.items.forEach((it) => {
      inner += `<li class="${it.indent ? "sub" : ""} ${q.mode === "check" && it.checked ? "done" : ""}">${escapeHtml(it.text)}</li>`;
    });
    inner += `</ul></div>`;
  });
  return inner + `</div>`;
}

export function kanbanPdfHtml(doc: KanbanDoc): string {
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  doc.cols.forEach((c) => {
    inner +=
      "<h2>" +
      escapeHtml(c.title) +
      " (" +
      c.items.length +
      ")</h2><ul>" +
      c.items.map((i) => "<li>" + escapeHtml(i.text) + "</li>").join("") +
      "</ul>";
  });
  return inner;
}

export function travelPdfHtml(doc: TravelDoc): string {
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  const byCat: Record<string, TravelDoc["items"]> = {};
  doc.items.forEach((it) => {
    (byCat[it.cat || "Outros"] = byCat[it.cat || "Outros"] || []).push(it);
  });
  doc.catOrder.concat(Object.keys(byCat).filter((c) => !doc.catOrder.includes(c))).forEach((cat) => {
    const list = byCat[cat];
    if (!list || !list.length) return;
    inner +=
      "<h2>" +
      escapeHtml(cat) +
      "</h2><ul>" +
      list
        .map(
          (i) =>
            `<li class="${i.checked ? "done" : ""}">${i.checked ? "☑" : "☐"} ${escapeHtml(i.name)}${i.qty && i.qty > 1 ? " ×" + i.qty : ""}</li>`
        )
        .join("") +
      "</ul>";
  });
  return inner;
}

export function metasPdfHtml(doc: CountdownDoc): string {
  let inner = "<h1>Metas</h1><ul>";
  [...(doc.targets || [])]
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
    .forEach((t) => {
      const d = daysUntil(t.date);
      const p = cdPace(t);
      const [y, m, dd] = t.date.split("-");
      inner +=
        "<li><b>" +
        escapeHtml(t.title) +
        "</b> — " +
        dd +
        "/" +
        m +
        "/" +
        y +
        " — " +
        (d >= 0 ? "faltam " + d + " dia(s)" : Math.abs(d) + " dia(s) atrás");
      if (p && t.topics != null)
        inner += " — " + (t.done || 0) + "/" + t.topics + " " + escapeHtml(cdUnit(t)) + " (" + p.txt + ")";
      inner += "</li>";
    });
  inner += "</ul><p class='meta'>gerado em " + localKey() + "</p>";
  return inner;
}

export function prosConsPdfHtml(doc: ProsConsDoc): string {
  const pros = doc.pros || [];
  const cons = doc.cons || [];
  const ps = pros.reduce((a, i) => a + i.w, 0);
  const cs = cons.reduce((a, i) => a + i.w, 0);
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  inner +=
    "<h2 style='color:#4F7A57;'>Prós (" +
    ps +
    ")</h2><ul>" +
    pros.map((i) => "<li>" + escapeHtml(i.text) + " <span class='meta'>(peso " + i.w + ")</span></li>").join("") +
    "</ul>";
  inner +=
    "<h2 style='color:#B0503F;'>Contras (" +
    cs +
    ")</h2><ul>" +
    cons.map((i) => "<li>" + escapeHtml(i.text) + " <span class='meta'>(peso " + i.w + ")</span></li>").join("") +
    "</ul>";
  inner +=
    "<p class='score'>Placar: " +
    (ps - cs > 0 ? "+" : "") +
    (ps - cs) +
    " — " +
    (ps > cs ? "prós vencem" : cs > ps ? "contras vencem" : "empate") +
    "</p>";
  return inner;
}

function relatorioTopRotinasHtml(concluidos: Array<{ rotulo?: string; pontos: number }>): string {
  const porRotulo: Record<string, number> = {};
  concluidos.forEach((c) => {
    if (!c.rotulo) return;
    porRotulo[c.rotulo] = (porRotulo[c.rotulo] || 0) + c.pontos;
  });
  const top = Object.entries(porRotulo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (!top.length) return "";
  return (
    "<h2>Maiores contribuições</h2><ul>" +
    top.map(([nome, pts]) => `<li>${escapeHtml(nome)} — ${pts.toFixed(1)} pts</li>`).join("") +
    "</ul>"
  );
}

function relatorioSemanalHtml(
  gam: GamificacaoState,
  history: HistoryEntry[],
  routines: Routine[],
  targets: MetaTarget[],
  hojeIso: string,
  snoozes: Snooze[] = []
): { title: string; inner: string } {
  if (!gam.semanaAtual) {
    return {
      title: "Relatório da semana",
      inner: `<h1>Relatório da semana</h1><p class="meta">Sem semana em curso.</p><p class="meta">gerado em ${hojeIso}</p>`,
    };
  }
  const sem = gam.semanaAtual;
  const nota = notaSemanaAtual(sem);
  const porArea = pontosPorAreaSemana(sem, gam.config);
  const streak = computeStreak(routines, history, undefined, snoozes);
  let inner = `<h1>Relatório da semana</h1><p class="score">Pontuação: ${nota.toFixed(1)} pts</p>`;
  if (streak > 0) inner += `<p class="meta">Sequência atual: ${streak} dia(s)</p>`;
  if (porArea.linhas.length) {
    inner +=
      "<h2>Por área</h2><ul>" +
      porArea.linhas
        .map(
          (l) =>
            `<li>${escapeHtml(l.label)}: ${l.pontos.toFixed(1)} pts${
              gam.config.roda.ativa && l.previsto ? " de " + l.previsto.toFixed(1) + " previstos" : ""
            }</li>`
        )
        .join("") +
      "</ul>";
  }
  inner += relatorioTopRotinasHtml(sem.concluidos || []);
  const inicio = sem.inicioISO;
  const feitas = history.filter((h) => h.date >= inicio);
  if (feitas.length) {
    inner += `<h2>Rotinas concluídas</h2><p class="meta">${feitas.length} execução(ões) desde ${inicio}</p>`;
  }
  const metasSemana = targets.filter((t) => metaConcluida(t) && t.date >= inicio);
  if (metasSemana.length) {
    inner +=
      "<h2>Metas concluídas</h2><ul>" + metasSemana.map((t) => `<li>${escapeHtml(t.title)}</li>`).join("") + "</ul>";
  }
  inner += `<p class="meta">gerado em ${hojeIso}</p>`;
  return { title: "Relatório da semana", inner };
}

function relatorioMensalHtml(
  gam: GamificacaoState,
  history: HistoryEntry[],
  targets: MetaTarget[],
  hojeIso: string
): { title: string; inner: string } {
  const anoMes = hojeIso.slice(0, 7);
  const bonusMetas = gam.metasPontos[anoMes] || 0;
  const semanas = gam.historico.semanas.filter((s) => !s.dispensada && anoMesDoFimDaSemana(s.inicioISO) === anoMes);
  const somaSemanas = semanas.reduce((s, w) => s + w.nota, 0);
  let inner = `<h1>Relatório do mês — ${anoMes}</h1><p class="score">Pontuação: ${(somaSemanas + bonusMetas).toFixed(1)} pts</p>
    <p class="meta">${semanas.length} semana(s) fechada(s) neste mês · bônus de metas: ${bonusMetas.toFixed(1)} pts</p>`;
  const inicioMes = anoMes + "-01";
  const feitas = history.filter((h) => h.date >= inicioMes && h.date.slice(0, 7) === anoMes);
  if (feitas.length) inner += `<h2>Rotinas concluídas</h2><p class="meta">${feitas.length} execução(ões) no mês</p>`;
  const metasMes = targets.filter((t) => metaConcluida(t) && t.date.slice(0, 7) === anoMes);
  if (metasMes.length)
    inner +=
      "<h2>Metas concluídas</h2><ul>" + metasMes.map((t) => `<li>${escapeHtml(t.title)}</li>`).join("") + "</ul>";
  inner += `<p class="meta">gerado em ${hojeIso}</p>`;
  return { title: "Relatório do mês", inner };
}

function relatorioAnualHtml(
  gam: GamificacaoState,
  history: HistoryEntry[],
  targets: MetaTarget[],
  hojeIso: string
): { title: string; inner: string } {
  const ano = hojeIso.slice(0, 4);
  const bonusMetas = gam.metasPontos[ano] || 0;
  const meses = gam.historico.meses.filter((m) => m.anoMes.slice(0, 4) === ano);
  const somaMeses = meses.reduce((s, m) => s + m.nota, 0);
  let inner = `<h1>Relatório do ano — ${ano}</h1><p class="score">Pontuação: ${(somaMeses + bonusMetas).toFixed(1)} pts</p>
    <p class="meta">${meses.length} mês(es) fechado(s) neste ano · bônus de metas: ${bonusMetas.toFixed(1)} pts</p>`;
  const feitas = history.filter((h) => h.date.slice(0, 4) === ano);
  if (feitas.length) inner += `<h2>Rotinas concluídas</h2><p class="meta">${feitas.length} execução(ões) no ano</p>`;
  const metasAno = targets.filter((t) => metaConcluida(t) && t.date.slice(0, 4) === ano);
  if (metasAno.length)
    inner +=
      "<h2>Metas concluídas</h2><ul>" + metasAno.map((t) => `<li>${escapeHtml(t.title)}</li>`).join("") + "</ul>";
  inner += `<p class="meta">gerado em ${hojeIso}</p>`;
  return { title: "Relatório do ano", inner };
}

/** Seção "Metas recorrentes" do relatório (recomendação 12 de 27/09/2026):
 * por meta, períodos cumpridos no intervalo [ini, fim] e a sequência atual.
 * Período semanal pertence ao intervalo pela data em que termina (mesma regra
 * de "a semana pertence ao mês em que termina"). */
export function metasRecRelatorioHtml(
  recs: MetaRecorrente[],
  ini: string,
  fim: string,
  agora: Date = new Date()
): string {
  const linhas: string[] = [];
  for (const rec0 of recs) {
    const rec = virarPeriodoMetaRec(rec0, agora);
    const semanal = rec.tipo === "semanal";
    const periodos = [...(rec.historico || []), rec.progresso!].filter((p) => {
      const iniP = p.periodo.slice(p.periodo.indexOf(":") + 1);
      const ref = semanal ? addDaysISO(iniP, 6) : iniP;
      return ref >= ini && ref <= fim;
    });
    if (!periodos.length) continue;
    const ok = periodos.filter((p) => metaRecCumprido(rec, p)).length;
    const un = semanal ? "semana" : "dia";
    const seq = metaRecSequencia(rec, agora);
    linhas.push(
      `<li><b>${escapeHtml(rec.titulo)}</b>${rec.negativa ? " (limite)" : ""}: ${ok} de ${periodos.length} ${un}${
        periodos.length > 1 ? "s" : ""
      } cumprido${periodos.length > 1 ? "s" : ""}${seq > 0 ? ` · sequência atual: ${seq} ${un}${seq > 1 ? "s" : ""}` : ""}</li>`
    );
  }
  return linhas.length ? "<h2>Metas recorrentes</h2><ul>" + linhas.join("") + "</ul>" : "";
}

/** Porta de relatorioFechamentoHtml (index.html:5501-5571) — gera o relatório
 * pronto para exportação via exportPdfView. */
export function relatorioFechamentoHtml(
  statsView: "semanal" | "mensal" | "anual",
  gam: GamificacaoState,
  history: HistoryEntry[],
  routines: Routine[],
  targets: MetaTarget[] = [],
  hojeIso = localKey(),
  recorrentes: MetaRecorrente[] = [],
  snoozes: Snooze[] = []
): { title: string; innerHtml: string } {
  let res: { title: string; inner: string };
  let ini: string;
  if (statsView === "mensal") {
    res = relatorioMensalHtml(gam, history, targets, hojeIso);
    ini = hojeIso.slice(0, 7) + "-01";
  } else if (statsView === "anual") {
    res = relatorioAnualHtml(gam, history, targets, hojeIso);
    ini = hojeIso.slice(0, 4) + "-01-01";
  } else {
    res = relatorioSemanalHtml(gam, history, routines, targets, hojeIso, snoozes);
    ini = gam.semanaAtual?.inicioISO || hojeIso;
  }
  // entra antes do "gerado em", que fecha o relatório
  const secao = metasRecRelatorioHtml(recorrentes, ini, hojeIso, isoToDate(hojeIso));
  const marca = res.inner.lastIndexOf('<p class="meta">gerado em');
  const inner = secao && marca >= 0 ? res.inner.slice(0, marca) + secao + res.inner.slice(marca) : res.inner + secao;
  return { title: res.title, innerHtml: inner };
}
