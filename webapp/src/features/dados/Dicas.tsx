// Dicas (recomendação 10): sugestões de ajuste a partir do histórico e das
// metas, iguais nas três visões — não dependem do período escolhido.
import type { HistoryEntry } from "../../lib/history";
import { gerarDicas } from "../../lib/stats";
import type { CountdownDoc, Routine, Snooze } from "../../lib/types";
import { CartaoSecao } from "./CartaoSecao";
import { LinhasTexto } from "./LinhasTexto";

export function Dicas({
  templates,
  routines,
  history,
  snoozes,
}: {
  templates: unknown[];
  routines: Routine[];
  history: HistoryEntry[];
  snoozes: Snooze[];
}) {
  const metas = (templates as Array<{ type?: string }>)
    .filter((t) => t.type === "countdown")
    .flatMap((d) => (d as CountdownDoc).targets || []);
  const dicas = gerarDicas(routines, history, snoozes, metas);
  if (!dicas.length) return null;
  return (
    <CartaoSecao titulo="Dicas" desc="Sugestões de ajuste tiradas do seu histórico recente e das metas.">
      <LinhasTexto textos={dicas} icone="infoCircle" />
    </CartaoSecao>
  );
}
