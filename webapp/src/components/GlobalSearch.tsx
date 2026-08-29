// Porta parcial de openGlobalSearch (index.html:2978-3151) — overlay de busca
// com filtro por tipo (rotinas/metas/notas) e peso. Sem filtro de área, sem
// "modelos"/"kanban"/"histórico" (telas de destino ainda não existem no
// React: renderTemplateDoc, kanban do Diário e Dados/renderStats) e sem
// debounce (dataset pequeno nesta fase não pesa a cada tecla).
import { useState, type CSSProperties } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import type { IconName } from "../lib/icons";
import type { CountdownDoc, Tag } from "../lib/types";

type Tipo = "tudo" | "rotinas" | "metas" | "notas";
const GS_TIPOS: Array<{ key: Tipo; label: string }> = [
  { key: "tudo", label: "tudo" },
  { key: "rotinas", label: "rotinas" },
  { key: "metas", label: "metas" },
  { key: "notas", label: "notas" },
];
const TAG_LABEL: Record<Tag, string> = { nenhum: "nenhum", baixo: "baixo", medio: "médio", alto: "alto" };

interface Hit {
  icon: IconName;
  title: string;
  sub: string;
  onSelect: () => void;
  action?: { icon: IconName; title: string; onRun: () => void };
}

export function GlobalSearch() {
  const open = useAppStore((s) => s.searchOpen);
  const close = useAppStore((s) => s.closeSearch);
  const routines = useAppStore((s) => s.routines);
  const templates = useAppStore((s) => s.templates);
  const notes = useAppStore((s) => s.notes);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const goTo = useAppStore((s) => s.goTo);
  const openNote = useAppStore((s) => s.openNote);

  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<Tipo>("tudo");
  const [peso, setPeso] = useState("");

  if (!open) return null;

  function ir(fn: () => void) {
    close();
    fn();
  }

  const q = query.trim().toLowerCase();
  const hits: Hit[] = [];
  if (q.length >= 2) {
    const quer = (t: Tipo) => tipo === "tudo" || tipo === t;

    if (quer("rotinas")) {
      routines.forEach((r) => {
        if (peso && (r.tagValor || "medio") !== peso) return;
        if (!r.name.toLowerCase().includes(q)) return;
        hits.push({
          icon: "play",
          title: r.name,
          sub: "Rotina",
          onSelect: () => ir(() => openEditor(r.id)),
          action: { icon: "play", title: "Iniciar rotina", onRun: () => ir(() => startPlayer(r.id)) },
        });
      });
    }

    if (quer("metas") && !peso) {
      const doc = templates.find((t): t is CountdownDoc => t.type === "countdown");
      (doc?.targets ?? []).forEach((t) => {
        if (!t.title.toLowerCase().includes(q)) return;
        hits.push({
          icon: "countdown",
          title: t.title,
          sub: `Meta · ${t.done || 0}/${t.topics || 0}${t.date ? " · até " + t.date : ""}`,
          onSelect: () => ir(() => goTo({ tab: "metas", screen: "metas" })),
        });
      });
    }

    if (quer("notas") && !peso) {
      notes.forEach((n) => {
        if (!((n.title || "") + " " + (n.content || "")).toLowerCase().includes(q)) return;
        hits.push({ icon: "notes", title: n.title || "Sem título", sub: "Nota", onSelect: () => ir(() => openNote(n.id)) });
      });
    }
  }

  return (
    <div className="confirm-overlay search-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="confirm-box search-box" role="dialog" aria-modal="true" aria-label="Busca" style={{ textAlign: "left" }}>
        <input
          type="search"
          className="note-search"
          style={{ marginBottom: 10 }}
          placeholder="Buscar rotinas, metas, notas..."
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
        />
        <div className="area-chips area-filter-row" style={{ marginBottom: 10 }}>
          {GS_TIPOS.map((t) => (
            <span
              key={t.key}
              className={"area-chip" + (tipo === t.key ? " sel" : "")}
              style={{ "--chip": "var(--caneta)" } as CSSProperties}
              onClick={() => setTipo(t.key)}
            >
              {t.label}
            </span>
          ))}
        </div>
        <select
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 10,
            background: "var(--card-2)",
            border: "1.5px solid var(--line)",
            borderRadius: 10,
            padding: "8px 6px",
            fontSize: 13,
            color: "var(--ink)",
          }}
        >
          <option value="">peso: todos</option>
          {(Object.entries(TAG_LABEL) as Array<[Tag, string]>).map(([k, v]) => (
            <option key={k} value={k}>
              peso: {v}
            </option>
          ))}
        </select>
        <div className="notes-list">
          {q.length < 2 ? null : hits.length === 0 ? (
            <div className="routine-meta" style={{ padding: "8px 2px" }}>
              Nada encontrado.
            </div>
          ) : (
            hits.slice(0, 20).map((h, i) => (
              <div key={i} className="routine-card" style={{ cursor: "pointer" }} onClick={h.onSelect}>
                <div className="note-info" style={{ flex: 1, minWidth: 0 }}>
                  <h3>
                    <Icon name={h.icon} size={14} /> {h.title}
                  </h3>
                  <div className="routine-meta" style={{ marginTop: 2 }}>
                    {h.sub}
                  </div>
                </div>
                {h.action && (
                  <div className="routine-actions">
                    <button
                      className="icon-btn"
                      title={h.action.title}
                      aria-label={h.action.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        h.action!.onRun();
                      }}
                    >
                      <Icon name={h.action.icon} size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          {hits.length > 20 && (
            <div className="routine-meta" style={{ padding: "8px 2px" }}>
              + {hits.length - 20} resultado(s) — refine a busca
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
