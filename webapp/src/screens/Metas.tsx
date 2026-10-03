// Porta de renderMetas (index.html:8391-8875) — Prazos (metas com data-limite)
// e Recorrentes (hábitos N vezes ao dia/na semana, com penalidade se
// negativa e opt-in de pontos). Cartões e popups moram em features/metas/.
// Sub-metas aninhadas, filtro multiselect por área e anotação live Markdown
// permanecem para etapas seguintes.
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { RodaVidaResumo } from "../features/roda/RodaVidaResumo";
import { CartaoPrazo } from "../features/metas/CartaoPrazo";
import { CartaoRec } from "../features/metas/CartaoRec";
import { FormMetaPrazo } from "../features/metas/FormMetaPrazo";
import { FormMetaRec } from "../features/metas/FormMetaRec";
import { exportPdfView } from "../lib/exportFile";
import { metasPdfHtml } from "../lib/pdfExport";
import { computeGridDragTarget, useDragReorder } from "../lib/dnd";
import { daysUntil } from "../lib/metas";
import type { CountdownDoc, MetaRecorrente, MetaTarget } from "../lib/types";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Fab } from "../ui/Fab";
import { Legenda } from "../ui/Legenda";
import { Modal, ModalAcoes, ModalTexto } from "../ui/Modal";
import { OpcaoCriar } from "../ui/OpcaoCriar";
import { RotuloSecao } from "../ui/RotuloSecao";
import { SegPill } from "../ui/Segmentado";
import { rolavel, tela } from "../ui/Tela";
import { Doca } from "../ui/Doca";
import { Icon } from "../components/Icon";

/** Cartões de meta em grade de 2 colunas (mockup de 02/10/2026); 4 no desktop. */
const GRADE = "grid grid-cols-2 gap-2.5 desktop:grid-cols-4";

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
  const reorderMetas = useAppStore((s) => s.reorderMetas);

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
  const metas = doc?.ordemManual
    ? [...doc.targets]
    : [...(doc?.targets ?? [])].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const recorrentes = doc?.recorrentes ?? [];

  const recRefs = useRef<Array<HTMLDivElement | null>>([]);
  const metaRefs = useRef<Array<HTMLDivElement | null>>([]);
  // container 0 = recorrentes, 1 = prazos
  const { dragFrom, dragHandleProps } = useDragReorder((from, to) => {
    if (from.container === 0) {
      reorderMetaRec(from.index, to.index);
      return;
    }
    const ids = metas.map((m) => m.id);
    const [movido] = ids.splice(from.index, 1);
    ids.splice(to.index, 0, movido);
    reorderMetas(ids);
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
    <div {...tela({ comAbas: true })}>
      <div {...rolavel()}>
        <CabecalhoTela titulo="Metas" margem="2.5">
          {mostraPrazos && doc && metas.length > 0 && (
            <div className="flex items-center gap-2.5">
              <BotaoIcone
                rotulo="Exportar PDF"
                onClick={async () => {
                  setErro("");
                  const r = await exportPdfView("Metas", metasPdfHtml(doc), "Metas");
                  if (!r.ok && r.erro) setErro(r.erro);
                }}
              >
                <Icon name="clipboard" size={15} />
              </BotaoIcone>
            </div>
          )}
        </CabecalhoTela>

        {erro && <Legenda className="mt-3 mb-2 text-erro">{erro}</Legenda>}

        <RodaVidaResumo />

        {mostraRecorrentes && (
          <div className={ambos ? "mb-5" : "mb-2.5"}>
            {ambos && <RotuloSecao className="mt-1 mb-2.5">Recorrentes</RotuloSecao>}
            {recorrentes.length === 0 ? (
              <EstadoVazio
                className="mb-2.5 min-h-[20vh]"
                titulo="Nenhuma meta recorrente"
                texto="Acompanhe hábitos que repetem ao dia ou na semana com metas positivas ou limites."
              >
                <Botao className="mt-3" onClick={() => setCriandoRec(true)}>
                  + Nova meta recorrente
                </Botao>
              </EstadoVazio>
            ) : (
              <div className={GRADE}>
                {recorrentes.map((rec, i) => (
                  <CartaoRec
                    key={rec.id}
                    rec={rec}
                    gam={gam}
                    isDragging={dragFrom?.container === 0 && dragFrom.index === i}
                    setRef={(el) => {
                      recRefs.current[i] = el;
                    }}
                    dragHandleProps={dragHandleProps({ container: 0, index: i }, (x, y) => ({
                      container: 0,
                      index: computeGridDragTarget(
                        recRefs.current.filter(Boolean).map((el) => el!.getBoundingClientRect()),
                        i,
                        x,
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
                ))}
              </div>
            )}
          </div>
        )}

        {mostraPrazos && (
          <div>
            {ambos && <RotuloSecao className="mt-1 mb-2.5">Prazos</RotuloSecao>}
            {metas.length === 0 ? (
              <EstadoVazio
                className="min-h-[20vh]"
                titulo="Nenhuma meta com prazo"
                texto="Defina um título e um prazo — o boletim credita pontos conforme o progresso."
              >
                <Botao className="mt-3" onClick={() => setCriandoPrazo(true)}>
                  + Nova meta
                </Botao>
              </EstadoVazio>
            ) : (
              <div className={GRADE}>
                {metas.map((t, i) => (
                  <CartaoPrazo
                    key={t.id}
                    t={t}
                    gam={gam}
                    isDragging={dragFrom?.container === 1 && dragFrom.index === i}
                    setRef={(el) => {
                      metaRefs.current[i] = el;
                    }}
                    dragHandleProps={dragHandleProps({ container: 1, index: i }, (x, y) => ({
                      container: 1,
                      index: computeGridDragTarget(
                        metaRefs.current.filter(Boolean).map((el) => el!.getBoundingClientRect()),
                        i,
                        x,
                        y
                      ),
                    }))}
                    onEditar={() => setEditandoPrazo(t)}
                    onDone={(d) => setMetaDone(t.id, d)}
                    onExcluir={() => {
                      if (window.confirm(`Remover a meta "${t.title}"?`)) deleteMeta(t.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {escolhendoTipo && (
        <Modal onFechar={() => setEscolhendoTipo(false)} className="text-left">
          {/* mesmo popup do FAB de Rotinas */}
          <ModalTexto className="mb-3">Criar</ModalTexto>
          <div className="flex flex-col gap-2">
            <OpcaoCriar
              icone="arrowPath"
              titulo="Meta recorrente"
              descricao="hábito ou limite que repete no dia/semana"
              onClick={() => {
                setEscolhendoTipo(false);
                setCriandoRec(true);
              }}
            />
            <OpcaoCriar
              icone="countdown"
              titulo="Meta com prazo"
              descricao="alvo com data de vencimento e tópicos"
              onClick={() => {
                setEscolhendoTipo(false);
                setCriandoPrazo(true);
              }}
            />
          </div>
          <ModalAcoes className="mt-3.5">
            <Botao variante="neutro" tamanho="modal" onClick={() => setEscolhendoTipo(false)}>
              Cancelar
            </Botao>
          </ModalAcoes>
        </Modal>
      )}

      {(criandoPrazo || editandoPrazo) && (
        <FormMetaPrazo
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
        <FormMetaRec
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

      {/* as duas podem ficar ligadas juntas (lista única com dois blocos) —
          por isso o check em cada uma ligada; na barra de baixo, no alcance do
          polegar, como Rotinas e Dados (03/10/2026) */}
      <Doca>
        <SegPill
          cheia
          options={(
            [
              { key: "recorrentes", label: "Recorrentes" },
              { key: "prazos", label: "Prazos" },
            ] as const
          ).map((o) => ({
            key: o.key,
            label: (
              <span className="inline-flex items-center justify-center gap-1.5">
                {metasSubview.includes(o.key) && <Icon name="check" size={13} />}
                {o.label}
              </span>
            ),
          }))}
          active={metasSubview}
          onSelect={toggleMetasSubviewState}
        />
      </Doca>

      <Fab rotulo="Novo" onClick={handleFabClick} />
    </div>
  );
}
