// Porta parcial do Diário (index.html:13136+) — texto por período (dia/
// semana/mês/ano) e agenda (time-blocking) lida da própria nota. Cartões do
// kanban do Diário, compromissos avulsos e eventos iCal ainda não têm dados
// no React, então não entram na agenda aqui — só o Markdown da nota. Kanban
// por período e calendário mensal seguem fora (ver CLAUDE.md > "webapp/").
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Tabbar } from "../components/Tabbar";
import { diarioChave, diarioRotulo, DIARIO_ESCOPOS, DIAS_PT } from "../lib/diario";
import { addDaysISO, localKey, ordemDiasSemana } from "../lib/gamificacao";
import { agendaGruposAno, agendaGruposMes, agendaGruposSemana, computeGradeLayout, parseTimeBlocks, toggleLinhaFeita } from "../lib/agenda";
import type { DiarioScope } from "../lib/types";
import type { GrupoAgenda } from "../lib/agenda";

const PASSO: Record<DiarioScope, number> = { dia: 1, semana: 7, mes: 30, ano: 365 };

function AgendaDia({ texto, iso, onToggle }: { texto: string; iso: string; onToggle: (linha: number) => void }) {
  const blocos = parseTimeBlocks(texto);
  if (blocos.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: "30vh" }}>
        <h2>Sem blocos de horário</h2>
        <p>
          Na nota do dia, escreva linhas como
          <br />
          <b>- [ ] 08:00 - 09:30 Estudar</b>
          <br />e elas viram blocos aqui.
        </p>
      </div>
    );
  }
  const agora = new Date();
  const nowMin = iso === localKey() ? agora.getHours() * 60 + agora.getMinutes() : null;
  const layout = computeGradeLayout(blocos, nowMin);
  return (
    <div className="ag-wrap" style={{ height: layout.alturaPx, position: "relative" }}>
      {layout.horas.map((h) => (
        <div key={h.min} className={"ag-hora" + (h.meia ? " ag-meia" : "")} style={{ top: h.topPx }}>
          <span>{h.label}</span>
        </div>
      ))}
      {layout.linhaAgoraPx != null && <div className="ag-agora" style={{ top: layout.linhaAgoraPx }} />}
      <div className="ag-blocos">
        {layout.blocos.map((b) => (
          <div
            key={b.linha}
            className={"ag-bloco" + (b.feito ? " feito" : "") + (b.adiado ? " adiado" : "")}
            style={{
              top: b.topPx,
              height: b.alturaBlocoPx,
              left: `calc(${b.leftPct}% + 2px)`,
              width: `calc(${b.larguraPct}% - 4px)`,
            }}
            onClick={() => onToggle(b.linha)}
          >
            <span className="ag-hh">
              {String(Math.floor(b.ini / 60)).padStart(2, "0")}:{String(b.ini % 60).padStart(2, "0")}&ndash;
              {String(Math.floor(b.fim / 60)).padStart(2, "0")}:{String(b.fim % 60).padStart(2, "0")}
              {b.adiado ? " · adiado" : ""}
            </span>
            <span className="ag-txt">{b.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaGrupos({ grupos, dica, onToggle }: { grupos: GrupoAgenda[]; dica: string; onToggle: (linha: number) => void }) {
  if (grupos.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: "30vh" }}>
        <h2>Sem itens de agenda</h2>
        <p dangerouslySetInnerHTML={{ __html: dica }} />
      </div>
    );
  }
  return (
    <div className="ag-grupos">
      {grupos.map((g) => (
        <div className="ag-grupo" key={g.label}>
          <div className="ag-grupo-titulo">{g.label}</div>
          {g.itens.map((b) => (
            <div key={b.linha} className={"ag-item" + (b.feito ? " feito" : "") + (b.adiado ? " adiado" : "")} onClick={() => onToggle(b.linha)}>
              {b.hora != null && (
                <span className="ag-item-hora">
                  {String(Math.floor(b.hora / 60)).padStart(2, "0")}:{String(b.hora % 60).padStart(2, "0")}
                </span>
              )}
              <span className="ag-item-txt">{b.texto}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Diario() {
  const diario = useAppStore((s) => s.diario);
  const setDiarioTexto = useAppStore((s) => s.setDiarioTexto);
  const [escopo, setEscopo] = useState<DiarioScope>("dia");
  const [iso, setIso] = useState(localKey());
  const [modo, setModo] = useState<"texto" | "agenda">("texto");

  const chave = diarioChave(escopo, iso);
  const texto = diario[chave] || "";

  function onToggleLinha(linha: number) {
    setDiarioTexto(chave, toggleLinhaFeita(texto, linha));
  }

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

        <div className="type-toggle" style={{ marginBottom: 10 }}>
          <span className={modo === "texto" ? "active" : ""} onClick={() => setModo("texto")}>
            Texto
          </span>
          <span className={modo === "agenda" ? "active" : ""} onClick={() => setModo("agenda")}>
            Agenda
          </span>
        </div>

        {modo === "texto" ? (
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
        ) : escopo === "dia" ? (
          <AgendaDia texto={texto} iso={iso} onToggle={onToggleLinha} />
        ) : escopo === "semana" ? (
          <AgendaGrupos
            grupos={agendaGruposSemana(texto, ordemDiasSemana(), DIAS_PT)}
            dica="Na nota da semana, escreva linhas como<br><b>- [ ] seg 08:00 Reunião</b> ou <b>- [ ] qui Levar carro à revisão</b><br>e elas viram a agenda da semana aqui."
            onToggle={onToggleLinha}
          />
        ) : escopo === "mes" ? (
          <AgendaGrupos
            grupos={agendaGruposMes(texto)}
            dica="Na nota do mês, escreva linhas como<br><b>- [ ] 05 Consulta médica</b><br>e elas viram a agenda do mês aqui."
            onToggle={onToggleLinha}
          />
        ) : (
          <AgendaGrupos
            grupos={agendaGruposAno(texto)}
            dica="Na nota do ano, escreva linhas como<br><b>- [ ] mar Renovar CNH</b><br>e elas viram a agenda do ano aqui."
            onToggle={onToggleLinha}
          />
        )}
      </div>
      <Tabbar />
    </div>
  );
}
