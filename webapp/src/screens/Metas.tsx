// Porta parcial de renderMetas (index.html:8391-8875) — só "Prazos": lista,
// criar/editar/excluir, progresso (done/topics) com pontuação de verdade
// (lib/metas.ts, mesma fórmula proporcional item-a-item do app antigo).
// Fica para depois: Recorrentes (sub-sistema à parte, com penalidade se
// "negativa"), sub-metas (parentId/bloqueio), áreas da roda da vida, filtro
// "só hoje", exportar PDF, e a anotação em markdown renderizado (aqui é
// textarea simples — o editor live ainda não existe no React).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { daysUntil, metaConcluida, metaCreditado, metaEscopo, metaPontosTotais } from "../lib/metas";
import type { CountdownDoc, MetaTarget, Tag } from "../lib/types";

const ESCOPO_LABEL = { mensal: "mensal", trimestral: "trimestral", anual: "anual" };
const TAGS: Tag[] = ["nenhum", "baixo", "medio", "alto"];
const TAG_LABEL: Record<Tag, string> = { nenhum: "Nenhum", baixo: "Baixo", medio: "Médio", alto: "Alto" };

export function Metas() {
  const templates = useAppStore((s) => s.templates);
  const gam = useAppStore((s) => s.gam);
  const addMeta = useAppStore((s) => s.addMeta);
  const updateMeta = useAppStore((s) => s.updateMeta);
  const setMetaDone = useAppStore((s) => s.setMetaDone);
  const deleteMeta = useAppStore((s) => s.deleteMeta);
  const [criando, setCriando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaData, setNovaData] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const doc = templates.find((t): t is CountdownDoc => t.type === "countdown");
  const metas = [...(doc?.targets ?? [])].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  function confirmarCriacao() {
    if (!novoTitulo.trim() || !novaData) return;
    addMeta(novoTitulo, novaData);
    setNovoTitulo("");
    setNovaData("");
    setCriando(false);
  }

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }}>
          <h1>Metas</h1>
        </div>

        {metas.length === 0 ? (
          <div className="empty-state">
            <h2>Nenhuma meta ainda</h2>
            <p>Defina um título e um prazo — o boletim credita pontos conforme o progresso.</p>
            <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setCriando(true)}>
              + Nova meta
            </button>
          </div>
        ) : (
          metas.map((t) => (
            <MetaCard
              key={t.id}
              t={t}
              gam={gam}
              editando={editandoId === t.id}
              onEditar={() => setEditandoId(editandoId === t.id ? null : t.id)}
              onSalvarEdicao={(patch) => {
                updateMeta(t.id, patch);
                setEditandoId(null);
              }}
              onDone={(d) => setMetaDone(t.id, d)}
              onExcluir={() => {
                if (window.confirm(`Remover a meta "${t.title}"?`)) deleteMeta(t.id);
              }}
              onNota={(nota) => updateMeta(t.id, { nota })}
            />
          ))
        )}
      </div>

      {criando && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setCriando(false)}>
          <div className="confirm-box" style={{ textAlign: "left" }}>
            <p style={{ margin: "0 0 10px" }}>Nova meta</p>
            <input
              className="note-title-input"
              style={{ width: "100%", marginBottom: 8 }}
              autoFocus
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Título"
            />
            <input
              type="date"
              style={{ width: "100%" }}
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
            />
            <div className="confirm-actions" style={{ marginTop: 10 }}>
              <button className="btn-cancel" onClick={() => setCriando(false)}>
                Cancelar
              </button>
              <button className="btn-confirm" onClick={confirmarCriacao}>
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="fab" title="Novo" onClick={() => setCriando(true)}>
        +
      </button>
      <Tabbar />
    </div>
  );
}

function MetaCard({
  t,
  gam,
  editando,
  onEditar,
  onSalvarEdicao,
  onDone,
  onExcluir,
  onNota,
}: {
  t: MetaTarget;
  gam: Parameters<typeof metaPontosTotais>[1];
  editando: boolean;
  onEditar: () => void;
  onSalvarEdicao: (patch: Partial<MetaTarget>) => void;
  onDone: (d: number) => void;
  onExcluir: () => void;
  onNota: (nota: string) => void;
}) {
  const [tituloEd, setTituloEd] = useState(t.title);
  const [dataEd, setDataEd] = useState(t.date);
  const [tagEd, setTagEd] = useState<Tag>(t.tagValor || "alto");
  const [topicsEd, setTopicsEd] = useState(t.topics ?? 0);

  const d = daysUntil(t.date);
  const esc = metaEscopo(t);
  const feita = metaConcluida(t);
  const donePct = t.topics ? Math.min(100, ((t.done || 0) / t.topics) * 100) : 0;
  const totalPts = metaPontosTotais(t, gam);
  const creditadoPts = metaCreditado(t);

  return (
    <div className="stat-card" style={{ marginBottom: 10, borderColor: feita ? "var(--ok)" : undefined }}>
      {editando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="note-title-input" value={tituloEd} onChange={(e) => setTituloEd(e.target.value)} />
          <input type="date" value={dataEd} onChange={(e) => setDataEd(e.target.value)} />
          <div className="type-toggle">
            {TAGS.map((tag) => (
              <span key={tag} className={tagEd === tag ? "active" : ""} onClick={() => setTagEd(tag)}>
                {TAG_LABEL[tag]}
              </span>
            ))}
          </div>
          <div className="sched-time-row" style={{ marginTop: 0 }}>
            <span style={{ flex: 1 }}>Total de itens (progresso)</span>
            <input
              className="dur-input"
              type="number"
              min={0}
              value={topicsEd}
              onChange={(e) => setTopicsEd(Math.max(0, +e.target.value || 0))}
            />
          </div>
          <div className="confirm-actions">
            <button className="btn-cancel" onClick={onEditar}>
              Cancelar
            </button>
            <button
              className="btn-confirm"
              onClick={() =>
                onSalvarEdicao({ title: tituloEd.trim() || t.title, date: dataEd, tagValor: tagEd, topics: topicsEd || null })
              }
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dev-row" style={{ border: "none", padding: 0 }}>
            <span style={{ fontFamily: "'Lato',sans-serif", fontSize: 17, flex: 1 }}>{t.title}</span>
            <button className="icon-btn borderless" title="Editar meta" aria-label="Editar meta" onClick={onEditar}>
              <Icon name="notes" size={14} />
            </button>
            <button className="icon-btn borderless" title="Excluir meta" aria-label="Excluir meta" onClick={onExcluir}>
              <Icon name="trash" size={14} />
            </button>
          </div>
          <div className="dev-n" style={{ marginTop: 4 }}>
            {t.date.split("-").reverse().join("/")} ·{" "}
            <b style={{ color: d < 0 ? "var(--erro)" : d <= 7 ? "var(--caneta)" : "var(--ok)" }}>
              {d >= 0 ? `${d} dia(s)` : `atrasada ${Math.abs(d)}d`}
            </b>{" "}
            · {ESCOPO_LABEL[esc]} · peso {TAG_LABEL[t.tagValor || "alto"].toLowerCase()}
          </div>
          {t.topics != null && (
            <>
              <div className="bar-row" style={{ marginTop: 8 }}>
                <div className="bar-track goal-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(3, donePct)}%`, background: feita ? "var(--ok)" : "var(--caneta)" }}
                  />
                </div>
                <div className="bar-val" style={{ width: "auto", whiteSpace: "nowrap", flex: "0 0 auto" }}>
                  {creditadoPts.toFixed(1)}/{totalPts.toFixed(1)} pts
                </div>
              </div>
              <div className="cd-topics" style={{ marginTop: 8 }}>
                <button
                  className="ctrl-btn"
                  style={{ width: 36, height: 36, fontSize: 15 }}
                  onClick={() => onDone(Math.max(0, (t.done || 0) - 1))}
                  title="Menos um"
                  aria-label="Menos um"
                >
                  &minus;
                </button>
                <span>
                  {t.done || 0} / {t.topics}
                </span>
                <button
                  className={"ctrl-btn" + (feita ? "" : " ok")}
                  style={{ width: 36, height: 36, fontSize: 15 }}
                  onClick={() => onDone((t.done || 0) + 1)}
                  title="Mais um"
                  aria-label="Mais um"
                >
                  +
                </button>
              </div>
            </>
          )}
          <textarea
            className="mk-e-name"
            placeholder="+ anotação"
            defaultValue={t.nota || ""}
            rows={t.nota ? 3 : 1}
            style={{ width: "100%", marginTop: 10, resize: "vertical" }}
            onBlur={(e) => {
              if (e.target.value !== (t.nota || "")) onNota(e.target.value);
            }}
          />
        </>
      )}
    </div>
  );
}
