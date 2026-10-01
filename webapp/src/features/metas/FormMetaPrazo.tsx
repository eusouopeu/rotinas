// Popup de meta com prazo (criar/editar) — porta de abrirFormMeta
// (index.html:8175-8265). Ordem do mockup de 30/09/2026: título; áreas (chips
// dentro da caixa, texto livre com os eixos da roda como sugestão) + prazo;
// quantidade + unidade e peso; dias para trabalhar — grupos separados por
// filetes, com o aviso de escopo/pontos ao vivo.
import { useState } from "react";
import { DIAS_ABREV } from "../../lib/constants";
import { metaAreaInfo, metaAreasPool, metaEscopo, metaPontosTotais } from "../../lib/metas";
import type { CountdownDoc, GamificacaoState, MetaMarco, MetaTarget, Tag } from "../../lib/types";
import { uid } from "../../lib/uid";
import { Icon } from "../../components/Icon";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Campo } from "../../ui/Campo";
import { AreaInput, DateKbInput } from "../../ui/CamposTexto";
import { ChipsDia } from "../../ui/ChipsDia";
import { Etiqueta } from "../../ui/Etiqueta";
import { Legenda } from "../../ui/Legenda";
import { Toggle } from "../../ui/Segmentado";
import { ESCOPO_LABEL, TAG_OPCOES } from "./constantes";
import { CaixaChips, CelulaForm, DivisorForm, FormMeta, IconeForm, LinhaForm } from "./FormMeta";

type Props = {
  meta: MetaTarget | null;
  doc: CountdownDoc | null;
  gam: GamificacaoState;
  onClose: () => void;
  onSalvar: (dados: Partial<MetaTarget> & { title: string; date: string }) => void;
};

export function FormMetaPrazo({ meta, doc, gam, onClose, onSalvar }: Props) {
  const areasRoda = gam.config.roda.areas;
  const [titulo, setTitulo] = useState(meta?.title || "");
  const [data, setData] = useState(meta?.date || "");
  const [qtd, setQtd] = useState(meta?.topics != null ? String(meta.topics) : "");
  const [unidade, setUnidade] = useState(meta?.unit || "");
  const [areas, setAreas] = useState<string[]>(() =>
    (meta?.areas || []).map((a) => metaAreaInfo(a, areasRoda).label).filter(Boolean)
  );
  const [dias, setDias] = useState<number[]>(meta?.dias ? meta.dias.slice() : []);
  const [tag, setTag] = useState<Tag>(meta?.tagValor || "alto");
  const [novaArea, setNovaArea] = useState("");
  // marcos intermediários (01/10/2026): data + quantos itens acumulados até lá
  const [marcos, setMarcos] = useState<Array<{ id: string; data: string; alvo: string }>>(() =>
    (meta?.marcos || []).map((m) => ({ id: m.id, data: m.data, alvo: String(m.alvo) }))
  );

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
    setAreas((prev) =>
      prev.some((x) => x.toLowerCase() === label.toLowerCase())
        ? prev.filter((x) => x.toLowerCase() !== label.toLowerCase())
        : [...prev, label]
    );
  }

  function salvar() {
    if (!titulo.trim() || !data) return;
    const marcosOk: MetaMarco[] =
      nItens > 0
        ? marcos
            .map((m) => ({ id: m.id, data: m.data, alvo: Math.min(nItens, parseInt(m.alvo, 10) || 0) }))
            .filter((m) => m.data && m.alvo > 0)
            .sort((a, b) => a.data.localeCompare(b.data))
        : [];
    onSalvar({
      marcos: marcosOk,
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
    <FormMeta titulo={meta ? "Editar meta" : "Nova meta"} onFechar={onClose} onSalvar={salvar} espacoAcoes="mt-4">
      <LinhaForm className="mt-0">
        <Campo
          variante="compacto"
          type="text"
          className="flex-[1_1_0]"
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Alvo (ex.: Prova SEFAZ-BA)"
        />
      </LinhaForm>

      <LinhaForm fixa>
        <CelulaForm className="min-w-0 flex-[1_1_0]">
          <IconeForm icone="briefcase" titulo="Áreas" />
          <CaixaChips className="flex-[1_1_0]">
            {areas.map((a) => {
              const info = metaAreaInfo(a, areasRoda);
              return (
                <Etiqueta
                  key={a}
                  tom="area"
                  cor={info.color}
                  role="button"
                  className="cursor-pointer"
                  title="Tirar esta área"
                  onClick={() => toggleArea(a)}
                >
                  {info.label}
                </Etiqueta>
              );
            })}
            <AreaInput
              className="min-w-4 flex-[1_1_0]"
              semMoldura
              limpaAoEscolher
              label="Adicionar área"
              placeholder={areas.length ? "" : "+ área"}
              valor={novaArea}
              pool={sugestoes}
              onEscolher={(lbl) => {
                const v = lbl.trim();
                if (v && !areas.some((x) => x.toLowerCase() === v.toLowerCase())) setAreas([...areas, v]);
                setNovaArea("");
              }}
            />
          </CaixaChips>
        </CelulaForm>
        <CelulaForm className="flex-none">
          <IconeForm icone="calendar" titulo="Prazo" />
          <DateKbInput label="Prazo" className="w-[112px]" value={data} onChange={setData} />
        </CelulaForm>
      </LinhaForm>

      <DivisorForm />

      <LinhaForm fixa>
        <CelulaForm className="flex-none">
          <IconeForm icone="hashtag" titulo="Quantidade (opcional)" />
          <Campo
            variante="compacto"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="ex.: 4"
            className="w-[74px]"
            aria-label="Quantos itens"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
          />
        </CelulaForm>
        <CelulaForm>
          <IconeForm icone="infoCircle" titulo="Do quê?" />
          <Campo
            variante="compacto"
            type="text"
            placeholder="ex.: questões"
            aria-label="Tipo do item"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
          />
        </CelulaForm>
      </LinhaForm>

      {nItens > 0 && (
        <div className="mt-2.5" data-meta="marcos">
          {marcos.map((m, i) => (
            <LinhaForm fixa key={m.id} className="mt-1.5">
              <CelulaForm className="flex-none">
                <IconeForm icone="ticket" titulo="Marco: até esta data" />
                <DateKbInput
                  label="Data do marco"
                  className="w-[112px]"
                  value={m.data}
                  onChange={(v) => setMarcos(marcos.map((x, j) => (j === i ? { ...x, data: v } : x)))}
                />
              </CelulaForm>
              <CelulaForm>
                <Campo
                  variante="compacto"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={nItens}
                  placeholder={`de ${nItens}`}
                  aria-label="Itens até o marco"
                  value={m.alvo}
                  onChange={(e) => setMarcos(marcos.map((x, j) => (j === i ? { ...x, alvo: e.target.value } : x)))}
                />
              </CelulaForm>
              <BotaoIcone
                rotulo="Tirar este marco"
                semBorda
                onClick={() => setMarcos(marcos.filter((_, j) => j !== i))}
              >
                <Icon name="xmark" size={15} />
              </BotaoIcone>
            </LinhaForm>
          ))}
          <button
            type="button"
            className="mt-1.5 border-0 bg-transparent p-0 font-sans text-md text-caneta"
            onClick={() => setMarcos([...marcos, { id: uid(), data: "", alvo: "" }])}
          >
            + marco intermediário
          </button>
        </div>
      )}

      <LinhaForm>
        <IconeForm icone="scale" titulo="Peso no boletim" />
        <Toggle larga options={TAG_OPCOES} active={tag} onSelect={setTag} />
      </LinhaForm>

      <DivisorForm />

      <LinhaForm>
        <IconeForm icone="bell" titulo="Dias para trabalhar (nenhum marcado = todo dia)" />
        <ChipsDia
          className="min-w-0 flex-[1_1_0]"
          rotulos={DIAS_ABREV.map((l) => l.charAt(0).toUpperCase())}
          titulos={DIAS_ABREV}
          ativos={dias}
          onToggle={(d) => setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
        />
      </LinhaForm>

      {esc && (
        <Legenda className="mt-3">
          Vale <b>{total.toFixed(1)}</b> pontos no boletim <b>{ESCOPO_LABEL[esc]}</b>
          {nItens > 0
            ? `, creditados aos poucos: ${(total / nItens).toFixed(2)} por item.`
            : ". Informe a quantidade para pontuar item por item."}
        </Legenda>
      )}
    </FormMeta>
  );
}
