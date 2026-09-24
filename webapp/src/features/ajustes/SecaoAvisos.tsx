// Notificações, som/vibração e cronômetro num único accordion (pedido do
// Pedro, 22/09/2026): são três faces do mesmo assunto — como o app te avisa.
import { useAppStore } from "../../store/useAppStore";
import { isNative } from "../../lib/storage";
import { alarmCue } from "../../lib/haptics";
import type { SomModo } from "../../lib/sound";
import { Botao } from "../../ui/Botao";
import { ChipsDia } from "../../ui/ChipsDia";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Toggle } from "../../ui/Segmentado";
import { Switch } from "../../ui/Switch";
import { LinhaValor } from "../../ui/LinhaValor";
import { SecaoAjuste } from "./SecaoAjuste";

const DIA_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];
const SOM_MODOS: SomModo[] = ["mudo", "suave", "normal"];
const CRONOMETRO_MODOS = [
  { key: "off", label: "não mostrar" },
  { key: "barra", label: "barra" },
  { key: "bolha", label: "bolha" },
] as const;

const TEXTO_CRONOMETRO = {
  off: "O tempo restante só aparece dentro do app.",
  barra: "Contagem regressiva na barra de status e na tela de bloqueio, como o timer do relógio do celular.",
  bolha:
    "Bolha flutuante com o tempo restante por cima de outros apps. Exige a permissão “Sobrepor a outros apps”. A notificação obrigatória do Android fica discreta — e só vira contagem na barra quando a tela apaga, quando a bolha não dá para ver.",
};

export function SecaoAvisos() {
  const digestSemanal = useAppStore((s) => s.digestSemanal);
  const setDigestSemanal = useAppStore((s) => s.setDigestSemanal);
  const nudge = useAppStore((s) => s.nudge);
  const setNudge = useAppStore((s) => s.setNudge);
  const nudgeDias = useAppStore((s) => s.nudgeDias);
  const toggleNudgeDia = useAppStore((s) => s.toggleNudgeDia);
  const nudgeMetas = useAppStore((s) => s.nudgeMetas);
  const setNudgeMetas = useAppStore((s) => s.setNudgeMetas);
  const nudgeStreak = useAppStore((s) => s.nudgeStreak);
  const setNudgeStreak = useAppStore((s) => s.setNudgeStreak);
  const somModo = useAppStore((s) => s.somModo);
  const setSomModo = useAppStore((s) => s.setSomModo);
  const vibracao = useAppStore((s) => s.vibracao);
  const setVibracao = useAppStore((s) => s.setVibracao);
  const cronometroModo = useAppStore((s) => s.cronometroModo);
  const setCronometroModo = useAppStore((s) => s.setCronometroModo);

  return (
    <SecaoAjuste
      titulo="Avisos e cronômetro"
      busca="notificações resumo semanal aviso de ritmo meta perto do prazo sequência em risco som vibração aviso sonoro mudo suave cronômetro barra bolha fora do app"
    >
      <RotuloSecao className="mt-0">Notificações</RotuloSecao>
      <div className="pt-2.5">
        <Switch checked={digestSemanal} onChange={setDigestSemanal}>
          Resumo ao fechar a semana
        </Switch>
        <Switch className="mt-3" checked={nudge} onChange={setNudge}>
          Aviso de ritmo
        </Switch>
        <ChipsDia className="mt-2.5" rotulos={DIA_LABEL} ativos={nudgeDias} onToggle={toggleNudgeDia} />
        <Legenda className="mt-3">Nos dias marcados, a partir das 9h, quando a semana está atrasada.</Legenda>
        <Switch className="mt-3" checked={nudgeMetas} onChange={setNudgeMetas}>
          Meta perto do prazo
        </Switch>
        <Switch className="mt-3" checked={nudgeStreak} onChange={setNudgeStreak}>
          Sequência em risco
        </Switch>
        <Legenda className="mt-3">
          Meta: uma vez por dia quando falta até 2 dias para o prazo. Sequência: a partir das 18h, quando uma rotina de
          hoje com sequência longa ainda não foi feita.
        </Legenda>
      </div>

      <RotuloSecao>Som e vibração</RotuloSecao>
      <div className="pt-2.5">
        <LinhaValor rotulo="Aviso sonoro">
          <Toggle options={SOM_MODOS.map((m) => ({ key: m, label: m }))} active={somModo} onSelect={setSomModo} />
        </LinhaValor>
        <Switch className="mt-3" checked={vibracao} onChange={setVibracao}>
          Vibrar
        </Switch>
        <LinhaValor className="mt-3" rotulo="Testar">
          <Botao variante="pilula" onClick={() => alarmCue()}>
            tocar
          </Botao>
        </LinhaValor>
      </div>

      {isNative && (
        <>
          <RotuloSecao>Cronômetro</RotuloSecao>
          <div className="pt-2.5">
            <LinhaValor rotulo="Fora do app">
              <Toggle
                options={CRONOMETRO_MODOS.map(({ key, label }) => ({ key, label }))}
                active={cronometroModo}
                onSelect={(m) => void setCronometroModo(m)}
              />
            </LinhaValor>
            <Legenda className="mt-3">{TEXTO_CRONOMETRO[cronometroModo]}</Legenda>
          </div>
        </>
      )}
    </SecaoAjuste>
  );
}
