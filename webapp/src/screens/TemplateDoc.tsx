// Porta de renderTemplateDoc (index.html:6716-6721) — dispatcher por
// doc.type. Só scoreboard/thoughtrecord/proscons têm editor no React; os
// outros tipos (market/matrix/kanban/expense/travel/countdown — countdown
// vive em Metas) caem no fallback "ainda não portado".
import { useAppStore } from "../store/useAppStore";
import { ScoreboardDoc } from "./ScoreboardDoc";
import { ThoughtRecordDoc } from "./ThoughtRecordDoc";
import { ProsConsDoc } from "./ProsConsDoc";
import type { ProsConsDoc as ProsConsDocType, ScoreboardDoc as ScoreboardDocType, ThoughtRecordDoc as ThoughtRecordDocType } from "../lib/types";

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

  return (
    <div className="screen">
      <div className="topbar">
        <button
          className="link-btn muted"
          onClick={() =>
            goTo(
              view.folderKind && view.folderKey
                ? { tab: "templates", screen: "tmplFolder", folderKind: view.folderKind, folderKey: view.folderKey }
                : { tab: "templates", screen: "templateFolders" },
            )
          }
        >
          &larr; Modelos
        </button>
      </div>
      <div className="empty-state">
        <h2>Editor ainda não portado</h2>
        <p>Este tipo de documento ("{doc.type}") ainda só existe no app antigo.</p>
      </div>
    </div>
  );
}
