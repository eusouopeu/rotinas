// Porta de renderScoreboardDoc (index.html:6856-6985) — grade única de
// jogadores × turnos. Difere do app antigo só na repintura: aqui o React já
// resolve "não perder o foco do input ao digitar um ponto" sozinho (o app
// antigo tinha atualizarTotais() à parte por causa do innerHTML manual).
import { useAppStore } from "../store/useAppStore";
import { GradePlacar } from "../features/modelos/GradePlacar";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Legenda } from "../ui/Legenda";
import { Toggle } from "../ui/Segmentado";
import { CabecalhoDoc } from "../features/modelos/CabecalhoDoc";
import { sbLideres, sbNome, sbTotais } from "../lib/scoreboard";
import type { ScoreboardDoc as ScoreboardDocType } from "../lib/types";
import { tela } from "../ui/Tela";

export function ScoreboardDoc({ doc }: { doc: ScoreboardDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);

  function save(patch: Partial<ScoreboardDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  const tot = sbTotais(doc);
  const lideres = sbLideres(doc);
  const n = doc.players.length;
  const resumo = `${doc.rounds.length} turno(s) · ${doc.players.length} jogador(es)${
    lideres.length
      ? ` · ${lideres.length > 1 ? "empate entre" : "liderando:"} ${lideres
          .map((id) =>
            sbNome(
              doc.players.find((p) => p.id === id)!,
              doc.players.findIndex((p) => p.id === id)
            )
          )
          .join(", ")} (${tot[lideres[0]]})`
      : ""
  }`;

  return (
    <div {...tela({})}>
      <CabecalhoDoc doc={doc} onTitleChange={(title) => save({ title })} />
      <div className="flex-1 overflow-y-auto pb-5">
        <div className="mt-0.5 mb-3 flex flex-wrap items-center justify-between gap-2.5">
          <BotaoIcone
            rotulo="Adicionar jogador"
            tamanho="sm"
            className="w-auto px-[11px] font-sans text-sm whitespace-nowrap"
            onClick={() => save({ players: [...doc.players, { id: uid(), name: "" }] })}
          >
            + jogador
          </BotaoIcone>
          <Toggle
            options={[
              { key: "maior", label: "maior vence" },
              { key: "menor", label: "menor vence" },
            ]}
            active={doc.higherWins !== false ? "maior" : "menor"}
            onSelect={(k) => save({ higherWins: k === "maior" })}
          />
        </div>

        {n === 0 ? (
          <EstadoVazio
            className="min-h-[25vh]"
            titulo="Sem jogadores"
            texto={
              <>
                Toque em <b>+ jogador</b> para montar o placar.
              </>
            }
          />
        ) : (
          <>
            <GradePlacar
              doc={doc}
              totais={tot}
              lideres={lideres}
              onRenomear={(id, name) => save({ players: doc.players.map((x) => (x.id === id ? { ...x, name } : x)) })}
              onRemoverJogador={(id, pi) => {
                if (!window.confirm(`Remover ${sbNome(doc.players[pi], pi)} e os pontos dele?`)) return;
                const players = doc.players.filter((x) => x.id !== id);
                const rounds = doc.rounds.map((r) => {
                  const scores = { ...r.scores };
                  delete scores[id];
                  return { ...r, scores };
                });
                save({ players, rounds });
              }}
              onPonto={(turnoId, jogadorId, bruto) => {
                const raw = bruto.trim();
                const rounds = doc.rounds.map((x) => {
                  if (x.id !== turnoId) return x;
                  const scores = { ...x.scores };
                  if (raw === "") delete scores[jogadorId];
                  else {
                    const v = parseFloat(raw.replace(",", "."));
                    if (!isNaN(v)) scores[jogadorId] = v;
                  }
                  return { ...x, scores };
                });
                save({ rounds });
              }}
              onRemoverTurno={(id) => save({ rounds: doc.rounds.filter((x) => x.id !== id) })}
            />
            <Botao className="mt-3 w-full" onClick={() => save({ rounds: [...doc.rounds, { id: uid(), scores: {} }] })}>
              + turno
            </Botao>
            <Legenda className="mt-2.5 text-center">{resumo}</Legenda>
          </>
        )}
      </div>
    </div>
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
