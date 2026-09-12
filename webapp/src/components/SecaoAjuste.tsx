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

export function SecaoAjuste({ titulo, children }: { titulo: string; children: ReactNode }) {
  const filtro = useContext(FiltroAjustes);
  const [aberta, setAberta] = useState(false);
  if (filtro.trim() && !normaliza(titulo).includes(normaliza(filtro.trim()))) return null;
  return (
    <div className={"set-secao" + (aberta ? " aberta" : "")}>
      <button className="set-secao-head" aria-expanded={aberta} onClick={() => setAberta((v) => !v)}>
        <span className="set-secao-titulo">{titulo}</span>
        <Icon name={aberta ? "chevronUp" : "chevronDown"} size={16} />
      </button>
      {aberta && <div className="set-secao-body">{children}</div>}
    </div>
  );
}
