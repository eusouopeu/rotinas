// Tela "Ano fechado" (recomendação 9 de 02/10/2026), no molde do Mês fechado:
// nota e selo do ano, meses, rotinas mais feitas, metas com prazo no ano e
// dinheiro (gastos por categoria, receitas e saldo); o foco do ano novo vira
// nota. Aberta pelo cartão fixo da aba Rotinas; sair marca o ano como visto.
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME } from "../lib/constants";
import { brl } from "../lib/expense";
import { anoFechadoPendente, resumoAno } from "../lib/anoFechado";
import { nomeMes } from "../lib/mesFechado";
import { Botao } from "../ui/Botao";
import { BotaoLink } from "../ui/BotaoLink";
import { AreaTexto } from "../ui/Campo";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { Cartao } from "../ui/Cartao";
import { Legenda } from "../ui/Legenda";
import { LinhaBarra } from "../ui/LinhaBarra";
import { LinhaValor } from "../ui/LinhaValor";
import { RotuloSecao } from "../ui/RotuloSecao";
import { tela } from "../ui/Tela";
import { cn } from "../lib/cn";

export function AnoFechado() {
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const templates = useAppStore((s) => s.templates);
  const goTo = useAppStore((s) => s.goTo);
  const marcarAnoVisto = useAppStore((s) => s.marcarAnoVisto);
  const addNote = useAppStore((s) => s.addNote);
  const [foco, setFoco] = useState("");

  const ano = anoFechadoPendente(gam) || gam.historico.anos[gam.historico.anos.length - 1] || null;
  useEffect(() => {
    if (!ano) goTo({ tab: "home", screen: "home" });
  }, [ano, goTo]);
  if (!ano) return null;

  const r = resumoAno(ano, gam, history, templates);
  const aprovado = ano.nota >= gam.config.notaMinima;
  const sair = () => {
    marcarAnoVisto(ano.ano);
    goTo({ tab: "home", screen: "home" });
  };
  const saldo = r.entradas - r.gastos;

  return (
    <div {...tela({})}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <BotaoLink tom="suave" onClick={sair}>
          Depois
        </BotaoLink>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        <CabecalhoTela titulo="Ano fechado" margem="0.5" />
        <Legenda className="mb-3">{ano.ano}</Legenda>

        <Cartao className="mb-1.5 text-center">
          <div className={cn("font-sans text-[48px] font-semibold", aprovado ? "text-ok" : "text-erro")}>
            {ano.nota.toFixed(1)}
          </div>
          <Legenda>{aprovado ? "aprovado" : `abaixo da nota mínima (${gam.config.notaMinima})`}</Legenda>
          {ano.badge && (
            <div className="mt-2.5 text-2xl" style={{ color: BADGE_COR[ano.badge] }}>
              {BADGE_CHAR[ano.badge]} {BADGE_NOME[ano.badge]}
            </div>
          )}
          {r.delta !== null && (
            <Legenda className="mt-1.5">
              {r.delta >= 0 ? "+" : ""}
              {r.delta.toFixed(1)} em relação ao ano anterior
            </Legenda>
          )}
        </Cartao>

        {r.meses.length > 0 && (
          <>
            <RotuloSecao>Meses{r.mediaMeses != null ? ` · média ${r.mediaMeses.toFixed(1)}` : ""}</RotuloSecao>
            <Cartao className="mb-1.5">
              {r.meses.map((m) => (
                <LinhaValor key={m.anoMes} rotulo={nomeMes(m.anoMes).split(" de ")[0]} valor={m.nota.toFixed(1)} />
              ))}
            </Cartao>
          </>
        )}

        <RotuloSecao>Rotinas</RotuloSecao>
        <Cartao className="mb-1.5">
          <LinhaValor rotulo="Execuções no ano" valor={String(r.execucoes)} />
          {r.topRotinas.map((t) => (
            <LinhaValor key={t.nome} rotulo={t.nome} valor={`${t.vezes}×`} />
          ))}
          {r.metas.total > 0 && (
            <LinhaValor rotulo="Metas com prazo no ano concluídas" valor={`${r.metas.concluidas} de ${r.metas.total}`} />
          )}
          {ano.bonusMetas > 0 && <LinhaValor rotulo="Bônus de metas" valor={`+${ano.bonusMetas.toFixed(1)}`} />}
        </Cartao>

        {(r.gastos > 0 || r.entradas > 0) && (
          <>
            <RotuloSecao>Dinheiro</RotuloSecao>
            <Cartao className="mb-1.5">
              <LinhaValor rotulo="Gastos" valor={brl(r.gastos)} />
              {r.entradas > 0 && (
                <>
                  <LinhaValor rotulo="Receitas" valor={brl(r.entradas)} />
                  <LinhaValor rotulo="Saldo do ano" valor={(saldo < 0 ? "−" : "") + brl(Math.abs(saldo))} />
                </>
              )}
            </Cartao>
            {r.porCategoria.length > 0 && (
              <Cartao className="mb-1.5">
                {r.porCategoria.map((c) => (
                  <LinhaBarra key={c.cat} rotulo={c.cat} valor={brl(c.valor)} pct={Math.max(3, c.pct)} cor={c.cor} />
                ))}
              </Cartao>
            )}
          </>
        )}

        <RotuloSecao>Foco do ano que começa</RotuloSecao>
        <AreaTexto
          rows={3}
          placeholder="O que fica, o que sai e o que entra neste ano..."
          value={foco}
          onChange={(e) => setFoco(e.target.value)}
        />

        <Botao
          className="mt-4 w-full"
          onClick={() => {
            if (foco.trim()) addNote(`Ano de ${ano.ano} · nota ${ano.nota.toFixed(1)}`, "## Foco do ano\n" + foco.trim());
            sair();
          }}
        >
          Começar o ano
        </Botao>
      </div>
    </div>
  );
}
