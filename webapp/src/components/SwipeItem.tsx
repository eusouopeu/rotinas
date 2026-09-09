// Porta de wrapSwipeDelete/wrapSwipeActions (index.html:2202-2320) — envolve
// um card numa faixa que revela um botão "Excluir" ao arrastar para a
// esquerda e, opcionalmente, um botão à direita (duplicar/adiar) ao arrastar
// para a direita. A manipulação do drag é direta no DOM via ref (sem
// setState a cada pointermove) pelo mesmo motivo do legado: performance e
// fidelidade 1:1 do gesto — só o estado final (aberto/fechado) importa para
// React, o offset intermediário nunca precisa re-renderizar a árvore.
import { useEffect, useRef } from "react";
import { swipeClosed, swipeOpened } from "../lib/swipe";

const REVEAL = 76;
const IGNORE_SELECTOR = ".drag-handle, .order-btn, input, select, button, textarea, .type-toggle span";

interface SwipeItemProps {
  children: React.ReactNode;
  onLeft?: () => void;
  leftLabel?: string;
  onRight?: () => void;
  rightLabel?: string;
  className?: string;
}

export function SwipeItem({ children, onLeft, leftLabel = "Excluir", onRight, rightLabel = "Duplicar", className }: SwipeItemProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const openState = useRef<"0" | "1" | "-1">("0");

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function applyTransform(x: number) {
      if (track) track.style.transform = `translateX(${x}px)`;
    }
    function setOpen(v: "0" | "1" | "-1") {
      openState.current = v;
      if (!track) return;
      track.style.transition = "transform .18s ease";
      applyTransform(v === "1" ? -REVEAL : v === "-1" ? REVEAL : 0);
      if (v === "0") swipeClosed(track);
    }
    (track as HTMLDivElement & { __closeSwipe?: () => void }).__closeSwipe = () => setOpen("0");

    let startX = 0;
    let startY = 0;
    let dragging = false;
    let decided = false;
    let horiz = false;
    let baseX = 0;
    let initialState: "0" | "1" | "-1" = "0";

    function clampNext(dx: number) {
      if (initialState === "1") return Math.max(-REVEAL, Math.min(0, baseX + dx));
      if (initialState === "-1") return Math.max(0, Math.min(onRight ? REVEAL : 0, baseX + dx));
      return Math.max(onLeft ? -REVEAL : 0, Math.min(onRight ? REVEAL : 0, baseX + dx));
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as HTMLElement).closest(IGNORE_SELECTOR)) return;
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
      decided = false;
      horiz = false;
      initialState = openState.current;
      baseX = initialState === "1" ? -REVEAL : initialState === "-1" ? REVEAL : 0;
      if (track) track.style.transition = "none";
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!decided) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          decided = true;
          horiz = Math.abs(dx) > Math.abs(dy) * 1.2;
          if (horiz) {
            try {
              (e.target as Element).setPointerCapture(e.pointerId);
            } catch {
              // alvo já perdeu o ponteiro — sem problema, o drag continua por eventos normais
            }
            if (track) swipeOpened(track, () => setOpen("0"));
          } else {
            dragging = false;
            return;
          }
        } else return;
      }
      if (!horiz) return;
      e.preventDefault();
      applyTransform(clampNext(dx));
    }
    function finish(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      if (!horiz) return;
      const dx = (e.clientX ?? startX) - startX;
      const next = clampNext(dx);
      let novo: "0" | "1" | "-1";
      if (initialState === "1") novo = next < -REVEAL / 2 ? "1" : "0";
      else if (initialState === "-1") novo = next > REVEAL / 2 ? "-1" : "0";
      else novo = next < -REVEAL / 2 ? "1" : next > REVEAL / 2 ? "-1" : "0";
      setOpen(novo);
      if (novo !== "0" && track) swipeOpened(track, () => setOpen("0"));
    }

    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", finish);
    track.addEventListener("pointercancel", finish);
    return () => {
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", finish);
      track.removeEventListener("pointercancel", finish);
      swipeClosed(track);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLeft, onRight]);

  function fechar() {
    const track = trackRef.current as (HTMLDivElement & { __closeSwipe?: () => void }) | null;
    track?.__closeSwipe?.();
  }

  // A classe do card visível (routine-card/note-card/...) vai no TRACK, não
  // no wrap: é ela quem carrega o layout/fundo/raio do card de verdade — o
  // wrap só existe pra cortar (overflow:hidden) o que fica atrás dele
  // (index.html:2204-2210, cardEl mantém sua classe própria + "swipe-track";
  // o wrap ganha só "swipe-item").
  return (
    <div className="swipe-item">
      {onLeft && (
        <button
          className="swipe-del-btn"
          onClick={() => {
            fechar();
            onLeft();
          }}
        >
          {leftLabel}
        </button>
      )}
      {onRight && (
        <button
          className="swipe-dup-btn"
          onClick={() => {
            fechar();
            onRight();
          }}
        >
          {rightLabel}
        </button>
      )}
      <div ref={trackRef} className={"swipe-track" + (className ? " " + className : "")}>
        {children}
      </div>
    </div>
  );
}
