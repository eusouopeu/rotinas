// Botão de texto do app (era .btn-primary / .btn-cancel / .btn-danger-outline).
// primario = ação principal sólida (--caneta); neutro = cancelar/secundário;
// perigo = excluir (contorno vermelho); solido/destrutivo = confirmação cheia
// em --caneta / --erro (dentro de Modal); pilula = ação pequena e arredondada
// ("tocar", "exportar", "Avançado"). `tamanho="modal"` é o botão dentro de
// uma fileira de ações de Modal (divide a linha em partes iguais).
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const botao = cva("font-sans", {
  variants: {
    variante: {
      primario:
        "rounded-app-sm border-0 bg-caneta p-4 text-xl font-semibold text-on-caneta transition-transform duration-120 ease-[ease] active:scale-[0.975]",
      neutro:
        "rounded-[12px] border-[1.5px] border-line bg-card-2 px-4 py-3 text-[14.5px] text-ink transition-[transform,background-color] duration-120 ease-[ease] active:scale-[0.98] active:bg-card",
      perigo: "rounded-lg border-[1.5px] border-erro bg-transparent px-[18px] py-4 text-lg text-erro",
      solido:
        "rounded-[12px] border-0 bg-caneta px-4 py-3 text-[14.5px] font-semibold text-on-caneta transition-[transform,background-color] duration-120 ease-[ease]",
      destrutivo:
        "rounded-[12px] border-0 bg-erro px-4 py-3 text-[14.5px] font-semibold text-on-caneta transition-[transform,background-color] duration-120 ease-[ease]",
      pilula:
        "rounded-pill border-[1.5px] border-line bg-card-2 px-[13px] py-[7px] text-md text-ink transition-[transform,background-color] duration-120 ease-[ease] active:scale-[0.96] active:bg-card",
    },
    tamanho: {
      padrao: "",
      modal: "flex-1 p-[13px] text-lg",
    },
  },
  defaultVariants: { variante: "primario", tamanho: "padrao" },
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof botao>;

export function Botao({ variante, tamanho, className, type = "button", ...resto }: Props) {
  return <button type={type} className={cn(botao({ variante, tamanho }), className)} {...resto} />;
}
