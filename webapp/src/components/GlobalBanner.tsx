// Porta de showAlertBanner/showCelebrationBanner/showUndoBanner
// (index.html:2484-2508, 9963-9977) — dois toasts independentes: o de cima
// (texto neutro ou celebração, some sozinho em 7s) e o de baixo (com botão
// "Desfazer", 6s, encostado na tabbar). Os dois aceitam swipe pra dispensar
// (attachSwipeDismiss, index.html:2356-2387) — arrastar de lado ou pra cima
// além do limiar cancela o timer de auto-esconder e some na hora.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";

const THRESH = 44;

/** Porta de attachSwipeDismiss — manipula transform/opacity direto no DOM
 * durante o arrasto (mesmo motivo do SwipeItem: fidelidade e performance),
 * chamando `onDismissed` só quando o gesto cruza o limiar. */
function useSwipeDismiss(ref: React.RefObject<HTMLDivElement | null>, onDismissed: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let decided = false;

    function onDown(e: PointerEvent) {
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
      decided = false;
      if (el) {
        el.style.transition = "none";
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // sem suporte a pointer capture — o gesto ainda funciona via bubbling normal
        }
      }
    }
    function onMove(e: PointerEvent) {
      if (!dragging || !el) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!decided && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) decided = true;
      if (!decided) return;
      const ty = Math.min(0, dy);
      el.style.transform = `translate(${dx}px, ${ty}px)`;
      el.style.opacity = String(Math.max(0.15, 1 - (Math.abs(dx) + Math.abs(ty)) / 180));
    }
    function finish(e: PointerEvent) {
      if (!dragging || !el) return;
      dragging = false;
      const dx = (e.clientX ?? startX) - startX;
      const dy = (e.clientY ?? startY) - startY;
      el.style.transition = "transform .2s ease, opacity .2s ease";
      if (Math.abs(dx) > THRESH || dy < -THRESH) {
        el.style.transform = `translate(${dx >= 0 ? 220 : -220}px, ${dy < -THRESH ? -160 : 0}px)`;
        el.style.opacity = "0";
        onDismissed();
      } else {
        el.style.transform = "translate(0,0)";
        el.style.opacity = "1";
      }
    }
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", finish);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", finish);
      el.removeEventListener("pointercancel", finish);
    };
  }, [ref, onDismissed]);
}

/** Esconde sozinho `ms` depois que `value` aparece (identidade muda), com a
 * transição de saída (.hide, 400ms) antes de sumir de vez — mesmo padrão de
 * showAlertBanner/showUndoBanner (setTimeout + classList "hide" + remove). */
function useAutoHide(active: boolean, ms: number, onExpire: () => void) {
  const [hiding, setHiding] = useState(false);
  useEffect(() => {
    setHiding(false);
    if (!active) return;
    const t = setTimeout(() => setHiding(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  useEffect(() => {
    if (!hiding) return;
    const t = setTimeout(onExpire, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiding]);
  return hiding;
}

export function GlobalBanner() {
  const banner = useAppStore((s) => s.banner);
  const undoBanner = useAppStore((s) => s.undoBanner);
  const dismissBanner = useAppStore((s) => s.dismissBanner);
  const dismissUndoBanner = useAppStore((s) => s.dismissUndoBanner);

  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topHiding = useAutoHide(!!banner, 7000, dismissBanner);
  const bottomHiding = useAutoHide(!!undoBanner, 6000, dismissUndoBanner);
  useSwipeDismiss(topRef, dismissBanner);
  useSwipeDismiss(bottomRef, dismissUndoBanner);

  return (
    <>
      {banner && banner.celebrate && (
        <div
          ref={topRef}
          className={"alert-banner celebrate" + (topHiding ? " hide" : "")}
          dangerouslySetInnerHTML={{ __html: `🏆 <span>${banner.text}</span>` }}
        />
      )}
      {banner && !banner.celebrate && (
        <div ref={topRef} className={"alert-banner" + (topHiding ? " hide" : "")}>
          {banner.text}
        </div>
      )}
      {undoBanner && (
        <div
          ref={bottomRef}
          className={"alert-banner undo-banner" + (bottomHiding ? " hide" : "")}
          style={{ top: "auto", bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 14px)" }}
        >
          <span>{undoBanner.text}</span>
          <button
            className="undo-btn"
            onClick={() => {
              const onUndo = undoBanner.onUndo;
              dismissUndoBanner();
              onUndo();
            }}
          >
            Desfazer
          </button>
        </div>
      )}
    </>
  );
}
