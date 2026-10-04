// Seletor de cor quadradinho (era .area-color-swatch): a cor de uma área da
// roda da vida. Desde 03/10/2026 abre uma folha do app com a paleta 600 do
// Tailwind (PALETA_AREAS) em vez do seletor de cor nativo do Android. Mesma
// API de antes (`value` "#rrggbb", `onChange(e)` com `e.target.value`).
import { useState, type ChangeEvent } from "react";
import { Icon } from "../components/Icon";
import { PALETA_AREAS } from "../lib/constants";
import { cn } from "../lib/cn";
import { Modal } from "./Modal";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  title?: string;
  "aria-label"?: string;
};

export function CampoCor({ value, defaultValue, onChange, className, title, "aria-label": ariaLabel }: Props) {
  const [aberto, setAberto] = useState(false);
  const [interno, setInterno] = useState(defaultValue ?? PALETA_AREAS[0]);
  const cor = value ?? interno;
  const escolher = (c: string) => {
    setAberto(false);
    setInterno(c);
    onChange?.({ target: { value: c }, currentTarget: { value: c } } as unknown as ChangeEvent<HTMLInputElement>);
  };
  return (
    <>
      <button
        type="button"
        title={title}
        aria-label={ariaLabel}
        className={cn("size-[26px] shrink-0 cursor-pointer rounded-app-sm border-0 p-0", className)}
        style={{ background: cor }}
        onClick={() => setAberto(true)}
      />
      {aberto && (
        <Modal onFechar={() => setAberto(false)}>
          <h3 className="mb-3 text-xl">{ariaLabel?.split(" — ")[0] || title || "Cor"}</h3>
          <div className="grid grid-cols-6 gap-2.5">
            {PALETA_AREAS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={c.toLowerCase() === cor.toLowerCase()}
                className="flex aspect-square items-center justify-center rounded-full border-0 text-on-caneta"
                style={{ background: c }}
                onClick={() => escolher(c)}
              >
                {c.toLowerCase() === cor.toLowerCase() && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
