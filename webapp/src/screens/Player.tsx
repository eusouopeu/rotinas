// Porta parcial de renderPlayer (index.html:12248-12513) — etapas "timer" e
// "exercicio" (sub-loop de séries com reps/peso, ver
// concluirSerieExercicio/pularDescansoExercicio/voltarSerieExercicio na
// store), sem modo zen, anotações, nota vinculada, adiar/não-fazer, painel
// de etapas do desktop. O círculo de progresso (SVG dasharray) é o mesmo
// truque do original.
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { computeExRestRemaining, computeRemaining, parseRepsRange } from "../lib/player";
import { fmtTime } from "../lib/format";

export function Player() {
  const playerState = useAppStore((s) => s.playerState);
  const exercicios = useAppStore((s) => s.exercicios);
  const togglePause = useAppStore((s) => s.togglePause);
  const advanceStep = useAppStore((s) => s.advanceStep);
  const goPrevStep = useAppStore((s) => s.goPrevStep);
  const exitPlayer = useAppStore((s) => s.exitPlayer);
  const concluirSerieExercicio = useAppStore((s) => s.concluirSerieExercicio);
  const pularDescansoExercicio = useAppStore((s) => s.pularDescansoExercicio);
  const voltarSerieExercicio = useAppStore((s) => s.voltarSerieExercicio);
  const [, setTick] = useState(0);
  const [reps, setReps] = useState(0);
  const [peso, setPeso] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      // Descanso ENTRE SÉRIES avança sozinho ao zerar (index.html:11355-11363)
      // — diferente do timer de etapa, que só avança no toque.
      const p = useAppStore.getState().playerState;
      if (!p?.paused && p?.ex?.phase === "rest" && p.ex.restEndTs != null && Date.now() >= p.ex.restEndTs) {
        useAppStore.getState().pularDescansoExercicio();
      }
    }, 1000);
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

  const step = playerState?.steps[playerState.idx];
  const exSetIdx = playerState?.ex?.setIdx;
  const exPhase = playerState?.ex?.phase;
  // Nova série: repõe reps/peso com os padrões (faixa da etapa · carga atual
  // da biblioteca, index.html:12386-12388) — sem isso o campo ficava com o
  // valor digitado na série anterior.
  useEffect(() => {
    if (!step || step.type !== "exercicio" || exPhase !== "set") return;
    const range = parseRepsRange(step.reps);
    setReps(range.max || range.min || 0);
    setPeso(exercicios.find((e) => e.id === step.exercicioId)?.pesoAtual || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, exSetIdx, exPhase]);

  if (!playerState || !step) return null;

  const rem = computeRemaining(playerState);
  const exRem = computeExRestRemaining(playerState);
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
        ) : step.type === "exercicio" ? (
          <div className="checklist-body">
            {exPhase === "rest" ? (
              <>
                <div className="step-title">Descanso</div>
                <div className="t" style={{ fontFamily: "'Montserrat'", fontSize: 48, fontWeight: 600, margin: "6px 0" }}>
                  {fmtTime(exRem)}
                </div>
                <h2>{step.name}</h2>
                <div className="dev-n">
                  série {playerState.ex!.setIdx} de {step.sets || 1} concluída
                </div>
              </>
            ) : (
              <>
                <div className="step-title">
                  Série {(playerState.ex?.setIdx || 0) + 1} de {step.sets || 1}
                </div>
                <div className="check-circle" style={{ width: 100, height: 100, fontSize: 36 }}>
                  <Icon name="trophy" size={32} />
                </div>
                <h2>{step.name}</h2>
                <div className="ex-inputs" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 12, color: "var(--sub)" }}>
                    reps
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={reps}
                      onChange={(e) => setReps(+e.target.value || 0)}
                      style={{ width: 64, textAlign: "center", background: "var(--card-2)", border: "1.5px solid var(--line)", borderRadius: 10, padding: 8, fontSize: 18, color: "var(--ink)" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 12, color: "var(--sub)" }}>
                    kg
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={peso}
                      onChange={(e) => setPeso(+e.target.value || 0)}
                      style={{ width: 72, textAlign: "center", background: "var(--card-2)", border: "1.5px solid var(--line)", borderRadius: 10, padding: 8, fontSize: 18, color: "var(--ink)" }}
                    />
                  </label>
                </div>
              </>
            )}
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

        {step.type === "exercicio" ? (
          <div className="player-controls">
            <button className="ctrl-btn" title="Etapa anterior" aria-label="Etapa anterior" onClick={goPrevStep}>
              <Icon name="arrowLeft" size={15} />
            </button>
            {exPhase === "rest" ? (
              <button className="ctrl-btn big ok" title="Pular descanso" aria-label="Pular descanso" onClick={pularDescansoExercicio}>
                <Icon name="play" size={20} />
              </button>
            ) : (
              <button
                className="ctrl-btn big ok"
                title="Concluir série"
                aria-label="Concluir série"
                onClick={() => concluirSerieExercicio(reps, peso)}
              >
                <Icon name="check" size={14} />
              </button>
            )}
          </div>
        ) : (
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
        )}

        {step.type === "exercicio" && (playerState.ex?.results.length || 0) > 0 && (
          <div className="skip-row" style={{ padding: "10px 0 4px" }}>
            <button className="skip-btn" onClick={voltarSerieExercicio}>
              <Icon name="arrowLeft" size={13} /> voltar série
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
