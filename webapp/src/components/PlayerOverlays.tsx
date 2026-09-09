// Overlays do player sobre a rotina em andamento (index.html:11570-11759) —
// o timer continua rodando por trás; nenhum dos dois navega para outra tela.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import { agruparEtapasPlayer, type PlayerState } from "../lib/player";
import { fmtTime } from "../lib/format";
import { MdPreview } from "../screens/NoteEditor";
import { EXP_CATS } from "../lib/expense";
import { localKey } from "../lib/gamificacao";

/** Painel "Etapas" (openPlayerStepsOverlay, index.html:11678-11759) — lista
 * TODAS as etapas da rotina em andamento, agrupando tarefa + pausa dela.
 * Reordenar só é liberado da etapa atual em diante — mexer no que já foi
 * executado reescreveria o histórico (stepActuals é indexado por posição). */
export function StepsOverlay({ playerState, onClose }: { playerState: PlayerState; onClose: () => void }) {
  const reordenarEtapasPlayer = useAppStore((s) => s.reordenarEtapasPlayer);
  const grupos = agruparEtapasPlayer(playerState.steps);
  const grupoAtual = grupos.findIndex((g) => g.reais.includes(playerState.idx));
  const restantes = playerState.steps
    .slice(playerState.idx)
    .filter((s) => s.type === "timer")
    .reduce((soma, s) => soma + (s.seconds || 0), 0);

  return (
    <div className="confirm-overlay search-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box search-box" style={{ textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ margin: 0 }}>Etapas — {playerState.routineName}</p>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="xmark" size={14} />
          </button>
        </div>
        <div className="dev-n" style={{ marginBottom: 10 }}>
          {playerState.idx + 1} de {playerState.steps.length} · faltam ~{fmtTime(restantes)}. Só dá para reordenar da etapa atual em
          diante.
        </div>
        <div className="pl-steps notes-list">
          {grupos.map((g, gi) => {
            const primeiraReal = g.reais[0];
            const estado = gi < grupoAtual ? "feita" : gi === grupoAtual ? "atual" : "futura";
            const podeSubir = gi > grupoAtual + 1;
            const podeDescer = gi > grupoAtual && gi < grupos.length - 1;
            const s = g.step;
            const dur = s.type === "timer" ? fmtTime(s.seconds || 0) : s.type === "exercicio" ? `${s.sets || 1}x${s.reps || ""}` : "livre";
            return (
              <div className={"pl-step " + estado} key={s.id}>
                <span className="pl-step-i">{estado === "feita" ? <Icon name="check" size={14} /> : primeiraReal + 1}</span>
                <span className="pl-step-nome">{g.step.name}</span>
                <span className="pl-step-dur">{dur}</span>
                <span className="pl-step-moves">
                  <button
                    className="kb-move-btn"
                    title="Subir etapa"
                    aria-label="Subir etapa"
                    disabled={!podeSubir}
                    onClick={() => reordenarEtapasPlayer(gi, gi - 1)}
                  >
                    <Icon name="arrowUp" size={14} />
                  </button>
                  <button
                    className="kb-move-btn"
                    title="Descer etapa"
                    aria-label="Descer etapa"
                    disabled={!podeDescer}
                    onClick={() => reordenarEtapasPlayer(gi, gi + 1)}
                  >
                    <Icon name="arrowDown" size={14} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Nota anexada à rotina (r.notaId), leitura/edição por cima do player
 * (openPlayerNotaOverlay, index.html:11570-11621). Textarea simples na
 * edição — mesma razão do NoteEditor: só existe uma instância de edição
 * "ao vivo" por vez e ela pertence à tela de Notas. Sem checklist clicável
 * na leitura ainda (a preview read-only, index.html:11588-11589, não existe
 * em nenhum lugar do React hoje — não é regressão desta rodada). */
export function NotaRotinaOverlay({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const routine = useAppStore((s) => s.routines.find((r) => r.id === routineId));
  const notes = useAppStore((s) => s.notes);
  const updateNote = useAppStore((s) => s.updateNote);
  const [editando, setEditando] = useState(false);

  const nota = routine?.notaId ? notes.find((n) => n.id === routine.notaId) : null;
  const [rascunho, setRascunho] = useState(nota?.content || "");

  if (!nota) {
    return (
      <div className="confirm-overlay" onClick={onClose}>
        <div className="confirm-box">
          <p>Nenhuma nota anexada a esta rotina</p>
          <div className="confirm-actions">
            <button className="btn-cancel" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  function alternarEdicao() {
    if (editando) updateNote(nota!.id, { content: rascunho });
    else setRascunho(nota!.content || "");
    setEditando((e) => !e);
  }

  return (
    <div className="confirm-overlay search-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box search-box nota-rot-box" style={{ textAlign: "left" }}>
        <div className="nota-rot-top">
          <span className="nota-rot-titulo">{nota.title || "(sem título)"}</span>
          <button className="icon-btn" title={editando ? "Ver formatado" : "Editar"} aria-label={editando ? "Ver formatado" : "Editar"} onClick={alternarEdicao}>
            <Icon name={editando ? "eye" : "notes"} size={editando ? 15 : 14} />
          </button>
          <button className="icon-btn" title="Fechar" aria-label="Fechar" onClick={onClose}>
            <Icon name="xmark" size={14} />
          </button>
        </div>
        <div className="nota-rot-corpo">
          {editando ? (
            <textarea
              className="mk-e-name nota-rot-ta"
              placeholder="Escreva em markdown…"
              value={rascunho}
              onChange={(e) => {
                setRascunho(e.target.value);
                updateNote(nota.id, { content: e.target.value });
              }}
              autoFocus
            />
          ) : (
            <MdPreview text={nota.content || ""} />
          )}
        </div>
      </div>
    </div>
  );
}

type QaTela = "escolha" | "nota" | "notaForm" | "despesa" | "kanban" | "compromisso";

/** Lançamento rápido sem sair da rotina em andamento (openPlayerQuickAdd,
 * index.html:12021-12232). Porta 4 das 5 opções do legado: nota simples,
 * despesa, cartão em "A fazer" e compromisso — "nota do dia" (diário) fica de
 * fora porque o Diário deixou de ser tela/aba (docs/react-migration.md,
 * 23/08/2026) e não deve ser recriado. */
export function QuickAddOverlay({ onClose }: { onClose: () => void }) {
  const [tela, setTela] = useState<QaTela>("escolha");
  const [notaEscolhida, setNotaEscolhida] = useState<{ id: string; title: string; content: string } | null | undefined>(undefined);
  const notes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const addExpense = useAppStore((s) => s.addExpense);
  const upsertDiaKanbanCard = useAppStore((s) => s.upsertDiaKanbanCard);
  const addCompromisso = useAppStore((s) => s.addCompromisso);

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [data, setData] = useState(localKey());
  const [hora, setHora] = useState("");
  const [texto, setTexto] = useState("");
  const [feito, setFeito] = useState<string | null>(null);

  function fecharComAviso(msg: string) {
    setFeito(msg);
    setTimeout(onClose, 900);
  }

  const cabecalho = (titulo: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <p style={{ margin: 0 }}>{titulo}</p>
      <button className="icon-btn" onClick={onClose}>
        <Icon name="xmark" size={14} />
      </button>
    </div>
  );

  if (feito) {
    return (
      <div className="confirm-overlay" onClick={onClose}>
        <div className="confirm-box">
          <p>{feito}</p>
        </div>
      </div>
    );
  }

  if (tela === "escolha") {
    return (
      <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="confirm-box" style={{ textAlign: "left" }}>
          <p style={{ margin: "0 0 10px" }}>Lançar rápido</p>
          <div className="tmpl-new-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button className="tmpl-new" onClick={() => setTela("nota")}>
              <span className="tmpl-ic">
                <Icon name="notes" size={22} />
              </span>
              <span>Nota simples</span>
            </button>
            <button className="tmpl-new" onClick={() => setTela("despesa")}>
              <span className="tmpl-ic">
                <Icon name="expense" size={22} />
              </span>
              <span>Nova despesa</span>
            </button>
            <button className="tmpl-new" onClick={() => setTela("kanban")}>
              <span className="tmpl-ic">
                <Icon name="kanban" size={22} />
              </span>
              <span>Cartão a fazer</span>
            </button>
            <button className="tmpl-new" onClick={() => setTela("compromisso")}>
              <span className="tmpl-ic">
                <Icon name="calendar" size={22} />
              </span>
              <span>Compromisso</span>
            </button>
          </div>
          <div className="confirm-actions" style={{ marginTop: 14 }}>
            <button className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tela === "nota") {
    const lista = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return (
      <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="confirm-box" style={{ textAlign: "left", maxHeight: "80vh", overflowY: "auto" }}>
          {cabecalho("Nota simples")}
          {lista.length ? (
            <>
              <div className="section-label">Adicionar a uma nota existente</div>
              <div className="qa-idea-list">
                {lista.map((n) => (
                  <button
                    key={n.id}
                    className="qa-idea-row"
                    onClick={() => {
                      setNotaEscolhida(n);
                      setTitulo(n.title || "");
                      setConteudo(n.content || "");
                      setTela("notaForm");
                    }}
                  >
                    <span className="qa-idea-nome">{n.title || "(sem título)"}</span>
                    <span className="qa-idea-meta">{n.content ? n.content.slice(0, 80) : "sem conteúdo ainda"}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="dev-n" style={{ marginBottom: 10 }}>
              Nenhuma nota criada ainda.
            </div>
          )}
          <button
            className="tmpl-new qa-idea-nova"
            onClick={() => {
              setNotaEscolhida(null);
              setTitulo("");
              setConteudo("");
              setTela("notaForm");
            }}
          >
            <span className="tmpl-ic">
              <Icon name="notes" size={18} />
            </span>
            <span>+ Nova nota</span>
          </button>
        </div>
      </div>
    );
  }

  if (tela === "notaForm") {
    const existente = notaEscolhida;
    return (
      <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="confirm-box" style={{ textAlign: "left", maxHeight: "80vh", overflowY: "auto" }}>
          {cabecalho(existente ? "Complementar nota" : "Nova nota")}
          <div className="section-label">Título</div>
          <input
            type="text"
            className="mk-e-name"
            style={{ width: "100%" }}
            placeholder="Nome da nota"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <div className="section-label">Conteúdo</div>
          <textarea
            className="mk-e-name"
            rows={5}
            style={{ width: "100%", lineHeight: 1.5 }}
            placeholder="Escreva em markdown…"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
          <div className="confirm-actions" style={{ marginTop: 14 }}>
            <button
              className="btn-confirm"
              style={{ background: "var(--caneta)" }}
              onClick={() => {
                if (existente) updateNote(existente.id, { title: titulo, content: conteudo });
                else if (titulo.trim() || conteudo.trim()) addNote(titulo.trim() || "Sem título", conteudo);
                fecharComAviso(existente ? "Nota atualizada ✓" : "Nota salva ✓");
              }}
            >
              Concluído
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tela === "despesa") {
    return (
      <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="confirm-box" style={{ textAlign: "left" }}>
          {cabecalho("Nova despesa")}
          <input
            type="text"
            className="mk-e-name"
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="Descrição"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="market-form-row" style={{ marginBottom: 8 }}>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              placeholder="R$"
              style={{ flex: 1, minWidth: 0 }}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <select style={{ flex: 1, minWidth: 0 }} value={cat} onChange={(e) => setCat(e.target.value)}>
              {EXP_CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="market-form-row" style={{ marginBottom: 8 }}>
            <input type="date" style={{ flex: 1, minWidth: 0 }} value={data} onChange={(e) => setData(e.target.value)} />
            <input type="time" style={{ flex: "0 0 auto", width: 100 }} value={hora} onChange={(e) => setHora(e.target.value)} title="Hora (opcional)" />
          </div>
          <div className="confirm-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-confirm"
              style={{ background: "var(--caneta)" }}
              onClick={() => {
                const value = +valor;
                if (!desc.trim() || !value) {
                  setFeito("Preencha descrição e valor");
                  setTimeout(() => setFeito(null), 1400);
                  return;
                }
                addExpense({ desc: desc.trim(), value, cat, date: data || localKey(), time: hora || undefined });
                fecharComAviso("Despesa salva ✓");
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tela === "kanban") {
    return (
      <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="confirm-box" style={{ textAlign: "left" }}>
          {cabecalho('Cartão em "A fazer"')}
          <input
            type="text"
            className="mk-e-name"
            style={{ width: "100%" }}
            placeholder="O que precisa ser feito?"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="confirm-actions" style={{ marginTop: 14 }}>
            <button className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-confirm"
              style={{ background: "var(--caneta)" }}
              onClick={() => {
                if (!texto.trim()) {
                  setFeito("Escreva o que precisa ser feito");
                  setTimeout(() => setFeito(null), 1400);
                  return;
                }
                upsertDiaKanbanCard(localKey(), { text: texto });
                fecharComAviso('Cartão criado em "A fazer" ✓');
              }}
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // tela === "compromisso"
  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box" style={{ textAlign: "left" }}>
        {cabecalho("Compromisso")}
        <input
          type="text"
          className="mk-e-name"
          style={{ width: "100%", marginBottom: 8 }}
          placeholder="Título"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="market-form-row">
          <input type="date" style={{ flex: 1, minWidth: 0 }} value={data} onChange={(e) => setData(e.target.value)} />
          <input type="time" style={{ flex: "0 0 auto", width: 100 }} value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
        <div className="confirm-actions" style={{ marginTop: 14 }}>
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-confirm"
            style={{ background: "var(--caneta)" }}
            onClick={() => {
              if (!texto.trim()) {
                setFeito("Escreva o título do compromisso");
                setTimeout(() => setFeito(null), 1400);
                return;
              }
              addCompromisso(texto.trim(), data || localKey(), hora);
              fecharComAviso("Compromisso criado ✓");
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
