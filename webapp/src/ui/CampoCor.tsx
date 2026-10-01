// Seletor de cor quadradinho (era .area-color-swatch): a cor de uma área da
// roda da vida. Input de cor nativo, só que com a moldura do app.
// Oferece a paleta 600 do Tailwind (PALETA_AREAS) como sugestões do seletor.
import { useId, type InputHTMLAttributes } from "react";
import { PALETA_AREAS } from "../lib/constants";
import { cn } from "../lib/cn";

export function CampoCor({ className, ...resto }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const lista = useId();
  return (
    <>
      <datalist id={lista}>
        {PALETA_AREAS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <input
        type="color"
        list={lista}
        className={cn(
          "size-[26px] shrink-0 cursor-pointer rounded-app-sm border border-line bg-transparent p-0 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0.5",
          className
        )}
        {...resto}
      />
    </>
  );
}
