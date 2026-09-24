// Seletor de cor quadradinho (era .area-color-swatch): a cor de uma área da
// roda da vida. Input de cor nativo, só que com a moldura do app.
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function CampoCor({ className, ...resto }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="color"
      className={cn(
        "size-[26px] shrink-0 cursor-pointer rounded-app-sm border-[1.5px] border-line bg-transparent p-0 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0.5",
        className
      )}
      {...resto}
    />
  );
}
