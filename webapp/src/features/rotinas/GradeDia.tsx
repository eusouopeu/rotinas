// Grade de horas compartilhada entre o dia (zoom cheio) e as 7 colunas da semana
// no desktop (agendaGradeHtml, index.html:12891-12931). `onDragCard` liga o
// arrasto vertical de cartão do kanban (wireAgendaHome, index.html:5120-5157) —
// passo de 5 min, só na visão "Dia".
import { useRef, useState } from "react";
import type { computeGradeLayout } from "../../lib/agenda";
import { cn } from "../../lib/cn";

type BlocoLayout = ReturnType<typeof computeGradeLayout>["blocos"][number];

/* Grade compartilhada entre AgendaDia e a grade de 7 colunas do desktop
   (agendaGradeHtml, index.html:12891-12931). `onDragCard` liga o arrasto
   vertical de cartão do kanban (wireAgendaHome, index.html:5120-5157) —
   passo de 5 min, só na visão "Dia". */
export function GradeDia({
  layout,
  onClique,
  onCliqueVazio,
  gradePxMin,
  gradeMIni,
  onDragCard,
  dragPxMin,
  fundoRotulo = "card",
  ocultarRotulos,
}: {
  layout: ReturnType<typeof computeGradeLayout>;
  onClique: (b: BlocoLayout) => void;
  /* clique num vão livre da grade cria evento naquele horário (arredondado
     de 15 em 15 min) — só ligado na visão "Dia", que tem o zoom cheio. */
  onCliqueVazio?: (iniMin: number) => void;
  gradePxMin?: number;
  gradeMIni?: number;
  onDragCard?: (cardId: string, novoIniMin: number) => void;
  dragPxMin?: number;
  /** cor atrás do rótulo da hora: "card" (dentro de um cartão) ou "paper" (grade solta na página) */
  fundoRotulo?: "card" | "paper";
  /** esconde os rótulos de hora (colunas da semana no desktop, exceto a 1ª) */
  ocultarRotulos?: boolean;
}) {
  const [drag, setDrag] = useState<{ idx: number; dy: number } | null>(null);
  const arrastouRef = useRef(false);

  function pointerDown(ev: React.PointerEvent<HTMLDivElement>, b: BlocoLayout, idx: number) {
    if (!onDragCard || !b.cardId || !dragPxMin) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    const el = ev.currentTarget;
    const startY = ev.clientY;
    let moved = false;
    try {
      el.setPointerCapture(ev.pointerId);
    } catch {
      /* ok sem capture */
    }
    const move = (ev2: PointerEvent) => {
      const dy = ev2.clientY - startY;
      if (!moved && Math.abs(dy) > 6) moved = true;
      if (moved) setDrag({ idx, dy });
    };
    const up = (ev2: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setDrag(null);
      if (!moved) return;
      arrastouRef.current = true;
      const dur = b.fim - b.ini;
      const deltaMin = Math.round((ev2.clientY - startY) / dragPxMin / 5) * 5;
      const novoIni = Math.max(0, Math.min(24 * 60 - dur, b.ini + deltaMin));
      if (novoIni !== b.ini) onDragCard(b.cardId!, novoIni);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  return (
    <div className="relative pl-[52px]" style={{ height: layout.alturaPx }}>
      {layout.horas.map((h) => (
        <div
          key={h.min}
          className={cn(
            "absolute inset-x-0",
            h.min % 60 ? "border-t border-line" : "border-t-[1.5px] border-line-forte"
          )}
          style={{ top: h.topPx }}
        >
          <span
            className={cn(
              "absolute top-[-8px] left-0 pr-[7px] font-sans text-sub",
              h.min % 60 ? "text-2xs font-normal" : "text-[11.5px] font-semibold",
              fundoRotulo === "paper" ? "bg-paper" : "bg-card",
              ocultarRotulos && "hidden"
            )}
          >
            {h.label}
          </span>
        </div>
      ))}
      {layout.linhaAgoraPx != null && <div className="absolute right-0 left-11 z-[2] border-t-2 border-erro" style={{ top: layout.linhaAgoraPx }} />}
      <div
        className="absolute top-0 right-0 bottom-0 left-[52px]"
        onClick={(ev) => {
          if (!onCliqueVazio || !gradePxMin) return;
          if (ev.target !== ev.currentTarget) return; // clique caiu num bloco
          const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
          const min = (gradeMIni ?? 0) + y / gradePxMin;
          onCliqueVazio(Math.max(0, Math.min(23 * 60 + 45, Math.round(min / 15) * 15)));
        }}
      >
        {layout.blocos.map((b, i) => (
          <div
            key={i}
            className={cn(
              "absolute flex flex-row flex-wrap content-start items-baseline gap-x-1.5 gap-y-0 overflow-hidden rounded-app-sm border-[1.5px] border-l-[3px] border-line border-l-caneta bg-card-2 px-[7px] py-1",
              b.cardId ? "touch-none border-l-caneta-2 bg-card" : "touch-pan-y",
              b.compromissoId && "border-l-ok bg-card",
              b.rotinaId && "border-l-caneta bg-card-2",
              b.ical && "cursor-default border-l-sub bg-card",
              b.feito && "border-l-ok opacity-60",
              b.adiado &&
                "border-dashed border-l-sub [background:repeating-linear-gradient(135deg,var(--card-2),var(--card-2)_7px,var(--card)_7px,var(--card)_14px)]",
              drag?.idx === i && "z-[5] cursor-grabbing opacity-85"
            )}
            style={{
              top: b.topPx,
              height: b.alturaBlocoPx,
              left: `calc(${b.leftPct}% + 2px)`,
              width: `calc(${b.larguraPct}% - 4px)`,
              cursor: b.ical ? undefined : "pointer",
              transform: drag?.idx === i ? `translateY(${drag.dy}px)` : undefined,
            }}
            onPointerDown={(ev) => pointerDown(ev, b, i)}
            onClick={() => {
              if (arrastouRef.current) {
                arrastouRef.current = false; // o arrasto já resolveu
                return;
              }
              onClique(b);
            }}
          >
            <span
              className={cn(
                "min-w-0 flex-[1_1_0] text-[12.5px] leading-[1.25] break-words",
                b.feito && "line-through",
                b.adiado && "text-sub"
              )}
            >
              {b.texto}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
