// Registro global de "só um swipe aberto por vez" (index.html:2184-2196) —
// um card aberto por swipe fecha sozinho ao abrir outro, ou ao tocar fora
// dele. Módulo-escopo de propósito (não é estado React): o comportamento é
// idêntico ao document.addEventListener("pointerdown", ...) do legado, só um
// listener global para qualquer quantidade de SwipeItem montados.
interface OpenEntry {
  el: HTMLElement;
  close: () => void;
}

let current: OpenEntry | null = null;

export function swipeOpened(el: HTMLElement, close: () => void): void {
  if (current && current.el !== el) current.close();
  current = { el, close };
}

export function swipeClosed(el: HTMLElement): void {
  if (current?.el === el) current = null;
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!current) return;
      const wrap = current.el.closest(".swipe-item");
      if (wrap && wrap.contains(e.target as Node)) return;
      current.close();
      current = null;
    },
    true
  );
}

/** Porta de wireSwipeDownSearch (index.html:2955-2966) — puxar o cabeçalho
 * pra baixo (>60px, gesto de toque) abre a busca global. Usado no header da
 * Home (só faz sentido no topo de uma tela sem outro scroll acima dele). */
export function attachSwipeDownSearch(header: HTMLElement, onOpen: () => void): () => void {
  let sy = 0;
  let active = false;
  function onStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    sy = e.touches[0].clientY;
    active = true;
  }
  function onMove(e: TouchEvent) {
    if (!active) return;
    if (e.touches[0].clientY - sy > 60) {
      active = false;
      onOpen();
    }
  }
  function onEnd() {
    active = false;
  }
  header.addEventListener("touchstart", onStart, { passive: true });
  header.addEventListener("touchmove", onMove, { passive: true });
  header.addEventListener("touchend", onEnd);
  header.addEventListener("touchcancel", onEnd);
  return () => {
    header.removeEventListener("touchstart", onStart);
    header.removeEventListener("touchmove", onMove);
    header.removeEventListener("touchend", onEnd);
    header.removeEventListener("touchcancel", onEnd);
  };
}
