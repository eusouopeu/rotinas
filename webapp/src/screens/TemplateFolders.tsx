// Porta de renderTemplates (index.html:6508-6550) — tiles de pastas fixas
// agrupados nas seções do legado (Geral/Listas/Registros), a pasta "Notas"
// (única que não vem de newTemplateDoc), a seção "Anotações de Rotinas"
// (pastas de journaling, uma por rotina com nota do tipo "journal") e o FAB
// com o popup "Criar novo" (openNewTemplatePopup, index.html:6554-6580),
// incluindo o seletor de preset da matriz (openMatrixPresetPicker).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { Tabbar } from "../components/Tabbar";
import { ModelosTabPill } from "../components/ModelosTabPill";
import { Botao } from "../ui/Botao";
import { CampoBusca } from "../ui/CampoBusca";
import { CartaoInfo, CartaoLista, CartaoTitulo } from "../ui/CartaoLista";
import { Fab } from "../ui/Fab";
import { Legenda } from "../ui/Legenda";
import { ListaCartoes } from "../ui/ListaCartoes";
import { Modal, ModalAcoes, ModalTexto } from "../ui/Modal";
import { GradePastas, PastaTile, SeparadorSecao } from "../features/modelos/PastaTile";
import { TMPL_SECOES, TMPL_TYPES, type MatrixPreset } from "../lib/templates";
import type { IconName } from "../lib/icons";
import { rolavel, tela } from "../ui/Tela";

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
  const todas: Tile[] = [
    { key: "notes", icon: "notes", label: "Notas" },
    ...TMPL_TYPES.map((t) => ({ key: t.type, icon: t.icon, label: t.label })),
  ];
  const secoes = TMPL_SECOES.map((s) => ({
    key: s.key,
    label: s.label,
    tiles: s.tipos.map((k) => todas.find((f) => f.key === k)).filter((f): f is Tile => !!f),
  }));
  const journalRoutineIds = [
    ...new Set(templates.filter((t) => t.type === "journal").map((t) => (t as { routineId?: string }).routineId)),
  ].filter((id): id is string => !!id);
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
    <GradePastas>
      {tiles.map((f) => (
        <PastaTile key={f.key} icone={f.icon} rotulo={f.label} onClick={() => abrirPasta(f.key)} />
      ))}
    </GradePastas>
  );

  return (
    <div {...tela({ comAbas: true, comPill: true })}>
      <div {...rolavel()}>
        <CabecalhoTela titulo="Modelos" />
        <CampoBusca
          forma="caixa"
          type="search"
          className="mb-3.5"
          placeholder="Buscar modelos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {q && docsAchados.length > 0 && (
          <ListaCartoes className="mb-3">
            {docsAchados.map((t) => {
              const rid = t.type === "journal" ? (t as { routineId?: string }).routineId : undefined;
              return (
                <CartaoLista
                  key={t.id}
                  onClick={() =>
                    goTo({
                      tab: "templates",
                      screen: "templateDoc",
                      id: t.id,
                      folderKind: rid ? "routine" : "type",
                      folderKey: rid || t.type,
                    })
                  }
                >
                  <CartaoInfo>
                    <CartaoTitulo>{(t as { title?: string }).title}</CartaoTitulo>
                    <Legenda>{TMPL_TYPES.find((x) => x.type === t.type)?.label || t.type}</Legenda>
                  </CartaoInfo>
                </CartaoLista>
              );
            })}
          </ListaCartoes>
        )}
        <div className="flex-none">
          {secoes
            .map((s) => ({ ...s, tiles: s.tiles.filter((f) => !q || f.label.toLowerCase().includes(q)) }))
            .filter((s) => s.tiles.length)
            .map((s) => (
              <div key={s.key}>
                <SeparadorSecao>{s.label}</SeparadorSecao>
                {grade(s.tiles)}
              </div>
            ))}
          <SeparadorSecao>Anotações de Rotinas</SeparadorSecao>
          {rotinasTiles.length ? (
            grade(rotinasTiles.filter((f) => !q || f.label.toLowerCase().includes(q)))
          ) : (
            <Legenda className="mx-0.5 mb-2">Nenhuma ainda — nasce sozinha ao registrar anotações numa rotina.</Legenda>
          )}
        </div>
      </div>

      <ModelosTabPill active="outros" />
      <Fab rotulo="Novo modelo" className="desktop:bottom-7" onClick={() => setCriando(true)} />

      {criando && (
        <Modal onFechar={() => setCriando(false)} className="text-left">
          <ModalTexto className="mb-2.5">Criar novo:</ModalTexto>
          <GradePastas>
            <PastaTile icone="notes" rotulo="Notas simples" onClick={() => criar("notasimples")} />
            {TMPL_TYPES.map((t) => (
              <PastaTile key={t.type} icone={t.icon} rotulo={t.label} onClick={() => criar(t.type)} />
            ))}
          </GradePastas>
          <ModalAcoes className="mt-3.5">
            <Botao variante="neutro" tamanho="modal" onClick={() => setCriando(false)}>
              Cancelar
            </Botao>
          </ModalAcoes>
        </Modal>
      )}

      {matrixPicker && (
        <Modal onFechar={() => setMatrixPicker(false)}>
          <ModalTexto>Começar a matriz como:</ModalTexto>
          <ModalAcoes className="flex-col">
            <Botao variante="solido" tamanho="modal" onClick={() => criarMatriz("eisenhower")}>
              Matriz de Eisenhower
            </Botao>
            <Botao variante="solido" tamanho="modal" onClick={() => criarMatriz("swot")}>
              Análise SWOT
            </Botao>
            <Botao
              variante="solido"
              tamanho="modal"
              className="bg-card-2 text-ink"
              onClick={() => criarMatriz("blank")}
            >
              Em branco
            </Botao>
            <Botao variante="neutro" tamanho="modal" onClick={() => setMatrixPicker(false)}>
              Cancelar
            </Botao>
          </ModalAcoes>
        </Modal>
      )}

      <Tabbar />
    </div>
  );
}
