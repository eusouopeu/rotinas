// Popup de meta recorrente (criar/editar). Meta negativa = limite de vezes; o
// toggle "pontua no boletim" saiu (12/09/2026): positiva sempre pontua,
// negativa nunca.
import { useState } from "react";
import type { GamificacaoState, MetaRecorrente, Tag } from "../../lib/types";
import { Campo } from "../../ui/Campo";
import { AreaInput, TimeKbInput } from "../../ui/CamposTexto";
import { Legenda } from "../../ui/Legenda";
import { Toggle } from "../../ui/Segmentado";
import { TAG_OPCOES } from "./constantes";
import { BotaoLigaForm, CelulaForm, FormMeta, IconeForm, LinhaForm, SepForm } from "./FormMeta";
import { Icon } from "../../components/Icon";


type Props = {
  rec: MetaRecorrente | null;
  gam: GamificacaoState;
  onClose: () => void;
  onSave: (dados: Omit<MetaRecorrente, "id" | "criadoEm" | "progresso">) => void;
};

export function FormMetaRec({ rec, gam, onClose, onSave }: Props) {
  const [titulo, setTitulo] = useState(rec?.titulo ?? "");
  const [tipo, setTipo] = useState<"diaria" | "semanal">(rec?.tipo ?? "diaria");
  const [negativa, setNegativa] = useState(rec?.negativa ?? false);
  const [vezes, setVezes] = useState(rec?.vezes ?? 4);
  const [pontua, setPontua] = useState(rec?.pontua ?? false);
  const [tagValor, setTagValor] = useState<Tag>(rec?.tagValor ?? "medio");
  const [area, setArea] = useState<string | null>(rec?.area ?? null);
  const [notifOn, setNotifOn] = useState(!!rec?.notif);
  const [notifIni, setNotifIni] = useState(rec?.notif?.inicio ?? "08:00");
  const [notifFim, setNotifFim] = useState(rec?.notif?.fim ?? "18:00");

  function salvar() {
    const t = titulo.trim();
    if (!t) return;
    const notif = tipo === "diaria" && notifOn && notifIni && notifFim ? { inicio: notifIni, fim: notifFim } : null;
    onSave({ titulo: t, tipo, vezes: Math.max(1, vezes || 1), area, notif, negativa, pontua, tagValor });
  }

  const lembrando = tipo === "diaria" && notifOn;

  return (
    <FormMeta titulo={rec ? "Editar meta" : "Nova meta"} onFechar={onClose} onSalvar={salvar}>
      <LinhaForm className="mt-0">
        <Campo
          variante="compacto"
          type="text"
          className="flex-[1_1_0]"
          placeholder="Alvo (ex.: Beber água)"
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </LinhaForm>

      <LinhaForm fixa>
        <CelulaForm className="flex-none">
          <IconeForm icone="hashtag" titulo={negativa ? "Limite de vezes" : "Quantas vezes"} />
          <Campo
            variante="compacto"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            placeholder="ex.: 4"
            aria-label={negativa ? "Limite de vezes" : "Quantas vezes"}
            className="w-[74px]"
            value={vezes}
            onChange={(e) => setVezes(Math.max(1, +e.target.value || 1))}
          />
        </CelulaForm>
        <CelulaForm className="flex-[0_1_auto]">
          <IconeForm icone="clock" titulo="Frequência" />
          <Toggle
            className="min-w-0 flex-auto [&>span]:whitespace-nowrap"
            options={[
              { key: "diaria", label: "diária" },
              { key: "semanal", label: "semanal" },
            ]}
            active={tipo}
            onSelect={setTipo}
          />
        </CelulaForm>
        <BotaoLigaForm
          ligado={negativa}
          title="Meta negativa (limite de vezes)"
          aria-label="Meta negativa"
          onClick={() => {
            const v = !negativa;
            setNegativa(v);
            setPontua(!v);
          }}
        >
          <Icon name="minusCircle" size={17} />
        </BotaoLigaForm>
      </LinhaForm>

      <LinhaForm>
        <IconeForm icone="ticket" titulo={negativa ? "Peso da penalidade" : "Peso no boletim"} />
        <Toggle larga options={TAG_OPCOES} active={tagValor} onSelect={setTagValor} />
      </LinhaForm>

      {gam.config.roda.ativa && gam.config.roda.areas.length > 0 && (
        <LinhaForm>
          <IconeForm icone="briefcase" titulo="Área" />
          <AreaInput
            className="min-w-0 flex-[1_1_0]"
            label="Área"
            placeholder="Sem área"
            valor={gam.config.roda.areas.find((a) => a.id === area)?.label || ""}
            pool={gam.config.roda.areas.map((a) => a.label)}
            onEscolher={(lbl) => {
              const achada = gam.config.roda.areas.find((a) => a.label.toLowerCase() === lbl.trim().toLowerCase());
              setArea(achada ? achada.id : null);
            }}
          />
        </LinhaForm>
      )}

      <LinhaForm>
        <IconeForm icone="bell" titulo="Lembretes (só quando é diária)" />
        <BotaoLigaForm
          ligado={lembrando}
          title="Lembrar em horários fixos"
          aria-label="Lembrar em horários fixos"
          disabled={tipo !== "diaria"}
          onClick={() => setNotifOn(!notifOn)}
        >
          <Icon name="check" size={17} />
        </BotaoLigaForm>
        <SepForm>das</SepForm>
        <TimeKbInput
          variante="formulario"
          className="min-w-0 flex-[1_1_0]"
          label="Lembrar a partir de"
          disabled={tipo !== "diaria" || !notifOn}
          value={notifIni}
          onChange={setNotifIni}
        />
        <SepForm>até</SepForm>
        <TimeKbInput
          variante="formulario"
          className="min-w-0 flex-[1_1_0]"
          label="Lembrar até"
          disabled={tipo !== "diaria" || !notifOn}
          value={notifFim}
          onChange={setNotifFim}
        />
      </LinhaForm>

      {negativa && <Legenda className="mt-2.5">Marque cada vez que acontecer. Passar do limite desconta do boletim.</Legenda>}
    </FormMeta>
  );
}
