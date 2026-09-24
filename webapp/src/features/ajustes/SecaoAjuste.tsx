// Seção retrátil da aba Ajustes (mockups de 12/09/2026): o rótulo de seção
// virou o cabeçalho clicável de um cartão, e o conteúdo só monta quando
// aberto. Fechada por padrão — a aba tem ~15 seções e o alvo é chegar na
// desejada rolando pouco. O estado é de UI e vive só enquanto a tela existe.
// O filtro da busca da aba chega por contexto para não precisar ser
// repassado em cada uma das seções (várias vivem dentro de outros cards).
import { createContext, useContext, useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";

export const FiltroAjustes = createContext("");

function normaliza(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** `busca`: termos extras que também acham a seção (nomes de sub-blocos que
 *  foram agrupados dentro dela, ex.: "hábito consolidado" em Pontuação).
 *  `montarSempre`: mantém o conteúdo montado mesmo fechado, só escondido.
 *  Necessário para a seção de dados/backup, cujo cartão precisa rodar a
 *  checagem de "backup mais recente em outro aparelho" e mostrar o aviso sem
 *  depender de a seção estar aberta. */
export function SecaoAjuste({
  titulo,
  busca,
  montarSempre,
  children,
}: {
  titulo: string;
  busca?: string;
  montarSempre?: boolean;
  children: ReactNode;
}) {
  const filtro = useContext(FiltroAjustes);
  const [aberta, setAberta] = useState(false);
  if (filtro.trim() && !normaliza(titulo + " " + (busca || "")).includes(normaliza(filtro.trim()))) return null;
  return (
    <div className="mb-2.5 overflow-hidden rounded-app border-[1.5px] border-line bg-card">
      <button
        aria-expanded={aberta}
        onClick={() => setAberta((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2.5 border-0 bg-transparent px-4 py-[15px] text-left font-sans text-lg text-ink [&_.icon-svg]:shrink-0 [&_.icon-svg]:text-sub",
          aberta && "border-b-[1.5px] border-line"
        )}
      >
        <span>{titulo}</span>
        <Icon name={aberta ? "chevronUp" : "chevronDown"} size={16} />
      </button>
      {montarSempre ? (
        <div className={cn("px-3.5 pt-1 pb-3.5", !aberta && "hidden")}>{children}</div>
      ) : (
        aberta && <div className="px-3.5 pt-1 pb-3.5">{children}</div>
      )}
    </div>
  );
}
