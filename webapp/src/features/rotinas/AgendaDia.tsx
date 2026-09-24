// Visão "Dia" da agenda — porta de agendaDiaHomeHtml (index.html:5078-5092):
// grade de minuto de um dia (00:00–24:00, marcação de 30 em 30, zoom dobrado),
// com blocos da nota, kanban, compromissos, iCal e rotinas agendadas; arrastar
// um bloco de cartão verticalmente reagenda o horário (mantém a duração).
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { addDaysISO, isoToDate, localKey } from "../../lib/gamificacao";
import { AG_PX_MIN_ZOOM, blocosAgendaDia, computeGradeLayout, horaParaMin, toggleLinhaFeita } from "../../lib/agenda";
import { getIcalCache, icalEventosDoDia } from "../../lib/ical";
import { DIAS_NOME } from "../../lib/constants";
import { formatHM } from "../../lib/schedule";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { GradeDia } from "./GradeDia";
import { ACAO_NAV, DataNav, LinhaNav, NomeDia, Sobra } from "./NavAgenda";
import { TarefaPopup } from "./TarefaPopup";

export function AgendaDia() {
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
      <LinhaNav cabecalho>
        <BotaoIcone rotulo="Dia anterior" semBorda onClick={() => setIso(addDaysISO(iso, -1))}>
          <Icon name="chevronLeft" size={15} />
        </BotaoIcone>
        <NomeDia hoje={ehHoje} rotuloPonto="hoje">
          {DIAS_NOME[dow].charAt(0).toUpperCase() + DIAS_NOME[dow].slice(1)}
        </NomeDia>
        <DataNav>
          {iso.slice(8, 10)}/{iso.slice(5, 7)}
        </DataNav>
        <BotaoIcone rotulo="Próximo dia" semBorda onClick={() => setIso(addDaysISO(iso, 1))}>
          <Icon name="chevronRight" size={15} />
        </BotaoIcone>
        <Sobra />
        {!ehHoje && (
          <BotaoIcone rotulo="Ir para hoje" className={ACAO_NAV} onClick={() => setIso(hojeISO)}>
            <Icon name="calendar" size={15} />
          </BotaoIcone>
        )}
        <BotaoIcone rotulo="Nova tarefa" className={ACAO_NAV} onClick={() => setPopup({ ini: null })}>
          <Icon name="plus" size={15} />
        </BotaoIcone>
      </LinhaNav>
      {popup && <TarefaPopup iso={iso} card={null} iniMin={popup.ini} onClose={() => setPopup(null)} />}
      {allDay.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {allDay.map((e, i) => (
            <span key={i} className="rounded-xl border-[1.5px] border-line bg-card-2 px-[9px] py-[3px] text-[11.5px] text-sub">
              {e.title}
            </span>
          ))}
        </div>
      )}
      <div className="max-h-[62vh] overflow-y-auto pt-3.5 pr-0 pb-0 pl-0.5">
        <GradeDia
          layout={layout}
          fundoRotulo="paper"
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
