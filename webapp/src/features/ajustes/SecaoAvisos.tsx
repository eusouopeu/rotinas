// Notificações, som/vibração e cronômetro num único accordion (pedido do
// Pedro, 22/09/2026): são três faces do mesmo assunto — como o app te avisa.
import { Ajuda } from "../../ui/Ajuda";
import { useAppStore } from "../../store/useAppStore";
import { isNative } from "../../lib/storage";
import { alarmCue } from "../../lib/haptics";
import type { SomModo } from "../../lib/sound";
import { Botao } from "../../ui/Botao";
import { ChipsDia } from "../../ui/ChipsDia";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Toggle } from "../../ui/Segmentado";
import { Switch } from "../../ui/Switch";
import { useState } from "react";
import { K_LEMBRETEGASTO } from "../../lib/constants";
import { lembreteGastoLigado, syncLembreteGasto } from "../../lib/lembreteGasto";
import { save } from "../../lib/storage";
import { LinhaValor } from "../../ui/LinhaValor";
import { SecaoAjuste } from "./SecaoAjuste";
import { DiagnosticoCronometro } from "./DiagnosticoCronometro";
import { definirNotificacoes, notificacoesDesligadas } from "../../lib/notificacoesGerais";
import {
  algumSnoozeAtivo,
  recorrentesAtuais,
  syncCompromissoNotifications,
  syncMetaRecNotifications,
  syncRoutineNotifications,
} from "../../store/shared";

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
  const templates = useAppStore((s) => s.templates);
  const [lembreteGasto, setLembreteGasto] = useState(lembreteGastoLigado);
  const naoFalharDois = useAppStore((s) => s.naoFalharDois);
  const setNaoFalharDois = useAppStore((s) => s.setNaoFalharDois);
  const [notifsLigadas, setNotifsLigadas] = useState(() => !notificacoesDesligadas());

  function alternarNotificacoes(v: boolean) {
    setNotifsLigadas(v);
    void definirNotificacoes(v, () => {
      // religar refaz as agendas que o boot faria
      const st = useAppStore.getState();
      const snoozed = algumSnoozeAtivo(st.snoozes);
      void syncCompromissoNotifications(st.compromissos, snoozed);
      void syncRoutineNotifications(st.routines, snoozed);
      void syncMetaRecNotifications(recorrentesAtuais(st.templates), snoozed);
      syncLembreteGasto(st.templates, lembreteGastoLigado());
    });
  }
  const cronometroModo = useAppStore((s) => s.cronometroModo);
  const setCronometroModo = useAppStore((s) => s.setCronometroModo);

  return (
    <SecaoAjuste
      titulo="Avisos e cronômetro"
      busca="notificações lembrete de gastos despesa resumo semanal aviso de ritmo meta perto do prazo sequência em risco som vibração aviso sonoro mudo suave cronômetro barra bolha fora do app"
    >
      <RotuloSecao className="mt-0">Notificações</RotuloSecao>
      <div className="pt-2.5">
        <Switch checked={notifsLigadas} onChange={alternarNotificacoes} data-notifs="geral">
          Notificações do app{" "}
          <Ajuda rotulo="Sobre as notificações">
            Desligado, o app não manda nenhum aviso ao sistema: nem o que desce na tela e some, nem o que fica na barra
            de notificações. O cronômetro tem ajuste próprio, em “Fora do app”.
          </Ajuda>
        </Switch>
      </div>
      <div
        className={notifsLigadas ? "pt-2.5" : "pointer-events-none pt-2.5 opacity-45"}
        aria-disabled={!notifsLigadas}
      >
        <Switch checked={digestSemanal} onChange={setDigestSemanal}>
          Resumo ao fechar a semana
        </Switch>
        <Switch className="mt-3" checked={nudge} onChange={setNudge}>
          Aviso de ritmo <Ajuda>Nos dias marcados, a partir das 9h, quando a semana está atrasada.</Ajuda>
        </Switch>
        <ChipsDia className="mt-2.5" rotulos={DIA_LABEL} ativos={nudgeDias} onToggle={toggleNudgeDia} />
        <Switch className="mt-3" checked={nudgeMetas} onChange={setNudgeMetas}>
          Meta perto do prazo <Ajuda>Uma vez por dia, quando falta até 2 dias para o prazo.</Ajuda>
        </Switch>
        <Switch className="mt-3" checked={nudgeStreak} onChange={setNudgeStreak}>
          Sequência em risco{" "}
          <Ajuda>A partir das 18h, quando uma rotina de hoje com sequência longa ainda não foi feita.</Ajuda>
        </Switch>
        <Switch
          className="mt-3"
          checked={lembreteGasto}
          onChange={(v) => {
            save(K_LEMBRETEGASTO, v);
            setLembreteGasto(v);
            syncLembreteGasto(templates, v);
          }}
        >
          Lembrete de gastos às 21h <Ajuda>Só nos dias sem nenhuma despesa lançada; o toque abre a Nova despesa.</Ajuda>
        </Switch>
        <Switch className="mt-3" checked={naoFalharDois} onChange={setNaoFalharDois}>
          Nunca falhar dois dias{" "}
          <Ajuda>
            Marca "não falhar hoje" no cartão da rotina ou da meta diária que ficou sem fazer na última vez. Só visual,
            sem notificação.
          </Ajuda>
        </Switch>
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
            <LinhaValor
              rotulo={
                <>
                  Fora do app <Ajuda>{TEXTO_CRONOMETRO[cronometroModo]}</Ajuda>
                </>
              }
            >
              <Toggle
                options={CRONOMETRO_MODOS.map(({ key, label }) => ({ key, label }))}
                active={cronometroModo}
                onSelect={(m) => void setCronometroModo(m)}
              />
            </LinhaValor>
            {cronometroModo !== "off" && <DiagnosticoCronometro />}
          </div>
        </>
      )}
    </SecaoAjuste>
  );
}
