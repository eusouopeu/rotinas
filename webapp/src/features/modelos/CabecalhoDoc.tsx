// Porta de tmplHeader (index.html:6730-6768) — cabeçalho comum dos
// documentos de Modelos: voltar (pra pasta de onde veio), título editável,
// data de criação, excluir e compartilhar/exportar (no ⋯).
import { useAppStore } from "../../store/useAppStore";
import { BarraDetalhe } from "../../ui/BarraDetalhe";
import { MenuMais } from "../../ui/MenuMais";
import { CampoTitulo } from "../../ui/CampoTitulo";
import { criadoEmLabel } from "../../lib/notes";
import { modeloShareData } from "../../lib/backup";
import { shareOrDownload, slugify } from "../../lib/exportFile";
import { mdTypeLabel, subpastaDoTipo } from "../../lib/templates";
import type { AnyTemplateDoc } from "../../lib/types";
import { confirmar } from "../../ui/Confirmar";

export function CabecalhoDoc({ doc, onTitleChange }: { doc: AnyTemplateDoc; onTitleChange: (title: string) => void }) {
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const deleteTemplateDoc = useAppStore((s) => s.deleteTemplateDoc);

  const title = "title" in doc && typeof doc.title === "string" ? doc.title : "";
  const createdAt =
    typeof (doc as { createdAt?: unknown }).createdAt === "number"
      ? (doc as { createdAt: number }).createdAt
      : Date.now();

  function back() {
    if (view.folderKind && view.folderKey) {
      goTo({ tab: "templates", screen: "tmplFolder", folderKind: view.folderKind, folderKey: view.folderKey });
    } else {
      goTo({ tab: "templates", screen: "templateFolders" });
    }
  }

  async function handleShare() {
    const data = modeloShareData(doc);
    const name = title.trim() || mdTypeLabel(doc.type);
    const filename = slugify(name).slice(0, 40) + ".json";
    await shareOrDownload(filename, JSON.stringify(data, null, 2), "application/json", subpastaDoTipo(doc.type));
  }

  // mesma barra do detalhe da rotina (03/10/2026): seta, título editável e ⋯
  // com compartilhar e excluir — antes "← Modelos" em texto + dois ícones
  return (
    <>
      <BarraDetalhe onVoltar={back} className="mb-0">
        <CampoTitulo
          aria-label="Título"
          className="mb-0 min-w-0 flex-1 border-b-0 py-0.5 text-[24px] focus:border-b-0"
          defaultValue={title}
          onBlur={(e) => {
            if (e.target.value !== title) onTitleChange(e.target.value);
          }}
        />
        <MenuMais
          itens={[
            { icone: "arrowUpTray", rotulo: "Compartilhar", onClick: () => void handleShare() },
            {
              icone: "trash",
              rotulo: "Excluir",
              perigo: true,
              onClick: async () => {
                if (await confirmar(`Excluir "${title || "sem título"}"?`, { acao: "Excluir", perigo: true })) {
                  deleteTemplateDoc(doc.id);
                  back();
                }
              },
            },
          ]}
        />
      </BarraDetalhe>
      <div className="mb-3 pl-9 font-sans text-xs tracking-[0.01em] text-sub">{criadoEmLabel(createdAt)}</div>
    </>
  );
}
