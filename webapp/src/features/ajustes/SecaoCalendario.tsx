// Calendário externo: importar (URL iCal) e exportar a agenda (.ics). A
// exportação é cópia de mão única, não sincronização.
import { useAppStore } from "../../store/useAppStore";
import { agendaIcs } from "../../lib/exportIcs";
import { downloadFile } from "../../lib/exportFile";
import { Botao } from "../../ui/Botao";
import { Legenda } from "../../ui/Legenda";
import { IcalCard } from "./IcalCard";
import { LinhaAjuste } from "./LinhaAjuste";
import { SecaoAjuste } from "./SecaoAjuste";

export function SecaoCalendario() {
  const routines = useAppStore((s) => s.routines);
  const compromissos = useAppStore((s) => s.compromissos);
  const showAlertBanner = useAppStore((s) => s.showAlertBanner);

  function exportar() {
    const ics = agendaIcs(routines, compromissos);
    if (!ics) {
      showAlertBanner("Nada agendado para exportar");
      return;
    }
    void downloadFile("rotinas-agenda.ics", ics, "text/calendar;charset=utf-8", "Dados").then((r) =>
      showAlertBanner(r.ok ? "Agenda exportada ✓" : "Não foi possível exportar a agenda")
    );
  }

  return (
    <SecaoAjuste titulo="Calendário externo">
      <div className="pt-2.5">
        <IcalCard />
        <LinhaAjuste className="mt-3.5" rotulo="Exportar agenda (.ics)">
          <Botao variante="pilula" onClick={exportar}>
            exportar
          </Botao>
        </LinhaAjuste>
        <Legenda className="mt-3">
          Rotinas com horário viram eventos recorrentes e compromissos avulsos viram eventos únicos — para abrir em
          outro calendário. É uma cópia, não uma sincronização: mudanças aqui não voltam para lá.
        </Legenda>
      </div>
    </SecaoAjuste>
  );
}
