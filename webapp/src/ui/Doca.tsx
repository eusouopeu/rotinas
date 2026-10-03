// Barra de controles da tela presa embaixo, logo acima da barra de abas, ao
// alcance do polegar (pedido do Pedro, 03/10/2026: visão Semanal/Mensal/Anual
// de Dados e Dia/Semana/Mês/Lista + filtros de Rotinas). Fica fora da área
// rolável, como último filho de `tela()`. Publica a própria altura em
// `--doca-h` no elemento pai, para o Fab (descendente da mesma tela) subir
// por cima dela.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "../lib/cn";

export function Doca({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const pai = el?.parentElement;
    if (!el || !pai) return;
    const medir = () => pai.style.setProperty("--doca-h", `${el.offsetHeight}px`);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      ro.disconnect();
      pai.style.removeProperty("--doca-h");
    };
  }, []);
  return (
    <div ref={ref} id={id} data-doca className={cn("flex flex-none flex-col gap-2 pt-2.5", className)}>
      {children}
    </div>
  );
}
