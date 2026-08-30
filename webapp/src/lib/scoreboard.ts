// Porta de sbTotais/sbLideres/sbNome (index.html:6814-6834) — puro, sem DOM.
import type { ScoreboardDoc } from "./types";

export function sbTotais(doc: ScoreboardDoc): Record<string, number> {
  const tot: Record<string, number> = {};
  doc.players.forEach((p) => {
    tot[p.id] = 0;
  });
  doc.rounds.forEach((r) => {
    doc.players.forEach((p) => {
      const v = r.scores ? r.scores[p.id] : undefined;
      if (typeof v === "number") tot[p.id] += v;
    });
  });
  return tot;
}

/** Pode haver empate na liderança — devolve todos os ids no topo. */
export function sbLideres(doc: ScoreboardDoc): string[] {
  const tot = sbTotais(doc);
  const ids = Object.keys(tot);
  if (!ids.length || !doc.rounds.length) return [];
  const vals = ids.map((id) => tot[id]);
  const alvo = doc.higherWins === false ? Math.min(...vals) : Math.max(...vals);
  return ids.filter((id) => tot[id] === alvo);
}

export function sbNome(p: { name: string }, i: number): string {
  return (p.name || "").trim() || "Jogador " + (i + 1);
}
