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
  type BadgeContagem,
} from "../lib/boletim";

// Porta de linhaBadgesHtml (index.html:13334-13339) — sempre os 4 tipos,
// mesmo com contagem zero (mostra "◇ 0" etc.), igual ao legado.
function LinhaBadges({ cont }: { cont: BadgeContagem }) {
  const tipos: Array<keyof BadgeContagem> = ["diamante", "ouro", "prata", "bronze"];
  return (
    <>
      {tipos.map((tipo) => (
        <span key={tipo} style={{ marginRight: 14, color: BADGE_COR[tipo] }}>
          {BADGE_CHAR[tipo]} {cont[tipo]}
        </span>
      ))}
    </>
  );
}

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

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link-btn muted" onClick={() => goTo({ tab: "home", screen: "home" })}>
          &larr; Rotinas
        </button>
      </div>
      <div className="tab-scroll" style={{ paddingBottom: 24 }}>
        <div className="home-header" style={{ marginBottom: 6 }}>
          <h1>Boletim</h1>
        </div>

        <div className="stat-card" style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 600, color: disp ? "var(--sub)" : r.cor }}>
            {r.nota.toFixed(1)}
          </div>
          <div className="routine-meta">
            de 100 &middot; semana termina sábado {String(fimSemana.getDate()).padStart(2, "0")}/{String(fimSemana.getMonth() + 1).padStart(2, "0")}
          </div>
          <div className="bar-track" style={{ margin: "12px 0 6px" }}>
            <div className="bar-fill" style={{ width: `${pctNota}%`, background: disp ? "var(--sub)" : r.cor }} />
          </div>
          {disp ? (
            <>
              <div style={{ color: "var(--sub)", fontWeight: 600 }}>Semana dispensada</div>
              <div className="dev-n" style={{ marginTop: 4 }}>
                não emite badge nem entra na média do mês
              </div>
            </>
          ) : (
            <>
              <div style={{ color: r.cor, fontWeight: 600 }}>{r.label}</div>
              <div className="dev-n" style={{ marginTop: 4 }}>
                esperado até hoje: {r.esperado.toFixed(1)} &middot; saldo {r.saldo >= 0 ? "+" : ""}
                {r.saldo.toFixed(1)}
              </div>
            </>
          )}
          {!gam.semanaAtual.totalBrutoAgendado && (
            <div className="stat-foot" style={{ color: "var(--caneta)" }}>
              Nenhuma rotina agendada nesta semana — a escala padrão está valendo ({BLOCOS_SEMANA_PADRAO} blocos médios de 30 min = 100). Ative o agendamento de uma
              rotina para o boletim medir a sua agenda de verdade.
            </div>
          )}
        </div>

        {!disp &&
          (r.nota < 100 ? (
            <div className="stat-card">
              <div className="section-label" style={{ marginTop: 0 }}>
                Para fechar a semana
              </div>
              <div className="routine-meta">{r.porDia100.toFixed(1)} pontos/dia até sábado para chegar a 100</div>
              {r.nota < gam.config.notaMinima && (
                <div className="routine-meta">
                  {r.porDia60.toFixed(1)} pontos/dia para ao menos aprovar ({gam.config.notaMinima})
                </div>
              )}
            </div>
          ) : (
            <div className="stat-card">
              <div className="routine-meta" style={{ color: "var(--ok)" }}>
                Meta da semana batida — o que vier agora é estouro ★
              </div>
            </div>
          ))}

        <div className="section-label">Orçamento de tempo da semana</div>
        <div className="stat-card">
          <div className="bar-row">
            <div className="bar-name">Planejado</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(100, Math.max(3, pctOrcamento))}%`, background: estourouOrcamento ? "var(--erro)" : "var(--caneta)" }} />
            </div>
            <div className="bar-val" style={{ width: "auto", whiteSpace: "nowrap", flex: "0 0 auto" }}>
              {hOrcamento}h{mOrcamento > 0 ? mOrcamento + "min" : ""}
            </div>
          </div>
          <div className="stat-foot" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            de{" "}
            <input
              type="number"
              min={1}
              value={horasDraft}
              onChange={(e) => setHorasDraft(e.target.value)}
              onBlur={commitHoras}
              onKeyDown={(e) => e.key === "Enter" && commitHoras()}
              style={{ width: 50, padding: "2px 4px" }}
            />{" "}
            horas/semana disponíveis para rotinas
            {estourouOrcamento && <span style={{ color: "var(--erro)" }}> &middot; {pctOrcamento}% do orçamento — planejado estoura o disponível</span>}
          </div>
        </div>

        {evolucao.length >= 2 && (
          <>
            <div className="section-label">Evolução do boletim</div>
            <div className="stat-card">
              <div className="hour-chart">
                {evolucao.map((s, i) => {
                  const h = Math.max(2, Math.round((Math.min(100, Math.max(0, s.nota)) / 100) * 70));
                  const cor = s.dispensada ? "var(--sub)" : "var(--caneta)";
                  const opacidade = s.emCurso ? "0.55" : "1";
                  const mostraLabel = i === 0 || i === evolucao.length - 1 || s.emCurso;
                  const dm = isoToDate(s.inicioISO);
                  return (
                    <div
                      key={s.inicioISO + (s.emCurso ? "-atual" : "")}
                      className="hour-col"
                      title={`Semana de ${dm.toLocaleDateString()}: ${s.nota.toFixed(1)} pts${s.emCurso ? " (em curso)" : ""}${s.dispensada ? " · dispensada" : ""}`}
                    >
                      <span className="trend-lbl">{mostraLabel ? `${String(dm.getDate()).padStart(2, "0")}/${String(dm.getMonth() + 1).padStart(2, "0")}` : ""}</span>
                      <div className="hour-bar-area">
                        <div className="hour-bar" style={{ height: h, background: cor, opacity: opacidade }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div style={{ margin: "10px 0 4px" }}>
          <button className={disp ? "btn-cancel" : "btn-danger-outline"} onClick={alternarDispensaSemana} style={{ width: "100%" }}>
            {disp ? "Reativar esta semana" : "Dispensar esta semana"}
          </button>
        </div>

        {(!rodaAtiva || !habitoAtivo) && (
          <div className="stat-card" style={{ marginBottom: 10 }}>
            <div className="section-label" style={{ marginTop: 0 }}>
              Recursos avançados disponíveis
            </div>
            {!rodaAtiva && (
              <div className="dev-n" style={{ marginBottom: 4 }}>
                Roda da vida desligada — rotinas de áreas diferentes ainda disputam o mesmo bolo de pontos da semana.
              </div>
            )}
            {!habitoAtivo && <div className="dev-n">Hábito consolidado desligado — rotinas antigas não abrem espaço automaticamente para as que ainda não pegaram.</div>}
            <button className="link-btn" onClick={() => goTo({ tab: "settings", screen: "settings" })} style={{ marginTop: 6 }}>
              Configurar em Ajustes &rarr;
            </button>
          </div>
        )}

        {roda.linhas.length > 0 && (
          <>
            <div className="section-label">Roda da vida — pontos desta semana</div>
            <div className="stat-card">
              {roda.linhas.map((l) => (
                <div key={l.label} className="bar-row">
                  <div className="bar-name" style={{ color: l.color }}>
                    {l.label}
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${roda.max ? Math.max(3, Math.round((l.pontos / roda.max) * 100)) : 0}%`, background: l.color }} />
                  </div>
                  <div className="bar-val" style={{ width: "auto", whiteSpace: "nowrap", flex: "0 0 auto" }}>
                    {l.pontos.toFixed(1)}
                    {l.previsto ? " / " + l.previsto.toFixed(0) : ""}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tend.length > 0 && (
          <>
            <div className="section-label">Roda da vida — últimas {tend[0].valores.length} semanas</div>
            <div className="stat-card">
              {tend.map((t) => (
                <div key={t.label} className="bar-row">
                  <div className="bar-name" style={{ color: t.color }}>
                    {t.label}
                  </div>
                  <div className="bar-val" style={{ width: "auto", flex: 1, textAlign: "right", fontFamily: "'Montserrat'", fontSize: 12 }}>
                    {t.valores.join(" · ")}
                  </div>
                </div>
              ))}
              <div className="stat-foot">Pontos por semana, da mais antiga à mais recente (esquerda &rarr; direita).</div>
            </div>
          </>
        )}

        {correlacoes.length > 0 && (
          <>
            <div className="section-label">Correlação entre áreas — últimas {tend[0].valores.length} semanas</div>
            <div className="stat-card">
              {correlacoes.map((p) => {
                const intensidade = Math.abs(p.r) >= 0.8 ? "forte" : "moderada";
                const sentido = p.r >= 0 ? "junto" : "em direções opostas";
                return (
                  <div key={`${p.a.label}-${p.b.label}`}>
                    <div className="bar-row">
                      <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                        <span style={{ color: p.a.color }}>{p.a.label}</span> &harr; <span style={{ color: p.b.color }}>{p.b.label}</span>
                      </div>
                      <div className="bar-val" style={{ width: "auto", color: Math.abs(p.r) >= 0.8 ? "var(--caneta)" : "var(--sub)" }}>
                        {p.r >= 0 ? "+" : ""}
                        {p.r.toFixed(2)}
                      </div>
                    </div>
                    <div className="dev-n" style={{ margin: "-2px 0 6px" }}>
                      correlação {intensidade}, andam {sentido}
                    </div>
                  </div>
                );
              })}
              <div className="stat-foot">Rudimentar: só mostra que duas áreas sobem/descem juntas nas últimas semanas — não prova que uma causa a outra.</div>
            </div>
          </>
        )}

        <div className="section-label">Distribuição de pesos</div>
        <div className="stat-card">
          {tags.total ? (
            <>
              <div className="bar-row">
                <div className="bar-name">Alto</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${larguraTag("alto")}%`, background: "var(--caneta)" }} />
                </div>
                <div className="bar-val">
                  {tags.alto} &middot; {pctTag("alto")}%
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-name">Médio</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${larguraTag("medio")}%`, background: "var(--caneta-2)" }} />
                </div>
                <div className="bar-val">
                  {tags.medio} &middot; {pctTag("medio")}%
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-name">Baixo</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${larguraTag("baixo")}%`, background: "var(--sub)" }} />
                </div>
                <div className="bar-val">
                  {tags.baixo} &middot; {pctTag("baixo")}%
                </div>
              </div>
              {tagAlerta && (
                <div className="stat-foot" style={{ color: "var(--caneta)" }}>
                  {pctTag("alto")}% das etapas estão como "alto" — a tag está perdendo poder de distinguir. Vale rebaixar parte delas ou ajustar os multiplicadores em
                  Configurações.
                </div>
              )}
            </>
          ) : (
            <div className="dev-n">Nenhuma etapa com tempo ainda.</div>
          )}
          {tags.nenhum > 0 && <div className="stat-foot">{tags.nenhum} etapa(s) com peso "nenhum" — rodam normalmente, mas ficam fora do boletim.</div>}
        </div>

        <div className="section-label">Vitrine de badges</div>
        <div className="stat-card">
          <div className="bar-row">
            <div className="bar-name">Semanais</div>
            <div className="bar-val" style={{ width: "auto" }}>
              <LinhaBadges cont={semanas} />
            </div>
          </div>
          <div className="bar-row">
            <div className="bar-name">Mensais</div>
            <div className="bar-val" style={{ width: "auto" }}>
              <LinhaBadges cont={meses} />
            </div>
          </div>
          <div className="bar-row">
            <div className="bar-name">Trimestrais</div>
            <div className="bar-val" style={{ width: "auto" }}>
              <LinhaBadges cont={tris} />
            </div>
          </div>
          <div className="bar-row">
            <div className="bar-name">Anuais</div>
            <div className="bar-val" style={{ width: "auto" }}>
              <LinhaBadges cont={anos} />
            </div>
          </div>
        </div>

        {bonusMes + bonusTri + bonusAno > 0 && (
          <>
            <div className="section-label">Bônus de metas concluídas</div>
            <div className="stat-card">
              {bonusMes > 0 && (
                <div className="bar-row">
                  <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                    Neste mês
                  </div>
                  <div className="bar-val" style={{ color: "var(--ok)" }}>
                    +{bonusMes}
                  </div>
                </div>
              )}
              {bonusTri > 0 && (
                <div className="bar-row">
                  <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                    Neste trimestre
                  </div>
                  <div className="bar-val" style={{ color: "var(--ok)" }}>
                    +{bonusTri}
                  </div>
                </div>
              )}
              {bonusAno > 0 && (
                <div className="bar-row">
                  <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                    Neste ano
                  </div>
                  <div className="bar-val" style={{ color: "var(--ok)" }}>
                    +{bonusAno}
                  </div>
                </div>
              )}
              <div className="stat-foot">Entram na nota do período ao fechar, não na semanal.</div>
            </div>
          </>
        )}

        {ultimasBadges.length > 0 ? (
          <>
            <div className="section-label">Últimas conquistas</div>
            <div className="stat-card">
              {ultimasBadges.map((b, i) => (
                <div key={i} className="bar-row">
                  <div className="bar-name" style={{ color: BADGE_COR[b.tipo] }}>
                    {BADGE_CHAR[b.tipo]} {BADGE_NOME[b.tipo]}
                  </div>
                  <div className="bar-val" style={{ width: "auto" }}>
                    {b.escopo} &middot; {b.periodo} &middot; {b.nota.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="dev-n" style={{ padding: "0 16px" }}>
            Nenhuma badge ainda — passe de {gam.config.notaMinima} pontos numa semana para conquistar a primeira.
          </div>
        )}
      </div>
    </div>
  );
}
