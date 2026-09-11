// Porta de renderMetas (index.html:8391-8875) — Prazos (metas com data-limite)
// e Recorrentes (hábitos N vezes ao dia/na semana, com penalidade se
// negativa e opt-in de pontos).
// Sub-metas aninhadas, filtro multiselect por área e anotação live Markdown
// permanecem para etapas seguintes.
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { RodaVidaResumo } from "../components/RodaVidaResumo";
import { exportPdfView } from "../lib/exportFile";
import { metasPdfHtml } from "../lib/pdfExport";
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import {
  daysUntil,
  metaConcluida,
  metaCreditado,
  metaAreaInfo,
  metaAreasPool,
  metaDiasLabel,
  metaEscopo,
  metaPontosTotais,
  metaRecCompleta,
  metaRecExcedida,
  metaRecExcesso,
  metaRecFeitas,
} from "../lib/metas";
import { fatorParaArea } from "../lib/gamificacao";
import { DIAS_ABREV } from "../lib/constants";
import { metaRecPenalidadeUnidade, metaRecPontosUnidade } from "../lib/scoring";
import type { CountdownDoc, GamificacaoState, MetaRecorrente, MetaTarget, Tag } from "../lib/types";

const ESCOPO_LABEL = { mensal: "mensal", trimestral: "trimestral", anual: "anual" };
const TAGS: Tag[] = ["nenhum", "baixo", "medio", "alto"];
const TAG_LABEL: Record<Tag, string> = { nenhum: "Nenhum", baixo: "Baixo", medio: "Médio", alto: "Alto" };

export function Metas() {
  const templates = useAppStore((s) => s.templates);
  const gam = useAppStore((s) => s.gam);
  const metasSubview = useAppStore((s) => s.metasSubview);
  const toggleMetasSubviewState = useAppStore((s) => s.toggleMetasSubviewState);

  const addMeta = useAppStore((s) => s.addMeta);
  const updateMeta = useAppStore((s) => s.updateMeta);
  const setMetaDone = useAppStore((s) => s.setMetaDone);
  const deleteMeta = useAppStore((s) => s.deleteMeta);

  const addMetaRec = useAppStore((s) => s.addMetaRec);
  const updateMetaRec = useAppStore((s) => s.updateMetaRec);
  const ajustarMetaRec = useAppStore((s) => s.ajustarMetaRec);
  const duplicarMetaRec = useAppStore((s) => s.duplicarMetaRec);
  const deleteMetaRec = useAppStore((s) => s.deleteMetaRec);
  const reorderMetaRec = useAppStore((s) => s.reorderMetaRec);

  const [criandoPrazo, setCriandoPrazo] = useState(false);
  const [editandoPrazo, setEditandoPrazo] = useState<MetaTarget | null>(null);

  const [criandoRec, setCriandoRec] = useState(false);
  const [editandoRec, setEditandoRec] = useState<MetaRecorrente | null>(null);
  const [escolhendoTipo, setEscolhendoTipo] = useState(false);

  const [erro, setErro] = useState("");

  const mostraPrazos = metasSubview.includes("prazos");
  const mostraRecorrentes = metasSubview.includes("recorrentes");
  const ambos = mostraPrazos && mostraRecorrentes;

  const doc = templates.find((t): t is CountdownDoc => t.type === "countdown");
  const metas = [...(doc?.targets ?? [])].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const recorrentes = doc?.recorrentes ?? [];

  const recRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { dragFrom, dragHandleProps } = useDragReorder((from, to) => {
    reorderMetaRec(from.index, to.index);
  });

  function handleFabClick() {
    if (ambos) {
      setEscolhendoTipo(true);
    } else if (mostraRecorrentes) {
      setCriandoRec(true);
    } else {
      setCriandoPrazo(true);
    }
  }

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }}>
          <h1>Metas</h1>
          {mostraPrazos && doc && metas.length > 0 && (
            <div className="header-right">
              <button
                className="icon-btn"
                title="Exportar PDF"
                aria-label="Exportar PDF"
                onClick={async () => {
                  setErro("");
                  const r = await exportPdfView("Metas", metasPdfHtml(doc), "Metas");
                  if (!r.ok && r.erro) setErro(r.erro);
                }}
              >
                PDF
              </button>
            </div>
          )}
        </div>

        {erro && (
          <div className="stat-foot" style={{ color: "var(--erro)", marginBottom: 8 }}>
            {erro}
          </div>
        )}

        <RodaVidaResumo />

        <div className="area-chips area-filter-row" style={{ marginBottom: 14 }}>
          <span
            className={`area-chip ${mostraRecorrentes ? "sel" : ""}`}
            style={{ "--chip": "var(--caneta)" } as React.CSSProperties}
            onClick={() => toggleMetasSubviewState("recorrentes")}
          >
            Recorrentes
          </span>
          <span
            className={`area-chip ${mostraPrazos ? "sel" : ""}`}
            style={{ "--chip": "var(--caneta)" } as React.CSSProperties}
            onClick={() => toggleMetasSubviewState("prazos")}
          >
            Prazos
          </span>
        </div>

        {mostraRecorrentes && (
          <div style={{ marginBottom: ambos ? 20 : 10 }}>
            {ambos && <div className="section-label" style={{ margin: "4px 0 10px" }}>Recorrentes</div>}
            {recorrentes.length === 0 ? (
              <div className="empty-state" style={{ minHeight: "20vh", marginBottom: 10 }}>
                <h2>Nenhuma meta recorrente</h2>
                <p>Acompanhe hábitos que repetem ao dia ou na semana com metas positivas ou limites.</p>
                <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => setCriandoRec(true)}>
                  + Nova meta recorrente
                </button>
              </div>
            ) : (
              recorrentes.map((rec, i) => (
                <RecCard
                  key={rec.id}
                  rec={rec}
                  index={i}
                  gam={gam}
                  isDragging={dragFrom?.index === i}
                  setRef={(el) => {
                    recRefs.current[i] = el;
                  }}
                  dragHandleProps={dragHandleProps({ container: 0, index: i }, (_x, y) => ({
                    container: 0,
                    index: computeStepDragTarget(
                      recRefs.current.filter(Boolean).map((el) => el!.getBoundingClientRect()),
                      i,
                      y
                    ),
                  }))}
                  onAjustar={(delta) => ajustarMetaRec(rec.id, delta)}
                  onEditar={() => setEditandoRec(rec)}
                  onDuplicar={() => duplicarMetaRec(rec.id)}
                  onExcluir={() => {
                    if (window.confirm(`Remover a meta recorrente "${rec.titulo}"?`)) {
                      deleteMetaRec(rec.id);
                    }
                  }}
                />
              ))
            )}
          </div>
        )}

        {mostraPrazos && (
          <div>
            {ambos && <div className="section-label" style={{ margin: "4px 0 10px" }}>Prazos</div>}
            {metas.length === 0 ? (
              <div className="empty-state" style={{ minHeight: "20vh" }}>
                <h2>Nenhuma meta com prazo</h2>
                <p>Defina um título e um prazo — o boletim credita pontos conforme o progresso.</p>
                <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => setCriandoPrazo(true)}>
                  + Nova meta
                </button>
              </div>
            ) : (
              metas.map((t) => (
                <MetaCard
                  key={t.id}
                  t={t}
                  gam={gam}
                  onEditar={() => setEditandoPrazo(t)}
                  onDone={(d) => setMetaDone(t.id, d)}
                  onExcluir={() => {
                    if (window.confirm(`Remover a meta "${t.title}"?`)) deleteMeta(t.id);
                  }}
                  onNota={(nota) => updateMeta(t.id, { nota })}
                />
              ))
            )}
          </div>
        )}
      </div>

      {escolhendoTipo && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setEscolhendoTipo(false)}>
          <div className="confirm-box" style={{ textAlign: "left", maxWidth: 360 }}>
            <p style={{ margin: "0 0 14px", fontWeight: 600 }}>Criar novo</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn-primary"
                style={{ textAlign: "left", padding: "12px 16px" }}
                onClick={() => {
                  setEscolhendoTipo(false);
                  setCriandoRec(true);
                }}
              >
                <b>Meta recorrente</b>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Hábito ou limite que repete no dia/semana</div>
              </button>
              <button
                className="btn-primary"
                style={{ textAlign: "left", padding: "12px 16px" }}
                onClick={() => {
                  setEscolhendoTipo(false);
                  setCriandoPrazo(true);
                }}
              >
                <b>Meta com prazo</b>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Alvo com data de vencimento e tópicos</div>
              </button>
              <button className="btn-cancel" style={{ marginTop: 4 }} onClick={() => setEscolhendoTipo(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {(criandoPrazo || editandoPrazo) && (
        <MetaPrazoForm
          meta={editandoPrazo}
          doc={doc ?? null}
          gam={gam}
          onClose={() => {
            setCriandoPrazo(false);
            setEditandoPrazo(null);
          }}
          onSalvar={(dados) => {
            if (editandoPrazo) updateMeta(editandoPrazo.id, dados);
            else addMeta(dados);
            setCriandoPrazo(false);
            setEditandoPrazo(null);
          }}
        />
      )}

      {(criandoRec || editandoRec) && (
        <MetaRecForm
          rec={editandoRec}
          gam={gam}
          onClose={() => {
            setCriandoRec(false);
            setEditandoRec(null);
          }}
          onSave={(dados) => {
            if (editandoRec) {
              updateMetaRec(editandoRec.id, dados);
            } else {
              addMetaRec(dados);
            }
            setCriandoRec(false);
            setEditandoRec(null);
          }}
        />
      )}

      <button className="fab" title="Novo" onClick={handleFabClick}>
        +
      </button>
      <Tabbar />
    </div>
  );
}

function RecCard({
  rec,
  gam,
  isDragging,
  setRef,
  dragHandleProps,
  onAjustar,
  onEditar,
  onDuplicar,
  onExcluir,
}: {
  rec: MetaRecorrente;
  index: number;
  gam: GamificacaoState;
  isDragging: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  dragHandleProps: Record<string, unknown>;
  onAjustar: (delta: number) => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
}) {
  const feitas = metaRecFeitas(rec);
  const completa = rec.negativa ? !metaRecExcedida(rec) : metaRecCompleta(rec);
  const excesso = rec.negativa ? metaRecExcesso(rec) : 0;

  const freqTxt = `${rec.negativa ? "até " : ""}${rec.vezes}× ${rec.tipo === "semanal" ? "na semana" : "ao dia"}${
    rec.notif ? ` · lembretes ${rec.notif.inicio}–${rec.notif.fim}` : ""
  }`;

  const areaObj = rec.area ? gam.config.roda.areas.find((a) => a.id === rec.area) : null;
  const linhaMeta = areaObj ? `${areaObj.label} | ${freqTxt}` : freqTxt;

  const fator = fatorParaArea(
    rec.area || "",
    gam.semanaAtual?.fatoresArea || {},
    gam.semanaAtual?.fatorNormalizacao || 1
  );

  let statusTxt = "";
  let statusColor = "var(--ok)";
  if (rec.negativa) {
    if (excesso > 0) {
      const penUnidade = -metaRecPenalidadeUnidade(rec, gam.config);
      const penalidade = excesso * penUnidade * fator;
      statusTxt = `excedeu em ${excesso} · -${penalidade.toFixed(1)} pts`;
      statusColor = "var(--erro)";
    } else {
      statusTxt = "dentro do limite";
      statusColor = "var(--ok)";
    }
  } else if (rec.pontua) {
    const ptsUnidade = metaRecPontosUnidade(rec, gam.config);
    const ganhos = feitas * ptsUnidade * fator;
    statusTxt = `+${ganhos.toFixed(1)} pts${completa ? " · concluída ✓" : ""}`;
    statusColor = "var(--ok)";
  } else if (completa) {
    statusTxt = "concluída ✓";
    statusColor = "var(--ok)";
  }

  const borderColor = rec.negativa
    ? excesso > 0
      ? "var(--erro)"
      : "var(--ok)"
    : completa
    ? "var(--ok)"
    : undefined;

  return (
    <div
      ref={setRef}
      className={`stat-card rec-card ${isDragging ? "dragging" : ""}`}
      style={{ marginBottom: 10, borderColor }}
    >
      <span
        className="rec-drag drag-handle"
        title="Arrastar para reordenar"
        aria-label="Arrastar para reordenar"
        {...dragHandleProps}
      >
        <Icon name="bars3" size={15} />
      </span>

      <div className="rec-card-body">
        <div className="dev-row" style={{ border: "none", padding: 0 }}>
          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: 17, flex: 1 }}>
            {rec.titulo}
            {rec.negativa ? <span className="dev-n"> (limite)</span> : null}
          </span>
        </div>
        <div className="dev-n" style={{ marginTop: 2 }}>
          {linhaMeta}
        </div>
        <div className="cd-topics" style={{ marginTop: 6 }}>
          <button
            className="ctrl-btn"
            style={{ width: 36, height: 36, fontSize: 15 }}
            onClick={() => onAjustar(-1)}
            title="Menos um"
            aria-label="Menos um"
          >
            &minus;
          </button>
          <span style={{ fontWeight: 600 }}>
            {feitas} / {rec.vezes}
          </span>
          <button
            className={"ctrl-btn" + (rec.negativa ? (excesso > 0 ? "" : " ok") : completa ? " ok" : "")}
            style={{ width: 36, height: 36, fontSize: 15 }}
            onClick={() => onAjustar(1)}
            title="Mais um"
            aria-label="Mais um"
          >
            +
          </button>
        </div>
        {statusTxt && (
          <div className="dev-n" style={{ marginTop: 4, color: statusColor }}>
            {statusTxt}
          </div>
        )}
      </div>

      <div className="rec-actions">
        <button className="icon-btn" onClick={onEditar} title="Editar" aria-label="Editar">
          <Icon name="notes" size={14} />
        </button>
        <button className="icon-btn" onClick={onDuplicar} title="Duplicar" aria-label="Duplicar">
          <Icon name="clipboard" size={14} />
        </button>
        <button
          className="icon-btn"
          onClick={onExcluir}
          title="Remover"
          aria-label="Remover"
          style={{ color: "var(--erro)" }}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
}

function MetaRecForm({
  rec,
  gam,
  onClose,
  onSave,
}: {
  rec: MetaRecorrente | null;
  gam: GamificacaoState;
  onClose: () => void;
  onSave: (dados: Omit<MetaRecorrente, "id" | "criadoEm" | "progresso">) => void;
}) {
  const [titulo, setTitulo] = useState(rec?.titulo ?? "");
  const [tipo, setTipo] = useState<"diaria" | "semanal">(rec?.tipo ?? "diaria");
  const [negativa, setNegativa] = useState(rec?.negativa ?? false);
  const [vezes, setVezes] = useState(rec?.vezes ?? 4);
  const [pontua, setPontua] = useState(rec?.pontua ?? false);
  const [tagValor, setTagValor] = useState<Tag>(rec?.tagValor ?? "medio");
  const [area, setArea] = useState<string | null>(rec?.area ?? null);
  const [notifIni, setNotifIni] = useState(rec?.notif?.inicio ?? "");
  const [notifFim, setNotifFim] = useState(rec?.notif?.fim ?? "");

  function handleSave() {
    const t = titulo.trim();
    if (!t) return;
    const notif =
      tipo === "diaria" && notifIni && notifFim ? { inicio: notifIni, fim: notifFim } : null;
    onSave({
      titulo: t,
      tipo,
      vezes: Math.max(1, vezes || 1),
      area,
      notif,
      negativa,
      pontua,
      tagValor,
    });
  }

  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="confirm-box meta-form"
        style={{ textAlign: "left", maxHeight: "86vh", overflowY: "auto" }}
      >
        <p className="mf-title">{rec ? "Editar meta" : "Nova meta"}</p>

        <div className="mf-row" style={{ marginTop: 0 }}>
          <input
            type="text"
            className="mf-grow"
            placeholder="Meta (ex.: Beber água)"
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <button
            type="button"
            className={"mf-toggle-btn" + (negativa ? " on" : "")}
            title="Meta negativa (limite de vezes)"
            aria-label="Meta negativa"
            aria-pressed={negativa}
            onClick={() => {
              const v = !negativa;
              setNegativa(v);
              if (v) setPontua(false);
            }}
          >
            <Icon name="minusCircle" size={17} />
          </button>
          <button
            type="button"
            className={"mf-toggle-btn" + (!negativa && pontua ? " on" : "")}
            title="Pontua no boletim"
            aria-label="Pontua no boletim"
            aria-pressed={!negativa && pontua}
            disabled={negativa}
            onClick={() => setPontua(!pontua)}
          >
            <Icon name="check" size={17} />
          </button>
        </div>

        <div className="mf-row">
          <div className="mf-cell">
            <span className="mf-ico" title="Frequência">
              <Icon name="clock" size={17} />
            </span>
            <div className="type-toggle">
              <span className={tipo === "diaria" ? "active" : ""} onClick={() => setTipo("diaria")}>
                diária
              </span>
              <span className={tipo === "semanal" ? "active" : ""} onClick={() => setTipo("semanal")}>
                semanal
              </span>
            </div>
          </div>
          <div className="mf-cell" style={{ flex: "0 1 auto" }}>
            <span className="mf-ico" title={negativa ? "Peso da penalidade" : "Peso no boletim"}>
              <Icon name="tag" size={17} />
            </span>
            <div className="type-toggle">
              {TAGS.map((t, i) => (
                <span
                  key={t}
                  className={tagValor === t ? "active" : ""}
                  title={TAG_LABEL[t]}
                  onClick={() => setTagValor(t)}
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mf-row">
          <div className="mf-cell" style={{ flex: "0 0 auto" }}>
            <span className="mf-ico" title={negativa ? "Limite de vezes" : "Quantas vezes"}>
              <Icon name="hashtag" size={17} />
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              placeholder="ex.: 4"
              aria-label={negativa ? "Limite de vezes" : "Quantas vezes"}
              style={{ width: 84 }}
              value={vezes}
              onChange={(e) => setVezes(Math.max(1, +e.target.value || 1))}
            />
          </div>
          <div className="mf-cell">
            <span className="mf-ico" title="Lembretes (só quando é diária)">
              <Icon name="bell" size={17} />
            </span>
            <input
              type="time"
              aria-label="Lembrar a partir de"
              disabled={tipo !== "diaria"}
              value={notifIni}
              onChange={(e) => setNotifIni(e.target.value)}
            />
            <span className="mf-sep">até</span>
            <input
              type="time"
              aria-label="Lembrar até"
              disabled={tipo !== "diaria"}
              value={notifFim}
              onChange={(e) => setNotifFim(e.target.value)}
            />
          </div>
        </div>

        {gam.config.roda.ativa && gam.config.roda.areas.length > 0 && (
          <div className="mf-row">
            <div className="mf-cell">
              <span className="mf-ico" title="Área">
                <Icon name="briefcase" size={17} />
              </span>
              <div className="area-chips mf-areas mf-grow">
                <span className={`area-chip ${!area ? "sel" : ""}`} onClick={() => setArea(null)}>
                  Sem área
                </span>
                {gam.config.roda.areas.map((a) => (
                  <span
                    key={a.id}
                    className={`area-chip ${area === a.id ? "sel" : ""}`}
                    style={{ "--chip": a.color } as React.CSSProperties}
                    onClick={() => setArea(a.id)}
                  >
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {negativa && (
          <div className="dev-n" style={{ marginTop: 10 }}>
            Marque cada vez que acontecer. Passar do limite desconta do boletim.
          </div>
        )}

        <div className="confirm-actions" style={{ marginTop: 18 }}>
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-confirm"
            style={{ background: "var(--caneta)" }}
            onClick={handleSave}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaCard({
  t,
  gam,
  onEditar,
  onDone,
  onExcluir,
  onNota,
}: {
  t: MetaTarget;
  gam: Parameters<typeof metaPontosTotais>[1];
  onEditar: () => void;
  onDone: (d: number) => void;
  onExcluir: () => void;
  onNota: (nota: string) => void;
}) {
  const d = daysUntil(t.date);
  const esc = metaEscopo(t);
  const feita = metaConcluida(t);
  const donePct = t.topics ? Math.min(100, ((t.done || 0) / t.topics) * 100) : 0;
  const totalPts = metaPontosTotais(t, gam);
  const creditadoPts = metaCreditado(t);
  const diasLabel = metaDiasLabel(t, DIAS_ABREV);

  return (
    <div className="stat-card" style={{ marginBottom: 10, borderColor: feita ? "var(--ok)" : undefined }}>
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
            {diasLabel ? ` · ${diasLabel}` : ""}
          </div>
          {(t.areas || []).length > 0 && (
            <div className="area-chips" style={{ marginTop: 6 }}>
              {(t.areas || []).map((a) => {
                const info = metaAreaInfo(a, gam.config.roda.areas);
                return (
                  <span key={a} className="area-chip sel" style={{ "--chip": info.color } as React.CSSProperties}>
                    {info.label}
                  </span>
                );
              })}
            </div>
          )}
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
    </div>
  );
}


/* Porta de abrirFormMeta (index.html:8175-8265) — formulário completo da meta
   com prazo: título, prazo, quantidade + unidade ("quantos itens e de quê"),
   áreas (texto livre, os eixos da roda entram como sugestão), dias para
   trabalhar e peso no boletim, com o aviso de escopo/pontos ao vivo. Serve a
   criação e a edição: antes a criação só pedia título e prazo e a edição
   inline não tinha quantidade/unidade, áreas nem dias. */
function MetaPrazoForm({
  meta,
  doc,
  gam,
  onClose,
  onSalvar,
}: {
  meta: MetaTarget | null;
  doc: CountdownDoc | null;
  gam: GamificacaoState;
  onClose: () => void;
  onSalvar: (dados: Partial<MetaTarget> & { title: string; date: string }) => void;
}) {
  const areasRoda = gam.config.roda.areas;
  const [titulo, setTitulo] = useState(meta?.title || "");
  const [data, setData] = useState(meta?.date || "");
  const [qtd, setQtd] = useState(meta?.topics != null ? String(meta.topics) : "");
  const [unidade, setUnidade] = useState(meta?.unit || "");
  const [areas, setAreas] = useState<string[]>(() => (meta?.areas || []).map((a) => metaAreaInfo(a, areasRoda).label).filter(Boolean));
  const [dias, setDias] = useState<number[]>(meta?.dias ? meta.dias.slice() : []);
  const [tag, setTag] = useState<Tag>(meta?.tagValor || "alto");
  const [novaArea, setNovaArea] = useState("");

  const pool = doc ? metaAreasPool(doc, areasRoda) : areasRoda.map((a) => a.label);
  const sugestoes = pool.filter((a) => !areas.some((x) => x.toLowerCase() === a.toLowerCase()));

  // aviso ao vivo: em que boletim a meta pontua e quanto vale por item
  const nItens = Math.max(0, parseInt(qtd, 10) || 0);
  const fake: MetaTarget = {
    id: meta?.id || "novo",
    title: titulo,
    date: data,
    createdAt: meta?.createdAt || Date.now(),
    tagValor: tag,
  };
  const esc = data ? metaEscopo(fake) : null;
  const total = data ? metaPontosTotais(fake, gam) : 0;

  function toggleArea(label: string) {
    setAreas((prev) => (prev.some((x) => x.toLowerCase() === label.toLowerCase()) ? prev.filter((x) => x.toLowerCase() !== label.toLowerCase()) : [...prev, label]));
  }

  function addNovaArea() {
    const v = novaArea.trim();
    if (!v) return;
    if (!areas.some((x) => x.toLowerCase() === v.toLowerCase())) setAreas([...areas, v]);
    setNovaArea("");
  }

  function salvar() {
    if (!titulo.trim() || !data) return;
    onSalvar({
      title: titulo.trim(),
      date: data,
      topics: nItens > 0 ? nItens : null,
      unit: unidade.trim() || "tópicos",
      areas,
      dias,
      tagValor: tag,
    });
  }

  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="confirm-box meta-form"
        style={{ textAlign: "left", maxHeight: "86vh", overflowY: "auto" }}
      >
        <p className="mf-title">{meta ? "Editar meta" : "Nova meta"}</p>

        <div className="mf-row" style={{ marginTop: 0 }}>
          <input
            type="text"
            className="mf-grow"
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Alvo (ex.: Prova SEFAZ-BA)"
          />
        </div>

        <div className="mf-row">
          <div className="mf-cell">
            <span className="mf-ico" title="Prazo">
              <Icon name="clock" size={17} />
            </span>
            <input
              type="date"
              aria-label="Prazo"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="mf-cell" style={{ flex: "0 1 auto" }}>
            <span className="mf-ico" title="Peso no boletim">
              <Icon name="tag" size={17} />
            </span>
            <div className="type-toggle tagval-pills">
              {TAGS.map((v, i) => (
                <span
                  key={v}
                  className={tag === v ? "active" : ""}
                  title={TAG_LABEL[v]}
                  onClick={() => setTag(v)}
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mf-row">
          <div className="mf-cell" style={{ flex: "0 0 auto" }}>
            <span className="mf-ico" title="Quantidade (opcional)">
              <Icon name="hashtag" size={17} />
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="ex.: 4"
              style={{ width: 84 }}
              aria-label="Quantos itens"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </div>
          <div className="mf-cell">
            <span className="mf-ico" title="Do quê?">
              <Icon name="infoCircle" size={17} />
            </span>
            <input
              type="text"
              placeholder="ex.: questões"
              aria-label="Tipo do item"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
            />
          </div>
        </div>

        <div className="mf-row">
          <div className="mf-cell">
            <span className="mf-ico" title="Áreas">
              <Icon name="briefcase" size={17} />
            </span>
            <div className="area-chips mf-areas mf-grow">
              {areas.map((a) => {
                const info = metaAreaInfo(a, areasRoda);
                return (
                  <span key={a} className="area-chip sel" style={{ "--chip": info.color } as React.CSSProperties} onClick={() => toggleArea(a)}>
                    {info.label}
                  </span>
                );
              })}
              {sugestoes.map((a) => {
                const info = metaAreaInfo(a, areasRoda);
                return (
                  <span key={a} className="area-chip" style={{ "--chip": info.color } as React.CSSProperties} onClick={() => toggleArea(info.label)}>
                    {info.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mf-row">
          <span className="mf-ico" style={{ visibility: "hidden" }}>
            <Icon name="briefcase" size={17} />
          </span>
          <input
            type="text"
            className="mf-grow"
            placeholder="nova área"
            aria-label="Nova área"
            value={novaArea}
            onChange={(e) => setNovaArea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNovaArea();
              }
            }}
          />
          <button className="icon-btn" title="Adicionar área" aria-label="Adicionar área" onClick={addNovaArea}>
            <Icon name="plus" size={14} />
          </button>
        </div>

        <div className="mf-row">
          <div className="mf-cell">
            <span className="mf-ico" title="Dias para trabalhar (nenhum marcado = todo dia)">
              <Icon name="calendar" size={17} />
            </span>
            <div className="day-chips mf-grow">
              {DIAS_ABREV.map((lbl, d) => (
                <span
                  key={d}
                  className={"day-chip" + (dias.includes(d) ? " active" : "")}
                  title={lbl}
                  onClick={() => setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                >
                  {lbl.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {esc && (
          <div className="dev-n" style={{ marginTop: 12 }}>
            Vale <b>{total.toFixed(1)}</b> pontos no boletim <b>{ESCOPO_LABEL[esc]}</b>
            {nItens > 0 ? `, creditados aos poucos: ${(total / nItens).toFixed(2)} por item.` : ". Informe a quantidade para pontuar item por item."}
          </div>
        )}
        <div className="confirm-actions" style={{ marginTop: 16 }}>
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={salvar}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
