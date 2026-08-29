// Porta parcial de renderPlayer (index.html:12248-12513) — só o caminho de
// etapas "timer" (o único tipo que o RoutineEditor cria hoje), sem modo zen,
// exercício, anotações, nota vinculada, adiar/não-fazer, painel de etapas do
// desktop, nem pontuação/histórico (ver lib/player.ts). O círculo de
// progresso (SVG dasharray) é o mesmo truque do original.
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { computeRemaining } from "../lib/player";
import { fmtTime } from "../lib/format";

export function Player() {
  const playerState = useAppStore((s) => s.playerState);
  const togglePause = useAppStore((s) => s.togglePause);
  const advanceStep = useAppStore((s) => s.advanceStep);
  const goPrevStep = useAppStore((s) => s.goPrevStep);
  const exitPlayer = useAppStore((s) => s.exitPlayer);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    (navigator as Navigator & { wakeLock: WakeLock }).wakeLock
      .request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  if (!playerState) return null;

  const step = playerState.steps[playerState.idx];
  const rem = computeRemaining(playerState);
  const rad = 116;
  const c = 2 * Math.PI * rad;
  const frac = step.type === "timer" ? Math.max(rem, 0) / (step.seconds || 1) : 0;
  const strokeColor = step.isRest ? "var(--ok)" : "var(--caneta)";

  function handleExit() {
    if (window.confirm("Sair da rotina em andamento?")) exitPlayer();
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="player">
        <div className="player-top">
          <button className="player-close" onClick={handleExit}>
            Sair
          </button>
          <div className="player-progress-label">
            {playerState.idx + 1} / {playerState.steps.length}
          </div>
        </div>

        {step.type === "timer" ? (
          <div className={"dial-wrap" + (rem < 0 ? " overtime" : "") + (step.isRest ? " restdial" : "")}>
            <svg viewBox="0 0 260 260">
              <circle className="dial-track" cx={130} cy={130} r={rad} fill="none" strokeWidth={10} />
              <circle
                cx={130}
                cy={130}
                r={rad}
                fill="none"
                stroke={strokeColor}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * frac}
              />
            </svg>
            <div className="dial-time">
              <div className="step-title">{step.isRest ? "Descanso" : "Etapa " + (playerState.idx + 1)}</div>
              <div className={"t" + (rem < 0 ? " overtime" : "")}>{fmtTime(rem)}</div>
              <div className="label">{step.name}</div>
            </div>
          </div>
        ) : (
          <div className="checklist-body">
            <div className="step-title">Etapa {playerState.idx + 1}</div>
            <div className="check-circle">
              <Icon name="check" size={14} />
            </div>
            <h2>{step.name}</h2>
          </div>
        )}

        <div style={{ width: "100%" }}>
          <div className="next-task-row">
            {playerState.steps[playerState.idx + 1]
              ? `próxima tarefa: ${playerState.steps[playerState.idx + 1].name}`
              : "última etapa"}
          </div>
        </div>

        <div className="stepper-track">
          {playerState.steps.map((s, i) => {
            const fillPct =
              i < playerState.idx ? 100 : i === playerState.idx && s.type === "timer" ? (1 - Math.max(rem, 0) / (s.seconds || 1)) * 100 : 0;
            return (
              <div className={"seg" + (i < playerState.idx ? " done" : "") + (s.isRest ? " rest" : "")} key={s.id}>
                <div className="fill" style={{ width: `${fillPct}%` }} />
              </div>
            );
          })}
        </div>

        <div className="player-controls five">
          <button className="ctrl-btn" title="Etapa anterior" aria-label="Etapa anterior" onClick={goPrevStep}>
            <Icon name="arrowLeft" size={15} />
          </button>
          <div style={{ width: 44 }} />
          <button className="ctrl-btn big" onClick={togglePause}>
            <Icon name={playerState.paused ? "play" : "pause"} size={22} />
          </button>
          <button
            className={"ctrl-btn ok" + (rem < 0 ? " pulse" : "")}
            title="Concluir etapa"
            aria-label="Concluir etapa"
            onClick={advanceStep}
          >
            <Icon name="check" size={14} />
          </button>
          <div style={{ width: 44 }} />
        </div>
      </div>
    </div>
  );
}
