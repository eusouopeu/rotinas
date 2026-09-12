// Porta de renderTemplates (index.html:6508-6550) — tiles de pastas fixas
// agrupados nas seções do legado (Geral/Listas/Registros), a pasta "Notas"
// (única que não vem de newTemplateDoc), a seção "Anotações de Rotinas"
// (pastas de journaling, uma por rotina com nota do tipo "journal") e o FAB
// com o popup "Criar novo" (openNewTemplatePopup, index.html:6554-6580),
// incluindo o seletor de preset da matriz (openMatrixPresetPicker).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { ModelosTabPill } from "../components/ModelosTabPill";
import { TMPL_SECOES, TMPL_TYPES, type MatrixPreset } from "../lib/templates";
import type { IconName } from "../lib/icons";

interface Tile {
  key: string;
  icon: IconName;
  label: string;
}

export function TemplateFolders() {
  const goTo = useAppStore((s) => s.goTo);
  const templates = useAppStore((s) => s.templates);
  const routines = useAppStore((s) => s.routines);
  const openNote = useAppStore((s) => s.openNote);
  const createTemplateDoc = useAppStore((s) => s.createTemplateDoc);
  const [criando, setCriando] = useState(false);
  const [matrixPicker, setMatrixPicker] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // busca: filtra as pastas pelo nome e lista os documentos cujo título bate
  const docsAchados = q
    ? templates.filter((t) => "title" in t && typeof t.title === "string" && t.title.toLowerCase().includes(q))
    : [];

  // Porta de templateFolderTiles (index.html:6471-6485).
  const todas: Tile[] = [{ key: "notes", icon: "notes", label: "Notas" }, ...TMPL_TYPES.map((t) => ({ key: t.type, icon: t.icon, label: t.label }))];
  const secoes = TMPL_SECOES.map((s) => ({
    key: s.key,
    label: s.label,
    tiles: s.tipos.map((k) => todas.find((f) => f.key === k)).filter((f): f is Tile => !!f),
  }));
  const journalRoutineIds = [...new Set(templates.filter((t) => t.type === "journal").map((t) => (t as { routineId?: string }).routineId))].filter(
    (id): id is string => !!id,
  );
  const rotinasTiles: Tile[] = journalRoutineIds.map((rid) => ({
    key: "journal:" + rid,
    icon: "notes",
    label: routines.find((x) => x.id === rid)?.name || "Rotina excluída",
  }));

  function abrirPasta(key: string) {
    if (key === "notes") {
      goTo({ tab: "templates", screen: "notes" });
      return;
    }
    if (key === "expense") {
      goTo({ tab: "templates", screen: "expenseFolder" });
      return;
    }
    if (key.startsWith("journal:")) {
      goTo({ tab: "templates", screen: "tmplFolder", folderKind: "routine", folderKey: key.slice(8) });
      return;
    }
    goTo({ tab: "templates", screen: "tmplFolder", folderKind: "type", folderKey: key });
  }

  /* Mesmo destino de openNewTemplatePopup: nota simples abre o editor de nota,
     matriz passa pelo seletor de preset e gastos vai direto pra pasta própria
     (que não tem doc por documento). */
  function criar(type: string) {
    setCriando(false);
    if (type === "notasimples") {
      openNote(null);
      return;
    }
    if (type === "matrix") {
      setMatrixPicker(true);
      return;
    }
    if (type === "expense") {
      goTo({ tab: "templates", screen: "expenseFolder" });
      return;
    }
    createTemplateDoc(type, "type", type);
  }

  function criarMatriz(preset: MatrixPreset) {
    setMatrixPicker(false);
    createTemplateDoc("matrix", "type", "matrix", preset);
  }

  const grade = (tiles: Tile[]) => (
    <div className="tmpl-new-grid">
      {tiles.map((f) => (
        <button key={f.key} className="tmpl-new" onClick={() => abrirPasta(f.key)}>
          <span className="tmpl-ic">
            <Icon name={f.icon} size={22} />
          </span>
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="screen with-tabbar com-modelos-pill">
      <div className="tab-scroll">
        <div className="home-header">
          <h1>Modelos</h1>
        </div>
        <input
          type="search"
          className="note-search"
          placeholder="Buscar modelos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {q && docsAchados.length > 0 && (
          <div className="notes-list" style={{ flex: "0 0 auto", overflow: "visible", marginBottom: 12 }}>
            {docsAchados.map((t) => {
              const rid = t.type === "journal" ? (t as { routineId?: string }).routineId : undefined;
              return (
                <div
                  key={t.id}
                  className="note-card"
                  onClick={() =>
                    goTo({ tab: "templates", screen: "templateDoc", id: t.id, folderKind: rid ? "routine" : "type", folderKey: rid || t.type })
                  }
                >
                  <div className="note-info">
                    <h3>{(t as { title?: string }).title}</h3>
                    <div className="routine-meta">{TMPL_TYPES.find((x) => x.type === t.type)?.label || t.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="tmpl-folders">
          {secoes
            .map((s) => ({ ...s, tiles: s.tiles.filter((f) => !q || f.label.toLowerCase().includes(q)) }))
            .filter((s) => s.tiles.length)
            .map((s) => (
              <div key={s.key}>
                <div className="tmpl-sep">
                  <span>{s.label}</span>
                </div>
                {grade(s.tiles)}
              </div>
            ))}
          <div className="tmpl-sep">
            <span>Anotações de Rotinas</span>
          </div>
          {rotinasTiles.length ? (
            grade(rotinasTiles.filter((f) => !q || f.label.toLowerCase().includes(q)))
          ) : (
            <div className="dev-n" style={{ margin: "0 2px 8px" }}>
              Nenhuma ainda — nasce sozinha ao registrar anotações numa rotina.
            </div>
          )}
        </div>
      </div>

      <ModelosTabPill active="outros" />
      <button className="fab" title="Novo modelo" onClick={() => setCriando(true)}>
        +
      </button>

      {criando && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setCriando(false)}>
          <div className="confirm-box" style={{ textAlign: "left" }}>
            <p style={{ margin: "0 0 10px" }}>Criar novo:</p>
            <div className="tmpl-new-grid">
              <button className="tmpl-new" onClick={() => criar("notasimples")}>
                <span className="tmpl-ic">
                  <Icon name="notes" size={22} />
                </span>
                <span>Notas simples</span>
              </button>
              {TMPL_TYPES.map((t) => (
                <button key={t.type} className="tmpl-new" onClick={() => criar(t.type)}>
                  <span className="tmpl-ic">
                    <Icon name={t.icon} size={22} />
                  </span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="confirm-actions" style={{ marginTop: 14 }}>
              <button className="btn-cancel" onClick={() => setCriando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {matrixPicker && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setMatrixPicker(false)}>
          <div className="confirm-box">
            <p>Começar a matriz como:</p>
            <div className="confirm-actions" style={{ flexDirection: "column" }}>
              <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={() => criarMatriz("eisenhower")}>
                Matriz de Eisenhower
              </button>
              <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={() => criarMatriz("swot")}>
                Análise SWOT
              </button>
              <button className="btn-confirm" style={{ background: "var(--card-2)", color: "var(--ink)" }} onClick={() => criarMatriz("blank")}>
                Em branco
              </button>
              <button className="btn-cancel" onClick={() => setMatrixPicker(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabbar />
    </div>
  );
}
