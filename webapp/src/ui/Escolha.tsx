// Escolha de uma opção na folha do próprio app — substitui o <select> nativo,
// que no Android abre o popup cinza e quadrado do sistema (pedido do Pedro,
// 03/10/2026: nada com o estilo cru do Android). Mesma API de um <select>
// controlado: `value`, `onChange(e)` com `e.target.value` e <option>/<optgroup>
// como filhos — por isso Selecao/SelecaoLinha/SelecaoArea só trocaram o miolo.
// O gatilho é um botão com o rótulo da opção escolhida; `className` desenha a
// moldura (cada wrapper passa a sua).
import {
  Children,
  isValidElement,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";
import { Modal } from "./Modal";

type Opcao = { valor: string; rotulo: string; disabled?: boolean; grupo?: string };

function texto(n: ReactNode): string {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(texto).join("");
  if (isValidElement(n)) return texto((n.props as { children?: ReactNode }).children);
  return "";
}

function lerOpcoes(children: ReactNode, grupo?: string, out: Opcao[] = []): Opcao[] {
  Children.toArray(children).forEach((c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; label?: string }>;
    if (el.type === "option") {
      const rotulo = texto(el.props.children);
      out.push({
        valor: el.props.value != null ? String(el.props.value) : rotulo,
        rotulo,
        disabled: el.props.disabled,
        grupo,
      });
    } else if (el.type === "optgroup") lerOpcoes(el.props.children, el.props.label, out);
    else lerOpcoes(el.props.children, grupo, out);
  });
  return out;
}

export type EscolhaProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  value?: string | number | readonly string[];
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  /** Título da folha (padrão: aria-label ou title). */
  titulo?: string;
  /** Mostra a setinha à direita do rótulo (padrão true). */
  seta?: boolean;
};

export function Escolha({
  value,
  onChange,
  children,
  className,
  titulo,
  seta = true,
  disabled,
  title,
  id,
  "aria-label": ariaLabel,
}: EscolhaProps) {
  const [aberto, setAberto] = useState(false);
  const opcoes = lerOpcoes(children);
  const atual = String(value ?? "");
  const escolhida = opcoes.find((o) => o.valor === atual) ?? opcoes[0];
  const escolher = (v: string) => {
    setAberto(false);
    if (v === atual) return;
    onChange?.({ target: { value: v }, currentTarget: { value: v } } as unknown as ChangeEvent<HTMLSelectElement>);
  };
  let grupoAnterior: string | undefined;
  return (
    <>
      <button
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn("flex min-w-0 items-center justify-between gap-2 text-left", className)}
        onClick={() => setAberto(true)}
      >
        <span className="min-w-0 truncate">{escolhida?.rotulo ?? ""}</span>
        {seta && <Icon name="chevronDown" size={14} />}
      </button>
      {aberto && (
        <Modal onFechar={() => setAberto(false)}>
          {(titulo || ariaLabel || title) && <h3 className="mb-2 text-xl">{titulo || ariaLabel || title}</h3>}
          <div role="listbox" className="-mx-1 flex max-h-[60vh] flex-col overflow-y-auto">
            {opcoes.map((o) => {
              const cabeca = o.grupo && o.grupo !== grupoAnterior ? o.grupo : null;
              grupoAnterior = o.grupo;
              const sel = o.valor === atual;
              return (
                <div key={o.grupo + "|" + o.valor} className="contents">
                  {cabeca && (
                    <div className="px-3 pt-3 pb-1 font-sans text-xs tracking-[0.08em] text-sub uppercase">
                      {cabeca}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={sel}
                    disabled={o.disabled}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-app-sm border-0 px-3 py-3 text-left text-lg disabled:opacity-40",
                      sel
                        ? "bg-caneta-soft font-semibold text-caneta"
                        : "bg-transparent text-ink active:bg-chip-neutro desktop:hover:bg-chip-neutro"
                    )}
                    onClick={() => escolher(o.valor)}
                  >
                    <span className="min-w-0">{o.rotulo}</span>
                    {sel && <Icon name="check" size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
