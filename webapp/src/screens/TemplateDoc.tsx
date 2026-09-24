// Porta de renderTemplateDoc (index.html:6716-6721) — dispatcher por
// doc.type. "expense" (registro de gastos, com import de CSV — countdown
// vive em Metas) segue caindo no fallback "ainda não portado".
import { useAppStore } from "../store/useAppStore";
import { BotaoLink } from "../ui/BotaoLink";
import { EstadoVazio } from "../ui/EstadoVazio";
import { ScoreboardDoc } from "./ScoreboardDoc";
import { ThoughtRecordDoc } from "./ThoughtRecordDoc";
import { ProsConsDoc } from "./ProsConsDoc";
import { MarketDoc } from "./MarketDoc";
import { MatrixDoc } from "./MatrixDoc";
import { KanbanDoc } from "./KanbanDoc";
import { TravelDoc } from "./TravelDoc";
import type {
  KanbanDoc as KanbanDocType,
  MarketDoc as MarketDocType,
  MatrixDoc as MatrixDocType,
  ProsConsDoc as ProsConsDocType,
  ScoreboardDoc as ScoreboardDocType,
  ThoughtRecordDoc as ThoughtRecordDocType,
  TravelDoc as TravelDocType,
} from "../lib/types";
import { tela } from "../ui/Tela";

export function TemplateDoc() {
  const templates = useAppStore((s) => s.templates);
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const doc = templates.find((t) => t.id === view.id);

  if (!doc) {
    goTo({ tab: "templates", screen: "templateFolders" });
    return null;
  }

  if (doc.type === "scoreboard") return <ScoreboardDoc doc={doc as ScoreboardDocType} />;
  if (doc.type === "thoughtrecord") return <ThoughtRecordDoc doc={doc as ThoughtRecordDocType} />;
  if (doc.type === "proscons") return <ProsConsDoc doc={doc as ProsConsDocType} />;
  if (doc.type === "market") return <MarketDoc doc={doc as MarketDocType} />;
  if (doc.type === "matrix") return <MatrixDoc doc={doc as MatrixDocType} />;
  if (doc.type === "kanban") return <KanbanDoc doc={doc as KanbanDocType} />;
  if (doc.type === "travel") return <TravelDoc doc={doc as TravelDocType} />;

  return (
    <div {...tela({})}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <BotaoLink
          tom="suave"
          onClick={() =>
            goTo(
              view.folderKind && view.folderKey
                ? { tab: "templates", screen: "tmplFolder", folderKind: view.folderKind, folderKey: view.folderKey }
                : { tab: "templates", screen: "templateFolders" }
            )
          }
        >
          &larr; Modelos
        </BotaoLink>
      </div>
      <EstadoVazio
        titulo="Editor ainda não portado"
        texto={`Este tipo de documento ("${doc.type}") ainda só existe no app antigo.`}
      />
    </div>
  );
}
