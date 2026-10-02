// Mês atual por categoria (01/10/2026): gasto × orçamento (barra) e × média
// dos meses anteriores (seta). O orçamento é editado tocando no valor e mora
// no mapa do diário ("orcamento:<categoria>", lib/expense.ts).
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { brl, categoriasDoMes, chaveOrcamento, EXP_CATS, soDespesas } from "../../lib/expense";
import type { ExpenseDoc } from "../../lib/types";
import { cn } from "../../lib/cn";
import { Cartao } from "../../ui/Cartao";
import { CampoNumero } from "../../ui/CampoNumero";
import { Legenda } from "../../ui/Legenda";
import { TrilhoBarra } from "../../ui/LinhaBarra";
import { PontoCor } from "../../ui/PontoCor";
import { RotuloSecao } from "../../ui/RotuloSecao";

/** Diferença sobre a média: "▲ 23%" (vermelho, gastou mais) / "▼ 10%" (verde). */
function VsMedia({ atual, media }: { atual: number; media: number | null }) {
  if (media == null || media <= 0) return <Legenda className="text-2xs">sem média ainda</Legenda>;
  const pct = Math.round(((atual - media) / media) * 100);
  if (pct === 0) return <Legenda className="text-2xs">= média</Legenda>;
  return (
    <span
      className={cn("font-sans text-2xs tabular-nums", pct > 0 ? "text-erro" : "text-ok")}
      title={`média dos meses anteriores: ${brl(media)}`}
    >
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs média
    </span>
  );
}

/** Usa TODAS as despesas, não a lista filtrada da tela: orçamento e média
 *  não mudam com a busca. */
export function OrcamentoCategorias() {
  const templates = useAppStore((s) => s.templates);
  const docs = soDespesas(templates.filter((t): t is ExpenseDoc => t.type === "expense"));
  const diario = useAppStore((s) => s.diario);
  const setDiarioTexto = useAppStore((s) => s.setDiarioTexto);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  const linhas = categoriasDoMes(docs, diario);
  // categorias padrão sem gasto nem orçamento ainda podem ganhar limite
  const semLinha = EXP_CATS.filter((c) => !linhas.some((l) => l.cat === c));

  function abrir(cat: string, atual: number | null) {
    setEditando(cat);
    setRascunho(atual ? String(atual) : "");
  }
  function gravar() {
    if (editando == null) return;
    const v = Math.max(0, parseFloat(rascunho.replace(",", ".")) || 0);
    setDiarioTexto(chaveOrcamento(editando), v > 0 ? String(v) : "");
    setEditando(null);
  }

  return (
    <>
      <RotuloSecao>Mês atual por categoria</RotuloSecao>
      <Cartao className="mb-1.5">
        {linhas.map((l) => {
          const pct = l.orcamento ? Math.min(100, (l.atual / l.orcamento) * 100) : 0;
          const estourou = l.orcamento != null && l.atual > l.orcamento;
          return (
            <div key={l.cat} className="my-2.5" data-orcamento={l.cat}>
              <div className="flex items-baseline gap-2">
                <PontoCor cor={l.color} className="mr-0 flex-none self-center" />
                <span className="min-w-0 flex-1 truncate text-base">{l.cat}</span>
                <span className="font-sans text-sm tabular-nums">{brl(l.atual)}</span>
                {editando === l.cat ? (
                  <CampoNumero
                    autoFocus
                    min={0}
                    step="10"
                    inputMode="decimal"
                    aria-label={`Orçamento de ${l.cat}`}
                    className="w-[70px] text-right"
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onBlur={gravar}
                    onKeyDown={(e) => e.key === "Enter" && gravar()}
                  />
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "border-0 bg-transparent p-0 font-sans text-sm tabular-nums",
                      l.orcamento ? (estourou ? "text-erro" : "text-sub") : "text-caneta"
                    )}
                    title="Orçamento do mês (tocar para mudar)"
                    onClick={() => abrir(l.cat, l.orcamento)}
                  >
                    {l.orcamento ? `/ ${brl(l.orcamento)}` : "+ limite"}
                  </button>
                )}
              </div>
              {l.orcamento != null && (
                <TrilhoBarra className="mt-1" pct={Math.max(2, pct)} cor={estourou ? "var(--erro)" : undefined} />
              )}
              <div className="mt-0.5 pl-[18px]">
                <VsMedia atual={l.atual} media={l.media} />
              </div>
            </div>
          );
        })}
        {semLinha.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Legenda className="text-2xs">limite para:</Legenda>
            {semLinha.map((c) =>
              editando === c ? (
                <CampoNumero
                  key={c}
                  autoFocus
                  min={0}
                  inputMode="decimal"
                  aria-label={`Orçamento de ${c}`}
                  className="w-[70px]"
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  onBlur={gravar}
                  onKeyDown={(e) => e.key === "Enter" && gravar()}
                />
              ) : (
                <button
                  key={c}
                  type="button"
                  className="rounded-full border-0 bg-card px-2 py-0.5 font-sans text-2xs text-sub"
                  onClick={() => abrir(c, null)}
                >
                  {c}
                </button>
              )
            )}
          </div>
        )}
      </Cartao>
    </>
  );
}
