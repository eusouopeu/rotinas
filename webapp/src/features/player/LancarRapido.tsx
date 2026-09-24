// Lançamento rápido sem sair da rotina em andamento (openPlayerQuickAdd,
// index.html:12021-12232). Porta 4 das 5 opções do legado: nota simples,
// despesa, cartão em "A fazer" e compromisso — "nota do dia" (diário) fica de
// fora porque o Diário deixou de ser tela/aba (docs/react-migration.md,
// 23/08/2026) e não deve ser recriado.
import { useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { Botao } from "../../ui/Botao";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { AreaTexto, Campo } from "../../ui/Campo";
import { Legenda } from "../../ui/Legenda";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { GradePastas, PastaTile } from "../modelos/PastaTile";
import { useAppStore } from "../../store/useAppStore";
import { EXP_CATS } from "../../lib/expense";
import { localKey } from "../../lib/gamificacao";

type Tela = "escolha" | "nota" | "notaForm" | "despesa" | "kanban" | "compromisso";

const CAIXA = "text-left";
const CAIXA_ROLAVEL = "max-h-[80vh] overflow-y-auto text-left";
// campos das fileiras de formulário rápido (era .market-form-row input/select)
const CAMPO_LINHA = "min-w-0 flex-1";
const CAMPO_HORA = "w-[100px] flex-none";

function Cabecalho({ titulo, onClose }: { titulo: string; onClose: () => void }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <ModalTexto className="m-0">{titulo}</ModalTexto>
      <BotaoIcone rotulo="Fechar" onClick={onClose}>
        <Icon name="xmark" size={14} />
      </BotaoIcone>
    </div>
  );
}

const Fileira = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={className ? `flex gap-2 ${className}` : "flex gap-2"}>{children}</div>
);

export function LancarRapido({ onClose }: { onClose: () => void }) {
  const [tela, setTela] = useState<Tela>("escolha");
  const [notaEscolhida, setNotaEscolhida] = useState<{ id: string; title: string; content: string } | null | undefined>(
    undefined
  );
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
  function avisar(msg: string) {
    setFeito(msg);
    setTimeout(() => setFeito(null), 1400);
  }

  const cancelar = (
    <Botao variante="neutro" tamanho="modal" onClick={onClose}>
      Cancelar
    </Botao>
  );
  const confirmar = (rotulo: string, onClick: () => void) => (
    <Botao variante="solido" tamanho="modal" onClick={onClick}>
      {rotulo}
    </Botao>
  );

  if (feito) {
    return (
      <Modal onFechar={onClose}>
        <ModalTexto>{feito}</ModalTexto>
      </Modal>
    );
  }

  if (tela === "escolha") {
    return (
      <Modal onFechar={onClose} className={CAIXA}>
        <ModalTexto className="mb-2.5">Lançar rápido</ModalTexto>
        <GradePastas className="grid-cols-2 desktop:grid-cols-2 paisagem:grid-cols-2">
          <PastaTile icone="notes" rotulo="Nota simples" onClick={() => setTela("nota")} />
          <PastaTile icone="expense" rotulo="Nova despesa" onClick={() => setTela("despesa")} />
          <PastaTile icone="kanban" rotulo="Cartão a fazer" onClick={() => setTela("kanban")} />
          <PastaTile icone="calendar" rotulo="Compromisso" onClick={() => setTela("compromisso")} />
        </GradePastas>
        <ModalAcoes className="mt-3.5">{cancelar}</ModalAcoes>
      </Modal>
    );
  }

  if (tela === "nota") {
    const lista = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return (
      <Modal onFechar={onClose} className={CAIXA_ROLAVEL}>
        <Cabecalho titulo="Nota simples" onClose={onClose} />
        {lista.length ? (
          <>
            <RotuloSecao>Adicionar a uma nota existente</RotuloSecao>
            <div className="flex max-h-[34vh] flex-col gap-1.5 overflow-y-auto">
              {lista.map((n) => (
                <button
                  key={n.id}
                  className="flex w-full flex-col items-start gap-0.5 rounded-app-sm border-[1.5px] border-line bg-card-2 px-[11px] py-[9px] text-left text-ink active:scale-[0.985] active:bg-card"
                  onClick={() => {
                    setNotaEscolhida(n);
                    setTitulo(n.title || "");
                    setConteudo(n.content || "");
                    setTela("notaForm");
                  }}
                >
                  <span className="text-base">{n.title || "(sem título)"}</span>
                  <span className="max-w-full truncate font-sans text-xs text-sub">
                    {n.content ? n.content.slice(0, 80) : "sem conteúdo ainda"}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <Legenda className="mb-2.5">Nenhuma nota criada ainda.</Legenda>
        )}
        <PastaTile
          icone="notes"
          rotulo="+ Nova nota"
          iconeTam={18}
          className="mt-3 aspect-auto w-full flex-row gap-2 p-3"
          onClick={() => {
            setNotaEscolhida(null);
            setTitulo("");
            setConteudo("");
            setTela("notaForm");
          }}
        />
      </Modal>
    );
  }

  if (tela === "notaForm") {
    const existente = notaEscolhida;
    return (
      <Modal onFechar={onClose} className={CAIXA_ROLAVEL}>
        <Cabecalho titulo={existente ? "Complementar nota" : "Nova nota"} onClose={onClose} />
        <RotuloSecao>Título</RotuloSecao>
        <Campo
          variante="modelo"
          type="text"
          placeholder="Nome da nota"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <RotuloSecao>Conteúdo</RotuloSecao>
        <AreaTexto
          rows={5}
          placeholder="Escreva em markdown…"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
        />
        <ModalAcoes className="mt-3.5">
          {confirmar("Concluído", () => {
            if (existente) updateNote(existente.id, { title: titulo, content: conteudo });
            else if (titulo.trim() || conteudo.trim()) addNote(titulo.trim() || "Sem título", conteudo);
            fecharComAviso(existente ? "Nota atualizada ✓" : "Nota salva ✓");
          })}
        </ModalAcoes>
      </Modal>
    );
  }

  if (tela === "despesa") {
    return (
      <Modal onFechar={onClose} className={CAIXA}>
        <Cabecalho titulo="Nova despesa" onClose={onClose} />
        <Campo
          variante="modelo"
          type="text"
          placeholder="Descrição"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <Fileira className="mb-2">
          <Campo
            variante="linha"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            placeholder="R$"
            className={CAMPO_LINHA}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <select
            className={`${CAMPO_LINHA} rounded-md border-[1.5px] border-line bg-card px-2 py-[9px] text-base text-ink`}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {EXP_CATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Fileira>
        <Fileira className="mb-2">
          <Campo
            variante="linha"
            type="date"
            className={CAMPO_LINHA}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
          <Campo
            variante="linha"
            type="time"
            className={CAMPO_HORA}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            title="Hora (opcional)"
          />
        </Fileira>
        <ModalAcoes>
          {cancelar}
          {confirmar("Salvar", () => {
            const value = +valor;
            if (!desc.trim() || !value) return avisar("Preencha descrição e valor");
            addExpense({ desc: desc.trim(), value, cat, date: data || localKey(), time: hora || undefined });
            fecharComAviso("Despesa salva ✓");
          })}
        </ModalAcoes>
      </Modal>
    );
  }

  if (tela === "kanban") {
    return (
      <Modal onFechar={onClose} className={CAIXA}>
        <Cabecalho titulo='Cartão em "A fazer"' onClose={onClose} />
        <Campo
          variante="modelo"
          type="text"
          placeholder="O que precisa ser feito?"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <ModalAcoes className="mt-3.5">
          {cancelar}
          {confirmar("Adicionar", () => {
            if (!texto.trim()) return avisar("Escreva o que precisa ser feito");
            upsertDiaKanbanCard(localKey(), { text: texto });
            fecharComAviso('Cartão criado em "A fazer" ✓');
          })}
        </ModalAcoes>
      </Modal>
    );
  }

  // tela === "compromisso"
  return (
    <Modal onFechar={onClose} className={CAIXA}>
      <Cabecalho titulo="Compromisso" onClose={onClose} />
      <Campo
        variante="modelo"
        type="text"
        placeholder="Título"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <Fileira>
        <Campo
          variante="linha"
          type="date"
          className={CAMPO_LINHA}
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
        <Campo
          variante="linha"
          type="time"
          className={CAMPO_HORA}
          value={hora}
          onChange={(e) => setHora(e.target.value)}
        />
      </Fileira>
      <ModalAcoes className="mt-3.5">
        {cancelar}
        {confirmar("Salvar", () => {
          if (!texto.trim()) return avisar("Escreva o título do compromisso");
          addCompromisso(texto.trim(), data || localKey(), hora);
          fecharComAviso("Compromisso criado ✓");
        })}
      </ModalAcoes>
    </Modal>
  );
}
