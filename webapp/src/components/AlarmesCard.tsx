// Lista os alarmes agendados (rotina/compromisso/meta recorrente), agrupados
// por tipo — recomendação 3 de docs/react-migration.md: torna visível o que
// `syncNativeSchedules` está de fato agendando, incluindo a notificação de
// metas recorrentes ativa desde 05/09/2026 "sem validação de campo".
import { useMemo } from "react";
import { recorrentesAtuais, useAppStore } from "../store/useAppStore";
import { listaAlarmesAgendados, type AlarmeAgendado } from "../lib/notifications";

const TAG_LABEL: Record<AlarmeAgendado["tag"], string> = {
  rotina: "Rotina",
  compromisso: "Compromisso",
  "meta recorrente": "Meta recorrente",
};

export function AlarmesCard() {
  const routines = useAppStore((s) => s.routines);
  const compromissos = useAppStore((s) => s.compromissos);
  const templates = useAppStore((s) => s.templates);
  const recorrentes = useMemo(() => recorrentesAtuais(templates), [templates]);

  const alarmes = useMemo(
    () => listaAlarmesAgendados(routines, compromissos, recorrentes, Date.now()).sort((a, b) => a.ordinal - b.ordinal),
    [routines, compromissos, recorrentes],
  );

  if (alarmes.length === 0) {
    return <div className="routine-meta">Nenhum alarme agendado no momento.</div>;
  }

  return (
    <div style={{ maxHeight: 260, overflowY: "auto" }}>
      {alarmes.map((a, i) => (
        <div className="bar-row" style={{ padding: "5px 0" }} key={a.tag + i}>
          <div className="bar-name" style={{ width: "auto", flex: 1 }}>
            {a.titulo}
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              {TAG_LABEL[a.tag]} · {a.quando}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
