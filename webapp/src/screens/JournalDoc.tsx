// Anotações de uma execução de rotina (doc "journal", criado no fim do player
// a partir das etapas com anotações — playerSlice.advanceStep). Leitura: uma
// seção por etapa, texto como foi escrito (negrito **assim** destacado).
import { useAppStore } from "../store/useAppStore";
import { splitBold } from "../lib/mdPreview";
import { BarraDetalhe } from "../ui/BarraDetalhe";
import { Cartao } from "../ui/Cartao";
import { Legenda } from "../ui/Legenda";
import { RotuloSecao } from "../ui/RotuloSecao";
import { rolavel, tela } from "../ui/Tela";

export interface JournalDocType {
  id: string;
  type: "journal";
  title?: string;
  routineId?: string;
  routineName?: string;
  executedAt?: number;
  sections?: Array<{ taskName: string; text: string }>;
}

export function JournalDoc({ doc }: { doc: JournalDocType }) {
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const quando = doc.executedAt
    ? new Date(doc.executedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "";
  return (
    <div {...tela({})}>
      <BarraDetalhe
        titulo={doc.routineName || "Anotações"}
        className="mb-3"
        onVoltar={() =>
          goTo(
            view.folderKind && view.folderKey
              ? { tab: "templates", screen: "tmplFolder", folderKind: view.folderKind, folderKey: view.folderKey }
              : { tab: "templates", screen: "templateFolders" }
          )
        }
      />
      <div {...rolavel("pb-6")}>
        {quando && <Legenda className="mb-2">{quando}</Legenda>}
        {(doc.sections || []).map((s, i) => (
          <div key={i}>
            <RotuloSecao>{s.taskName}</RotuloSecao>
            <Cartao className="mb-1.5 font-sans text-lg leading-normal whitespace-pre-wrap">
              {splitBold(s.text || "").map((p, j) =>
                p.bold ? <b key={j}>{p.text}</b> : <span key={j}>{p.text}</span>
              )}
            </Cartao>
          </div>
        ))}
      </div>
    </div>
  );
}
