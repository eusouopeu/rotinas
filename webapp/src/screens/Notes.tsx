// Porta parcial de renderNotes (index.html:4785-4902) — busca, filtro por
// tag, pin, excluir por swipe com undo banner (index.html:4879-4886), FAB de
// nova nota. Sem backup/importar/paginação "carregar mais" nesta fase.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { Tabbar } from "../components/Tabbar";
import { ModelosTabPill } from "../components/ModelosTabPill";
import { SwipeItem } from "../ui/SwipeItem";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { CampoBusca } from "../ui/CampoBusca";
import { CARTAO_LISTA, CartaoInfo, CartaoTitulo } from "../ui/CartaoLista";
import { Chip } from "../ui/Chip";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Fab } from "../ui/Fab";
import { Legenda } from "../ui/Legenda";
import { ListaCartoes } from "../ui/ListaCartoes";
import { cn } from "../lib/cn";
import { allTags, extractTags, relativeTime, stripMdForSnippet } from "../lib/notes";
import { rolavel, tela } from "../ui/Tela";

export function Notes() {
  const notes = useAppStore((s) => s.notes);
  const openNote = useAppStore((s) => s.openNote);
  const toggleNotePinned = useAppStore((s) => s.toggleNotePinned);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const showUndoBanner = useAppStore((s) => s.showUndoBanner);
  const addNoteAt = useAppStore((s) => s.addNoteAt);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  /* Arquivadas somem da lista mas continuam existindo e buscáveis por aqui —
     arquivar não é excluir (22/09/2026). */
  const [verArquivadas, setVerArquivadas] = useState(false);
  const arquivadas = notes.filter((n) => n.arquivada).length;

  const visiveis = notes.filter((n) => !!n.arquivada === verArquivadas);
  const tags = allTags(visiveis);
  const q = query.trim().toLowerCase();
  let filtered = visiveis.filter(
    (n) => !q || (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q)
  );
  if (tag) filtered = filtered.filter((n) => extractTags(n).includes(tag));
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);

  return (
    <div {...tela({ comAbas: true, comPill: true })}>
      <div {...rolavel()}>
        <CabecalhoTela titulo="Notas" margem="2.5" />

        <CampoBusca
          forma="caixa"
          type="search"
          className="mb-3.5"
          placeholder="Buscar notas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {(arquivadas > 0 || verArquivadas) && (
          <div className="mb-2.5 flex justify-end">
            <Botao variante="pilula" className="ml-2.5 whitespace-nowrap" onClick={() => setVerArquivadas((v) => !v)}>
              {verArquivadas ? "ver notas ativas" : `ver arquivadas (${arquivadas})`}
            </Botao>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mb-3.5 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t} variante="tag" ativo={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </Chip>
            ))}
          </div>
        )}

        <ListaCartoes>
          {sorted.length === 0 ? (
            <EstadoVazio
              className="min-h-[40vh] desktop:col-span-full"
              titulo={q || tag ? "Nada encontrado" : "Nenhuma nota ainda"}
              texto={
                q || tag
                  ? "Nenhuma nota corresponde ao filtro."
                  : "Listas de compras, tarefas, notas de estudo — tudo rápido, em markdown."
              }
            >
              {!(q || tag) && (
                <Botao className="mt-3.5" onClick={() => openNote(null)}>
                  + Nova nota
                </Botao>
              )}
            </EstadoVazio>
          ) : (
            sorted.map((n, idx) => (
              <SwipeItem
                key={n.id}
                className={CARTAO_LISTA}
                onLeft={() => {
                  deleteNote(n.id);
                  showUndoBanner("Nota excluída", () => addNoteAt(idx, n));
                }}
              >
                <CartaoInfo onClick={() => openNote(n.id)}>
                  <CartaoTitulo>
                    {n.pinned && <span className="text-base text-caneta">&#9733; </span>}
                    {n.title || "Sem título"}
                  </CartaoTitulo>
                  <div className="mt-1 truncate text-md leading-[1.4] text-sub">{stripMdForSnippet(n.content)}</div>
                  <Legenda className="mt-1.5">
                    {relativeTime(n.updatedAt)}
                    {(n.subjects || []).length > 0 &&
                      " · " + n.subjects!.slice(0, 3).join(", ") + (n.subjects!.length > 3 ? "…" : "")}
                  </Legenda>
                </CartaoInfo>
                <BotaoIcone
                  rotulo="Fixar nota"
                  semBorda
                  className={cn("text-2xl", n.pinned ? "text-caneta" : "text-line")}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNotePinned(n.id);
                  }}
                >
                  &#9733;
                </BotaoIcone>
              </SwipeItem>
            ))
          )}
        </ListaCartoes>
      </div>

      <ModelosTabPill active="notes" />
      <Fab rotulo="Novo" className="desktop:bottom-7" onClick={() => openNote(null)} />
      <Tabbar />
    </div>
  );
}
