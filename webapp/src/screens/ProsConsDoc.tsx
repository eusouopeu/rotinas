// Porta de renderProsConsDoc (index.html:9460-9519) —
// prós/contras com peso 1-5, placar é a soma dos pesos de cada lado.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { exportPdfView } from "../lib/exportFile";
import { prosConsPdfHtml } from "../lib/pdfExport";
import type { ProsConsDoc as ProsConsDocType } from "../lib/types";

type Key = "pros" | "cons";

function ColunaHtml({
  label,
  color,
  items,
  onAdd,
  onSetWeight,
  onDelete,
  onEditText,
}: {
  label: string;
  color: string;
  items: Array<{ id: string; text: string; w: number }>;
  onAdd: (text: string) => void;
  onSetWeight: (id: string, w: number) => void;
  onDelete: (id: string) => void;
  onEditText: (id: string, text: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const soma = items.reduce((a, i) => a + i.w, 0);

  return (
    <>
      <div className="section-label" style={{ color }}>
        {label} · soma {soma}
      </div>
      <div className="stat-card">
        {items.length === 0 ? (
          <div className="dev-n">vazio</div>
        ) : (
          items.map((i) =>
            editingId === i.id ? (
              <div className="dev-row" key={i.id}>
                <textarea
                  className="mk-e-name"
                  rows={1}
                  style={{ flex: 1, marginBottom: 0 }}
                  defaultValue={i.text}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const v = (e.target as HTMLTextAreaElement).value.trim();
                    if (v) onEditText(i.id, v);
                    setEditingId(null);
                  }}
                  id={`pc-edit-${i.id}`}
                />
                <button
                  className="btn-primary"
                  style={{ padding: "8px 14px" }}
                  onClick={() => {
                    const ta = document.getElementById(`pc-edit-${i.id}`) as HTMLTextAreaElement | null;
                    const v = ta?.value.trim();
                    if (v) onEditText(i.id, v);
                    setEditingId(null);
                  }}
                >
                  <Icon name="check" size={14} />
                </button>
              </div>
            ) : (
              <div className="dev-row" key={i.id}>
                <span style={{ flex: 1, cursor: "pointer" }} title="Tocar para editar" onClick={() => setEditingId(i.id)}>
                  {i.text}
                </span>
                <span className="pc-weights">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <span
                      key={w}
                      className={"pc-w" + (i.w === w ? " sel" : "")}
                      style={i.w === w ? { background: color, color: "var(--on-caneta)", borderColor: "transparent" } : undefined}
                      onClick={() => onSetWeight(i.id, w)}
                    >
                      {w}
                    </span>
                  ))}
                </span>
                <button className="del-exec" onClick={() => onDelete(i.id)}>
                  <Icon name="xmark" size={14} />
                </button>
              </div>
            ),
          )
        )}
        <div className="mx-add">
          <input
            type="text"
            placeholder={`+ argumento (Enter, peso 3 padrão)`}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const v = (e.target as HTMLInputElement).value.trim();
              if (!v) return;
              onAdd(v);
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </div>
      </div>
    </>
  );
}

export function ProsConsDoc({ doc }: { doc: ProsConsDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const [erro, setErro] = useState("");
  function save(patch: Partial<ProsConsDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  const ps = doc.pros.reduce((a, i) => a + i.w, 0);
  const cs = doc.cons.reduce((a, i) => a + i.w, 0);
  const verdict =
    ps > cs ? (
      <b style={{ color: "var(--ok)" }}>prós vencem (+{ps - cs})</b>
    ) : cs > ps ? (
      <b>contras vencem (&minus;{cs - ps})</b>
    ) : (
      <b>empate</b>
    );

  function colunaProps(key: Key, label: string, color: string) {
    const items = doc[key];
    return {
      label,
      color,
      items,
      onAdd: (text: string) => save({ [key]: [...items, { id: uid(), text, w: 3 }] } as Partial<ProsConsDocType>),
      onSetWeight: (id: string, w: number) => save({ [key]: items.map((i) => (i.id === id ? { ...i, w } : i)) } as Partial<ProsConsDocType>),
      onDelete: (id: string) => save({ [key]: items.filter((i) => i.id !== id) } as Partial<ProsConsDocType>),
      onEditText: (id: string, text: string) => save({ [key]: items.map((i) => (i.id === id ? { ...i, text } : i)) } as Partial<ProsConsDocType>),
    };
  }

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => save({ title })} />
      <div className="topbar" style={{ borderTop: "none", justifyContent: "flex-end" }}>
        <button
          className="icon-btn"
          title="Exportar PDF"
          aria-label="Exportar PDF"
          onClick={async () => {
            setErro("");
            const r = await exportPdfView(doc.title, prosConsPdfHtml(doc), "Pros e Contras");
            if (!r.ok && r.erro) setErro(r.erro);
          }}
        >
          PDF
        </button>
      </div>
      {erro && (
        <div className="stat-foot" style={{ color: "var(--erro)" }}>
          {erro}
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
        <div className="stat-card" style={{ marginBottom: 12, textAlign: "center" }}>
          <div className="cd-big ontime" style={{ fontSize: 34 }}>
            {ps} &times; {cs}
          </div>
          <div>{verdict}</div>
        </div>
        <ColunaHtml {...colunaProps("pros", "Prós", "var(--ok)")} />
        <ColunaHtml {...colunaProps("cons", "Contras", "var(--erro)")} />
      </div>
    </div>
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
