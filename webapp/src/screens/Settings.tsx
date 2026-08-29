// Porta parcial de renderSettings (index.html:13700-14142) — esta fase cobre
// Aparência, Início da semana e Notificações (o núcleo de toggles/chips que
// valida o binding de estado). Fica para fases seguintes: roda da vida,
// hábito consolidado, vagas por peso, privacidade/PIN, mensagens
// motivacionais, cronômetro (overlay nativo), sincronização com nuvem,
// integrações MCP, pontuação do boletim, backup/exportação, calendário
// externo, mini player e atalhos de teclado — a maioria depende de módulos
// (rotinas com agenda, notas, backup) que ainda não existem no React.
import { useAppStore } from "../store/useAppStore";
import { Tabbar } from "../components/Tabbar";
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
      </div>
      <Tabbar />
    </div>
  );
}
