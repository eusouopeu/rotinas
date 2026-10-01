// Ajuda recolhida (minimalismo.md e design-standards.md, "Texto e rótulos"):
// a explicação de como algo funciona vive atrás de um ⓘ posto AO LADO do texto
// a que se refere (nunca numa linha embaixo) e abre num popover flutuante —
// não empurra o layout como o antigo toggle. Fecha com outro toque, toque
// fora, Esc ou rolagem. O balão vai para o <body> (portal) para não ser
// cortado por cartão com overflow escondido, e é posicionado embaixo do ⓘ
// (ou em cima, se não couber), preso às margens de 12px da tela.
//
// Dentro de <label> (Switch) o clique no ⓘ não liga/desliga o controle.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

const MARGEM = 12;
const LARGURA = 280;

export function Ajuda({
  children,
  className,
  rotulo = "Como funciona",
}: {
  children: ReactNode;
  className?: string;
  rotulo?: string;
}) {
  const [aberta, setAberta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const balao = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; acima: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!aberta || !botao.current) return;
    const r = botao.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const largura = Math.min(LARGURA, vw - MARGEM * 2);
    const left = Math.min(Math.max(MARGEM, r.left + r.width / 2 - largura / 2), vw - MARGEM - largura);
    const altura = balao.current?.offsetHeight || 80;
    const acima = r.bottom + 6 + altura > vh - MARGEM && r.top - 6 - altura > MARGEM;
    setPos({ left, top: acima ? r.top - 6 - altura : r.bottom + 6, acima });
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const fora = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!balao.current?.contains(t) && !botao.current?.contains(t)) setAberta(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    const rolou = () => setAberta(false);
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", rolou, true);
    window.addEventListener("resize", rolou);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", rolou, true);
      window.removeEventListener("resize", rolou);
    };
  }, [aberta]);

  return (
    <span className={cn("inline-flex align-middle", className)} data-ajuda>
      <BotaoAjuda
        ref={botao}
        aberta={aberta}
        rotulo={rotulo}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPos(null);
          setAberta(!aberta);
        }}
      />
      {aberta &&
        createPortal(
          <div
            ref={balao}
            role="tooltip"
            data-ajuda-balao
            className={cn(
              "fixed z-[1100] rounded-app-sm bg-ink px-3 py-2.5 font-sans text-sm leading-[1.45] font-normal tracking-normal text-card normal-case",
              pos ? "animate-surge" : "invisible",
              pos?.acima ? "origin-bottom" : "origin-top"
            )}
            style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, width: Math.min(LARGURA, window.innerWidth - MARGEM * 2) }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>,
          document.body
        )}
    </span>
  );
}

export function BotaoAjuda({
  aberta,
  rotulo = "Como funciona",
  onClick,
  ref,
}: {
  aberta: boolean;
  rotulo?: string;
  onClick: (e: React.MouseEvent) => void;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={aberta}
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      className={cn(
        "-my-1.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent align-middle transition-[color,transform] duration-150 active:scale-90 [&_.icon-svg]:size-[17px]",
        aberta ? "text-caneta" : "text-sub"
      )}
    >
      <Icon name="infoCircle" />
    </button>
  );
}
