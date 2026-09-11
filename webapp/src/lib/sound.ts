// Porta do oscilador WebAudio do bloco SOUND/HAPTICS do legado
// (index.html:2447-2466: beep/cueBeep). No legado `soundMode()` foi
// amarrado em "mudo" (index.html:2461) — o beep existe mas nunca soa. Aqui o
// modo volta a ser uma preferência de verdade, configurável em Ajustes
// (K_SOMMODO), porque no APK a etapa que zera com a tela apagada não avisa
// por nenhum outro canal. O cálculo dos tons é o mesmo do legado.
import { K_SOMMODO, K_VIBRAR } from "./constants";
import { load } from "./storage";

export type SomModo = "mudo" | "suave" | "normal";

/** Modo de som salvo em Ajustes. Padrão "suave": o app legado era mudo, mas
 * um aviso audível é justamente o gap que esta preferência existe para
 * fechar — "mudo" continua a um toque de distância. */
export function somModo(): SomModo {
  return load<SomModo>(K_SOMMODO, "suave");
}

/** Vibração salva em Ajustes (padrão ligada — é o comportamento que o React
 * já tinha antes desta preferência existir). */
export function vibracaoLigada(): boolean {
  return load<boolean>(K_VIBRAR, true);
}

let audioCtx: AudioContext | null = null;

/** Porta de beep (index.html:2447-2458) — senóide curta com envelope
 * exponencial. Qualquer falha (contexto bloqueado por política de autoplay,
 * ambiente sem WebAudio) é silenciosa, igual ao legado. */
export function beep(freq: number, dur: number): void {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    // Um contexto criado antes do primeiro gesto do usuário nasce suspenso;
    // o resume() é no-op quando já está rodando.
    void audioCtx.resume?.().catch(() => {});
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur + 0.02);
  } catch {
    // Sem áudio disponível — a vibração (lib/haptics) segue valendo.
  }
}

/** Porta de cueBeep (index.html:2462-2466) — "suave" abaixa tom e duração,
 * "mudo" não emite nada. */
export function cueBeep(freq: number, dur: number, modo: SomModo = somModo()): void {
  if (modo === "mudo") return;
  if (modo === "suave") beep(freq * 0.75, dur * 0.8);
  else beep(freq, dur);
}
