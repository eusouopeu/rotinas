// Porta de renderMatrixDoc (index.html:7421-7587) — grade de 4 quadrantes
// com cor, modo (check/lista/numerada), itens com indentação simples (1
// nível), expandir quadrante, edição dos rótulos dos eixos e exportar PDF.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { BarraPdf } from "../features/modelos/BarraPdf";
import { CabecalhoDoc } from "../features/modelos/CabecalhoDoc";
import { EdicaoItemMatriz, QuadranteMatriz } from "../features/modelos/QuadranteMatriz";
import { BotaoIcone } from "../ui/BotaoIcone";
import { exportPdfView } from "../lib/exportFile";
import { matrixPdfHtml } from "../lib/pdfExport";
import type { MatrixDoc as MatrixDocType } from "../lib/types";
import { tela } from "../ui/Tela";

type Quadrant = MatrixDocType["quadrants"][number];

const CAMPO_EIXO = "flex-1 rounded-[9px] border-[1.5px] border-line bg-card px-2.5 py-2 text-md text-ink";

export function MatrixDoc({ doc }: { doc: MatrixDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const [editing, setEditing] = useState<{ qi: number; ii: number } | null>(null);
  const [showAxes, setShowAxes] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  function save(patch: Partial<MatrixDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }
  function saveQuadrants(quadrants: Quadrant[]) {
    save({ quadrants });
  }
  function patchQuad(qi: number, patch: Partial<Quadrant>) {
    saveQuadrants(doc.quadrants.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }

  const quad = (q: Quadrant, qi: number, grande: boolean) => (
    <QuadranteMatriz
      key={qi}
      q={q}
      grande={grande}
      editando={editing && editing.qi === qi ? editing.ii : null}
      onPatch={(patch) => patchQuad(qi, patch)}
      onAlternarExpandir={() => {
        setExpanded(expanded === qi ? null : qi);
        setEditing(null);
      }}
      onEditar={(ii) => setEditing({ qi, ii })}
      renderEdicao={(ii, it) => (
        <EdicaoItemMatriz
          key={ii}
          doc={doc}
          qi={qi}
          ii={ii}
          it={it}
          onDone={() => setEditing(null)}
          onSave={saveQuadrants}
        />
      )}
    />
  );

  return (
    <div {...tela({})}>
      <CabecalhoDoc doc={doc} onTitleChange={(title) => save({ title })} />
      <BarraPdf
        antes={
          <BotaoIcone rotulo="Rótulos dos eixos" onClick={() => setShowAxes(!showAxes)}>
            <Icon name="tag" size={15} />
          </BotaoIcone>
        }
        exportar={() => exportPdfView(doc.title, matrixPdfHtml(doc), "Matrizes 2x2")}
      />
      {showAxes && (
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            className={CAMPO_EIXO}
            placeholder="eixo horizontal"
            value={doc.axisX || ""}
            onChange={(e) => save({ axisX: e.target.value })}
          />
          <input
            type="text"
            className={CAMPO_EIXO}
            placeholder="eixo vertical"
            value={doc.axisY || ""}
            onChange={(e) => save({ axisY: e.target.value })}
          />
        </div>
      )}
      {doc.axisX && !showAxes && (
        <div className="mb-1 text-center font-sans text-xs text-sub">&larr; {doc.axisX} &rarr;</div>
      )}
      <div className="flex min-h-0 flex-1 gap-1.5 overflow-hidden">
        {doc.axisY && !showAxes && expanded === null && (
          <div className="flex rotate-180 items-center font-sans text-xs text-sub [writing-mode:vertical-rl]">
            {doc.axisY}
          </div>
        )}
        {expanded !== null ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto">{quad(doc.quadrants[expanded], expanded, true)}</div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] grid-rows-[1fr_1fr] gap-2.5 overflow-y-auto pb-4">
            {doc.quadrants.map((q, qi) => quad(q, qi, false))}
          </div>
        )}
      </div>
    </div>
  );
}
