// Porta de renderThoughtRecordDoc (index.html:7002-7032) — RPD, formulário
// fixo de 5 campos. Sem autoGrowTextarea (a caixa cresce por CSS normal, não
// pelo truque de scrollHeight do app antigo).
import { useAppStore } from "../store/useAppStore";
import { CabecalhoDoc } from "../features/modelos/CabecalhoDoc";
import { AreaTexto } from "../ui/Campo";
import { RotuloSecao } from "../ui/RotuloSecao";
import { Selecao } from "../ui/Selecao";
import { COGNITIVE_DISTORTIONS } from "../lib/templates";
import type { ThoughtRecordDoc as ThoughtRecordDocType } from "../lib/types";
import { tela } from "../ui/Tela";

export function ThoughtRecordDoc({ doc }: { doc: ThoughtRecordDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  function save(patch: Partial<ThoughtRecordDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }
  const area = (campo: "trigger" | "emotions" | "altThoughts" | "results", linhas: number, dica: string) => (
    <AreaTexto
      rows={linhas}
      placeholder={dica}
      defaultValue={doc[campo]}
      onBlur={(e) => save({ [campo]: e.target.value })}
    />
  );

  return (
    <div {...tela({})}>
      <CabecalhoDoc doc={doc} onTitleChange={(title) => save({ title })} />
      <div className="flex-1 overflow-y-auto pb-5">
        <RotuloSecao className="mt-1.5">Gatilho</RotuloSecao>
        {area("trigger", 3, "O que aconteceu?")}
        <RotuloSecao>Emoções</RotuloSecao>
        {area("emotions", 2, "O que você sentiu, e com que intensidade?")}
        <RotuloSecao>Distorção cognitiva</RotuloSecao>
        <Selecao className="mb-2" defaultValue={doc.distortion} onChange={(e) => save({ distortion: e.target.value })}>
          <option value="">selecione...</option>
          {COGNITIVE_DISTORTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Selecao>
        <RotuloSecao>Pensamentos alternativos</RotuloSecao>
        {area("altThoughts", 3, "Existe uma forma mais equilibrada de ver isso?")}
        <RotuloSecao>Resultados</RotuloSecao>
        {area("results", 3, "Como você se sente agora?")}
      </div>
    </div>
  );
}
