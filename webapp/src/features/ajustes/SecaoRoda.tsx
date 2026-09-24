// Áreas da roda da vida: liga/desliga a repartição de pontos, edita nome, cor e
// peso de cada área e remove (com aviso de quantas rotinas ficam sem área).
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/Icon";
import { Botao } from "../../ui/Botao";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Campo } from "../../ui/Campo";
import { CampoCor } from "../../ui/CampoCor";
import { CampoNumero, LinhaNumero } from "../../ui/CampoNumero";
import { Legenda } from "../../ui/Legenda";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { Switch } from "../../ui/Switch";
import { SecaoAjuste } from "./SecaoAjuste";

export function SecaoRoda() {
  const gam = useAppStore((s) => s.gam);
  const routines = useAppStore((s) => s.routines);
  const updateGamConfig = useAppStore((s) => s.updateGamConfig);
  const addRodaArea = useAppStore((s) => s.addRodaArea);
  const updateRodaArea = useAppStore((s) => s.updateRodaArea);
  const removeRodaArea = useAppStore((s) => s.removeRodaArea);
  const [novaArea, setNovaArea] = useState("");
  const [areaParaRemover, setAreaParaRemover] = useState<string | null>(null);
  const c = gam.config;
  const semArea = areaParaRemover ? routines.filter((r) => r.eixo === areaParaRemover).length : 0;

  function adicionar() {
    if (!novaArea.trim()) return;
    addRodaArea(novaArea);
    setNovaArea("");
  }

  return (
    <SecaoAjuste titulo="Roda da vida">
      <div className="pt-2.5">
        <Switch
          checked={c.roda.ativa}
          onChange={(ativa) => updateGamConfig({ roda: { ...c.roda, ativa } })}
        >
          Repartir os pontos por área
        </Switch>
        {c.roda.areas.map((a) => (
          <div className="flex items-center gap-2" key={a.id}>
            <CampoCor
              title="Cor da área"
              aria-label="Cor da área — usada também nas rotinas dessa área"
              value={a.color.startsWith("#") ? a.color : "#6D28D9"}
              onChange={(e) => updateRodaArea(a.id, { color: e.target.value })}
            />
            <input
              type="text"
              aria-label="Nome da área"
              className="min-w-0 flex-auto border-0 bg-transparent px-0.5 py-1.5 font-sans text-base focus:border-b-[1.5px] focus:border-line focus:outline-none"
              style={{ color: a.color }}
              value={a.label}
              onChange={(e) => updateRodaArea(a.id, { label: e.target.value })}
            />
            <CampoNumero
              className="w-11 flex-[0_0_44px] text-right"
              min={1}
              max={10}
              value={a.peso}
              onChange={(e) => updateRodaArea(a.id, { peso: Math.max(1, +e.target.value || 1) })}
            />
            <BotaoIcone rotulo="Remover área" semBorda className="text-erro" onClick={() => setAreaParaRemover(a.id)}>
              <Icon name="trash" size={15} />
            </BotaoIcone>
          </div>
        ))}
        {c.roda.areas.length === 0 && <Legenda>Nenhuma área — adicione abaixo.</Legenda>}
        <div className="mt-2.5 flex gap-2">
          <Campo
            variante="linha"
            type="text"
            placeholder="Nova área"
            className="min-w-0 flex-1"
            value={novaArea}
            onChange={(e) => setNovaArea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <Botao variante="neutro" className="shrink-0" onClick={adicionar}>
            Adicionar
          </Botao>
        </div>
        <LinhaNumero
          className="mt-3"
          rotulo='Peso de "sem área"'
          min={1}
          max={10}
          value={c.roda.pesoSemArea}
          onChange={(e) =>
            updateGamConfig({ roda: { ...c.roda, pesoSemArea: Math.max(1, Math.min(10, +e.target.value || 5)) } })
          }
        />
      </div>

      {/* o legado (index.html:14097-14106) avisa quantas rotinas ficam sem
          área antes de remover, porque o vínculo some junto */}
      {areaParaRemover && (
        <Modal onFechar={() => setAreaParaRemover(null)}>
          <ModalTexto className="mb-2">
            Remover a área?
            {semArea > 0 && (
              <>
                {" "}
                <b>{semArea}</b> rotina(s) ficam sem área.
              </>
            )}
          </ModalTexto>
          <ModalAcoes>
            <Botao variante="neutro" tamanho="modal" onClick={() => setAreaParaRemover(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="destrutivo"
              tamanho="modal"
              onClick={() => {
                removeRodaArea(areaParaRemover);
                setAreaParaRemover(null);
              }}
            >
              Remover
            </Botao>
          </ModalAcoes>
        </Modal>
      )}
    </SecaoAjuste>
  );
}
