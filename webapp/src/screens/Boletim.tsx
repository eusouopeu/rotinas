// Porta de renderBoletim (index.html:13342-13501) — card de status da
// semana atual: nota/ritmo, orçamento de tempo, evolução, roda da vida por
// área (pontos, tendência, correlação), distribuição de pesos e vitrine de
// badges. Lógica pura em lib/boletim.ts.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { BADGE_NOME } from "../lib/constants";
import { localKey, isoToDate, addDaysISO, trimestreDe } from "../lib/gamificacao";
import {
  BLOCOS_SEMANA_PADRAO,
  BADGE_CHAR,
  BADGE_COR,
  ritmoInfo,
  contagemBadges,
  distribuicaoTags,
  pontosPorAreaSemana,
  tendenciaAreaSemanas,
  notaEvolucaoSemanas,
  correlacaoAreas,
  minutosPlanejadosSemana,
} from "../lib/boletim";
import { LinhaBadges, LinhaSimples, BarrasSemanas } from "../features/boletim/pecas";
import { Botao } from "../ui/Botao";
import { BarraDetalhe } from "../ui/BarraDetalhe";
import { Cartao } from "../ui/Cartao";
import { Legenda } from "../ui/Legenda";
import { LinhaBarra, TrilhoBarra } from "../ui/LinhaBarra";
import { LinhaValor } from "../ui/LinhaValor";
import { RotuloSecao } from "../ui/RotuloSecao";

export function Boletim() {
  const gam = useAppStore((s) => s.gam);
  const routines = useAppStore((s) => s.routines);
  const horasBudget = useAppStore((s) => s.horasBudget);
  const setHorasBudget = useAppStore((s) => s.setHorasBudget);
  const alternarDispensaSemana = useAppStore((s) => s.alternarDispensaSemana);
  const goTo = useAppStore((s) => s.goTo);

  // Campo de horas-orçamento: estado local pra não clampar o valor a cada
  // tecla (min="1" cortaria digitação intermediária) — persiste no blur,
  // igual ao `.onchange` do legado (dispara ao sair do campo/Enter).
  const [horasDraft, setHorasDraft] = useState(String(horasBudget));

  if (!gam.semanaAtual) return null;

  const r = ritmoInfo(gam.semanaAtual, gam.config);
  const pctNota = Math.min(100, Math.max(0, r.nota));
  const fimSemana = isoToDate(addDaysISO(gam.semanaAtual.inicioISO, 6)); // sábado

  const semanas = contagemBadges(gam.badges, "semanal");
  const meses = contagemBadges(gam.badges, "mensal");
  const tris = contagemBadges(gam.badges, "trimestral");
  const anos = contagemBadges(gam.badges, "anual");

  const hojeAnoMes = localKey().slice(0, 7);
  const bonusMes = gam.metasPontos[hojeAnoMes] || 0;
  const bonusTri = gam.metasPontos[trimestreDe(hojeAnoMes)] || 0;
  const bonusAno = gam.metasPontos[localKey().slice(0, 4)] || 0;
  const ultimasBadges = [...gam.badges].slice(-8).reverse();

  const disp = !!gam.semanaAtual.dispensada;
  const tags = distribuicaoTags(routines);
  const roda = pontosPorAreaSemana(gam.semanaAtual, gam.config);
  const tend = tendenciaAreaSemanas(gam.historico.semanas, gam.config, 8);
  const evolucao = notaEvolucaoSemanas(gam.historico.semanas, gam.semanaAtual, 11);
  const correlacoes = correlacaoAreas(gam.historico.semanas, gam.config, 8)
    .filter((p) => Math.abs(p.r) >= 0.5)
    .slice(0, 5);

  const pctTag = (t: "alto" | "medio" | "baixo") => (tags.total ? Math.round((tags[t] / tags.total) * 100) : 0);
  const larguraTag = (t: "alto" | "medio" | "baixo") => (tags[t] === 0 ? 0 : Math.max(3, pctTag(t)));
  const tagAlerta = tags.total >= 5 && pctTag("alto") >= 70;

  const planMin = minutosPlanejadosSemana(routines, gam.semanaAtual.inicioISO);
  const budgetMin = horasBudget * 60;
  const pctOrcamento = budgetMin > 0 ? Math.round((planMin / budgetMin) * 100) : 0;
  const estourouOrcamento = budgetMin > 0 && planMin > budgetMin;
  const hOrcamento = Math.floor(planMin / 60);
  const mOrcamento = planMin % 60;

  const rodaAtiva = !!gam.config.roda.ativa;
  const habitoAtivo = !!gam.config.habito.ativo;

  function commitHoras() {
    const v = Math.max(1, Number(horasDraft) || horasBudget);
    setHorasDraft(String(v));
    setHorasBudget(v);
  }

  const CARTAO = "mb-1.5";
  const evolucaoSemanas = evolucao.map((s, i) => {
    const dm = isoToDate(s.inicioISO);
    return {
      chave: s.inicioISO + (s.emCurso ? "-atual" : ""),
      titulo: `Semana de ${dm.toLocaleDateString()}: ${s.nota.toFixed(1)} pts${s.emCurso ? " (em curso)" : ""}${s.dispensada ? " · dispensada" : ""}`,
      rotulo: i === 0 || i === evolucao.length - 1 || s.emCurso ? `${String(dm.getDate()).padStart(2, "0")}/${String(dm.getMonth() + 1).padStart(2, "0")}` : "",
      altura: Math.max(2, Math.round((Math.min(100, Math.max(0, s.nota)) / 100) * 70)),
      cor: s.dispensada ? "var(--sub)" : "var(--caneta)",
      opacidade: s.emCurso ? "0.55" : "1",
    };
  });

  return (
    <div className="screen">
      <BarraDetalhe titulo="Boletim" className="mb-3" onVoltar={() => goTo({ tab: "home", screen: "home" })} />
      <div className="tab-scroll pb-6" data-rolagem>
        <Cartao className={`${CARTAO} text-center`}>
          <div className="font-sans text-[48px] font-semibold" style={{ color: disp ? "var(--sub)" : r.cor }}>
            {r.nota.toFixed(1)}
          </div>
          <Legenda>
            de 100 &middot; semana termina sábado {String(fimSemana.getDate()).padStart(2, "0")}/{String(fimSemana.getMonth() + 1).padStart(2, "0")}
          </Legenda>
          <TrilhoBarra className="mt-3 mb-1.5" pct={pctNota} cor={disp ? "var(--sub)" : r.cor} />
          {disp ? (
            <>
              <div className="font-semibold text-sub">Semana dispensada</div>
              <Legenda className="mt-1">não emite badge nem entra na média do mês</Legenda>
            </>
          ) : (
            <>
              <div className="font-semibold" style={{ color: r.cor }}>
                {r.label}
              </div>
              <Legenda className="mt-1">
                esperado até hoje: {r.esperado.toFixed(1)} &middot; saldo {r.saldo >= 0 ? "+" : ""}
                {r.saldo.toFixed(1)}
              </Legenda>
            </>
          )}
          {!gam.semanaAtual.totalBrutoAgendado && (
            <Legenda className="mt-3 text-caneta">
              Nenhuma rotina agendada nesta semana — a escala padrão está valendo ({BLOCOS_SEMANA_PADRAO} blocos médios de 30 min = 100). Ative o agendamento de uma
              rotina para o boletim medir a sua agenda de verdade.
            </Legenda>
          )}
        </Cartao>

        {!disp &&
          (r.nota < 100 ? (
            <Cartao className={CARTAO}>
              <RotuloSecao className="mt-0">Para fechar a semana</RotuloSecao>
              <Legenda>{r.porDia100.toFixed(1)} pontos/dia até sábado para chegar a 100</Legenda>
              {r.nota < gam.config.notaMinima && (
                <Legenda>
                  {r.porDia60.toFixed(1)} pontos/dia para ao menos aprovar ({gam.config.notaMinima})
                </Legenda>
              )}
            </Cartao>
          ) : (
            <Cartao className={CARTAO}>
              <Legenda className="text-ok">Meta da semana batida — o que vier agora é estouro ★</Legenda>
            </Cartao>
          ))}

        <RotuloSecao>Orçamento de tempo da semana</RotuloSecao>
        <Cartao className={CARTAO}>
          <LinhaBarra
            rotulo="Planejado"
            pct={Math.min(100, Math.max(3, pctOrcamento))}
            cor={estourouOrcamento ? "var(--erro)" : "var(--caneta)"}
            larguraValor="auto"
            valor={`${hOrcamento}h${mOrcamento > 0 ? mOrcamento + "min" : ""}`}
          />
          <Legenda className="mt-3 flex flex-wrap items-center gap-1.5">
            de{" "}
            <input
              type="number"
              min={1}
              value={horasDraft}
              onChange={(e) => setHorasDraft(e.target.value)}
              onBlur={commitHoras}
              onKeyDown={(e) => e.key === "Enter" && commitHoras()}
              className="w-[50px] px-1 py-0.5"
            />{" "}
            horas/semana disponíveis para rotinas
            {estourouOrcamento && <span className="text-erro"> &middot; {pctOrcamento}% do orçamento — planejado estoura o disponível</span>}
          </Legenda>
        </Cartao>

        {evolucao.length >= 2 && (
          <>
            <RotuloSecao>Evolução do boletim</RotuloSecao>
            <Cartao className={CARTAO}>
              <BarrasSemanas semanas={evolucaoSemanas} />
            </Cartao>
          </>
        )}

        <div className="mt-2.5 mb-1">
          <Botao variante={disp ? "neutro" : "perigo"} className="w-full" onClick={alternarDispensaSemana}>
            {disp ? "Reativar esta semana" : "Dispensar esta semana"}
          </Botao>
        </div>

        {(!rodaAtiva || !habitoAtivo) && (
          <Cartao className="mb-2.5">
            <RotuloSecao className="mt-0">Recursos avançados disponíveis</RotuloSecao>
            {!rodaAtiva && (
              <Legenda className="mb-1">
                Roda da vida desligada — rotinas de áreas diferentes ainda disputam o mesmo bolo de pontos da semana.
              </Legenda>
            )}
            {!habitoAtivo && (
              <Legenda>Hábito consolidado desligado — rotinas antigas não abrem espaço automaticamente para as que ainda não pegaram.</Legenda>
            )}
            <Botao variante="pilula" className="mt-1.5" onClick={() => goTo({ tab: "settings", screen: "settings" })}>
              Configurar em Ajustes &rarr;
            </Botao>
          </Cartao>
        )}

        {roda.linhas.length > 0 && (
          <>
            <RotuloSecao>Roda da vida — pontos desta semana</RotuloSecao>
            <Cartao className={CARTAO}>
              {roda.linhas.map((l) => (
                <LinhaBarra
                  key={l.label}
                  rotulo={l.label}
                  corRotulo={l.color}
                  cor={l.color}
                  pct={roda.max ? Math.max(3, Math.round((l.pontos / roda.max) * 100)) : 0}
                  larguraValor="auto"
                  valor={`${l.pontos.toFixed(1)}${l.previsto ? " / " + l.previsto.toFixed(0) : ""}`}
                />
              ))}
            </Cartao>
          </>
        )}

        {tend.length > 0 && (
          <>
            <RotuloSecao>Roda da vida — últimas {tend[0].valores.length} semanas</RotuloSecao>
            <Cartao className={CARTAO}>
              {tend.map((t) => (
                <LinhaSimples key={t.label} rotulo={t.label} corRotulo={t.color} estender>
                  {t.valores.join(" · ")}
                </LinhaSimples>
              ))}
              <Legenda className="mt-3">Pontos por semana, da mais antiga à mais recente (esquerda &rarr; direita).</Legenda>
            </Cartao>
          </>
        )}

        {correlacoes.length > 0 && (
          <>
            <RotuloSecao>Correlação entre áreas — últimas {tend[0].valores.length} semanas</RotuloSecao>
            <Cartao className={CARTAO}>
              {correlacoes.map((p) => {
                const intensidade = Math.abs(p.r) >= 0.8 ? "forte" : "moderada";
                const sentido = p.r >= 0 ? "junto" : "em direções opostas";
                return (
                  <div key={`${p.a.label}-${p.b.label}`}>
                    <LinhaValor
                      rotulo={
                        <>
                          <span style={{ color: p.a.color }}>{p.a.label}</span> &harr; <span style={{ color: p.b.color }}>{p.b.label}</span>
                        </>
                      }
                      valor={`${p.r >= 0 ? "+" : ""}${p.r.toFixed(2)}`}
                      corValor={Math.abs(p.r) >= 0.8 ? "var(--caneta)" : "var(--sub)"}
                    />
                    <Legenda className="mt-[-2px] mb-1.5">
                      correlação {intensidade}, andam {sentido}
                    </Legenda>
                  </div>
                );
              })}
              <Legenda className="mt-3">Rudimentar: só mostra que duas áreas sobem/descem juntas nas últimas semanas — não prova que uma causa a outra.</Legenda>
            </Cartao>
          </>
        )}

        <RotuloSecao>Distribuição de pesos</RotuloSecao>
        <Cartao className={CARTAO}>
          {tags.total ? (
            <>
              <LinhaBarra rotulo="Alto" pct={larguraTag("alto")} cor="var(--caneta)" valor={`${tags.alto} · ${pctTag("alto")}%`} />
              <LinhaBarra rotulo="Médio" pct={larguraTag("medio")} cor="var(--caneta-2)" valor={`${tags.medio} · ${pctTag("medio")}%`} />
              <LinhaBarra rotulo="Baixo" pct={larguraTag("baixo")} cor="var(--sub)" valor={`${tags.baixo} · ${pctTag("baixo")}%`} />
              {tagAlerta && (
                <Legenda className="mt-3 text-caneta">
                  {pctTag("alto")}% das etapas estão como "alto" — a tag está perdendo poder de distinguir. Vale rebaixar parte delas ou ajustar os multiplicadores em
                  Configurações.
                </Legenda>
              )}
            </>
          ) : (
            <Legenda>Nenhuma etapa com tempo ainda.</Legenda>
          )}
          {tags.nenhum > 0 && <Legenda className="mt-3">{tags.nenhum} etapa(s) com peso "nenhum" — rodam normalmente, mas ficam fora do boletim.</Legenda>}
        </Cartao>

        <RotuloSecao>Vitrine de badges</RotuloSecao>
        <Cartao className={CARTAO}>
          <LinhaSimples rotulo="Semanais">
            <LinhaBadges cont={semanas} />
          </LinhaSimples>
          <LinhaSimples rotulo="Mensais">
            <LinhaBadges cont={meses} />
          </LinhaSimples>
          <LinhaSimples rotulo="Trimestrais">
            <LinhaBadges cont={tris} />
          </LinhaSimples>
          <LinhaSimples rotulo="Anuais">
            <LinhaBadges cont={anos} />
          </LinhaSimples>
        </Cartao>

        {bonusMes + bonusTri + bonusAno > 0 && (
          <>
            <RotuloSecao>Bônus de metas concluídas</RotuloSecao>
            <Cartao className={CARTAO}>
              {bonusMes > 0 && <LinhaValor rotulo="Neste mês" valor={`+${bonusMes}`} corValor="var(--ok)" />}
              {bonusTri > 0 && <LinhaValor rotulo="Neste trimestre" valor={`+${bonusTri}`} corValor="var(--ok)" />}
              {bonusAno > 0 && <LinhaValor rotulo="Neste ano" valor={`+${bonusAno}`} corValor="var(--ok)" />}
              <Legenda className="mt-3">Entram na nota do período ao fechar, não na semanal.</Legenda>
            </Cartao>
          </>
        )}

        {ultimasBadges.length > 0 ? (
          <>
            <RotuloSecao>Últimas conquistas</RotuloSecao>
            <Cartao className={CARTAO}>
              {ultimasBadges.map((b, i) => (
                <LinhaSimples
                  key={i}
                  rotulo={
                    <>
                      {BADGE_CHAR[b.tipo]} {BADGE_NOME[b.tipo]}
                    </>
                  }
                  corRotulo={BADGE_COR[b.tipo]}
                >
                  {b.escopo} &middot; {b.periodo} &middot; {b.nota.toFixed(1)}
                </LinhaSimples>
              ))}
            </Cartao>
          </>
        ) : (
          <Legenda className="px-4">
            Nenhuma badge ainda — passe de {gam.config.notaMinima} pontos numa semana para conquistar a primeira.
          </Legenda>
        )}
      </div>
    </div>
  );
}
