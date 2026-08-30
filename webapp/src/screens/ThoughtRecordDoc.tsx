// Porta de renderThoughtRecordDoc (index.html:7002-7032) — RPD, formulário
// fixo de 5 campos. Sem autoGrowTextarea (a caixa cresce por CSS normal, não
// pelo truque de scrollHeight do app antigo).
import { useAppStore } from "../store/useAppStore";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { COGNITIVE_DISTORTIONS } from "../lib/templates";
import type { ThoughtRecordDoc as ThoughtRecordDocType } from "../lib/types";

export function ThoughtRecordDoc({ doc }: { doc: ThoughtRecordDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  function save(patch: Partial<ThoughtRecordDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => save({ title })} />
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
        <div className="section-label" style={{ marginTop: 6 }}>
          Gatilho
        </div>
        <textarea
          className="mk-e-name"
          rows={3}
          style={{ lineHeight: 1.5 }}
          placeholder="O que aconteceu?"
          defaultValue={doc.trigger}
          onBlur={(e) => save({ trigger: e.target.value })}
        />
        <div className="section-label">Emoções</div>
        <textarea
          className="mk-e-name"
          rows={2}
          style={{ lineHeight: 1.5 }}
          placeholder="O que você sentiu, e com que intensidade?"
          defaultValue={doc.emotions}
          onBlur={(e) => save({ emotions: e.target.value })}
        />
        <div className="section-label">Distorção cognitiva</div>
        <select
          className="routine-select"
          style={{ width: "100%", marginBottom: 8 }}
          defaultValue={doc.distortion}
          onChange={(e) => save({ distortion: e.target.value })}
        >
          <option value="">selecione...</option>
          {COGNITIVE_DISTORTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="section-label">Pensamentos alternativos</div>
        <textarea
          className="mk-e-name"
          rows={3}
          style={{ lineHeight: 1.5 }}
          placeholder="Existe uma forma mais equilibrada de ver isso?"
          defaultValue={doc.altThoughts}
          onBlur={(e) => save({ altThoughts: e.target.value })}
        />
        <div className="section-label">Resultados</div>
        <textarea
          className="mk-e-name"
          rows={3}
          style={{ lineHeight: 1.5 }}
          placeholder="Como você se sente agora?"
          defaultValue={doc.results}
          onBlur={(e) => save({ results: e.target.value })}
        />
      </div>
    </div>
  );
}
