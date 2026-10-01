// "Fechar o dia" (recomendação 9 de 30/09/2026): a partir das 19h, se sobrou
// cartão do kanban do dia ou compromisso pendente hoje, um cartão na aba
// Rotinas lista cada um com "amanhã" (passa para o dia seguinte) ou
// "descartar". O "x" esconde até o dia seguinte (preferência local).
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { K_FECHAMENTODIA } from "../../lib/constants";
import { localKey } from "../../lib/gamificacao";
import { load, save } from "../../lib/storage";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { BotaoLink } from "../../ui/BotaoLink";

export const HORA_FECHAMENTO = 19;

export function FechamentoDia({ agora = new Date() }: { agora?: Date }) {
  const diaKanban = useAppStore((s) => s.diaKanban);
  const compromissos = useAppStore((s) => s.compromissos);
  const passarParaAmanha = useAppStore((s) => s.passarParaAmanha);
  const deleteCompromisso = useAppStore((s) => s.deleteCompromisso);
  const deleteDiaKanbanCard = useAppStore((s) => s.deleteDiaKanbanCard);
  const hoje = localKey(agora);
  const [dispensado, setDispensado] = useState(() => load<string>(K_FECHAMENTODIA, "") === hoje);

  if (dispensado || agora.getHours() < HORA_FECHAMENTO) return null;
  const pendentes = [
    ...diaKanban
      .filter((c) => c.per === "dia:" + hoje && c.col !== "done")
      .map((c) => ({ tipo: "cartao" as const, id: c.id, texto: c.text, hora: c.hIni || "" })),
    ...compromissos
      .filter((c) => c.date === hoje && !c.feito)
      .map((c) => ({ tipo: "compromisso" as const, id: c.id, texto: c.title, hora: c.time || "" })),
  ].sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99"));
  if (!pendentes.length) return null;

  return (
    <section className="mb-3.5 rounded-app bg-card-2 px-4 py-3" data-fechamento="dia">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="m-0 flex-1 font-titulo text-xl font-semibold text-caneta">Fechar o dia</h3>
        <BotaoIcone
          rotulo="Esconder até amanhã"
          semBorda
          tamanho="sm"
          onClick={() => {
            save(K_FECHAMENTODIA, hoje);
            setDispensado(true);
          }}
        >
          <Icon name="xmark" size={14} />
        </BotaoIcone>
      </div>
      <p className="mt-0 mb-1.5 font-sans text-sm text-sub">
        Ficou pendente hoje — passe para amanhã ou descarte.
      </p>
      {pendentes.map((p) => (
        <div key={p.tipo + p.id} className="flex items-center gap-2 py-1.5 font-sans text-md">
          <span className="min-w-0 flex-1 truncate text-ink">
            {p.hora && <span className="mr-1.5 text-sub tabular-nums">{p.hora}</span>}
            {p.texto}
          </span>
          <BotaoLink onClick={() => passarParaAmanha(p.tipo, p.id)}>amanhã</BotaoLink>
          <BotaoLink
            className="text-erro"
            onClick={() => (p.tipo === "compromisso" ? deleteCompromisso(p.id) : deleteDiaKanbanCard(p.id))}
          >
            descartar
          </BotaoLink>
        </div>
      ))}
    </section>
  );
}
