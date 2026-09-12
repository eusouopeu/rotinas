// Porta parcial de renderHome (index.html:3531-3762) — o piloto desta fase
// cobre header + lista de rotinas + criar/editar/excluir (via o editor de
// verdade, RoutineEditor) + ver detalhe (RoutineDetail, de onde "Começar"
// fica a um toque, mesmo padrão do app antigo) + iniciar (via Player) + a
// agenda inline (visões "semana" — lista via itensAgendaDoDia — e "dia" —
// grade de minuto via blocosAgendaDia/computeGradeLayout, com nota, kanban,
// compromissos, iCal e rotinas; ver AgendaSemana/AgendaDia abaixo). Fica
// para uma fase seguinte: aviso de backup/carga da semana, card de "semana
// fechada", card motivacional, retomar rotina em andamento, grade de 7
// colunas no desktop, agenda pausada (snoozes), arrastar bloco/cartão pra
// reagendar, e swipe-to-delete.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { RodaVidaResumo } from "../components/RodaVidaResumo";
import { StreakTag } from "../components/StreakTag";
import { fmtTime } from "../lib/format";
import { EXERCICIO_SET_SEG, rotinaCabeEmHoje, rotinasOrdenadas, routineDurationRaw } from "../lib/routines";
import { AG_PX_MIN_ZOOM, blocosAgendaDia, computeGradeLayout, horaParaMin, itensAgendaDoDia, toggleLinhaFeita, type AgendaItemDia } from "../lib/agenda";
import { getIcalCache, icalEventosDoDia } from "../lib/ical";
import { useIsDesktop } from "../lib/useIsDesktop";
import type { DiaKanbanCard, Snooze, Tag } from "../lib/types";
import { corDaRotina, fillStyle, rotinaEhHabito } from "../lib/scoring";
import { addDaysISO, isoToDate, localKey } from "../lib/gamificacao";
import { computeSchedule, diasChipLabel, formatHM } from "../lib/schedule";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME, DIAS_ABREV, DIAS_NOME } from "../lib/constants";
import { semanaFechadaPendente } from "../lib/semanaFechada";
import { SwipeItem } from "../components/SwipeItem";
import { attachSwipeDownSearch } from "../lib/swipe";
import { execucaoDoDia, execucaoMinutos } from "../lib/history";

function AgendaLinha({ it, onClick, onDelete, onEdit }: { it: AgendaItemDia; onClick: () => void; onDelete?: () => void; onEdit?: () => void }) {
  return (
    <div className={"dev-row agenda-row" + (it.feito ? " feito" : "")} onClick={onClick} style={{ cursor: "pointer" }}>
      {/* início SEMPRE acima do término, sem travessão: as duas linhas alinham
          em coluna entre os itens do dia, e o item sem fim ocupa só uma. */}
      <span className="agenda-time">
        {it.ini == null ? (
          <span>sem hora</span>
        ) : (
          <>
            <span>{formatHM(it.ini)}</span>
            {it.tipo !== "compromisso" && <span>{formatHM(it.fim!)}</span>}
          </>
        )}
      </span>
      <span className="agenda-nome">
        {it.tipo === "rotina" ? <span className="r-dot" style={{ background: fillStyle(it.cor) }} /> : <span className="ag-square" />}
        {it.texto}
      </span>
      {onEdit ? (
        <button
          className="icon-btn borderless"
          title="Editar tarefa"
          aria-label="Editar tarefa"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Icon name="notes" size={13} />
        </button>
      ) : onDelete ? (
        <button
          className="icon-btn borderless"
          title="Excluir"
          aria-label="Excluir"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="trash" size={13} />
        </button>
      ) : (
        <span className="agenda-edit-slot" />
      )}
    </div>
  );
}

/* Máscara dos campos de hora do popup (timeKbInputHtml/wireTimeKbInputs,
   index.html:1851-1868): digita números, ganha ":" sozinho, normaliza no blur. */
function TimeKbInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className="time-kb-input"
      placeholder="--:--"
      maxLength={5}
      aria-label={label}
      value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
        if (v.length >= 3) v = v.slice(0, 2) + ":" + v.slice(2);
        onChange(v);
      }}
      onBlur={() => {
        const m = value.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) {
          onChange("");
          return;
        }
        const h = Math.min(23, +m[1]);
        const mi = Math.min(59, +m[2]);
        onChange(String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0"));
      }}
    />
  );
}

/* Porta de abrirPopupTarefa (index.html:5181-5256) — popup completo de
   tarefa do dia: texto, horário opcional, peso e área da roda (quando
   ativa). Sem o crédito de pontos do cartão (ver upsertDiaKanbanCard). */
function TarefaPopup({ iso, card, iniMin, onClose }: { iso: string; card: DiaKanbanCard | null; iniMin?: number | null; onClose: () => void }) {
  const gam = useAppStore((s) => s.gam);
  const upsertDiaKanbanCard = useAppStore((s) => s.upsertDiaKanbanCard);
  const deleteDiaKanbanCard = useAppStore((s) => s.deleteDiaKanbanCard);
  const [text, setText] = useState(card?.text || "");
  // horário do vão clicado na grade: 1h de duração, mesma regra do legado
  const [hIni, setHIni] = useState(card?.hIni || (iniMin != null ? formatHM(iniMin) : ""));
  const [hFim, setHFim] = useState(card?.hFim || (iniMin != null ? formatHM(Math.min(24 * 60, iniMin + 60)) : ""));
  const [tag, setTag] = useState<Tag>((card?.tagValor as Tag) || "baixo");
  const [eixo, setEixo] = useState<string | null>(card?.eixo ?? null);
  const rodaAtiva = !!gam.config.roda.ativa;

  function salvar() {
    if (!text.trim()) return;
    const fimOk = hIni && hFim && (horaParaMin(hFim) ?? 0) > (horaParaMin(hIni) ?? 0) ? hFim : "";
    upsertDiaKanbanCard(iso, { id: card?.id, text, hIni, hFim: fimOk, tagValor: tag, eixo });
    onClose();
  }

  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box" style={{ textAlign: "left" }}>
        <p style={{ marginBottom: 10 }}>
          {card ? "Editar" : "Nova"} tarefa · {iso.slice(8, 10)}/{iso.slice(5, 7)}
        </p>
        <input
          type="text"
          className="mk-e-name"
          style={{ width: "100%" }}
          placeholder="O que precisa ser feito?"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
        />
        <div className="section-label" style={{ margin: "12px 0 4px" }}>
          Horário (opcional)
        </div>
        <div className="kb-e-horas">
          <div className="kb-horas-row">
            <TimeKbInput value={hIni} onChange={setHIni} label="Hora de início" />
            <span className="dev-n">até</span>
            <TimeKbInput value={hFim} onChange={setHFim} label="Hora de término" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <div className="section-label" style={{ margin: 0 }}>
            Peso
          </div>
          <div className="type-toggle tagval-pills">
            {(["baixo", "medio", "alto"] as Tag[]).map((v) => (
              <span key={v} className={tag === v ? "active" : ""} onClick={() => setTag(v)}>
                {v === "baixo" ? "Baixo" : v === "medio" ? "Médio" : "Alto"}
              </span>
            ))}
          </div>
        </div>
        {rodaAtiva && (
          <>
            <div className="section-label" style={{ margin: "12px 0 4px" }}>
              Área
            </div>
            <div className="area-chips">
              <span className={"area-chip" + (!eixo ? " sel" : "")} style={{ "--chip": "var(--sub)" } as React.CSSProperties} onClick={() => setEixo(null)}>
                sem área
              </span>
              {gam.config.roda.areas.map((a) => (
                <span
                  key={a.id}
                  className={"area-chip" + (eixo === a.id ? " sel" : "")}
                  style={{ "--chip": a.color } as React.CSSProperties}
                  onClick={() => setEixo(a.id)}
                >
                  {a.label}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="confirm-actions" style={{ marginTop: 16, justifyContent: "space-between" }}>
          {card ? (
            <button
              className="ghost"
              style={{ color: "var(--erro)" }}
              title="Excluir tarefa"
              aria-label="Excluir tarefa"
              onClick={() => {
                deleteDiaKanbanCard(card.id);
                onClose();
              }}
            >
              <Icon name="trash" size={15} />
            </button>
          ) : (
            <button className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
          )}
          <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={salvar}>
            {card ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Snoozes (K_SNOOZES) — porta de agendaSnoozed/abrirSnoozeModal
   (index.html:5259-5290, 11023): pausa alertas/cumprimento por N dias.
   Estado reativo na store (addSnooze/resumeAgenda), ver useAppStore.ts. */
function agendaSnoozed(snoozes: Snooze[]): Snooze | null {
  return snoozes.find((s) => Date.now() >= s.from && Date.now() <= s.to) || null;
}

function SnoozeModal({ onClose }: { onClose: () => void }) {
  const addSnooze = useAppStore((s) => s.addSnooze);
  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box">
        <p>Pausar todos os alertas e o cumprimento por:</p>
        <div className="confirm-actions" style={{ flexDirection: "column" }}>
          {(
            [
              ["1 dia", 1],
              ["3 dias", 3],
              ["7 dias", 7],
              ["30 dias", 30],
            ] as const
          ).map(([l, d]) => (
            <button
              key={d}
              className="btn-confirm"
              style={{ background: "var(--caneta)" }}
              onClick={() => {
                addSnooze(d);
                onClose();
              }}
            >
              {l}
            </button>
          ))}
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function AgendaSemana() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const diaKanban = useAppStore((s) => s.diaKanban);
  const compromissos = useAppStore((s) => s.compromissos);
  const snoozes = useAppStore((s) => s.snoozes);
  const resumeAgenda = useAppStore((s) => s.resumeAgenda);
  const goTo = useAppStore((s) => s.goTo);
  const toggleDiaKanbanCard = useAppStore((s) => s.toggleDiaKanbanCard);
  const toggleCompromisso = useAppStore((s) => s.toggleCompromisso);
  const deleteCompromisso = useAppStore((s) => s.deleteCompromisso);
  const diario = useAppStore((s) => s.diario);
  const setDiarioTexto = useAppStore((s) => s.setDiarioTexto);
  const ehDesktop = useIsDesktop();

  const hojeISO = localKey();
  const [inicioISO, setInicioISO] = useState(hojeISO);
  const [popup, setPopup] = useState<{ iso: string; card: DiaKanbanCard | null } | null>(null);
  const [snoozeModal, setSnoozeModal] = useState(false);

  const fimISO = addDaysISO(inicioISO, 6);
  const rangeLabel =
    inicioISO === hojeISO ? "próximos 7 dias" : `${inicioISO.slice(8, 10)}/${inicioISO.slice(5, 7)} – ${fimISO.slice(8, 10)}/${fimISO.slice(5, 7)}`;
  const snoozed = agendaSnoozed(snoozes);

  return (
    <div className="ag-semana">
      {/* navegação e ações na MESMA linha: setas coladas na data, o resto
          empurrado para a direita pelo separador flexível. */}
      <div className="ag-semana-topo ag-nav-row">
        <button className="icon-btn borderless" title="Semana anterior" aria-label="Semana anterior" onClick={() => setInicioISO(addDaysISO(inicioISO, -7))}>
          <Icon name="chevronLeft" size={15} />
        </button>
        <span className="dev-n">{rangeLabel}</span>
        <button className="icon-btn borderless" title="Próxima semana" aria-label="Próxima semana" onClick={() => setInicioISO(addDaysISO(inicioISO, 7))}>
          <Icon name="chevronRight" size={15} />
        </button>
        <span className="ag-nav-gap" />
        {inicioISO !== hojeISO && (
          <button className="link-btn" onClick={() => setInicioISO(hojeISO)}>
            hoje
          </button>
        )}
        <button
          className="link-btn"
          onClick={() => {
            if (snoozed) resumeAgenda();
            else setSnoozeModal(true);
          }}
        >
          {snoozed ? "retomar" : "pausar"}
        </button>
      </div>
      {snoozed && (
        <div className="notice-card" style={{ marginBottom: 14 }}>
          <span>
            <Icon name="exclamationTriangle" size={14} /> Agenda pausada até {String(new Date(snoozed.to).getDate()).padStart(2, "0")}/
            {String(new Date(snoozed.to).getMonth() + 1).padStart(2, "0")} — sem alertas, e os dias pausados não contam no cumprimento.
          </span>
        </div>
      )}
      {snoozeModal && <SnoozeModal onClose={() => setSnoozeModal(false)} />}
      {popup && <TarefaPopup iso={popup.iso} card={popup.card} onClose={() => setPopup(null)} />}
      {ehDesktop ? (
        /* Porta de agendaSemanaGradeHtml (index.html:5020-5033) — grade de 7
           colunas, janela fixa 6h–23h, rótulo de hora só na 1ª coluna (CSS). */
        <div className="ag-week-grid">
          {Array.from({ length: 7 }, (_, d) => {
            const iso = addDaysISO(inicioISO, d);
            const ehHoje = iso === hojeISO;
            const dow = isoToDate(iso).getDay();
            const blocos = blocosAgendaDia(iso, isoToDate(iso), diario["dia:" + iso] || "", routines, gam, history, diaKanban, compromissos, getIcalCache());
            const agora = new Date();
            const layout = computeGradeLayout(blocos, ehHoje ? agora.getHours() * 60 + agora.getMinutes() : null, {
              pxMin: 0.85,
              passo: 60,
              mIni: 360,
              mFim: 1380,
            });
            return (
              <div key={iso} className={"ag-week-day" + (ehHoje ? " ag-week-today" : "")}>
                <div className="ag-week-daylbl">
                  {DIAS_ABREV[dow].slice(0, 3)}
                  <span>
                    {iso.slice(8, 10)}/{iso.slice(5, 7)}
                  </span>
                </div>
                <div className="ag-dia-scroll">
                  <GradeDia
                    layout={layout}
                    onClique={(b) => {
                      if (b.rotinaId) goTo({ tab: "home", screen: "routineDetail", id: b.rotinaId });
                      else if (b.cardId) toggleDiaKanbanCard(b.cardId);
                      else if (b.compromissoId) toggleCompromisso(b.compromissoId);
                      else if (!b.ical && b.linha >= 0) setDiarioTexto("dia:" + iso, toggleLinhaFeita(diario["dia:" + iso] || "", b.linha));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        Array.from({ length: 7 }, (_, d) => renderDiaLista(d))
      )}
    </div>
  );

  function renderDiaLista(d: number) {
        const iso = addDaysISO(inicioISO, d);
        const ehHoje = iso === hojeISO;
        const dow = isoToDate(iso).getDay();
        const itens = itensAgendaDoDia(iso, isoToDate(iso), routines, gam, history, diaKanban, compromissos);
        return (
          <div key={iso}>
            <div className="ag-dia-head">
              <span className="ag-dia-nome">
                {DIAS_NOME[dow].charAt(0).toUpperCase() + DIAS_NOME[dow].slice(1)}
                {ehHoje ? " · hoje" : ""}
              </span>
              <span className="ag-nav-gap" />
              <span className="dev-n">
                {iso.slice(8, 10)}/{iso.slice(5, 7)}
              </span>
              <button
                className="icon-btn borderless"
                title="Nova tarefa neste dia"
                aria-label="Nova tarefa neste dia"
                onClick={() => setPopup({ iso, card: null })}
              >
                <Icon name="plus" size={15} />
              </button>
            </div>
            <div className={"stat-card" + (ehHoje ? " agenda-today" : "")}>
              {itens.length ? (
                itens.map((it) => (
                  <AgendaLinha
                    key={it.tipo + ":" + it.id}
                    it={it}
                    onClick={() => {
                      if (it.tipo === "rotina") goTo({ tab: "home", screen: "routineDetail", id: it.id });
                      else if (it.tipo === "cartao") toggleDiaKanbanCard(it.id);
                      else toggleCompromisso(it.id);
                    }}
                    onEdit={it.tipo === "cartao" ? () => setPopup({ iso, card: diaKanban.find((c) => c.id === it.id) || null }) : undefined}
                    onDelete={it.tipo === "compromisso" ? () => deleteCompromisso(it.id) : undefined}
                  />
                ))
              ) : (
                <div className="dev-n" style={{ padding: "4px 0" }}>
                  nada agendado
                </div>
              )}
            </div>
          </div>
        );
  }
}

/* Porta de agendaDiaHomeHtml (index.html:5078-5092) — grade de minuto de um
   dia (00:00–24:00, marcação de 30 em 30, zoom dobrado), com blocos da nota,
   kanban, compromissos, iCal e rotinas agendadas; arrastar um bloco de
   cartão verticalmente reagenda o horário (mantém a duração). */

type BlocoLayout = ReturnType<typeof computeGradeLayout>["blocos"][number];

/* Grade compartilhada entre AgendaDia e a grade de 7 colunas do desktop
   (agendaGradeHtml, index.html:12891-12931). `onDragCard` liga o arrasto
   vertical de cartão do kanban (wireAgendaHome, index.html:5120-5157) —
   passo de 5 min, só na visão "Dia". */
function GradeDia({
  layout,
  onClique,
  onCliqueVazio,
  gradePxMin,
  gradeMIni,
  onDragCard,
  dragPxMin,
}: {
  layout: ReturnType<typeof computeGradeLayout>;
  onClique: (b: BlocoLayout) => void;
  /* clique num vão livre da grade cria evento naquele horário (arredondado
     de 15 em 15 min) — só ligado na visão "Dia", que tem o zoom cheio. */
  onCliqueVazio?: (iniMin: number) => void;
  gradePxMin?: number;
  gradeMIni?: number;
  onDragCard?: (cardId: string, novoIniMin: number) => void;
  dragPxMin?: number;
}) {
  const [drag, setDrag] = useState<{ idx: number; dy: number } | null>(null);
  const arrastouRef = useRef(false);

  function pointerDown(ev: React.PointerEvent<HTMLDivElement>, b: BlocoLayout, idx: number) {
    if (!onDragCard || !b.cardId || !dragPxMin) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    const el = ev.currentTarget;
    const startY = ev.clientY;
    let moved = false;
    try {
      el.setPointerCapture(ev.pointerId);
    } catch {
      /* ok sem capture */
    }
    const move = (ev2: PointerEvent) => {
      const dy = ev2.clientY - startY;
      if (!moved && Math.abs(dy) > 6) moved = true;
      if (moved) setDrag({ idx, dy });
    };
    const up = (ev2: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setDrag(null);
      if (!moved) return;
      arrastouRef.current = true;
      const dur = b.fim - b.ini;
      const deltaMin = Math.round((ev2.clientY - startY) / dragPxMin / 5) * 5;
      const novoIni = Math.max(0, Math.min(24 * 60 - dur, b.ini + deltaMin));
      if (novoIni !== b.ini) onDragCard(b.cardId!, novoIni);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  return (
    <div className="ag-wrap" style={{ height: layout.alturaPx }}>
      {layout.horas.map((h) => (
        <div key={h.min} className={"ag-hora" + (h.min % 60 ? " ag-meia" : "")} style={{ top: h.topPx }}>
          <span>{h.label}</span>
        </div>
      ))}
      {layout.linhaAgoraPx != null && <div className="ag-agora" style={{ top: layout.linhaAgoraPx }} />}
      <div
        className={"ag-blocos" + (onCliqueVazio ? " ag-blocos-clicavel" : "")}
        onClick={(ev) => {
          if (!onCliqueVazio || !gradePxMin) return;
          if (ev.target !== ev.currentTarget) return; // clique caiu num bloco
          const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
          const min = (gradeMIni ?? 0) + y / gradePxMin;
          onCliqueVazio(Math.max(0, Math.min(23 * 60 + 45, Math.round(min / 15) * 15)));
        }}
      >
        {layout.blocos.map((b, i) => (
          <div
            key={i}
            className={
              "ag-bloco" +
              (b.rotinaId ? " ag-rot" : "") +
              (b.cardId ? " ag-kb" : "") +
              (b.compromissoId ? " ag-cp" : "") +
              (b.ical ? " ag-ical" : "") +
              (b.feito ? " feito" : "") +
              (b.adiado ? " adiado" : "") +
              (drag?.idx === i ? " ag-bloco-dragging" : "")
            }
            style={{
              top: b.topPx,
              height: b.alturaBlocoPx,
              left: `calc(${b.leftPct}% + 2px)`,
              width: `calc(${b.larguraPct}% - 4px)`,
              cursor: b.ical ? undefined : "pointer",
              transform: drag?.idx === i ? `translateY(${drag.dy}px)` : undefined,
            }}
            onPointerDown={(ev) => pointerDown(ev, b, i)}
            onClick={() => {
              if (arrastouRef.current) {
                arrastouRef.current = false; // o arrasto já resolveu
                return;
              }
              onClique(b);
            }}
          >
            <span className="ag-txt">{b.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaDia() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const diaKanban = useAppStore((s) => s.diaKanban);
  const compromissos = useAppStore((s) => s.compromissos);
  const diario = useAppStore((s) => s.diario);
  const goTo = useAppStore((s) => s.goTo);
  const toggleDiaKanbanCard = useAppStore((s) => s.toggleDiaKanbanCard);
  const toggleCompromisso = useAppStore((s) => s.toggleCompromisso);
  const upsertDiaKanbanCard = useAppStore((s) => s.upsertDiaKanbanCard);
  const setDiarioTexto = useAppStore((s) => s.setDiarioTexto);

  const hojeISO = localKey();
  const [iso, setIso] = useState(hojeISO);
  // `ini` = minuto do dia clicado na grade vazia (null = sem horário sugerido)
  const [popup, setPopup] = useState<{ ini: number | null } | null>(null);

  const icalCache = getIcalCache();
  const ehHoje = iso === hojeISO;
  const dow = isoToDate(iso).getDay();
  const blocos = blocosAgendaDia(iso, isoToDate(iso), diario["dia:" + iso] || "", routines, gam, history, diaKanban, compromissos, icalCache);
  const agora = new Date();
  const layout = computeGradeLayout(blocos, ehHoje ? agora.getHours() * 60 + agora.getMinutes() : null, {
    pxMin: AG_PX_MIN_ZOOM,
    passo: 30,
    mIni: 0,
    mFim: 24 * 60,
  });
  const allDay = icalEventosDoDia(icalCache, iso).filter((e) => e.allDay);

  function clique(b: (typeof layout.blocos)[number]) {
    if (b.rotinaId) goTo({ tab: "home", screen: "routineDetail", id: b.rotinaId });
    else if (b.cardId) toggleDiaKanbanCard(b.cardId);
    else if (b.compromissoId) toggleCompromisso(b.compromissoId);
    else if (!b.ical && b.linha >= 0) {
      const k = "dia:" + iso;
      const t = toggleLinhaFeita(diario[k] || "", b.linha);
      setDiarioTexto(k, t);
    }
  }

  return (
    <div>
      {/* grupo "‹ Sexta 12/09 ›" compacto à esquerda e ações à direita; o ponto
          marca o dia atual (era o sufixo "· hoje") e o botão de calendário é o
          antigo link "hoje" — some quando a agenda já está no dia de hoje */}
      <div className="ag-dia-head ag-nav-row">
        <button className="icon-btn borderless" title="Dia anterior" aria-label="Dia anterior" onClick={() => setIso(addDaysISO(iso, -1))}>
          <Icon name="chevronLeft" size={15} />
        </button>
        <span className="ag-dia-nome">
          {ehHoje && <span className="ag-dia-hoje-dot" aria-label="hoje" title="hoje" />}
          {DIAS_NOME[dow].charAt(0).toUpperCase() + DIAS_NOME[dow].slice(1)}
        </span>
        <span className="dev-n">
          {iso.slice(8, 10)}/{iso.slice(5, 7)}
        </span>
        <button className="icon-btn borderless" title="Próximo dia" aria-label="Próximo dia" onClick={() => setIso(addDaysISO(iso, 1))}>
          <Icon name="chevronRight" size={15} />
        </button>
        <span className="ag-nav-gap" />
        {!ehHoje && (
          <button className="icon-btn" title="Ir para hoje" aria-label="Ir para hoje" onClick={() => setIso(hojeISO)}>
            <Icon name="calendar" size={15} />
          </button>
        )}
        <button className="icon-btn" title="Nova tarefa" aria-label="Nova tarefa" onClick={() => setPopup({ ini: null })}>
          <Icon name="plus" size={15} />
        </button>
      </div>
      {popup && <TarefaPopup iso={iso} card={null} iniMin={popup.ini} onClose={() => setPopup(null)} />}
      {allDay.length > 0 && (
        <div className="ag-allday-row">
          {allDay.map((e, i) => (
            <span key={i} className="ag-allday-chip">
              {e.title}
            </span>
          ))}
        </div>
      )}
      <div className="ag-dia-scroll ag-dia-plana">
        <GradeDia
          layout={layout}
          onClique={clique}
          onCliqueVazio={(min) => setPopup({ ini: min })}
          gradePxMin={AG_PX_MIN_ZOOM}
          gradeMIni={0}
          dragPxMin={AG_PX_MIN_ZOOM}
          onDragCard={(cardId, novoIni) => {
            const card = diaKanban.find((c) => c.id === cardId);
            if (!card) return;
            const iniOrig = horaParaMin(card.hIni);
            if (iniOrig == null) return;
            const fimOrig = card.hFim && (horaParaMin(card.hFim) ?? 0) > iniOrig ? horaParaMin(card.hFim)! : iniOrig + 60;
            upsertDiaKanbanCard(iso, {
              id: card.id,
              text: card.text,
              hIni: formatHM(novoIni),
              hFim: formatHM(novoIni + (fimOrig - iniOrig)),
              tagValor: card.tagValor,
              eixo: card.eixo,
            });
          }}
        />
      </div>
    </div>
  );
}

export function Home() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const deleteRoutineWithUndo = useAppStore((s) => s.deleteRoutineWithUndo);
  const duplicateRoutine = useAppStore((s) => s.duplicateRoutine);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const goTo = useAppStore((s) => s.goTo);
  const homeView = useAppStore((s) => s.homeView);
  const setHomeView = useAppStore((s) => s.setHomeView);
  const soHoje = useAppStore((s) => s.soHoje);
  const setSoHoje = useAppStore((s) => s.setSoHoje);
  const openSearch = useAppStore((s) => s.openSearch);
  const headerRef = useRef<HTMLDivElement>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoEvento, setNovoEvento] = useState(false);

  const semFechada = semanaFechadaPendente(gam);
  const hojeISO = localKey();
  /* Mesma ordem do legado (index.html:3645-3646): sempre por horário de início,
     e o filtro "hoje" esconde só quem tem dia fixo em outro dia. */
  const visiveis = rotinasOrdenadas(routines).filter((r) => !soHoje || rotinaCabeEmHoje(r));

  // Puxar o cabeçalho pra baixo abre a busca global (wireSwipeDownSearch,
  // index.html:2955-2966) — só no topo da tela mesmo, sem scroll acima dele.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    return attachSwipeDownSearch(el, openSearch);
  }, [openSearch]);

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }} ref={headerRef}>
          <h1>Rotinas</h1>
          <button className="bell-btn" title="Boletim da semana" aria-label="Boletim da semana" onClick={() => goTo({ tab: "home", screen: "boletim" })}>
            <Icon name="trophy" size={16} />
          </button>
        </div>

        <RodaVidaResumo />

        {semFechada && (
          <div
            className="routine-card resume-card pinned-card"
            style={{ cursor: "pointer", marginBottom: 14 }}
            onClick={() => goTo({ tab: "home", screen: "semanaFechada" })}
          >
            <div className="routine-info">
              <h3>
                Semana fechada
                {semFechada.badge && (
                  <>
                    {" · "}
                    <span style={{ color: BADGE_COR[semFechada.badge] }}>
                      {BADGE_CHAR[semFechada.badge]} {BADGE_NOME[semFechada.badge]}
                    </span>
                  </>
                )}
              </h3>
              <div className="routine-meta">Nota {semFechada.nota.toFixed(1)} — toque para ver o fechamento</div>
            </div>
          </div>
        )}

        <div className="type-toggle view-toggle" style={{ marginBottom: 14 }}>
          <span className={homeView === "semana" ? "active" : ""} onClick={() => setHomeView("semana")}>
            Semana
          </span>
          <span className={homeView === "dia" ? "active" : ""} onClick={() => setHomeView("dia")}>
            Dia
          </span>
          <span className={homeView === "rotinas" ? "active" : ""} onClick={() => setHomeView("rotinas")}>
            Lista
          </span>
        </div>

        {homeView === "rotinas" && (
          <div className="header-right" style={{ marginBottom: 14 }}>
            <button
              className={"bell-btn di-hoje" + (soHoje ? " on" : "")}
              title="Mostrar só as rotinas de hoje"
              aria-pressed={soHoje}
              onClick={() => setSoHoje(!soHoje)}
            >
              hoje
            </button>
          </div>
        )}

        {homeView === "semana" ? (
          <AgendaSemana />
        ) : homeView === "dia" ? (
          <AgendaDia />
        ) : routines.length === 0 ? (
          <div className="empty-state">
            <h2>Nenhuma rotina ainda</h2>
            <p>Crie sua primeira sequência de etapas com tempo — igual um ritual de prática.</p>
            <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => openEditor(null)}>
              + Nova rotina
            </button>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="empty-state">
            <h2>Nada agendado para hoje</h2>
            <p>Desligue o "hoje" para ver todas as rotinas.</p>
          </div>
        ) : (
          <div className="routine-list" style={{ flex: "0 0 auto", overflow: "visible" }}>
            {visiveis.map((r) => {
              const dur = routineDurationRaw(r, EXERCICIO_SET_SEG);
              const sched = computeSchedule(r);
              const execHoje = execucaoDoDia(history, r.id, hojeISO);
              const execMin = execHoje ? execucaoMinutos(execHoje) : null;
              return (
                <SwipeItem
                  key={r.id}
                  onLeft={() => deleteRoutineWithUndo(r.id)}
                  onRight={() => duplicateRoutine(r.id)}
                  className="routine-card routine-card-compact"
                >
                  <div
                    className="routine-info"
                    style={{ cursor: "pointer" }}
                    onClick={() => goTo({ tab: "home", screen: "routineDetail", id: r.id })}
                  >
                    <h3>
                      <span className="r-dot" style={{ background: fillStyle(corDaRotina(r, gam)) }} />
                      {r.icon ? r.icon + " " : ""}
                      {r.name}
                      <StreakTag routineId={r.id} routines={routines} history={history} />
                    </h3>
                    {/* etapas · horário (ou duração, só quando não há horário) ·
                        dias, tudo em ícone e numa linha só. A área da roda saiu:
                        já está dita pela cor da bolinha antes do nome. */}
                    <div className="routine-meta routine-meta-line">
                      <span className="rc-fact" title={`${r.steps.length} etapa${r.steps.length !== 1 ? "s" : ""}`}>
                        <Icon name="clipboard" size={13} /> {r.steps.length}
                      </span>
                      {execMin ? (
                        <span className="rc-fact" style={{ color: "var(--ok)" }} title="Executada hoje">
                          <Icon name="check" size={13} /> {formatHM(execMin.ini)} &rarr; {formatHM(execMin.fim)}
                        </span>
                      ) : sched ? (
                        <span className="rc-fact" style={{ color: "var(--caneta)" }} title="Horário">
                          <Icon name="clock" size={13} /> {sched.startStr} &rarr; {sched.endStr}
                        </span>
                      ) : dur > 0 ? (
                        <span className="rc-fact" style={{ color: "var(--caneta)" }} title="Duração">
                          <Icon name="clock" size={13} /> {fmtTime(dur).replace("+", "")}
                        </span>
                      ) : null}
                      {sched && (
                        <span className="rc-fact" title="Dias">
                          <Icon name="calendar" size={13} /> {diasChipLabel(r)}
                        </span>
                      )}
                      {rotinaEhHabito(r, gam) && (
                        <span
                          className="habito-chip"
                          title={`Hábito consolidado: vale ${Math.round((gam.config.habito.fator || 0.6) * 100)}% do peso, para abrir espaço ao que ainda não pegou`}
                        >
                          hábito
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="routine-actions">
                    <button
                      className="play-btn"
                      title="Iniciar rotina"
                      aria-label="Iniciar rotina"
                      disabled={r.steps.length === 0}
                      onClick={() => startPlayer(r.id)}
                    >
                      <Icon name="play" size={16} />
                    </button>
                  </div>
                </SwipeItem>
              );
            })}
          </div>
        )}
      </div>

      {/* um único FAB nas três visões: abre a escolha entre rotina e evento */}
      <button className="fab" title="Novo" onClick={() => setNovoAberto(true)}>
        +
      </button>
      {novoAberto && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setNovoAberto(false)}>
          <div className="confirm-box" style={{ textAlign: "left" }}>
            <p style={{ margin: "0 0 12px" }}>Criar</p>
            <div className="novo-opcoes">
              <button
                className="novo-opcao"
                onClick={() => {
                  setNovoAberto(false);
                  openEditor(null);
                }}
              >
                <Icon name="play" size={16} />
                <b>Rotina</b>
                <span className="dev-n">sequência de etapas com tempo</span>
              </button>
              <button
                className="novo-opcao"
                onClick={() => {
                  setNovoAberto(false);
                  setNovoEvento(true);
                }}
              >
                <Icon name="calendar" size={16} />
                <b>Evento</b>
                <span className="dev-n">compromisso avulso na agenda</span>
              </button>
            </div>
            <div className="confirm-actions" style={{ marginTop: 14 }}>
              <button className="btn-cancel" onClick={() => setNovoAberto(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {novoEvento && <TarefaPopup iso={hojeISO} card={null} onClose={() => setNovoEvento(false)} />}
      <Tabbar />
    </div>
  );
}
