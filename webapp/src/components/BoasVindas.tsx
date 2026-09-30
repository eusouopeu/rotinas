// Primeira abertura guiada (recomendação 12 de 30/09/2026): dois passos num
// app vazio — áreas da roda da vida e rotinas prontas. "Pular" e "Concluir"
// gravam a marca local e o aviso não volta.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { AREAS_SUGERIDAS, deveMostrarBoasVindas, marcarBoasVindasVistas } from "../lib/boasVindas";
import { montarRotinaPronta, ROTINAS_PRONTAS } from "../lib/rotinasProntas";
import { Botao } from "../ui/Botao";
import { BotaoLink } from "../ui/BotaoLink";
import { cn } from "../lib/cn";
import { Chip } from "../ui/Chip";
import { Legenda } from "../ui/Legenda";
import { Modal, ModalAcoes, ModalTexto } from "../ui/Modal";

export function BoasVindas() {
  const routines = useAppStore((s) => s.routines);
  const notes = useAppStore((s) => s.notes);
  const history = useAppStore((s) => s.history);
  const gam = useAppStore((s) => s.gam);
  const addRodaArea = useAppStore((s) => s.addRodaArea);
  const updateGamConfig = useAppStore((s) => s.updateGamConfig);
  const upsertExercicio = useAppStore((s) => s.upsertExercicio);
  const importRotinaShare = useAppStore((s) => s.importRotinaShare);
  // decidido uma vez ao montar: criar a 1ª área já tiraria o app de "vazio"
  const [aberto, setAberto] = useState(() => deveMostrarBoasVindas({ routines, notes, history, gam }));
  const [passo, setPasso] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [rotinas, setRotinas] = useState<string[]>([]);

  if (!aberto) return null;

  const alternar = (lista: string[], item: string) =>
    lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];

  function concluir() {
    AREAS_SUGERIDAS.filter((a) => areas.includes(a.label)).forEach((a) => addRodaArea(a.label, a.color));
    if (areas.length) updateGamConfig({ roda: { ...useAppStore.getState().gam.config.roda, ativa: true } });
    ROTINAS_PRONTAS.filter((t) => rotinas.includes(t.name)).forEach((tpl) => {
      const r = montarRotinaPronta(tpl, useAppStore.getState().exercicios, (nome, grupo) =>
        upsertExercicio({ nome, grupos: [grupo], pesoAtual: 0 })
      );
      importRotinaShare(r);
    });
    fechar();
  }

  function fechar() {
    marcarBoasVindasVistas();
    setAberto(false);
  }

  return (
    <Modal className="text-left">
      <ModalTexto className="mb-1">{passo === 0 ? "Boas-vindas ao Rotinas" : "Para começar"}</ModalTexto>
      {passo === 0 ? (
        <>
          <Legenda className="mb-3">
            Quais áreas da vida você quer acompanhar? Elas formam a roda da vida e dão cor às rotinas.
          </Legenda>
          <div className="mb-2 flex flex-wrap gap-2">
            {AREAS_SUGERIDAS.map((a) => (
              <Chip
                key={a.label}
                role="checkbox"
                aria-checked={areas.includes(a.label)}
                ativo={areas.includes(a.label)}
                cor={a.color}
                className="text-md"
                onClick={() => setAreas(alternar(areas, a.label))}
              >
                {a.label}
              </Chip>
            ))}
          </div>
        </>
      ) : (
        <>
          <Legenda className="mb-3">Escolha rotinas prontas para ajustar depois (ou crie a sua).</Legenda>
          <div className="mb-2 flex flex-col gap-2">
            {ROTINAS_PRONTAS.map((t) => {
              const on = rotinas.includes(t.name);
              return (
                <button
                  key={t.name}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setRotinas(alternar(rotinas, t.name))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-app-sm border-[1.5px] bg-card px-3.5 py-2.5 text-left text-ink",
                    on ? "border-caneta" : "border-line"
                  )}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="min-w-0 flex-auto">
                    <b className="block">{t.name}</b>
                    <span className="font-sans text-sm text-sub">{t.descricao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <ModalAcoes className="mt-3.5 items-center">
        <BotaoLink tom="suave" onClick={fechar}>
          Pular
        </BotaoLink>
        {passo === 0 ? (
          <Botao variante="solido" tamanho="modal" onClick={() => setPasso(1)}>
            Próximo
          </Botao>
        ) : (
          <Botao variante="solido" tamanho="modal" onClick={concluir}>
            Concluir
          </Botao>
        )}
      </ModalAcoes>
    </Modal>
  );
}
