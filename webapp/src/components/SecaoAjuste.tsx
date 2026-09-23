// Seção retrátil da aba Ajustes (mockups de 12/09/2026): o rótulo de seção
// virou o cabeçalho clicável de um cartão, e o conteúdo só monta quando
// aberto. Fechada por padrão — a aba tem ~15 seções e o alvo é chegar na
// desejada rolando pouco. O estado é de UI e vive só enquanto a tela existe.
// O filtro da busca da aba chega por contexto para não precisar ser
// repassado em cada uma das seções (várias vivem dentro de outros cards).
import { createContext, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

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
    <div className={"set-secao" + (aberta ? " aberta" : "")}>
      <button className="set-secao-head" aria-expanded={aberta} onClick={() => setAberta((v) => !v)}>
        <span className="set-secao-titulo">{titulo}</span>
        <Icon name={aberta ? "chevronUp" : "chevronDown"} size={16} />
      </button>
      {montarSempre ? (
        <div className="set-secao-body" style={aberta ? undefined : { display: "none" }}>
          {children}
        </div>
      ) : (
        aberta && <div className="set-secao-body">{children}</div>
      )}
    </div>
  );
}
