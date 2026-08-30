// Porta de renderScoreboardDoc (index.html:6856-6985) — grade única de
// jogadores × turnos. Difere do app antigo só na repintura: aqui o React já
// resolve "não perder o foco do input ao digitar um ponto" sozinho (o app
// antigo tinha atualizarTotais() à parte por causa do innerHTML manual).
import { Fragment } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { sbLideres, sbNome, sbTotais } from "../lib/scoreboard";
import type { ScoreboardDoc as ScoreboardDocType } from "../lib/types";

export function ScoreboardDoc({ doc }: { doc: ScoreboardDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);

  function save(patch: Partial<ScoreboardDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  const tot = sbTotais(doc);
  const lideres = sbLideres(doc);
  const n = doc.players.length;
  const densidade = n >= 6 ? "mini" : n >= 4 ? "compacto" : "";
  const resumo = `${doc.rounds.length} turno(s) · ${doc.players.length} jogador(es)${
    lideres.length
      ? ` · ${lideres.length > 1 ? "empate entre" : "liderando:"} ${lideres
          .map((id) => sbNome(doc.players.find((p) => p.id === id)!, doc.players.findIndex((p) => p.id === id)))
          .join(", ")} (${tot[lideres[0]]})`
      : ""
  }`;

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => save({ title })} />
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
        <div className="sb-toolbar">
          <button
            className="bell-btn di-hoje"
            onClick={() => save({ players: [...doc.players, { id: uid(), name: "" }] })}
          >
            + jogador
          </button>
          <div className="type-toggle">
            <span className={doc.higherWins !== false ? "active" : ""} onClick={() => save({ higherWins: true })}>
              maior vence
            </span>
            <span className={doc.higherWins === false ? "active" : ""} onClick={() => save({ higherWins: false })}>
              menor vence
            </span>
          </div>
        </div>

        {n === 0 ? (
          <div className="empty-state" style={{ minHeight: "25vh" }}>
            <h2>Sem jogadores</h2>
            <p>
              Toque em <b>+ jogador</b> para montar o placar.
            </p>
          </div>
        ) : (
          <>
            <div className="sb-scroll">
              <div
                className={"sb-grid " + densidade}
                style={{ gridTemplateColumns: `26px repeat(${n}, minmax(0, 1fr)) 26px` }}
              >
                <div className="sb-h sb-idx">#</div>
                {doc.players.map((p, pi) => (
                  <div className="sb-h" key={p.id}>
                    <input
                      type="text"
                      className="sb-name"
                      defaultValue={p.name}
                      placeholder={`J${pi + 1}`}
                      onBlur={(e) => {
                        if (e.target.value === p.name) return;
                        const players = doc.players.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x));
                        save({ players });
                      }}
                    />
                    {n > 1 && (
                      <button
                        className="del-exec sb-delp"
                        title="Remover jogador"
                        aria-label="Remover jogador"
                        onClick={() => {
                          if (!window.confirm(`Remover ${sbNome(p, pi)} e os pontos dele?`)) return;
                          const players = doc.players.filter((x) => x.id !== p.id);
                          const rounds = doc.rounds.map((r) => {
                            const scores = { ...r.scores };
                            delete scores[p.id];
                            return { ...r, scores };
                          });
                          save({ players, rounds });
                        }}
                      >
                        <Icon name="xmark" size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="sb-h" />
                <div className="sb-tot sb-idx">&Sigma;</div>
                {doc.players.map((p) => (
                  <div className={"sb-tot" + (lideres.includes(p.id) ? " lider" : "")} key={p.id}>
                    {tot[p.id]}
                  </div>
                ))}
                <div className="sb-tot" />
                {doc.rounds.map((r, ri) => (
                  <Fragment key={r.id}>
                    <div className="sb-c sb-idx" key={r.id + "-idx"}>
                      {ri + 1}
                    </div>
                    {doc.players.map((p) => (
                      <div className="sb-c" key={r.id + "-" + p.id}>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="sb-in"
                          defaultValue={r.scores[p.id] ?? ""}
                          placeholder="–"
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const rounds = doc.rounds.map((x) => {
                              if (x.id !== r.id) return x;
                              const scores = { ...x.scores };
                              if (raw === "") delete scores[p.id];
                              else {
                                const v = parseFloat(raw.replace(",", "."));
                                if (!isNaN(v)) scores[p.id] = v;
                              }
                              return { ...x, scores };
                            });
                            save({ rounds });
                          }}
                        />
                      </div>
                    ))}
                    <div className="sb-c" key={r.id + "-del"}>
                      <button
                        className="del-exec"
                        title="Remover turno"
                        aria-label="Remover turno"
                        onClick={() => save({ rounds: doc.rounds.filter((x) => x.id !== r.id) })}
                      >
                        <Icon name="xmark" size={14} />
                      </button>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => save({ rounds: [...doc.rounds, { id: uid(), scores: {} }] })}
            >
              + turno
            </button>
            <div className="dev-n" style={{ marginTop: 10, textAlign: "center" }}>
              {resumo}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
