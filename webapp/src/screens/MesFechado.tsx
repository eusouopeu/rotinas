// Tela "Mês fechado" (recomendação 11 de 30/09/2026): nota e selo do mês que
// acabou, semanas dele, rotinas mais feitas, gastos e o foco do mês seguinte
// (vira nota comum, como a reflexão da Semana fechada). Aberta pelo cartão
// fixo da aba Rotinas; "Depois" ou "Começar o mês" marcam o mês como visto.
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME } from "../lib/constants";
import { brl } from "../lib/expense";
import { formatarPeriodoSemana } from "../lib/semanaFechada";
import { mesFechadoPendente, nomeMes, resumoMes, tituloNotaMes } from "../lib/mesFechado";
import { Botao } from "../ui/Botao";
import { BotaoLink } from "../ui/BotaoLink";
import { AreaTexto } from "../ui/Campo";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { Cartao } from "../ui/Cartao";
import { Legenda } from "../ui/Legenda";
import { LinhaValor } from "../ui/LinhaValor";
import { RotuloSecao } from "../ui/RotuloSecao";
import { tela } from "../ui/Tela";
import { fmtNum } from "../lib/format";

export function MesFechado() {
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const templates = useAppStore((s) => s.templates);
  const goTo = useAppStore((s) => s.goTo);
  const marcarMesVisto = useAppStore((s) => s.marcarMesVisto);
  const addNote = useAppStore((s) => s.addNote);
  const [foco, setFoco] = useState("");

  const mes = mesFechadoPendente(gam) || gam.historico.meses[gam.historico.meses.length - 1] || null;
  useEffect(() => {
    if (!mes) goTo({ tab: "home", screen: "home" });
  }, [mes, goTo]);
  if (!mes) return null;

  const r = resumoMes(mes, gam, history, templates);
  const aprovado = mes.nota >= gam.config.notaMinima;
  const sair = () => {
    marcarMesVisto(mes.anoMes);
    goTo({ tab: "home", screen: "home" });
  };

  return (
    <div {...tela({})}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <BotaoLink tom="suave" onClick={sair}>
          Depois
        </BotaoLink>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        <CabecalhoTela titulo="Mês fechado" margem="0.5" />
        <Legenda className="mb-3">{nomeMes(mes.anoMes)}</Legenda>

        <Cartao className="mb-1.5 text-center">
          <div
            className="font-sans text-[48px] font-semibold"
            style={{ color: aprovado ? "var(--ok)" : "var(--erro)" }}
          >
            {fmtNum(mes.nota, 1)}
          </div>
          <Legenda>{aprovado ? "aprovado" : `abaixo da nota mínima (${gam.config.notaMinima})`}</Legenda>
          {mes.badge && (
            <div className="mt-2.5 text-2xl" style={{ color: BADGE_COR[mes.badge] }}>
              {BADGE_CHAR[mes.badge]} {BADGE_NOME[mes.badge]}
            </div>
          )}
          {r.delta !== null && (
            <Legenda className="mt-1.5">
              {r.delta >= 0 ? "+" : ""}
              {fmtNum(r.delta, 1)} em relação ao mês anterior
            </Legenda>
          )}
        </Cartao>

        <RotuloSecao>Semanas</RotuloSecao>
        <Cartao className="mb-1.5">
          {r.semanas.map((s) => (
            <LinhaValor
              key={s.inicioISO}
              rotulo={formatarPeriodoSemana(s.inicioISO).label}
              valor={s.dispensada ? "dispensada" : fmtNum(s.nota, 1)}
            />
          ))}
        </Cartao>

        <RotuloSecao>O mês em números</RotuloSecao>
        <Cartao className="mb-1.5">
          <LinhaValor rotulo="Rotinas executadas" valor={String(r.execucoes)} />
          {r.topRotinas.map((t) => (
            <LinhaValor key={t.nome} rotulo={t.nome} valor={`${t.vezes}×`} />
          ))}
          {r.gastos > 0 && <LinhaValor rotulo="Gastos lançados" valor={brl(r.gastos)} />}
          {r.entradas > 0 && (
            <>
              <LinhaValor rotulo="Receitas" valor={brl(r.entradas)} />
              <LinhaValor
                rotulo="Saldo do mês"
                valor={(r.entradas - r.gastos < 0 ? "−" : "") + brl(Math.abs(r.entradas - r.gastos))}
              />
            </>
          )}
          {mes.bonusMetas > 0 && <LinhaValor rotulo="Bônus de metas" valor={`+${fmtNum(mes.bonusMetas, 1)}`} />}
        </Cartao>

        <RotuloSecao>Foco do próximo mês</RotuloSecao>
        <AreaTexto
          rows={3}
          placeholder="Uma ou duas prioridades para o mês que começa..."
          value={foco}
          onChange={(e) => setFoco(e.target.value)}
        />

        <Botao
          className="mt-4 w-full"
          onClick={() => {
            if (foco.trim()) addNote(tituloNotaMes(mes.anoMes, mes.nota), "## Foco do próximo mês\n" + foco.trim());
            sair();
          }}
        >
          Começar o mês
        </Botao>
      </div>
    </div>
  );
}
