// Porta de renderProsConsDoc (index.html:9460-9519) —
// prós/contras com peso 1-5, placar é a soma dos pesos de cada lado.
import { useAppStore } from "../store/useAppStore";
import { BarraPdf } from "../features/modelos/BarraPdf";
import { CabecalhoDoc } from "../features/modelos/CabecalhoDoc";
import { ColunaArgumentos } from "../features/modelos/ColunaArgumentos";
import { Cartao } from "../ui/Cartao";
import { exportPdfView } from "../lib/exportFile";
import { prosConsPdfHtml } from "../lib/pdfExport";
import type { ProsConsDoc as ProsConsDocType } from "../lib/types";

type Key = "pros" | "cons";

export function ProsConsDoc({ doc }: { doc: ProsConsDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  function save(patch: Partial<ProsConsDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  const ps = doc.pros.reduce((a, i) => a + i.w, 0);
  const cs = doc.cons.reduce((a, i) => a + i.w, 0);
  const verdict =
    ps > cs ? (
      <b className="text-ok">prós vencem (+{ps - cs})</b>
    ) : cs > ps ? (
      <b>contras vencem (&minus;{cs - ps})</b>
    ) : (
      <b>empate</b>
    );

  function colunaProps(key: Key, label: string, tom: { texto: string; fundo: string }) {
    const items = doc[key];
    return {
      label,
      tom,
      items,
      onAdd: (text: string) => save({ [key]: [...items, { id: uid(), text, w: 3 }] } as Partial<ProsConsDocType>),
      onSetWeight: (id: string, w: number) =>
        save({ [key]: items.map((i) => (i.id === id ? { ...i, w } : i)) } as Partial<ProsConsDocType>),
      onDelete: (id: string) => save({ [key]: items.filter((i) => i.id !== id) } as Partial<ProsConsDocType>),
      onEditText: (id: string, text: string) =>
        save({ [key]: items.map((i) => (i.id === id ? { ...i, text } : i)) } as Partial<ProsConsDocType>),
    };
  }

  return (
    <div className="screen">
      <CabecalhoDoc doc={doc} onTitleChange={(title) => save({ title })} />
      <BarraPdf exportar={() => exportPdfView(doc.title, prosConsPdfHtml(doc), "Pros e Contras")} />
      <div className="flex-1 overflow-y-auto pb-5">
        <Cartao className="mb-3 text-center">
          <div className="font-sans text-[34px] font-medium text-caneta">
            {ps} &times; {cs}
          </div>
          <div>{verdict}</div>
        </Cartao>
        <ColunaArgumentos {...colunaProps("pros", "Prós", { texto: "text-ok", fundo: "bg-ok" })} />
        <ColunaArgumentos {...colunaProps("cons", "Contras", { texto: "text-erro", fundo: "bg-erro" })} />
      </div>
    </div>
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
