// Visão "Semana" da agenda: lista por dia no celular; grade de 7 colunas
// (6h–23h) no desktop. Mescla rotina agendada (com horário real se já
// executada), cartão do kanban do dia, compromissos e o calendário externo.
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { addDaysISO, isoToDate, localKey } from "../../lib/gamificacao";
import { blocosAgendaDia, computeGradeLayout, itensAgendaDoDia, toggleLinhaFeita } from "../../lib/agenda";
import { atualizarIcal, getIcalCache, getIcalUrl, icalStale } from "../../lib/ical";
import { DIAS_ABREV, DIAS_NOME } from "../../lib/constants";
import { useIsDesktop } from "../../lib/useIsDesktop";
import type { DiaKanbanCard } from "../../lib/types";
import { cn } from "../../lib/cn";
import { AvisoCartao } from "../../ui/AvisoCartao";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Cartao } from "../../ui/Cartao";
import { Legenda } from "../../ui/Legenda";
import { AgendaLinha } from "./AgendaLinha";
import { GradeDia } from "./GradeDia";
import { ACAO_NAV, DataNav, LinhaNav, PontoHoje, Sobra } from "./NavAgenda";
import { agendaSnoozed, SnoozeModal } from "./SnoozeModal";
import { TarefaPopup } from "./TarefaPopup";

export function AgendaSemana() {
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
  // calendário externo na lista da semana (só leitura); cache velho (>30 min)
  // é renovado em segundo plano ao abrir a visão, falha fica silenciosa
  const [icalCache, setIcalCache] = useState(getIcalCache);
  useEffect(() => {
    const url = getIcalUrl();
    if (!icalStale(url, getIcalCache())) return;
    let vivo = true;
    atualizarIcal(url)
      .then((c) => vivo && setIcalCache(c))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  const [snoozeModal, setSnoozeModal] = useState(false);

  const fimISO = addDaysISO(inicioISO, 6);
  const rangeLabel = `${inicioISO.slice(8, 10)}/${inicioISO.slice(5, 7)} – ${fimISO.slice(8, 10)}/${fimISO.slice(5, 7)}`;
  const snoozed = agendaSnoozed(snoozes);

  function renderDiaLista(d: number) {
    const iso = addDaysISO(inicioISO, d);
    const ehHoje = iso === hojeISO;
    const dow = isoToDate(iso).getDay();
    const itens = itensAgendaDoDia(iso, isoToDate(iso), routines, gam, history, diaKanban, compromissos, icalCache);
    return (
      <div key={iso}>
        <div className="mt-4 mb-1.5 flex items-center gap-2">
          <span className="min-w-0 flex-auto overflow-hidden font-titulo text-[15px] font-semibold text-ellipsis whitespace-nowrap">
            {DIAS_NOME[dow].charAt(0).toUpperCase() + DIAS_NOME[dow].slice(1)}
            {ehHoje ? " · hoje" : ""}
          </span>
          <span />
          <Legenda>
            {iso.slice(8, 10)}/{iso.slice(5, 7)}
          </Legenda>
          <BotaoIcone rotulo="Nova tarefa neste dia" semBorda onClick={() => setPopup({ iso, card: null })}>
            <Icon name="plus" size={15} />
          </BotaoIcone>
        </div>
        <Cartao className="mb-1.5">
          {itens.length ? (
            itens.map((it) => (
              <AgendaLinha
                key={it.tipo + ":" + it.id}
                it={it}
                onClick={() => {
                  if (it.tipo === "rotina") goTo({ tab: "home", screen: "routineDetail", id: it.id });
                  else if (it.tipo === "cartao") toggleDiaKanbanCard(it.id);
                  else if (it.tipo === "compromisso") toggleCompromisso(it.id);
                }}
                onEdit={it.tipo === "cartao" ? () => setPopup({ iso, card: diaKanban.find((c) => c.id === it.id) || null }) : undefined}
                onDelete={it.tipo === "compromisso" ? () => deleteCompromisso(it.id) : undefined}
              />
            ))
          ) : (
            <Legenda className="py-1">nada agendado</Legenda>
          )}
        </Cartao>
      </div>
    );
  }

  return (
    <div>
      {/* navegação e ações na MESMA linha: setas coladas na data, o resto
          empurrado para a direita pelo separador flexível. */}
      <LinhaNav>
        <BotaoIcone rotulo="Semana anterior" semBorda onClick={() => setInicioISO(addDaysISO(inicioISO, -7))}>
          <Icon name="chevronLeft" size={15} />
        </BotaoIcone>
        <DataNav>
          {inicioISO === hojeISO && <PontoHoje rotulo="semana atual" />}
          {rangeLabel}
        </DataNav>
        <BotaoIcone rotulo="Próxima semana" semBorda onClick={() => setInicioISO(addDaysISO(inicioISO, 7))}>
          <Icon name="chevronRight" size={15} />
        </BotaoIcone>
        <Sobra />
        {inicioISO !== hojeISO && (
          <BotaoIcone rotulo="Ir para a semana atual" className={ACAO_NAV} onClick={() => setInicioISO(hojeISO)}>
            <Icon name="calendar" size={15} />
          </BotaoIcone>
        )}
        <BotaoIcone
          rotulo={snoozed ? "Retomar agenda" : "Pausar agenda"}
          className={ACAO_NAV}
          onClick={() => {
            if (snoozed) resumeAgenda();
            else setSnoozeModal(true);
          }}
        >
          <Icon name={snoozed ? "play" : "pause"} size={15} />
        </BotaoIcone>
      </LinhaNav>
      {snoozed && (
        <AvisoCartao className="mb-3.5">
          <span>
            <Icon name="exclamationTriangle" size={14} /> Agenda pausada até {String(new Date(snoozed.to).getDate()).padStart(2, "0")}/
            {String(new Date(snoozed.to).getMonth() + 1).padStart(2, "0")} — sem alertas, e os dias pausados não contam no cumprimento.
          </span>
        </AvisoCartao>
      )}
      {snoozeModal && <SnoozeModal onClose={() => setSnoozeModal(false)} />}
      {popup && <TarefaPopup iso={popup.iso} card={popup.card} onClose={() => setPopup(null)} />}
      {ehDesktop ? (
        /* Porta de agendaSemanaGradeHtml (index.html:5020-5033) — grade de 7
           colunas, janela fixa 6h–23h, rótulo de hora só na 1ª coluna. */
        <div className="grid grid-cols-7 gap-2">
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
              <div key={iso} className="min-w-0">
                <div className={cn("flex items-baseline justify-between pb-1 pl-1 text-sm font-semibold", ehHoje ? "text-caneta" : "text-sub")}>
                  {DIAS_ABREV[dow].slice(0, 3)}
                  <span>
                    {iso.slice(8, 10)}/{iso.slice(5, 7)}
                  </span>
                </div>
                <div className="max-h-[min(60vh,620px)] overflow-y-auto rounded-app-sm border-[1.5px] border-line bg-card pt-3 pr-2.5 pb-0 pl-1">
                  <GradeDia
                    layout={layout}
                    ocultarRotulos={d > 0}
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
}
