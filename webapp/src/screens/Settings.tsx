// Porta parcial de renderSettings (index.html:13700-14142) — esta fase soma
// Roda da vida, Hábito consolidado, Vagas e Pontuação do boletim (reaproveita
// lib/gamificacao.ts, já portado) às seções anteriores (Aparência, Início da
// semana, Notificações). Fica para fases seguintes: privacidade/PIN,
// mensagens motivacionais, cronômetro (overlay nativo), sincronização com
// nuvem, integrações MCP, backup/exportação, calendário externo, mini player,
// atalhos de teclado e a simulação "e se" da pontuação (depende de
// routines+agenda, ainda não portado) — a maioria depende de módulos (notas,
// backup) que ainda não existem no React.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Tabbar } from "../components/Tabbar";
import { Icon } from "../components/Icon";
import { DIAS_ABREV } from "../lib/constants";

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
  const nudgeDias = useAppStore((s) => s.nudgeDias);
  const toggleNudgeDia = useAppStore((s) => s.toggleNudgeDia);

  const gam = useAppStore((s) => s.gam);
  const updateGamConfig = useAppStore((s) => s.updateGamConfig);
  const addRodaArea = useAppStore((s) => s.addRodaArea);
  const updateRodaArea = useAppStore((s) => s.updateRodaArea);
  const removeRodaArea = useAppStore((s) => s.removeRodaArea);
  const [novaArea, setNovaArea] = useState("");
  const c = gam.config;

  return (
    <div className="screen with-tabbar screen-wide">
      <div className="settings-scroll" style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
        <div className="home-header" style={{ marginBottom: 6 }}>
          <h1>Ajustes</h1>
        </div>

        <div className="section-label">Aparência</div>
        <div className="stat-card">
          <div className="bar-row">
            <div className="bar-name" style={{ width: "auto", flex: 1 }}>
              Tema
            </div>
            <div className="type-toggle">
              {(["auto", "light", "dark"] as const).map((t) => (
                <span key={t} className={theme === t ? "active" : ""} onClick={() => setTheme(t)}>
                  {t === "auto" ? "sistema" : t === "light" ? "claro" : "escuro"}
                </span>
              ))}
            </div>
          </div>
          <div className="bar-row" style={{ marginTop: 10 }}>
            <div className="bar-name" style={{ width: "auto", flex: 1 }}>
              Tamanho do texto
            </div>
            <div className="type-toggle">
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
          </div>
        </div>

        <div className="section-label">Início da semana</div>
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

        <div className="section-label">Notificações</div>
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
        </div>

        <div className="section-label">Roda da vida</div>
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
            <div className="roda-area-row" key={a.id}>
              <input
                type="color"
                value={a.color.startsWith("#") ? a.color : "#6D28D9"}
                onChange={(e) => updateRodaArea(a.id, { color: e.target.value })}
              />
              <input
                className="roda-area-nome"
                type="text"
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
              <button className="icon-btn borderless" title="Excluir área" onClick={() => removeRodaArea(a.id)}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
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
        </div>

        <div className="section-label">Hábito consolidado</div>
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

        <div className="section-label">Vagas por nível de peso</div>
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

        <div className="section-label">Pontuação do boletim</div>
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
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
