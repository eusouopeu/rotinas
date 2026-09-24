// Popup de meta com prazo (criar/editar) — porta de abrirFormMeta
// (index.html:8175-8265): título, prazo, quantidade + unidade, áreas (texto
// livre, os eixos da roda entram como sugestão), dias para trabalhar e peso no
// boletim, com o aviso de escopo/pontos ao vivo.
import { useState } from "react";
import { DIAS_ABREV } from "../../lib/constants";
import { metaAreaInfo, metaAreasPool, metaEscopo, metaPontosTotais } from "../../lib/metas";
import type { CountdownDoc, GamificacaoState, MetaTarget, Tag } from "../../lib/types";
import { Campo } from "../../ui/Campo";
import { AreaInput, DateKbInput } from "../../ui/CamposTexto";
import { Chip } from "../../ui/Chip";
import { ChipsDia } from "../../ui/ChipsDia";
import { Legenda } from "../../ui/Legenda";
import { Toggle } from "../../ui/Segmentado";
import { ESCOPO_LABEL, TAG_OPCOES } from "./constantes";
import { CelulaForm, FormMeta, IconeForm, LinhaForm } from "./FormMeta";

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

      <LinhaForm>
        <IconeForm icone="ticket" titulo="Peso no boletim" />
        <Toggle larga options={TAG_OPCOES} active={tag} onSelect={setTag} />
      </LinhaForm>

      {areas.length > 0 && (
        <div className="mt-2.5 flex flex-1 flex-wrap gap-1.5">
          {areas.map((a) => {
            const info = metaAreaInfo(a, areasRoda);
            return (
              <Chip key={a} ativo cor={info.color} onClick={() => toggleArea(a)}>
                {info.label}
              </Chip>
            );
          })}
        </div>
      )}

      <LinhaForm>
        <CelulaForm className="flex-[0_1_auto]">
          <IconeForm icone="calendar" titulo="Prazo" />
          <DateKbInput label="Prazo" value={data} onChange={setData} />
        </CelulaForm>
        <CelulaForm>
          <IconeForm icone="briefcase" titulo="Áreas" />
          <AreaInput
            className="min-w-0 flex-[1_1_0]"
            limpaAoEscolher
            label="Adicionar área"
            placeholder="+ área"
            valor={novaArea}
            pool={sugestoes}
            onEscolher={(lbl) => {
              const v = lbl.trim();
              if (v && !areas.some((x) => x.toLowerCase() === v.toLowerCase())) setAreas([...areas, v]);
              setNovaArea("");
            }}
          />
        </CelulaForm>
      </LinhaForm>

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
