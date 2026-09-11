// Porta parcial de renderPlayer (index.html:12248-12513) — etapas "timer" e
// "exercicio" (sub-loop de séries com reps/peso, ver
// concluirSerieExercicio/pularDescansoExercicio/voltarSerieExercicio na
// store), adiar/não-fazer/reiniciar etapa, lançamento rápido, painel de
// etapas e nota vinculada (ver components/PlayerOverlays.tsx). Sem modo zen
// nem journaling/nota por etapa ainda (RoutineStep.noteId/journaling não têm
// UI de criação em nenhum editor do React — não é regressão desta rodada,
// nunca existiu aqui). O círculo de progresso (SVG dasharray) é o mesmo
// truque do original.
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { activeCountdown, computeExRestRemaining, computeRemaining, filaOverlay, parseRepsRange } from "../lib/player";
import { fmtTime } from "../lib/format";
import { timeUpCue } from "../lib/haptics";
import { onAppStateChange, overlayHide, overlayShow } from "../lib/nativeBridge";
import { cancelarAlertaFundo, sincronizarAlertaFundo } from "../lib/notifications";
import { NotaRotinaOverlay, QuickAddOverlay, StepsOverlay } from "../components/PlayerOverlays";

export function Player() {
  const playerState = useAppStore((s) => s.playerState);
  const routine = useAppStore((s) => s.routines.find((r) => r.id === playerState?.routineId));
  const exercicios = useAppStore((s) => s.exercicios);
  const togglePause = useAppStore((s) => s.togglePause);
  const advanceStep = useAppStore((s) => s.advanceStep);
  const goPrevStep = useAppStore((s) => s.goPrevStep);
  const exitPlayer = useAppStore((s) => s.exitPlayer);
  const concluirSerieExercicio = useAppStore((s) => s.concluirSerieExercicio);
  const pularDescansoExercicio = useAppStore((s) => s.pularDescansoExercicio);
  const voltarSerieExercicio = useAppStore((s) => s.voltarSerieExercicio);
  const naoFazerEtapaAtual = useAppStore((s) => s.naoFazerEtapaAtual);
  const adiarEtapaAtual = useAppStore((s) => s.adiarEtapaAtual);
  const reiniciarTimerEtapaAtual = useAppStore((s) => s.reiniciarTimerEtapaAtual);
  const playerBanner = useAppStore((s) => s.playerBanner);
  const clearPlayerBanner = useAppStore((s) => s.clearPlayerBanner);
  const cronometroModo = useAppStore((s) => s.cronometroModo);
  const [, setTick] = useState(0);
  const [appBackground, setAppBackground] = useState(() => typeof document !== "undefined" && document.hidden);
  const [reps, setReps] = useState(0);
  const [peso, setPeso] = useState(0);
  const [overlay, setOverlay] = useState<"steps" | "nota" | "quickadd" | null>(null);

  // Banner transiente (adiar/não fazer/repescagem) — some sozinho, mesmo
  // padrão de duração do showAlertBanner do legado.
  useEffect(() => {
    if (!playerBanner) return;
    const id = setTimeout(clearPlayerBanner, 3200);
    return () => clearTimeout(id);
  }, [playerBanner, clearPlayerBanner]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      // Descanso ENTRE SÉRIES avança sozinho ao zerar (index.html:11355-11363)
      // — diferente do timer de etapa, que só avança no toque.
      const p = useAppStore.getState().playerState;
      if (!p?.paused && p?.ex?.phase === "rest" && p.ex.restEndTs != null && Date.now() >= p.ex.restEndTs) {
        timeUpCue();
        useAppStore.getState().pularDescansoExercicio();
        return;
      }
      // Etapa de tempo/pausa zerou: nunca avança sozinha (index.html:11418-
      // 11433), só o aviso (vibração) dispara — uma vez — e o cronômetro
      // segue contando negativo até o toque em "concluir".
      const step = p?.steps[p.idx];
      if (p && !p.paused && step?.type === "timer" && p.stepEndTs != null && Date.now() >= p.stepEndTs && !p.overtimeCueFired) {
        timeUpCue();
        useAppStore.setState({ playerState: { ...p, overtimeCueFired: true } });
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

  // Sinal de "app saiu da frente" — a bolha do cronômetro (abaixo) só aparece
  // fora do app, igual ao timer nativo da Samsung (index.html:2734-2739).
  useEffect(() => {
    const onVis = () => setAppBackground(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const unsubscribe = onAppStateChange((isActive) => setAppBackground(!isActive));
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      unsubscribe();
    };
  }, []);

  const cd = playerState ? activeCountdown(playerState) : null;
  // Espelha a etapa atual na notificação/bolha nativa (porta de
  // sincronizarOverlay, index.html:2642-2664) — só quando a preferência está
  // ligada e há contagem ativa (timer de etapa ou descanso entre séries). O
  // mesmo serviço Android cobre as duas superfícies: a notificação com
  // chronometer sai sempre, e `visible` decide se a bolha flutuante também
  // aparece — no modo "barra" ela nunca aparece.
  useEffect(() => {
    if (cronometroModo === "off" || !playerState || !cd) {
      overlayHide();
      return;
    }
    const ref = playerState.paused && playerState.pausedAt ? playerState.pausedAt : Date.now();
    const remMs = cd.endTs - ref;
    overlayShow({
      endTs: playerState.paused ? 0 : Date.now() + remMs,
      remainingMs: remMs,
      paused: !!playerState.paused,
      auto: cd.auto,
      visible: cronometroModo === "bolha" && appBackground,
      label: cd.label || playerState.routineName || "",
      queue: JSON.stringify(filaOverlay(playerState)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cronometroModo, appBackground, playerState?.idx, playerState?.paused, playerState?.pausedAt, cd?.endTs, cd?.auto, cd?.label]);

  // Alerta nativo de fim de etapa (porta de sincronizarAlertaFundo,
  // index.html:2708-2725). Independente da bolha e da preferência de
  // cronômetro: é o único canal que avisa com o app fora da frente e a bolha
  // desligada. Mesmas dependências do efeito da bolha, mais o estado de
  // segundo plano.
  useEffect(() => {
    void sincronizarAlertaFundo({
      emSegundoPlano: appBackground,
      pausado: !!playerState?.paused,
      countdown: cd ? { endTs: cd.endTs, isRest: !!cd.isRest, label: cd.label || "" } : null,
      routineName: playerState?.routineName || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appBackground, playerState?.idx, playerState?.paused, cd?.endTs, cd?.isRest, cd?.label, playerState?.routineName]);

  // Encerra o serviço/bolha ao sair da tela do Player (rotina concluída ou
  // cancelada) — sem isso a notificação/bolha ficaria presa. O alerta de
  // fundo pendente some junto: a etapa deixou de existir.
  useEffect(() => {
    return () => {
      overlayHide();
      void cancelarAlertaFundo();
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

  const temNota = !!routine?.notaId;
  // só faz sentido adiar se existe um próximo BLOCO (tarefa + a pausa dela)
  // inteiro pra trocar de lugar (index.html:12441-12443).
  const curBlockLen = !step.isRest && playerState.steps[playerState.idx + 1]?.isRest ? 2 : 1;
  const podeAdiar = playerState.idx + curBlockLen < playerState.steps.length;

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="player">
        <div className="player-top">
          <button className="player-close" onClick={handleExit}>
            Sair
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="player-close" title="Ver todas as etapas" aria-label="Ver todas as etapas" onClick={() => setOverlay("steps")}>
              <Icon name="bars3" size={15} />
            </button>
            {temNota && (
              <button className="player-close" title="Abrir nota anexada" aria-label="Abrir nota anexada" onClick={() => setOverlay("nota")}>
                <Icon name="notes" size={14} />
              </button>
            )}
            <button className="player-close" title="Lançar rápido" aria-label="Lançar rápido" onClick={() => setOverlay("quickadd")}>
              +
            </button>
            <div className="player-progress-label">
              {playerState.idx + 1} / {playerState.steps.length}
            </div>
          </div>
        </div>

        {playerBanner && (
          <div className="notice-card" style={{ marginBottom: 10 }}>
            <span>{playerBanner}</span>
          </div>
        )}

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

        {step.type === "timer" ? (
          <div className="player-controls five">
            <button className="ctrl-btn" title="Etapa anterior" aria-label="Etapa anterior" onClick={goPrevStep}>
              <Icon name="arrowLeft" size={15} />
            </button>
            <button className="ctrl-btn" title="Reiniciar o temporizador da etapa" aria-label="Reiniciar o temporizador da etapa" onClick={reiniciarTimerEtapaAtual}>
              <Icon name="arrowPath" size={15} />
            </button>
            <button className="ctrl-btn big" onClick={togglePause}>
              <Icon name={playerState.paused ? "play" : "pause"} size={22} />
            </button>
            <button
              className={"ctrl-btn ok" + (rem < 0 ? " pulse" : "")}
              title="Concluir etapa"
              aria-label="Concluir etapa"
              onClick={() => advanceStep()}
            >
              <Icon name="check" size={14} />
            </button>
            <button
              className="ctrl-btn"
              title="Adiar: vai para depois da pausa da próxima etapa"
              aria-label="Adiar etapa"
              disabled={!podeAdiar}
              style={podeAdiar ? undefined : { opacity: 0.35 }}
              onClick={adiarEtapaAtual}
            >
              <Icon name="arrowUturnRight" size={14} />
            </button>
          </div>
        ) : step.type === "exercicio" ? (
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
            <button
              className="ctrl-btn"
              title="Adiar: vai para depois da pausa da próxima etapa"
              aria-label="Adiar etapa"
              disabled={!podeAdiar}
              style={podeAdiar ? undefined : { opacity: 0.35 }}
              onClick={adiarEtapaAtual}
            >
              <Icon name="arrowUturnRight" size={14} />
            </button>
          </div>
        ) : (
          <div className="player-controls">
            <button className="ctrl-btn" title="Etapa anterior" aria-label="Etapa anterior" onClick={goPrevStep}>
              <Icon name="arrowLeft" size={15} />
            </button>
            <button className="ctrl-btn big ok" title="Concluir etapa" aria-label="Concluir etapa" onClick={() => advanceStep()}>
              <Icon name="check" size={14} />
            </button>
            <button
              className="ctrl-btn"
              title="Adiar: vai para depois da pausa da próxima etapa"
              aria-label="Adiar etapa"
              disabled={!podeAdiar}
              style={podeAdiar ? undefined : { opacity: 0.35 }}
              onClick={adiarEtapaAtual}
            >
              <Icon name="arrowUturnRight" size={14} />
            </button>
          </div>
        )}

        {(step.type === "exercicio" && (playerState.ex?.results.length || 0) > 0) || !step.isRest ? (
          <div className="skip-row" style={{ padding: "10px 0 4px" }}>
            {step.type === "exercicio" && (playerState.ex?.results.length || 0) > 0 && (
              <button className="skip-btn" onClick={voltarSerieExercicio}>
                <Icon name="arrowLeft" size={13} /> voltar série
              </button>
            )}
            {!step.isRest && (
              <button className="skip-btn" title="Encerrar sem concluir e sem pontuar" onClick={naoFazerEtapaAtual}>
                não fazer
              </button>
            )}
          </div>
        ) : null}
      </div>

      {overlay === "steps" && <StepsOverlay playerState={playerState} onClose={() => setOverlay(null)} />}
      {overlay === "nota" && <NotaRotinaOverlay routineId={playerState.routineId} onClose={() => setOverlay(null)} />}
      {overlay === "quickadd" && <QuickAddOverlay onClose={() => setOverlay(null)} />}
    </div>
  );
}
