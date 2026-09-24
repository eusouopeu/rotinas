// Peças dos popups de meta (recorrente e com prazo): caixa com título, linhas
// de ícone + controle e o botão de liga/desliga quadradinho. Era .meta-form e
// .mf-*. Uma linha (`LinhaForm`) põe ícone e controles lado a lado.
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../lib/icons";
import { cn } from "../../lib/cn";
import { Botao } from "../../ui/Botao";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";

export function FormMeta({
  titulo,
  onFechar,
  onSalvar,
  espacoAcoes = "mt-[18px]",
  children,
}: {
  titulo: string;
  onFechar: () => void;
  onSalvar: () => void;
  /** classe de margem acima dos botões (18px na recorrente, 16px no prazo) */
  espacoAcoes?: string;
  children: ReactNode;
}) {
  return (
    <Modal onFechar={onFechar} className="max-h-[86vh] overflow-y-auto text-left">
      <ModalTexto className="mb-3.5 font-titulo text-[19px] leading-normal font-bold">{titulo}</ModalTexto>
      {children}
      <ModalAcoes className={espacoAcoes}>
        <Botao variante="neutro" tamanho="modal" onClick={onFechar}>
          Cancelar
        </Botao>
        <Botao variante="solido" tamanho="modal" onClick={onSalvar}>
          Salvar
        </Botao>
      </ModalAcoes>
    </Modal>
  );
}

/** Linha do formulário; `fixa` não quebra de linha (campos + toggles pequenos). */
export function LinhaForm({ fixa, className, ...resto }: HTMLAttributes<HTMLDivElement> & { fixa?: boolean }) {
  return (
    <div
      className={cn("mt-2.5 flex items-center gap-x-2.5 gap-y-2", fixa ? "flex-nowrap" : "flex-wrap", className)}
      {...resto}
    />
  );
}

/** Célula da linha: ícone + campo, ocupando o espaço que sobra. */
export function CelulaForm({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-w-0 flex-auto items-center gap-2", className)} {...resto} />;
}

export function IconeForm({ icone, titulo }: { icone: IconName; titulo: string }) {
  return (
    <span className="flex flex-none text-sub" title={titulo}>
      <Icon name={icone} size={17} />
    </span>
  );
}

/** Texto curto entre campos ("das", "até"). */
export function SepForm({ children }: { children: ReactNode }) {
  return <span className="flex-none text-sm text-sub">{children}</span>;
}

/** Botão quadrado liga/desliga (meta negativa, lembretes). */
export function BotaoLigaForm({
  ligado,
  className,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { ligado: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={ligado}
      className={cn(
        "flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-[9px] border-[1.5px]",
        ligado ? "border-transparent bg-caneta text-on-caneta" : "border-line bg-card-2 text-sub",
        className
      )}
      {...resto}
    />
  );
}
