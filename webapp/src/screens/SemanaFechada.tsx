// Porta da tela ritual "Semana fechada" (renderSemanaFechada,
// index.html:13515-13565) — exibida após a virada de semana com a nota final,
// badge conquistado, delta em relação à semana anterior não dispensada,
// destaques de pontuação e campo de reflexão que vira nota comum.
// Desde 13/09/2026 (recomendação 6) é uma revisão guiada em três passos:
// (1) resultado + o que levo da semana, (2) rotinas que ficaram para trás,
// com troca de dias ali mesmo, (3) metas que vencem em breve + foco da
// semana. Tudo vira uma única nota com seções (títulos recolhíveis).
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME, DIAS_ABREV } from "../lib/constants";
import { DAY_LETTERS } from "../lib/schedule";
import { daysUntil } from "../lib/metas";
import {
  semanaFechadaPendente,
  calcularDeltaSemana,
  calcularCorSemana,
  formatarPeriodoSemana,
  tituloNotaReflexao,
  rotinasAtrasadasSemana,
  metasProximasSemana,
  notaRevisaoSemana,
} from "../lib/semanaFechada";

const PASSOS = ["Resultado", "Rotinas", "Próxima semana"];

function TextoCrescente({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      id={id}
      ref={ref}
      className="mk-e-name"
      rows={2}
      placeholder={placeholder}
      style={{ width: "100%", resize: "none", overflow: "hidden", lineHeight: 1.5 }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SemanaFechada() {
  const gam = useAppStore((s) => s.gam);
  const goTo = useAppStore((s) => s.goTo);
  const marcarSemanaVista = useAppStore((s) => s.marcarSemanaVista);
  const addNote = useAppStore((s) => s.addNote);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const snoozes = useAppStore((s) => s.snoozes);
  const templates = useAppStore((s) => s.templates);
  const setRoutineDays = useAppStore((s) => s.setRoutineDays);

  const [passo, setPasso] = useState(0);
  const [reflexao, setReflexao] = useState("");
  const [foco, setFoco] = useState("");

  const semanas = gam.historico.semanas;
  const sem = semanaFechadaPendente(gam) || (semanas.length > 0 ? semanas[semanas.length - 1] : null);

  // lista e dias originais congelados ao abrir: trocar dias não tira a rotina da revisão
  const [atrasadas] = useState(() => (sem ? rotinasAtrasadasSemana(sem.inicioISO, routines, history, snoozes) : []));
  const [diasOriginais] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(routines.map((r) => [r.id, (r.schedule?.days || []).slice()]))
  );

  useEffect(() => {
    if (!sem) {
      goTo({ tab: "home", screen: "home" });
    }
  }, [sem, goTo]);

  if (!sem) return null;

  const delta = calcularDeltaSemana(sem, semanas);
  const cor = calcularCorSemana(sem, gam.config.notaMinima);
  const { label: periodoLabel } = formatarPeriodoSemana(sem.inicioISO);
  const metas = metasProximasSemana(templates);

  const nomesDias = (dias: number[]) => (dias.length ? [...dias].sort((a, b) => a - b).map((d) => DIAS_ABREV[d]).join(", ") : "—");
  const ajustes = atrasadas
    .map((a) => {
      const r = routines.find((x) => x.id === a.id);
      const antes = diasOriginais[a.id] || [];
      const depois = r?.schedule?.days || [];
      return nomesDias(antes) === nomesDias(depois) ? null : `${a.nome}: ${nomesDias(antes)} → ${nomesDias(depois)}`;
    })
    .filter((x): x is string => !!x);

  const sair = () => {
    marcarSemanaVista();
    goTo({ tab: "home", screen: "home" });
  };

  const handleSalvar = () => {
    const conteudo = notaRevisaoSemana({ reflexao, ajustes, foco });
    if (conteudo) addNote(tituloNotaReflexao(sem.inicioISO, sem.nota), conteudo);
    sair();
  };

  function alternarDia(id: string, d: number) {
    const r = routines.find((x) => x.id === id);
    const dias = r?.schedule?.days || [];
    const novos = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d];
    if (!novos.length) return; // não deixa a rotina sem nenhum dia
    setRoutineDays(id, novos);
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link-btn muted" id="sfSkip" onClick={sair}>
          Depois
        </button>
        <span className="ag-nav-gap" />
        <span className="dev-n" aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {passo + 1}/{PASSOS.length} · {PASSOS[passo]}
        </span>
      </div>
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
        <div className="home-header" style={{ marginBottom: 2 }}>
          <h1>Semana fechada</h1>
        </div>
        <div className="routine-meta" style={{ marginBottom: 12 }}>
          {periodoLabel}
        </div>

        {passo === 0 && (
          <>
            <div className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 48, fontWeight: 600, color: cor }}>
                {sem.nota.toFixed(1)}
              </div>
              {sem.dispensada ? (
                <div className="routine-meta">semana dispensada — não entra na média do mês</div>
              ) : (
                <div className="routine-meta">
                  {sem.nota >= gam.config.notaMinima ? "aprovado" : `abaixo da nota mínima (${gam.config.notaMinima})`}
                </div>
              )}
              {sem.badge && (
                <div style={{ marginTop: 10, fontSize: 18, color: BADGE_COR[sem.badge] }}>
                  {BADGE_CHAR[sem.badge]} {BADGE_NOME[sem.badge]}
                </div>
              )}
              {delta !== null && (
                <div className="dev-n" style={{ marginTop: 6 }}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)} em relação à semana anterior
                </div>
              )}
            </div>

            {(sem.destaques || []).length > 0 && (
              <>
                <div className="section-label">O que mais somou</div>
                <div className="stat-card">
                  {sem.destaques!.map((d, i) => (
                    <div className="bar-row" key={i}>
                      <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                        {d.nome}
                      </div>
                      <div className="bar-val">{d.pontos.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="section-label">O que você leva dessa semana</div>
            <TextoCrescente
              id="sfReflexao"
              value={reflexao}
              onChange={setReflexao}
              placeholder="O que funcionou, o que atrapalhou..."
            />
          </>
        )}

        {passo === 1 && (
          <>
            <div className="section-label">Rotinas que ficaram para trás</div>
            {atrasadas.length === 0 ? (
              <div className="stat-card">
                <div className="routine-meta">Todas as rotinas agendadas foram feitas. Nada para ajustar.</div>
              </div>
            ) : (
              <div className="stat-card">
                {atrasadas.map((a, i) => {
                  const r = routines.find((x) => x.id === a.id);
                  const porDias = !!r?.schedule && r.schedule.mode !== "intervalo";
                  return (
                    <div key={a.id} style={{ paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0, borderTop: i ? "1.5px solid var(--line)" : undefined }}>
                      <div className="bar-row" style={{ padding: 0 }}>
                        <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                          {a.nome}
                        </div>
                        <div className="bar-val" style={{ width: "auto", color: "var(--erro)" }}>
                          {a.feitas} de {a.planejadas}
                        </div>
                      </div>
                      {porDias ? (
                        <div className="day-chips" style={{ marginTop: 8 }}>
                          {DAY_LETTERS.map((l, d) => (
                            <span
                              key={d}
                              className={"day-chip" + (r!.schedule!.days.includes(d) ? " active" : "")}
                              title={DIAS_ABREV[d]}
                              onClick={() => alternarDia(a.id, d)}
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="stat-foot">Agendada por intervalo — ajuste no editor da rotina.</div>
                      )}
                    </div>
                  );
                })}
                <div className="stat-foot" style={{ marginTop: 12 }}>
                  Tocar num dia já muda o agendamento. As mudanças entram na nota da revisão.
                </div>
              </div>
            )}
          </>
        )}

        {passo === 2 && (
          <>
            <div className="section-label">Metas que vencem em breve</div>
            <div className="stat-card">
              {metas.length === 0 ? (
                <div className="routine-meta">Nenhuma meta com prazo nos próximos 14 dias.</div>
              ) : (
                metas.map((t) => {
                  const dias = daysUntil(t.date);
                  return (
                    <div className="bar-row" key={t.id}>
                      <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                        {t.title}
                      </div>
                      <div className="bar-val" style={{ width: "auto" }}>
                        {t.topics != null ? `${t.done || 0}/${t.topics} · ` : ""}
                        {dias === 0 ? "hoje" : `${dias} dia${dias > 1 ? "s" : ""}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="section-label">Foco da próxima semana</div>
            <TextoCrescente id="sfFoco" value={foco} onChange={setFoco} placeholder="Uma ou duas prioridades para a semana que começa..." />
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {passo > 0 && (
            <button className="btn-cancel" style={{ flex: "0 0 37%" }} onClick={() => setPasso(passo - 1)}>
              Voltar
            </button>
          )}
          {passo < PASSOS.length - 1 ? (
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => setPasso(passo + 1)}>
              Próximo
            </button>
          ) : (
            <button className="btn-primary" id="sfSalvar" style={{ flex: 1 }} onClick={handleSalvar}>
              Começar a semana
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
