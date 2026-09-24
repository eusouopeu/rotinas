// Peças das listas de itens por seção (mercado por gôndola, viagem por
// categoria): chips de sugestão, cartão da seção, linha do item e a caixa de
// edição do item.
import type { ReactNode } from "react";
import { Chip } from "../../ui/Chip";
import { BotaoCompacto } from "../../ui/BotaoCompacto";
import { Campo } from "../../ui/Campo";
import { CaixaCheck, ItemChecklist, RISCADO } from "../../ui/ItemChecklist";
import { Cartao } from "../../ui/Cartao";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { cn } from "../../lib/cn";

/** Fileira de chips (sugestões ao digitar, itens frequentes). */
export function ChipsSugestao({
  rotulo,
  itens,
  onEscolher,
}: {
  rotulo?: string;
  itens: string[];
  onEscolher: (s: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {rotulo && <span className="mr-0.5 font-sans text-sm text-sub">{rotulo}</span>}
      {itens.map((s) => (
        <Chip key={s} variante="tag" onClick={() => onEscolher(s)}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

/** Uma seção: rótulo (com `extra` ao lado, ex.: setas de ordenar) e o cartão dos itens. */
export function SecaoItens({
  titulo,
  extra,
  vazia,
  children,
}: {
  titulo: string;
  extra?: ReactNode;
  vazia: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <RotuloSecao className="flex items-center gap-2">
        {titulo}
        {extra}
      </RotuloSecao>
      <Cartao className="mb-1.5 px-3.5 py-2.5">
        {vazia ? <Legenda className="px-0.5 py-1 opacity-60">— vazia —</Legenda> : children}
      </Cartao>
    </div>
  );
}

type LinhaProps = { marcado: boolean; nome: string; direita?: string; onMarcar: () => void; onEditar: () => void };

export function LinhaItem({ marcado, nome, direita, onMarcar, onEditar }: LinhaProps) {
  return (
    <ItemChecklist className="gap-2">
      <CaixaCheck marcado={marcado} onClick={onMarcar} />
      <span className={cn("min-w-0 flex-1 break-words", marcado && RISCADO)} onClick={onEditar}>
        {nome}
      </span>
      <span className="ml-auto shrink-0 text-right font-sans text-sm text-sub" onClick={onEditar}>
        {direita}
      </span>
    </ItemChecklist>
  );
}

/** Caixa de edição: nome, os campos da linha (`children`) e ok / excluir / cancelar. */
export function EdicaoItem({
  nome,
  onNome,
  onOk,
  onExcluir,
  onCancelar,
  children,
}: {
  nome: string;
  onNome: (n: string) => void;
  onOk: () => void;
  onExcluir: () => void;
  onCancelar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="my-1.5 rounded-md bg-card-2 p-2.5">
      <Campo variante="modelo" type="text" value={nome} onChange={(e) => onNome(e.target.value)} />
      <div className="flex gap-2">{children}</div>
      <div className="flex gap-2">
        <BotaoCompacto onClick={onOk}>ok</BotaoCompacto>
        <BotaoCompacto variante="fantasma" className="text-erro" onClick={onExcluir}>
          excluir
        </BotaoCompacto>
        <BotaoCompacto variante="fantasma" onClick={onCancelar}>
          cancelar
        </BotaoCompacto>
      </div>
    </div>
  );
}
