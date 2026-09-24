// Seletores de opção única lado a lado. Dois tamanhos, mesma API:
//  - SegPill: troca de VISÃO da tela (Rotinas Semana/Dia/Lista, Metas, Notas/
//    Outros, Dados). Com borda e fundo translúcido — visual da pill de Modelos.
//  - Toggle: escolha pequena dentro de formulário (peso, tipo de etapa).
// `active` aceita lista quando mais de uma opção pode ficar ligada (Metas).
// data-seg impede o SwipeItem de começar um arrasto em cima do seletor.
import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

export interface SegOpcao<K extends string> {
  key: K;
  label: string;
}

interface Base<K extends string> {
  options: SegOpcao<K>[];
  active: K | K[];
  onSelect: (key: K) => void;
  className?: string;
  style?: CSSProperties;
}

function Segmentado<K extends string>({
  options,
  active,
  onSelect,
  className,
  style,
  caixa,
  item,
  itemAtivo,
}: Base<K> & { caixa: string; item: string; itemAtivo?: string }) {
  const ligado = (k: K) => (Array.isArray(active) ? active.includes(k) : active === k);
  return (
    // desktop: o segmentado abraça o conteúdo (esticado por 550px vira faixa)
    <div
      data-seg
      className={cn(
        "flex rounded-app-sm p-0.5 font-sans text-xs desktop:w-fit desktop:self-start desktop:text-sm",
        caixa,
        className
      )}
      style={style}
    >
      {options.map((o) => (
        <span
          key={o.key}
          className={cn(
            "cursor-pointer rounded-xs text-sub",
            item,
            ligado(o.key) ? cn("bg-caneta text-on-caneta", itemAtivo) : "hover:text-ink"
          )}
          onClick={() => onSelect(o.key)}
        >
          {o.label}
        </span>
      ))}
    </div>
  );
}

/** `cheia` ocupa a linha toda (cada opção divide o espaço); sem ela a pill
 *  tem a largura do conteúdo (ex.: a flutuante de Modelos). */
export function SegPill<K extends string>({ cheia, ...props }: Base<K> & { cheia?: boolean }) {
  return (
    <Segmentado
      {...props}
      caixa={cn("border-[1.5px] border-line bg-card-blur", cheia && "w-full")}
      item={cheia ? "flex-1 px-3 py-[9px] text-center" : "px-[26px] py-[9px] desktop:px-3 desktop:py-[5px]"}
    />
  );
}

/** `larga` = ocupa o espaço livre da linha e reparte igual (era .mf-wide);
 *  `quebra` = opções quebram de linha em tela estreita (pesos);
 *  `grande` = fonte 13px e mais respiro (era .set-toggle, em Ajustes). */
export function Toggle<K extends string>({
  larga,
  quebra,
  grande,
  ...props
}: Base<K> & { larga?: boolean; quebra?: boolean; grande?: boolean }) {
  return (
    <Segmentado
      {...props}
      caixa={cn("bg-card-2", larga && "min-w-0 flex-[1_1_0]", quebra && "flex-wrap", grande && "p-[3px] text-md")}
      item={cn(
        "px-2 py-1 desktop:px-3 desktop:py-[5px]",
        larga && "flex-[1_1_0] text-center",
        grande && "px-3 py-[9px] desktop:py-[5px]"
      )}
    />
  );
}
