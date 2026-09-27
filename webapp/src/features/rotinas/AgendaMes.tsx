// Visão "Mês" da agenda (recomendação 1, 27/09/2026): grade do mês com uma
// bolinha por item de cada dia — rotina agendada, cartão do kanban do dia,
// compromisso e calendário externo —, lidos da MESMA fonte da Semana/Dia
// (itensAgendaDoDia). Feito = bolinha cheia; pendente = vazada. Tocar num dia
// abre a visão Dia naquela data. Não é a agenda do legado baseada na nota do
// mês (agendaMesHtml), que dependia da aba Diário removida.
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { isoToDate, localKey, weekStartDow } from "../../lib/gamificacao";
import { celulasMes, itensAgendaDoDia } from "../../lib/agenda";
import { getIcalCache } from "../../lib/ical";
import { DIAS_ABREV } from "../../lib/constants";
import { cn } from "../../lib/cn";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Cartao } from "../../ui/Cartao";
import { ACAO_NAV, DataNav, LinhaNav, PontoHoje, Sobra } from "./NavAgenda";

const MAX_PONTOS = 6;

export function AgendaMes({ onAbrirDia }: { onAbrirDia: (iso: string) => void }) {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const diaKanban = useAppStore((s) => s.diaKanban);
  const compromissos = useAppStore((s) => s.compromissos);

  const hojeISO = localKey();
  const hoje = isoToDate(hojeISO);
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const ehMesAtual = ref.ano === hoje.getFullYear() && ref.mes === hoje.getMonth();
  const weekStart = weekStartDow();
  const icalCache = getIcalCache();
  const celulas = celulasMes(ref.ano, ref.mes, weekStart);
  const nomeMes = new Date(ref.ano, ref.mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function mover(delta: number) {
    const d = new Date(ref.ano, ref.mes + delta, 1);
    setRef({ ano: d.getFullYear(), mes: d.getMonth() });
  }

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
            onClick={() => setRef({ ano: hoje.getFullYear(), mes: hoje.getMonth() })}
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
            const itens = itensAgendaDoDia(
              iso,
              isoToDate(iso),
              routines,
              gam,
              history,
              diaKanban,
              compromissos,
              icalCache
            );
            const ehHoje = iso === hojeISO;
            const passado = iso < hojeISO;
            const extras = itens.length - MAX_PONTOS;
            return (
              <button
                key={iso}
                type="button"
                aria-label={`Dia ${+iso.slice(8, 10)}: ${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
                onClick={() => onAbrirDia(iso)}
                className={cn(
                  "flex min-h-14 flex-col items-center gap-1 rounded-app-sm border-[1.5px] bg-transparent px-0.5 pt-1 pb-1.5",
                  ehHoje ? "border-caneta" : "border-transparent",
                  passado && "opacity-70"
                )}
              >
                <span className={cn("text-sm", ehHoje ? "font-bold text-caneta" : "text-ink")}>
                  {+iso.slice(8, 10)}
                </span>
                <span className="flex flex-wrap justify-center gap-[3px]">
                  {itens.slice(0, MAX_PONTOS).map((it) => (
                    <span
                      key={it.tipo + ":" + it.id}
                      className="size-[6px] rounded-full border-[1.5px]"
                      style={{
                        borderColor: it.cor || "var(--caneta)",
                        background: it.feito ? it.cor || "var(--caneta)" : "transparent",
                      }}
                    />
                  ))}
                  {extras > 0 && <span className="text-[10px] leading-[6px] text-sub">+{extras}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Cartao>
    </div>
  );
}
