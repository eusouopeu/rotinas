// Um quadrante da matriz: título colorido, cores, modo da lista (check / lista /
// numerada), expandir, os itens e o campo de novo item. As cores do quadrante
// (borda, fundo suave, título, marcadores) vêm do dado e por isso entram como
// estilo em linha.
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { AreaTexto } from "../../ui/Campo";
import { BotaoCompacto } from "../../ui/BotaoCompacto";
import { BotaoOrdem } from "../../ui/BotaoOrdem";
import { CampoNovoItem } from "../../ui/CampoNovoItem";
import { CaixaCheck, ItemChecklist, RISCADO } from "../../ui/ItemChecklist";
import { Toggle } from "../../ui/Segmentado";
import { MATRIX_COLORS } from "../../lib/templates";
import { cn } from "../../lib/cn";
import type { MatrixDoc } from "../../lib/types";

type Quadrant = MatrixDoc["quadrants"][number];
type QItem = Quadrant["items"][number];
type Modo = Quadrant["mode"];

const ICONE_MODO = { check: <Icon name="check" size={13} />, ul: "•", ol: "1." };

type QuadProps = {
  q: Quadrant;
  grande: boolean;
  /** índice do item em edição neste quadrante, se houver */
  editando: number | null;
  onPatch: (patch: Partial<Quadrant>) => void;
  onAlternarExpandir: () => void;
  onEditar: (ii: number) => void;
  /** caixa de edição do item `ii` (o pai conhece o documento inteiro) */
  renderEdicao: (ii: number, it: QItem) => React.ReactNode;
};

export function QuadranteMatriz({
  q,
  grande,
  editando,
  onPatch,
  onAlternarExpandir,
  onEditar,
  renderEdicao,
}: QuadProps) {
  return (
    <div
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border-[1.5px] p-2.5", grande && "flex-1")}
      style={{ borderColor: q.color, background: q.color + "14" }}
    >
      <input
        type="text"
        className={cn(
          "w-full border-0 bg-transparent px-0 pt-0 pb-1 font-titulo font-semibold focus:outline-none",
          grande ? "text-[17px]" : "text-base"
        )}
        value={q.title}
        style={{ color: q.color }}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <span className="font-sans text-xs text-sub">{q.items.length} item(ns)</span>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1">
          {MATRIX_COLORS.map((c) => (
            <span key={c} className="size-4" style={{ background: c }} onClick={() => onPatch({ color: c })} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Toggle<Modo>
            className="text-2xs desktop:text-2xs"
            options={(["check", "ul", "ol"] as const).map((m) => ({ key: m, label: ICONE_MODO[m] }))}
            active={q.mode}
            onSelect={(m) => onPatch({ mode: m })}
          />
          <BotaoOrdem
            title={grande ? "Voltar à grade" : "Expandir"}
            aria-label={grande ? "Voltar à grade" : "Expandir"}
            onClick={onAlternarExpandir}
          >
            <Icon name={grande ? "arrowsPointingIn" : "arrowsPointingOut"} size={15} />
          </BotaoOrdem>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {q.items.map((it, ii) =>
          editando === ii ? (
            renderEdicao(ii, it)
          ) : (
            <LinhaQuadrante
              key={ii}
              q={q}
              it={it}
              ii={ii}
              grande={grande}
              onEditar={() => onEditar(ii)}
              onAlternar={() =>
                onPatch({ items: q.items.map((x, i) => (i === ii ? { ...x, checked: !x.checked } : x)) })
              }
            />
          )
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const inp = e.currentTarget.querySelector("input") as HTMLInputElement;
          const val = inp.value.trim();
          if (!val) return;
          onPatch({ items: [...q.items, { text: val, checked: false, indent: 0 }] });
          inp.value = "";
        }}
      >
        <CampoNovoItem placeholder="+ item (Enter)" />
      </form>
    </div>
  );
}

function LinhaQuadrante({
  q,
  it,
  ii,
  grande,
  onEditar,
  onAlternar,
}: {
  q: Quadrant;
  it: QItem;
  ii: number;
  grande: boolean;
  onEditar: () => void;
  onAlternar: () => void;
}) {
  const tamanho = grande ? "text-lg" : "text-base";
  if (q.mode === "check") {
    return (
      <ItemChecklist className={cn("my-[3px]", tamanho, "leading-[1.4]", it.indent && "ml-4")}>
        <CaixaCheck className="size-4" marcado={!!it.checked} cor={q.color} onClick={onAlternar} />
        <span className={cn("flex-1", it.checked && RISCADO)} onClick={onEditar}>
          {it.text}
        </span>
      </ItemChecklist>
    );
  }
  const marcador =
    q.mode === "ol" ? q.items.slice(0, ii).filter((x) => !x.indent).length + (it.indent ? 0 : 1) + "." : "•";
  return (
    <div
      className={cn(
        tamanho,
        "flex min-h-6 items-start rounded-[6px] py-1 pr-0.5 pl-2 leading-normal active:bg-card desktop:hover:bg-card",
        it.indent && "ml-4"
      )}
    >
      <span className="mr-1.5" style={{ color: q.color }}>
        {it.indent ? "◦" : marcador}
      </span>
      <span className="flex-1" onClick={onEditar}>
        {it.text}
      </span>
    </div>
  );
}

type EdicaoProps = {
  doc: MatrixDoc;
  qi: number;
  ii: number;
  it: QItem;
  onSave: (quadrants: Quadrant[]) => void;
  onDone: () => void;
};

/** Caixa de edição de um item: texto, quadrante de destino, indentar, subir/descer, ok / excluir. */
export function EdicaoItemMatriz({ doc, qi, ii, it, onSave, onDone }: EdicaoProps) {
  const [text, setText] = useState(it.text);
  const [targetQ, setTargetQ] = useState(qi);

  function commit(patch: Partial<QItem>) {
    const quadrants = doc.quadrants.map((q) => ({ ...q, items: [...q.items] }));
    quadrants[qi].items[ii] = { ...quadrants[qi].items[ii], ...patch };
    onSave(quadrants);
  }
  function ok() {
    const trimmed = text.trim() || it.text;
    if (targetQ !== qi) {
      const quadrants = doc.quadrants.map((q) => ({ ...q, items: [...q.items] }));
      const [moved] = quadrants[qi].items.splice(ii, 1);
      quadrants[targetQ].items.push({ ...moved, text: trimmed });
      onSave(quadrants);
    } else {
      commit({ text: trimmed });
    }
    onDone();
  }
  function del() {
    const quadrants = doc.quadrants.map((q) => ({ ...q, items: [...q.items] }));
    quadrants[qi].items.splice(ii, 1);
    onSave(quadrants);
    onDone();
  }
  function move(delta: number) {
    const target = ii + delta;
    const q = doc.quadrants[qi];
    if (target < 0 || target >= q.items.length) return;
    const quadrants = doc.quadrants.map((x) => ({ ...x, items: [...x.items] }));
    [quadrants[qi].items[ii], quadrants[qi].items[target]] = [quadrants[qi].items[target], quadrants[qi].items[ii]];
    onSave(quadrants);
    onDone();
  }

  return (
    <div className="my-1 rounded-[9px] bg-card p-2">
      <AreaTexto
        className="mb-1.5 rounded-[8px] bg-card-2 px-[9px] py-2 text-base"
        rows={1}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            ok();
          }
        }}
      />
      <div className="mb-1.5 flex flex-wrap items-center gap-0.5">
        <select
          className="min-w-0 flex-1 rounded-[8px] border-[1.5px] border-line bg-card-2 p-1.5 text-sm text-ink"
          value={targetQ}
          onChange={(e) => setTargetQ(+e.target.value)}
        >
          {doc.quadrants.map((qq, qqi) => (
            <option key={qqi} value={qqi}>
              {qq.title.slice(0, 18)}
            </option>
          ))}
        </select>
        <BotaoOrdem title="Indentar" onClick={() => commit({ indent: 1 })}>
          <Icon name="chevronDoubleRight" size={14} />
        </BotaoOrdem>
        <BotaoOrdem title="Remover indentação" onClick={() => commit({ indent: 0 })}>
          <Icon name="chevronDoubleLeft" size={14} />
        </BotaoOrdem>
        <BotaoOrdem disabled={ii === 0} onClick={() => move(-1)}>
          <Icon name="arrowUp" size={14} />
        </BotaoOrdem>
        <BotaoOrdem disabled={ii === doc.quadrants[qi].items.length - 1} onClick={() => move(1)}>
          <Icon name="arrowDown" size={14} />
        </BotaoOrdem>
      </div>
      <div className="flex gap-2">
        <BotaoCompacto onClick={ok}>ok</BotaoCompacto>
        <BotaoCompacto variante="fantasma" className="text-erro" onClick={del}>
          excluir
        </BotaoCompacto>
      </div>
    </div>
  );
}
