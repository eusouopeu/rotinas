// Porta de renderTmplFolder (index.html:6603-6669) — pasta por tipo
// (kind:"type") e pasta-rotina (kind:"routine", as notas de journaling de uma
// rotina). Excluir é por swipe com undo banner (index.html:6639-6645).
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { SwipeItem } from "../ui/SwipeItem";
import { CARTAO_LISTA, CartaoInfo, CartaoTitulo } from "../ui/CartaoLista";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Fab } from "../ui/Fab";
import { Legenda } from "../ui/Legenda";
import { ListaCartoes } from "../ui/ListaCartoes";
import { relativeTime } from "../lib/notes";
import { TMPL_TYPES, tmplMeta } from "../lib/templates";

export function TmplFolder() {
  const templates = useAppStore((s) => s.templates);
  const goTo = useAppStore((s) => s.goTo);
  const createTemplateDoc = useAppStore((s) => s.createTemplateDoc);
  const deleteTemplateDocWithUndo = useAppStore((s) => s.deleteTemplateDocWithUndo);
  const key = useAppStore((s) => s.view.folderKey) || "";
  const kind = useAppStore((s) => s.view.folderKind) || "type";
  const routines = useAppStore((s) => s.routines);

  /* Pasta-rotina (kind:"routine") lista as notas de journaling daquela rotina;
     pasta por tipo lista os documentos do tipo (index.html:6607-6615). */
  const typeInfo = TMPL_TYPES.find((t) => t.type === key);
  const titleLabel =
    kind === "routine" ? routines.find((x) => x.id === key)?.name || "Rotina excluída" : typeInfo ? typeInfo.label : key;
  const brutos =
    kind === "routine"
      ? templates.filter((t) => t.type === "journal" && (t as { routineId?: string }).routineId === key)
      : templates.filter((t) => t.type === key);
  const docs = [...brutos].sort((a, b) => {
    const au = typeof a.updatedAt === "number" ? a.updatedAt : 0;
    const bu = typeof b.updatedAt === "number" ? b.updatedAt : 0;
    return bu - au;
  });

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header">
          <h1 className="text-4xl">
            <span
              className="cursor-pointer text-4xl text-sub"
              onClick={() => goTo({ tab: "templates", screen: "templateFolders" })}
            >
              <Icon name="chevronLeft" size={18} />
            </span>{" "}
            {titleLabel}
          </h1>
        </div>

        {docs.length === 0 ? (
          <EstadoVazio titulo="Pasta vazia" texto="Crie o primeiro documento aqui." />
        ) : (
          <ListaCartoes>
            {docs.map((t) => (
              <SwipeItem key={t.id} className={CARTAO_LISTA} onLeft={() => deleteTemplateDocWithUndo(t.id)}>
                <CartaoInfo
                  onClick={() => goTo({ tab: "templates", screen: "templateDoc", id: t.id, folderKind: kind, folderKey: key })}
                >
                  <CartaoTitulo>{("title" in t && typeof t.title === "string" && t.title) || "Sem título"}</CartaoTitulo>
                  <Legenda className="mt-1">
                    {tmplMeta(t)} · {relativeTime(typeof t.updatedAt === "number" ? t.updatedAt : 0)}
                  </Legenda>
                </CartaoInfo>
              </SwipeItem>
            ))}
          </ListaCartoes>
        )}
      </div>

      <Fab rotulo="Novo" onClick={() => createTemplateDoc(key, "type", key)} />
      <Tabbar />
    </div>
  );
}
