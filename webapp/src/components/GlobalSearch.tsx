// Porta parcial de openGlobalSearch (index.html:2978-3151) — overlay de busca
// com filtro por tipo (rotinas/metas/notas) e peso. Sem filtro de área, sem
// "modelos"/"kanban"/"histórico" (telas de destino ainda não existem no
// React: renderTemplateDoc, kanban do Diário e Dados/renderStats) e sem
// debounce (dataset pequeno nesta fase não pesa a cada tecla).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import { BotaoIcone } from "../ui/BotaoIcone";
import { CampoBusca } from "../ui/CampoBusca";
import { CartaoInfo, CartaoLista, CartaoTitulo } from "../ui/CartaoLista";
import { Chip } from "../ui/Chip";
import { Legenda } from "../ui/Legenda";
import { Modal } from "../ui/Modal";
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
        hits.push({
          icon: "notes",
          title: n.title || "Sem título",
          sub: "Nota",
          onSelect: () => ir(() => openNote(n.id)),
        });
      });
    }
  }

  return (
    <Modal
      posicao="topo"
      onFechar={close}
      className="flex max-h-[82vh] max-w-[460px] flex-col text-left desktop:max-w-[640px]"
    >
      <CampoBusca
        forma="caixa"
        type="search"
        className="mb-2.5"
        placeholder="Buscar rotinas, metas, notas..."
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && close()}
      />
      <div className="mb-2.5 flex flex-none flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
        {GS_TIPOS.map((t) => (
          <Chip key={t.key} className="flex-none" ativo={tipo === t.key} onClick={() => setTipo(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <select
        value={peso}
        onChange={(e) => setPeso(e.target.value)}
        className="mb-2.5 w-full rounded-md border-[1.5px] border-line bg-card-2 px-1.5 py-2 text-md text-ink"
      >
        <option value="">peso: todos</option>
        {(Object.entries(TAG_LABEL) as Array<[Tag, string]>).map(([k, v]) => (
          <option key={k} value={k}>
            peso: {v}
          </option>
        ))}
      </select>
      <div className="flex flex-auto flex-col gap-3 overflow-y-auto desktop:grid desktop:grid-cols-2 desktop:content-start desktop:items-start">
        {q.length < 2 ? null : hits.length === 0 ? (
          <Legenda className="px-0.5 py-2">Nada encontrado.</Legenda>
        ) : (
          hits.slice(0, 20).map((h, i) => (
            <CartaoLista key={i} className="cursor-pointer" onClick={h.onSelect}>
              <CartaoInfo>
                <CartaoTitulo>
                  <Icon name={h.icon} size={14} /> {h.title}
                </CartaoTitulo>
                <Legenda className="mt-0.5">{h.sub}</Legenda>
              </CartaoInfo>
              {h.action && (
                <div className="flex shrink-0 items-center gap-2">
                  <BotaoIcone
                    rotulo={h.action.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      h.action!.onRun();
                    }}
                  >
                    <Icon name={h.action.icon} size={14} />
                  </BotaoIcone>
                </div>
              )}
            </CartaoLista>
          ))
        )}
        {hits.length > 20 && (
          <Legenda className="px-0.5 py-2">+ {hits.length - 20} resultado(s) — refine a busca</Legenda>
        )}
      </div>
    </Modal>
  );
}
