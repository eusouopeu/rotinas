// Porta parcial do Diário (index.html:13136+, ~12597-12636 pras chaves) — só
// o texto por período (dia/semana/mês/ano), sem agenda (time-blocking),
// kanban por período nem calendário mensal — todos dependem de parsers/grids
// ainda não portados (ver CLAUDE.md > "webapp/").
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Tabbar } from "../components/Tabbar";
import { diarioChave, diarioRotulo, DIARIO_ESCOPOS } from "../lib/diario";
import { addDaysISO, localKey } from "../lib/gamificacao";
import type { DiarioScope } from "../lib/types";

const PASSO: Record<DiarioScope, number> = { dia: 1, semana: 7, mes: 30, ano: 365 };

export function Diario() {
  const diario = useAppStore((s) => s.diario);
  const setDiarioTexto = useAppStore((s) => s.setDiarioTexto);
  const [escopo, setEscopo] = useState<DiarioScope>("dia");
  const [iso, setIso] = useState(localKey());

  const chave = diarioChave(escopo, iso);
  const texto = diario[chave] || "";

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }}>
          <h1>Diário</h1>
        </div>

        <div className="type-toggle" style={{ marginBottom: 10 }}>
          {DIARIO_ESCOPOS.map(([v, l]) => (
            <span key={v} className={escopo === v ? "active" : ""} onClick={() => setEscopo(v)}>
              {l}
            </span>
          ))}
        </div>

        <div className="header-right" style={{ marginBottom: 14 }}>
          <button className="bell-btn" onClick={() => setIso(addDaysISO(iso, -PASSO[escopo]))}>
            ‹
          </button>
          <span className="dev-n" style={{ flex: 1, textAlign: "center" }}>
            {diarioRotulo(escopo, iso)}
          </span>
          <button className="bell-btn" onClick={() => setIso(addDaysISO(iso, PASSO[escopo]))}>
            ›
          </button>
          <button className="bell-btn" onClick={() => setIso(localKey())}>
            hoje
          </button>
        </div>

        <textarea
          key={chave}
          className="mk-e-name"
          style={{ width: "100%", minHeight: "40vh", resize: "vertical", lineHeight: 1.6 }}
          placeholder="Escreva aqui..."
          defaultValue={texto}
          onBlur={(e) => {
            if (e.target.value !== texto) setDiarioTexto(chave, e.target.value);
          }}
        />
      </div>
      <Tabbar />
    </div>
  );
}
