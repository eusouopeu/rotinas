// Porta parcial de renderPlayer (index.html:12248-12513) — etapas "timer" e
// "exercicio" (sub-loop de séries com reps/peso, ver
// concluirSerieExercicio/pularDescansoExercicio/voltarSerieExercicio na
// store), adiar/não-fazer/reiniciar etapa, lançamento rápido, painel de
// etapas e nota vinculada (ver features/player/). Sem modo zen
// nem journaling/nota por etapa ainda (RoutineStep.noteId/journaling não têm
// UI de criação em nenhum editor do React — não é regressão desta rodada,
// nunca existiu aqui). O círculo de progresso (SVG dasharray) é o mesmo
// truque do original.
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  activeCountdown,
  computeExRestRemaining,
  exercicioAnteriorComSeries,
  computeRemaining,
  filaOverlay,
  parseRepsRange,
} from "../lib/player";
import { timeUpCue } from "../lib/haptics";
import { onAppStateChange, overlayHide, overlayShow } from "../lib/nativeBridge";
import { cancelarAlertaFundo, sincronizarAlertaFundo } from "../lib/notifications";
import { AvisoCartao } from "../ui/AvisoCartao";
import { LancarRapido } from "../features/player/LancarRapido";
import { NotaAnexada } from "../features/player/NotaAnexada";
import { PainelEtapas } from "../features/player/PainelEtapas";
import { CorpoExercicio, CorpoSimples, DiscoTempo } from "../features/player/Corpos";
import {
  ControlesExercicio,
  ControlesSimples,
  ControlesTempo,
  LinhaPular,
  TrilhaEtapas,
} from "../features/player/Controles";
import { TopoPlayer } from "../features/player/Topo";
import { tela } from "../ui/Tela";

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
  const salvarPlayerSnapshot = useAppStore((s) => s.salvarPlayerSnapshot);
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
      // Descanso ENTRE SÉRIES também não avança sozinho (pedido do Pedro,
      // 12/09/2026 — diverge do legado index.html:11355-11363): avisa uma vez
      // e segue contando negativo até o toque em "pular descanso".
      const p = useAppStore.getState().playerState;
      if (
        p &&
        !p.paused &&
        p.ex?.phase === "rest" &&
        p.ex.restEndTs != null &&
        Date.now() >= p.ex.restEndTs &&
        !p.overtimeCueFired
      ) {
        timeUpCue();
        useAppStore.setState({ playerState: { ...p, overtimeCueFired: true } });
        return;
      }
      // Etapa de tempo/pausa zerou: nunca avança sozinha (index.html:11418-
      // 11433), só o aviso (vibração) dispara — uma vez — e o cronômetro
      // segue contando negativo até o toque em "concluir".
      const step = p?.steps[p.idx];
      if (
        p &&
        !p.paused &&
        step?.type === "timer" &&
        p.stepEndTs != null &&
        Date.now() >= p.stepEndTs &&
        !p.overtimeCueFired
      ) {
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

  /* Guarda o ponto da execução a cada mudança (etapa, pausa, série) — é o que
     permite fechar o app ou sair da tela e voltar no mesmo lugar
     (savePlayerSnapshot do legado, index.html:11238). */
  useEffect(() => {
    if (playerState) salvarPlayerSnapshot();
  }, [playerState, salvarPlayerSnapshot]);

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
      modo: cronometroModo === "bolha" ? "bolha" : "barra",
      label: cd.label || playerState.routineName || "",
      queue: JSON.stringify(filaOverlay(playerState)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cronometroModo,
    appBackground,
    playerState?.idx,
    playerState?.paused,
    playerState?.pausedAt,
    cd?.endTs,
    cd?.auto,
    cd?.label,
  ]);

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
  }, [
    appBackground,
    playerState?.idx,
    playerState?.paused,
    cd?.endTs,
    cd?.isRest,
    cd?.label,
    playerState?.routineName,
  ]);

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

  function handleExit() {
    const ganhos = playerState?.pontosGanhos || 0;
    const nota = ganhos > 0 ? `\nOs ${ganhos.toFixed(1)} pontos das etapas já concluídas ficam no boletim.` : "";
    if (window.confirm("Sair da rotina em andamento?\nO progresso fica salvo para retomar depois." + nota))
      exitPlayer();
  }

  const temNota = !!routine?.notaId;
  // só faz sentido adiar se existe um próximo BLOCO (tarefa + a pausa dela)
  // inteiro pra trocar de lugar (index.html:12441-12443).
  const curBlockLen = !step.isRest && playerState.steps[playerState.idx + 1]?.isRest ? 2 : 1;
  const podeAdiar = playerState.idx + curBlockLen < playerState.steps.length;

  // Carga prevista do próximo exercício, já na pausa antes dele (legado
  // index.html:12415-12421); pula a pausa se a próxima etapa for ela.
  const proxima = playerState.steps[playerState.idx + 1];
  const proximoEx = [proxima, proxima?.isRest ? playerState.steps[playerState.idx + 2] : undefined].find(
    (s) => s?.type === "exercicio"
  );
  const proximoPeso = proximoEx ? exercicios.find((e) => e.id === proximoEx.exercicioId)?.pesoAtual || 0 : 0;
  // no descanso entre séries: a carga da última série (vira a sugestão da próxima)
  const pesoSerie = playerState.ex?.results[playerState.ex.results.length - 1]?.peso || 0;
  const podeVoltarSerie =
    (step.type === "exercicio" && (playerState.ex?.results.length || 0) > 0) ||
    exercicioAnteriorComSeries(playerState) >= 0;
  const comuns = { podeAdiar, onAnterior: goPrevStep, onAdiar: adiarEtapaAtual };

  return (
    <div {...tela({}, "pb-0")}>
      <div className="flex w-full flex-1 flex-col items-center justify-between pt-1.5 pb-5 paisagem:justify-start paisagem:gap-1 paisagem:overflow-y-auto paisagem:pt-0.5 paisagem:pb-2">
        <TopoPlayer
          posicao={playerState.idx + 1}
          total={playerState.steps.length}
          temNota={temNota}
          onSair={handleExit}
          onEtapas={() => setOverlay("steps")}
          onNota={() => setOverlay("nota")}
          onRapido={() => setOverlay("quickadd")}
        />

        {playerBanner && (
          <AvisoCartao className="mb-2.5">
            <span>{playerBanner}</span>
          </AvisoCartao>
        )}

        {step.type === "timer" ? (
          <DiscoTempo
            restante={rem}
            total={step.seconds || 1}
            descanso={!!step.isRest}
            titulo={step.isRest ? "Descanso" : "Etapa " + (playerState.idx + 1)}
            nome={step.name}
          />
        ) : step.type === "exercicio" ? (
          <CorpoExercicio
            nome={step.name}
            fase={exPhase}
            serieAtual={playerState.ex?.setIdx || 0}
            series={step.sets || 1}
            descansoRestante={exRem}
            pesoSerie={pesoSerie}
            reps={reps}
            peso={peso}
            onReps={setReps}
            onPeso={setPeso}
          />
        ) : (
          <CorpoSimples posicao={playerState.idx + 1} nome={step.name} />
        )}

        <div className="w-full">
          <div className="mt-2.5 mb-1.5 w-full text-center font-sans text-sm leading-normal text-sub paisagem:px-0.5 paisagem:py-1">
            {proxima ? `próxima tarefa: ${proxima.name}${proximoPeso ? ` — ${proximoPeso}kg` : ""}` : "última etapa"}
          </div>
        </div>

        <TrilhaEtapas etapas={playerState.steps} atual={playerState.idx} restante={rem} />

        {step.type === "timer" ? (
          <ControlesTempo
            {...comuns}
            pausado={!!playerState.paused}
            estourou={rem < 0}
            onReiniciar={reiniciarTimerEtapaAtual}
            onPausar={togglePause}
            onConcluir={() => advanceStep()}
          />
        ) : step.type === "exercicio" ? (
          <ControlesExercicio
            {...comuns}
            descansando={exPhase === "rest"}
            onConcluirSerie={() => concluirSerieExercicio(reps, peso)}
            onPularDescanso={pularDescansoExercicio}
          />
        ) : (
          <ControlesSimples {...comuns} onConcluir={() => advanceStep()} />
        )}

        {(podeVoltarSerie || !step.isRest) && (
          <LinhaPular
            podeVoltarSerie={podeVoltarSerie}
            podeNaoFazer={!step.isRest}
            onVoltarSerie={voltarSerieExercicio}
            onNaoFazer={naoFazerEtapaAtual}
          />
        )}
      </div>

      {overlay === "steps" && <PainelEtapas playerState={playerState} onClose={() => setOverlay(null)} />}
      {overlay === "nota" && <NotaAnexada routineId={playerState.routineId} onClose={() => setOverlay(null)} />}
      {overlay === "quickadd" && <LancarRapido onClose={() => setOverlay(null)} />}
    </div>
  );
}
