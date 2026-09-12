// Porta parcial de renderSettings (index.html:13700-14142) — esta fase soma
// Roda da vida, Hábito consolidado, Vagas, Pontuação do boletim (com
// simulação "e se" da semana), Backup (exportar/importar JSON), Calendário
// externo (iCal), Mini player (ponte, desktop), Sincronização com nuvem
// (Drive) e Integrações (MCP) às seções anteriores (Aparência, Início da
// semana, Notificações). PIN e atalhos de teclado ficam de fora por decisão
// de escopo (não entram na migração — CLAUDE.md). Fica para fases
// seguintes: mensagens motivacionais e cronômetro (overlay nativo Android).
import { useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Tabbar } from "../components/Tabbar";
import { Icon } from "../components/Icon";
import { BackupCard } from "../components/BackupCard";
import { IcalCard } from "../components/IcalCard";
import { SyncCard } from "../components/SyncCard";
import { McpCard } from "../components/McpCard";
import { DiagnosticsCard } from "../components/DiagnosticsCard";
import { FiltroAjustes, SecaoAjuste } from "../components/SecaoAjuste";
import { getMiniPlayerBridge } from "../lib/nativeBridge";
import { DIAS_ABREV } from "../lib/constants";
import { isDesktop, isNative } from "../lib/storage";
import { inicioSemanaISO } from "../lib/gamificacao";
import { simularDistribuicaoSemana } from "../lib/scoring";
import { alarmCue } from "../lib/haptics";
import type { SomModo } from "../lib/sound";
import { agendaIcs } from "../lib/exportIcs";
import { downloadFile } from "../lib/exportFile";

const NUDGE_DIA_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];

export function Settings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const fontScale = useAppStore((s) => s.fontScale);
  const setFontScale = useAppStore((s) => s.setFontScale);
  const weekStart = useAppStore((s) => s.weekStart);
  const setWeekStart = useAppStore((s) => s.setWeekStart);
  const digestSemanal = useAppStore((s) => s.digestSemanal);
  const setDigestSemanal = useAppStore((s) => s.setDigestSemanal);
  const nudge = useAppStore((s) => s.nudge);
  const setNudge = useAppStore((s) => s.setNudge);
  const cronometroModo = useAppStore((s) => s.cronometroModo);
  const setCronometroModo = useAppStore((s) => s.setCronometroModo);
  const nudgeDias = useAppStore((s) => s.nudgeDias);
  const toggleNudgeDia = useAppStore((s) => s.toggleNudgeDia);
  const nudgeMetas = useAppStore((s) => s.nudgeMetas);
  const setNudgeMetas = useAppStore((s) => s.setNudgeMetas);
  const nudgeStreak = useAppStore((s) => s.nudgeStreak);
  const setNudgeStreak = useAppStore((s) => s.setNudgeStreak);
  const somModo = useAppStore((s) => s.somModo);
  const setSomModo = useAppStore((s) => s.setSomModo);
  const vibracao = useAppStore((s) => s.vibracao);
  const setVibracao = useAppStore((s) => s.setVibracao);
  const compromissos = useAppStore((s) => s.compromissos);
  const showAlertBanner = useAppStore((s) => s.showAlertBanner);

  const gam = useAppStore((s) => s.gam);
  const updateGamConfig = useAppStore((s) => s.updateGamConfig);
  const routines = useAppStore((s) => s.routines);
  const addRodaArea = useAppStore((s) => s.addRodaArea);
  const updateRodaArea = useAppStore((s) => s.updateRodaArea);
  const removeRodaArea = useAppStore((s) => s.removeRodaArea);
  const [novaArea, setNovaArea] = useState("");
  const [areaParaRemover, setAreaParaRemover] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const c = gam.config;
  const simulacao = useMemo(() => simularDistribuicaoSemana(routines, gam, inicioSemanaISO(new Date())), [routines, gam]);

  return (
    <FiltroAjustes.Provider value={busca}>
    <div className="screen with-tabbar screen-wide">
      <div className="settings-scroll" style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
        <div className="home-header" style={{ marginBottom: 6 }}>
          <h1>Ajustes</h1>
        </div>

        {/* Tema e tamanho ficam sempre à vista, em fileiras largas; o resto
            da aba é uma pilha de seções retráteis filtrada pela busca. */}
        <div className="section-label">Tema</div>
        <div className="type-toggle mf-wide set-toggle">
          {(["auto", "light", "dark"] as const).map((t) => (
            <span key={t} className={theme === t ? "active" : ""} onClick={() => setTheme(t)}>
              {t === "auto" ? "sistema" : t === "light" ? "claro" : "escuro"}
            </span>
          ))}
        </div>
        <div className="section-label">Tamanho do texto</div>
        <div className="type-toggle mf-wide set-toggle">
          {[
            { v: 0.9, l: "P" },
            { v: 1, l: "M" },
            { v: 1.15, l: "G" },
            { v: 1.3, l: "GG" },
          ].map(({ v, l }) => (
            <span key={v} className={fontScale === v ? "active" : ""} onClick={() => setFontScale(v)}>
              {l}
            </span>
          ))}
        </div>

        <input
          className="set-busca"
          type="text"
          placeholder="Buscar em Ajustes..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <SecaoAjuste titulo="Início da semana">
        <div className="stat-card">
          <div className="day-chips">
            {DIAS_ABREV.map((l, d) => (
              <span
                key={d}
                className={"day-chip" + (weekStart === d ? " active" : "")}
                onClick={() => setWeekStart(d)}
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        </SecaoAjuste>

        <SecaoAjuste titulo="Notificações">
        <div className="stat-card">
          <label className="switch-row" style={{ marginTop: 0 }}>
            <span>Resumo ao fechar a semana</span>
            <input
              type="checkbox"
              checked={digestSemanal}
              onChange={(e) => setDigestSemanal(e.target.checked)}
            />
          </label>
          <label className="switch-row" style={{ marginTop: 12 }}>
            <span>Aviso de ritmo</span>
            <input type="checkbox" checked={nudge} onChange={(e) => setNudge(e.target.checked)} />
          </label>
          <div className="day-chips" style={{ marginTop: 10 }}>
            {NUDGE_DIA_LABEL.map((l, d) => (
              <span
                key={d}
                className={"day-chip" + (nudgeDias.includes(d) ? " active" : "")}
                onClick={() => toggleNudgeDia(d)}
              >
                {l}
              </span>
            ))}
          </div>
          <div className="stat-foot">Nos dias marcados, a partir das 9h, quando a semana está atrasada.</div>
          <label className="switch-row" style={{ marginTop: 12 }}>
            <span>Meta perto do prazo</span>
            <input type="checkbox" checked={nudgeMetas} onChange={(e) => setNudgeMetas(e.target.checked)} />
          </label>
          <label className="switch-row" style={{ marginTop: 12 }}>
            <span>Sequência em risco</span>
            <input type="checkbox" checked={nudgeStreak} onChange={(e) => setNudgeStreak(e.target.checked)} />
          </label>
          <div className="stat-foot">
            Meta: uma vez por dia quando falta até 2 dias para o prazo. Sequência: a partir das 18h, quando uma rotina de
            hoje com sequência longa ainda não foi feita.
          </div>
        </div>

        </SecaoAjuste>

        <SecaoAjuste titulo="Som e vibração">
        <div className="stat-card">
          <div className="bar-row">
            <div className="bar-name" style={{ width: "auto", flex: 1 }}>
              Aviso sonoro
            </div>
            <div className="type-toggle">
              {(["mudo", "suave", "normal"] as SomModo[]).map((m) => (
                <span key={m} className={somModo === m ? "active" : ""} onClick={() => setSomModo(m)}>
                  {m}
                </span>
              ))}
            </div>
          </div>
          <label className="switch-row" style={{ marginTop: 12 }}>
            <span>Vibrar</span>
            <input type="checkbox" checked={vibracao} onChange={(e) => setVibracao(e.target.checked)} />
          </label>
          <div className="bar-row" style={{ marginTop: 12 }}>
            <div className="bar-name" style={{ width: "auto", flex: 1 }}>
              Testar
            </div>
            <button className="link-btn" onClick={() => alarmCue()}>
              tocar
            </button>
          </div>
          <div className="stat-foot">
            Vale para a troca de etapa, o fim do tempo e a rotina concluída dentro do Player. Com o app em segundo plano
            quem avisa é a notificação de fim de etapa, que segue este mesmo modo.
          </div>
        </div>

        </SecaoAjuste>

        <SecaoAjuste titulo="Roda da vida">
        <div className="stat-card">
          <label className="switch-row" style={{ marginTop: 0 }}>
            <span>Repartir os pontos por área</span>
            <input
              type="checkbox"
              checked={c.roda.ativa}
              onChange={(e) => updateGamConfig({ roda: { ...c.roda, ativa: e.target.checked } })}
            />
          </label>
          {c.roda.areas.map((a) => (
            /* .roda-area-row só traz o gap: quem dá display:flex é
               .sched-time-row (app.css:405/429), igual ao legado
               (index.html:14076) — sem ela a linha empilha. */
            <div className="sched-time-row roda-area-row" style={{ marginTop: 0 }} key={a.id}>
              <input
                type="color"
                className="area-color-swatch"
                title="Cor da área"
                aria-label="Cor da área — usada também nas rotinas dessa área"
                value={a.color.startsWith("#") ? a.color : "#6D28D9"}
                onChange={(e) => updateRodaArea(a.id, { color: e.target.value })}
              />
              <input
                className="roda-area-nome"
                type="text"
                aria-label="Nome da área"
                style={{ color: a.color }}
                value={a.label}
                onChange={(e) => updateRodaArea(a.id, { label: e.target.value })}
              />
              <input
                className="roda-area-peso dur-input"
                type="number"
                min={1}
                max={10}
                value={a.peso}
                onChange={(e) => updateRodaArea(a.id, { peso: Math.max(1, +e.target.value || 1) })}
              />
              <button
                className="icon-btn borderless"
                title="Remover área"
                aria-label="Remover área"
                style={{ color: "var(--erro)" }}
                onClick={() => setAreaParaRemover(a.id)}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
          {c.roda.areas.length === 0 && <div className="dev-n">Nenhuma área — adicione abaixo.</div>}
          <div className="market-form-row" style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="Nova área"
              style={{ flex: 1, minWidth: 0 }}
              value={novaArea}
              onChange={(e) => setNovaArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novaArea.trim()) {
                  addRodaArea(novaArea);
                  setNovaArea("");
                }
              }}
            />
            <button
              className="btn-cancel"
              style={{ flex: "0 0 auto" }}
              onClick={() => {
                if (!novaArea.trim()) return;
                addRodaArea(novaArea);
                setNovaArea("");
              }}
            >
              Adicionar
            </button>
          </div>
          <div className="sched-time-row" style={{ marginTop: 12 }}>
            <span style={{ flex: 1 }}>Peso de "sem área"</span>
            <input
              className="dur-input"
              type="number"
              min={1}
              max={10}
              value={c.roda.pesoSemArea}
              onChange={(e) =>
                updateGamConfig({ roda: { ...c.roda, pesoSemArea: Math.max(1, Math.min(10, +e.target.value || 5)) } })
              }
            />
          </div>
        </div>

        </SecaoAjuste>

        <SecaoAjuste titulo="Hábito consolidado">
        <div className="stat-card">
          <label className="switch-row" style={{ marginTop: 0 }}>
            <span>Descontar rotina que virou hábito</span>
            <input
              type="checkbox"
              checked={c.habito.ativo}
              onChange={(e) => updateGamConfig({ habito: { ...c.habito, ativo: e.target.checked } })}
            />
          </label>
          <div className="sched-time-row" style={{ marginTop: 10 }}>
            <span style={{ flex: 1 }}>Dias seguidos para virar hábito</span>
            <input
              className="dur-input"
              type="number"
              min={3}
              max={365}
              value={c.habito.streakMin}
              onChange={(e) =>
                updateGamConfig({ habito: { ...c.habito, streakMin: Math.max(3, +e.target.value || 3) } })
              }
            />
          </div>
          <div className="sched-time-row">
            <span style={{ flex: 1 }}>Quanto ela passa a valer</span>
            <input
              className="dur-input"
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              value={c.habito.fator}
              onChange={(e) => updateGamConfig({ habito: { ...c.habito, fator: +e.target.value || 0.6 } })}
            />
          </div>
        </div>

        </SecaoAjuste>

        <SecaoAjuste titulo="Vagas por nível de peso">
        <div className="stat-card">
          {(["alto", "medio", "baixo"] as const).map((nivel) => (
            <div className="sched-time-row" style={{ marginTop: nivel === "alto" ? 0 : undefined }} key={nivel}>
              <span style={{ flex: 1 }}>{nivel === "alto" ? "Alto" : nivel === "medio" ? "Médio" : "Baixo"}</span>
              <input
                className="dur-input"
                type="number"
                min={0}
                max={99}
                value={c.vagas[nivel]}
                onChange={(e) =>
                  updateGamConfig({ vagas: { ...c.vagas, [nivel]: Math.max(0, +e.target.value || 0) } })
                }
              />
            </div>
          ))}
        </div>

        </SecaoAjuste>

        <SecaoAjuste titulo="Pontuação do boletim">
        <div className="stat-card">
          {(["alto", "medio", "baixo"] as const).map((nivel) => (
            <div className="sched-time-row" style={{ marginTop: nivel === "alto" ? 0 : undefined }} key={nivel}>
              <span style={{ flex: 1 }}>{nivel === "alto" ? "Alto" : nivel === "medio" ? "Médio" : "Baixo"}</span>
              <input
                className="dur-input"
                type="number"
                step={0.25}
                min={nivel === "baixo" ? 0.25 : nivel === "medio" ? 0.5 : 1}
                max={10}
                value={c.multiplicadores[nivel]}
                onChange={(e) =>
                  updateGamConfig({
                    multiplicadores: { ...c.multiplicadores, [nivel]: +e.target.value || c.multiplicadores[nivel] },
                  })
                }
              />
            </div>
          ))}
          <div className="sched-time-row" style={{ marginTop: 14 }}>
            <span style={{ flex: 1 }}>Nota mínima para aprovar</span>
            <input
              className="dur-input"
              type="number"
              min={1}
              max={100}
              value={c.notaMinima}
              onChange={(e) => updateGamConfig({ notaMinima: Math.max(1, +e.target.value || 60) })}
            />
          </div>
          <div className="sched-time-row">
            <span style={{ flex: 1 }}>Duração de referência (min)</span>
            <input
              className="dur-input"
              type="number"
              min={5}
              max={240}
              value={c.divisorDuracao}
              onChange={(e) => updateGamConfig({ divisorDuracao: Math.max(5, +e.target.value || 30) })}
            />
          </div>
          <div className="routine-meta" style={{ margin: "14px 0 6px" }}>
            Bônus por meta concluída, no escopo definido pelo prazo dela.
          </div>
          {(["mensal", "trimestral", "anual"] as const).map((periodo) => (
            <div className="sched-time-row" style={{ marginTop: periodo === "mensal" ? 0 : undefined }} key={periodo}>
              <span style={{ flex: 1 }}>
                Meta {periodo === "mensal" ? "mensal" : periodo === "trimestral" ? "trimestral" : "anual"}
              </span>
              <input
                className="dur-input"
                type="number"
                min={0}
                max={100}
                value={c.pontosMeta[periodo]}
                onChange={(e) =>
                  updateGamConfig({ pontosMeta: { ...c.pontosMeta, [periodo]: Math.max(0, +e.target.value || 0) } })
                }
              />
            </div>
          ))}
          <div className="stat-foot">Vale para as próximas semanas — a semana atual já está com o fator congelado.</div>

          <div className="section-label" style={{ margin: "14px 0 4px" }}>
            Simulação — próxima semana
          </div>
          {simulacao.length === 0 ? (
            <div className="stat-foot">Nada agendado esta semana — a escala padrão vale 100 pts.</div>
          ) : (
            <div className="stat-foot">
              {simulacao.slice(0, 6).map((s) => (
                <div key={s.routineId}>
                  {s.routineName} — {s.pontos.toFixed(1)} pts
                </div>
              ))}
            </div>
          )}
        </div>

        </SecaoAjuste>

        <BackupCard />

        <SecaoAjuste titulo="Calendário externo">
        <div className="stat-card">
          <IcalCard />
          <div className="bar-row" style={{ marginTop: 14 }}>
            <div className="bar-name" style={{ width: "auto", flex: 1 }}>
              Exportar agenda (.ics)
            </div>
            <button
              className="link-btn"
              onClick={() => {
                const ics = agendaIcs(routines, compromissos);
                if (!ics) {
                  showAlertBanner("Nada agendado para exportar");
                  return;
                }
                void downloadFile("rotinas-agenda.ics", ics, "text/calendar;charset=utf-8", "Dados").then((r) =>
                  showAlertBanner(r.ok ? "Agenda exportada ✓" : "Não foi possível exportar a agenda")
                );
              }}
            >
              exportar
            </button>
          </div>
          <div className="stat-foot">
            Rotinas com horário viram eventos recorrentes e compromissos avulsos viram eventos únicos — para abrir em
            outro calendário. É uma cópia, não uma sincronização: mudanças aqui não voltam para lá.
          </div>
        </div>

        </SecaoAjuste>

        {isDesktop && (
          <SecaoAjuste titulo="Mini player">
            <div className="stat-card">
              <div className="dev-n" style={{ marginBottom: 10 }}>
                Uma janelinha sempre no topo com a etapa atual e o cronômetro, pra acompanhar a rotina enquanto usa outro app. Também abre pelo menu Ver → Mini player.
              </div>
              <button className="btn-cancel" style={{ width: "100%" }} onClick={() => getMiniPlayerBridge()?.open()}>
                Abrir mini player
              </button>
            </div>
          </SecaoAjuste>
        )}

        {isNative && (
          <SecaoAjuste titulo="Cronômetro">
            <div className="stat-card">
              <div className="bar-row">
                <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                  Fora do app
                </div>
                <div className="type-toggle">
                  {(["off", "barra", "bolha"] as const).map((m) => (
                    <span
                      key={m}
                      className={cronometroModo === m ? "active" : ""}
                      onClick={() => void setCronometroModo(m)}
                    >
                      {m === "off" ? "não mostrar" : m === "barra" ? "barra" : "bolha"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="stat-foot">
                {cronometroModo === "off"
                  ? "O tempo restante só aparece dentro do app."
                  : cronometroModo === "barra"
                    ? "Contagem regressiva na barra de status e na tela de bloqueio, como o timer do relógio do celular."
                    : "Além da notificação na barra, uma bolha flutuante com o tempo restante por cima de outros apps. Exige a permissão \u201CSobrepor a outros apps\u201D."}
              </div>
            </div>
          </SecaoAjuste>
        )}

        {(isDesktop || isNative) && (
          <SecaoAjuste titulo="Sincronização com nuvem">
            <div className="stat-card">
              <SyncCard />
            </div>
          </SecaoAjuste>
        )}

        {isDesktop && (
          <SecaoAjuste titulo="Integrações (MCP)">
            <div className="stat-card">
              <McpCard />
            </div>
          </SecaoAjuste>
        )}

        <SecaoAjuste titulo="Diagnóstico">
          <DiagnosticsCard />
        </SecaoAjuste>
      </div>

      {/* Confirmação de remoção de área — o legado (index.html:14097-14106)
          avisa quantas rotinas ficam sem área antes de remover, porque o
          vínculo some junto. */}
      {areaParaRemover && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setAreaParaRemover(null)}>
          <div className="confirm-box">
            <p style={{ marginBottom: 8 }}>
              Remover a área?
              {routines.filter((r) => r.eixo === areaParaRemover).length > 0 && (
                <>
                  {" "}
                  <b>{routines.filter((r) => r.eixo === areaParaRemover).length}</b> rotina(s) ficam sem área.
                </>
              )}
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setAreaParaRemover(null)}>
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={() => {
                  removeRodaArea(areaParaRemover);
                  setAreaParaRemover(null);
                }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabbar />
    </div>
    </FiltroAjustes.Provider>
  );
}
