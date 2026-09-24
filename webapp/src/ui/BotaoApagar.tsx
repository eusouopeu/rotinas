// "✕" pequeno e sem moldura para apagar uma linha (registro, item, turno).
// Fica cinza e vira vermelho ao apertar (e ao passar o mouse no desktop). Era
// .del-exec. Passe `title`/`aria-label` para dar nome.
import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

export function BotaoApagar({
  className,
  type = "button",
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "shrink-0 border-0 bg-transparent px-1.5 py-0.5 text-md text-sub active:text-erro desktop:hover:text-erro",
        className
      )}
      {...resto}
    >
      {children ?? <Icon name="xmark" size={14} />}
    </button>
  );
}
