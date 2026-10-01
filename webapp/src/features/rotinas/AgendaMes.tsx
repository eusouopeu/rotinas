// Visão "Mês" da agenda (recomendação 1, 27/09/2026): grade do mês com uma
// bolinha por item de cada dia — rotina agendada, cartão do kanban do dia,
// compromisso e calendário externo —, lidos da MESMA fonte da Semana/Dia
// (itensAgendaDoDia). As faixinhas com nome de 30/09 deixaram as células altas
// demais; desde 01/10/2026 a célula voltou à altura original e cada item é uma
// marca na cor dele: bolinha = pendente, "V" = concluído. Tocar num dia abre, logo abaixo da grade, o resumo daquele dia — rotinas,
// tarefas e compromissos, com o horário em que foram cumpridos; "abrir no Dia"
// leva à grade de horário. Não é a agenda do legado baseada na nota do mês
// (agendaMesHtml), que dependia da aba Diário removida.
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { isoToDate, localKey, weekStartDow } from "../../lib/gamificacao";
import { celulasMes, itensAgendaDoDia } from "../../lib/agenda";
import { getIcalCache } from "../../lib/ical";
import { DIAS_ABREV, DIAS_NOME } from "../../lib/constants";
import { formatHM } from "../../lib/schedule";
import type { AgendaItemDia } from "../../lib/agenda";
import { cn } from "../../lib/cn";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Cartao } from "../../ui/Cartao";
import { BotaoLink } from "../../ui/BotaoLink";
import { ACAO_NAV, DataNav, LinhaNav, PontoHoje, Sobra } from "./NavAgenda";

const MAX_MARCAS = 6;

export function AgendaMes({ onAbrirDia }: { onAbrirDia: (iso: string) => void }) {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const diaKanban = useAppStore((s) => s.diaKanban);
  const compromissos = useAppStore((s) => s.compromissos);
  const goTo = useAppStore((s) => s.goTo);
  const toggleDiaKanbanCard = useAppStore((s) => s.toggleDiaKanbanCard);
  const toggleCompromisso = useAppStore((s) => s.toggleCompromisso);

  const hojeISO = localKey();
  const hoje = isoToDate(hojeISO);
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const ehMesAtual = ref.ano === hoje.getFullYear() && ref.mes === hoje.getMonth();
  // dia aberto no resumo abaixo da grade (começa em hoje)
  const [aberto, setAberto] = useState<string | null>(hojeISO);
  const weekStart = weekStartDow();
  const icalCache = getIcalCache();
  const celulas = celulasMes(ref.ano, ref.mes, weekStart);
  const nomeMes = new Date(ref.ano, ref.mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function mover(delta: number) {
    const d = new Date(ref.ano, ref.mes + delta, 1);
    setRef({ ano: d.getFullYear(), mes: d.getMonth() });
    setAberto(null);
  }

  const itensDe = (iso: string) =>
    itensAgendaDoDia(iso, isoToDate(iso), routines, gam, history, diaKanban, compromissos, icalCache);

  return (
    <div>
      <LinhaNav>
        <BotaoIcone rotulo="Mês anterior" semBorda onClick={() => mover(-1)}>
          <Icon name="chevronLeft" size={15} />
        </BotaoIcone>
        <DataNav>
          {ehMesAtual && <PontoHoje rotulo="mês atual" />}
          {nomeMes}
        </DataNav>
        <BotaoIcone rotulo="Próximo mês" semBorda onClick={() => mover(1)}>
          <Icon name="chevronRight" size={15} />
        </BotaoIcone>
        <Sobra />
        {!ehMesAtual && (
          <BotaoIcone
            rotulo="Ir para o mês atual"
            className={ACAO_NAV}
            onClick={() => {
              setRef({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
              setAberto(hojeISO);
            }}
          >
            <Icon name="calendar" size={15} />
          </BotaoIcone>
        )}
      </LinhaNav>
      <Cartao className="p-2">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="pb-1 text-center text-xs font-semibold text-sub">
              {DIAS_ABREV[(weekStart + i) % 7]}
            </div>
          ))}
          {celulas.map((iso, i) => {
            if (!iso) return <div key={"v" + i} />;
            const itens = itensDe(iso);
            const ehHoje = iso === hojeISO;
            const passado = iso < hojeISO;
            const extras = itens.length - MAX_MARCAS;
            const sel = iso === aberto;
            return (
              <button
                key={iso}
                type="button"
                aria-label={`Dia ${+iso.slice(8, 10)}: ${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
                aria-pressed={sel}
                onClick={() => setAberto(sel ? null : iso)}
                className={cn(
                  "flex min-h-14 min-w-0 flex-col items-center gap-1 rounded-app-sm border px-0.5 pt-1 pb-1.5 transition-[background-color,transform] duration-150 active:scale-95",
                  sel ? "bg-caneta-soft" : "bg-transparent",
                  ehHoje ? "border-caneta" : "border-transparent",
                  passado && !sel && "opacity-75"
                )}
              >
                <span className={cn("text-sm", ehHoje ? "font-bold text-caneta" : "text-ink")}>
                  {+iso.slice(8, 10)}
                </span>
                {/* pendente = bolinha; concluído = "V" na cor do item (01/10/2026) */}
                <span className="flex min-h-[11px] flex-wrap items-center justify-center gap-[3px]">
                  {itens.slice(0, MAX_MARCAS).map((it) => (
                    <span
                      key={it.tipo + ":" + it.id}
                      data-mes={it.feito ? "feito" : "pendente"}
                      style={{ "--cor": it.cor || "var(--caneta)" } as React.CSSProperties}
                      className={
                        it.feito
                          ? "flex size-[11px] animate-marca items-center justify-center text-(--cor) [&_.icon-svg]:size-[11px] [&_.icon-svg]:stroke-[3]"
                          : "size-[6px] rounded-full bg-(--cor)"
                      }
                    >
                      {it.feito && <Icon name="check" size={11} />}
                    </span>
                  ))}
                  {extras > 0 && <span className="text-[9px] leading-[9px] text-sub">+{extras}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Cartao>
      {aberto && (
        <ResumoDia
          iso={aberto}
          itens={itensDe(aberto)}
          hojeISO={hojeISO}
          onAbrirDia={() => onAbrirDia(aberto)}
          onItem={(it) => {
            if (it.tipo === "rotina") goTo({ tab: "home", screen: "routineDetail", id: it.id });
            else if (it.tipo === "cartao") toggleDiaKanbanCard(it.id);
            else if (it.tipo === "compromisso") toggleCompromisso(it.id);
          }}
        />
      )}
    </div>
  );
}

/** Resumo do dia tocado na grade: cada item com horário, estado e cor. */
function ResumoDia({
  iso,
  itens,
  hojeISO,
  onAbrirDia,
  onItem,
}: {
  iso: string;
  itens: AgendaItemDia[];
  hojeISO: string;
  onAbrirDia: () => void;
  onItem: (it: AgendaItemDia) => void;
}) {
  const d = isoToDate(iso);
  const titulo = `${DIAS_NOME[d.getDay()]}, ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
  const ordenados = itens
    .slice()
    .sort((a, b) => (a.diaTodo ? -1 : b.diaTodo ? 1 : (a.ini ?? 9999) - (b.ini ?? 9999)));
  const passou = iso < hojeISO;
  return (
    <div className="mt-3 rounded-app bg-card-2 px-4 py-3" data-mes="resumo">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="m-0 flex-1 font-titulo text-lg font-bold first-letter:uppercase">{titulo}</h3>
        <BotaoLink onClick={onAbrirDia}>abrir no Dia</BotaoLink>
      </div>
      {ordenados.length === 0 ? (
        <div className="py-2 font-sans text-md text-sub">Nada agendado neste dia.</div>
      ) : (
        ordenados.map((it) => {
          const hora = it.diaTodo
            ? "dia todo"
            : it.ini != null
              ? formatHM(it.ini) + (it.fim != null ? " → " + formatHM(it.fim) : "")
              : "sem horário";
          const estado =
            it.tipo === "ical"
              ? "calendário externo"
              : it.feito
                ? it.tipo === "rotina"
                  ? "feita"
                  : "feito"
                : passou
                  ? it.tipo === "rotina"
                    ? "não feita"
                    : "não feito"
                  : "pendente";
          return (
            <button
              key={it.tipo + ":" + it.id}
              type="button"
              disabled={it.tipo === "ical"}
              onClick={() => onItem(it)}
              className="flex w-full items-center gap-2.5 border-0 bg-transparent py-1.5 text-left font-sans"
            >
              <span
                className="size-2.5 flex-none rounded-full border"
                style={{
                  borderColor: it.cor || "var(--caneta)",
                  background: it.feito ? it.cor || "var(--caneta)" : "transparent",
                }}
              />
              <span className={cn("min-w-0 flex-1 truncate text-md text-ink", it.feito && "text-sub line-through")}>
                {it.texto}
              </span>
              <span
                className={cn(
                  "flex-none text-sm tabular-nums",
                  it.feito ? "text-ok" : passou && it.tipo !== "ical" ? "text-erro" : "text-sub"
                )}
              >
                {it.feito && <Icon name="check" size={12} />} {hora} · {estado}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
