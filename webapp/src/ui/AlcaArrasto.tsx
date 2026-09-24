// Alça "≡" para reordenar por arrasto (era .drag-handle). Recebe os
// dragHandleProps de useDragReorder (lib/dnd.ts). touch-none: o gesto de
// arrastar não pode virar rolagem da página.
import type { HTMLAttributes } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

export function AlcaArrasto({ className, ...resto }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      title="Arrastar para reordenar"
      aria-label="Arrastar para reordenar"
      className={cn(
        "cursor-grab touch-none px-2 py-0.5 text-[17px] text-sub select-none [-webkit-user-drag:none]",
        className
      )}
      {...resto}
    >
      <Icon name="bars3" size={15} />
    </span>
  );
}
