// Porta da tela ritual "Semana fechada" (renderSemanaFechada,
// index.html:13515-13565) — exibida após a virada de semana com a nota final,
// badge conquistado, delta em relação à semana anterior não dispensada,
// destaques de pontuação e campo de reflexão que vira nota comum.
// Desde 13/09/2026 (recomendação 6) é uma revisão guiada em três passos:
// (1) resultado + o que levo da semana, (2) rotinas que ficaram para trás,
// com troca de dias ali mesmo, (3) metas que vencem em breve + foco da
// semana. Tudo vira uma única nota com seções (títulos recolhíveis).
import { useEffect, useRef, useState } from "react";
import { Botao } from "../ui/Botao";
import { BotaoLink } from "../ui/BotaoLink";
import { AreaTexto } from "../ui/Campo";
import { Cartao } from "../ui/Cartao";
import { ChipsDia } from "../ui/ChipsDia";
import { Legenda } from "../ui/Legenda";
import { LinhaValor } from "../ui/LinhaValor";
import { RotuloSecao } from "../ui/RotuloSecao";
import { cn } from "../lib/cn";
import { useAppStore } from "../store/useAppStore";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME, DIAS_ABREV } from "../lib/constants";
import { DAY_LETTERS } from "../lib/schedule";
import { daysUntil } from "../lib/metas";
import {
  semanaFechadaPendente,
  calcularDeltaSemana,
  calcularCorSemana,
  formatarPeriodoSemana,
  tituloNotaReflexao,
  rotinasAtrasadasSemana,
  metasProximasSemana,
  notaRevisaoSemana,
} from "../lib/semanaFechada";

const PASSOS = ["Resultado", "Rotinas", "Próxima semana"];

function TextoCrescente({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);
  return <AreaTexto id={id} ref={ref} rows={2} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function SemanaFechada() {
  const gam = useAppStore((s) => s.gam);
  const goTo = useAppStore((s) => s.goTo);
  const marcarSemanaVista = useAppStore((s) => s.marcarSemanaVista);
  const addNote = useAppStore((s) => s.addNote);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const snoozes = useAppStore((s) => s.snoozes);
  const templates = useAppStore((s) => s.templates);
  const setRoutineDays = useAppStore((s) => s.setRoutineDays);

  const [passo, setPasso] = useState(0);
  const [reflexao, setReflexao] = useState("");
  const [foco, setFoco] = useState("");

  const semanas = gam.historico.semanas;
  const sem = semanaFechadaPendente(gam) || (semanas.length > 0 ? semanas[semanas.length - 1] : null);

  // lista e dias originais congelados ao abrir: trocar dias não tira a rotina da revisão
  const [atrasadas] = useState(() => (sem ? rotinasAtrasadasSemana(sem.inicioISO, routines, history, snoozes) : []));
  const [diasOriginais] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(routines.map((r) => [r.id, (r.schedule?.days || []).slice()]))
  );

  useEffect(() => {
    if (!sem) {
      goTo({ tab: "home", screen: "home" });
    }
  }, [sem, goTo]);

  if (!sem) return null;

  const delta = calcularDeltaSemana(sem, semanas);
  const cor = calcularCorSemana(sem, gam.config.notaMinima);
  const { label: periodoLabel } = formatarPeriodoSemana(sem.inicioISO);
  const metas = metasProximasSemana(templates);

  const nomesDias = (dias: number[]) => (dias.length ? [...dias].sort((a, b) => a - b).map((d) => DIAS_ABREV[d]).join(", ") : "—");
  const ajustes = atrasadas
    .map((a) => {
      const r = routines.find((x) => x.id === a.id);
      const antes = diasOriginais[a.id] || [];
      const depois = r?.schedule?.days || [];
      return nomesDias(antes) === nomesDias(depois) ? null : `${a.nome}: ${nomesDias(antes)} → ${nomesDias(depois)}`;
    })
    .filter((x): x is string => !!x);

  const sair = () => {
    marcarSemanaVista();
    goTo({ tab: "home", screen: "home" });
  };

  const handleSalvar = () => {
    const conteudo = notaRevisaoSemana({ reflexao, ajustes, foco });
    if (conteudo) addNote(tituloNotaReflexao(sem.inicioISO, sem.nota), conteudo);
    sair();
  };

  function alternarDia(id: string, d: number) {
    const r = routines.find((x) => x.id === id);
    const dias = r?.schedule?.days || [];
    const novos = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d];
    if (!novos.length) return; // não deixa a rotina sem nenhum dia
    setRoutineDays(id, novos);
  }

  const CARTAO = "mb-1.5";
  return (
    <div className="screen">
      <div className="mb-5 flex items-center justify-between gap-3">
        <BotaoLink tom="suave" id="sfSkip" onClick={sair}>
          Depois
        </BotaoLink>
        <Legenda aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {passo + 1}/{PASSOS.length} · {PASSOS[passo]}
        </Legenda>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="home-header mb-0.5">
          <h1>Semana fechada</h1>
        </div>
        <Legenda className="mb-3">{periodoLabel}</Legenda>

        {passo === 0 && (
          <>
            <Cartao className={`${CARTAO} text-center`}>
              <div className="font-sans text-[48px] font-semibold" style={{ color: cor }}>
                {sem.nota.toFixed(1)}
              </div>
              {sem.dispensada ? (
                <Legenda>semana dispensada — não entra na média do mês</Legenda>
              ) : (
                <Legenda>{sem.nota >= gam.config.notaMinima ? "aprovado" : `abaixo da nota mínima (${gam.config.notaMinima})`}</Legenda>
              )}
              {sem.badge && (
                <div className="mt-2.5 text-2xl" style={{ color: BADGE_COR[sem.badge] }}>
                  {BADGE_CHAR[sem.badge]} {BADGE_NOME[sem.badge]}
                </div>
              )}
              {delta !== null && (
                <Legenda className="mt-1.5">
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)} em relação à semana anterior
                </Legenda>
              )}
            </Cartao>

            {(sem.destaques || []).length > 0 && (
              <>
                <RotuloSecao>O que mais somou</RotuloSecao>
                <Cartao className={CARTAO}>
                  {sem.destaques!.map((d, i) => (
                    <LinhaValor key={i} rotulo={d.nome} valor={d.pontos.toFixed(1)} />
                  ))}
                </Cartao>
              </>
            )}

            <RotuloSecao>O que você leva dessa semana</RotuloSecao>
            <TextoCrescente id="sfReflexao" value={reflexao} onChange={setReflexao} placeholder="O que funcionou, o que atrapalhou..." />
          </>
        )}

        {passo === 1 && (
          <>
            <RotuloSecao>Rotinas que ficaram para trás</RotuloSecao>
            {atrasadas.length === 0 ? (
              <Cartao className={CARTAO}>
                <Legenda>Todas as rotinas agendadas foram feitas. Nada para ajustar.</Legenda>
              </Cartao>
            ) : (
              <Cartao className={CARTAO}>
                {atrasadas.map((a, i) => {
                  const r = routines.find((x) => x.id === a.id);
                  const porDias = !!r?.schedule && r.schedule.mode !== "intervalo";
                  return (
                    <div key={a.id} className={cn(i > 0 && "mt-3 border-t-[1.5px] border-line pt-3")}>
                      <LinhaValor rotulo={a.nome} valor={`${a.feitas} de ${a.planejadas}`} corValor="var(--erro)" />
                      {porDias ? (
                        <ChipsDia
                          className="mt-2"
                          rotulos={DAY_LETTERS}
                          titulos={DIAS_ABREV}
                          ativos={r!.schedule!.days}
                          onToggle={(d) => alternarDia(a.id, d)}
                        />
                      ) : (
                        <Legenda className="mt-3">Agendada por intervalo — ajuste no editor da rotina.</Legenda>
                      )}
                    </div>
                  );
                })}
                <Legenda className="mt-3">Tocar num dia já muda o agendamento. As mudanças entram na nota da revisão.</Legenda>
              </Cartao>
            )}
          </>
        )}

        {passo === 2 && (
          <>
            <RotuloSecao>Metas que vencem em breve</RotuloSecao>
            <Cartao className={CARTAO}>
              {metas.length === 0 ? (
                <Legenda>Nenhuma meta com prazo nos próximos 14 dias.</Legenda>
              ) : (
                metas.map((t) => {
                  const dias = daysUntil(t.date);
                  return (
                    <LinhaValor
                      key={t.id}
                      rotulo={t.title}
                      valor={`${t.topics != null ? `${t.done || 0}/${t.topics} · ` : ""}${dias === 0 ? "hoje" : `${dias} dia${dias > 1 ? "s" : ""}`}`}
                    />
                  );
                })
              )}
            </Cartao>
            <RotuloSecao>Foco da próxima semana</RotuloSecao>
            <TextoCrescente id="sfFoco" value={foco} onChange={setFoco} placeholder="Uma ou duas prioridades para a semana que começa..." />
          </>
        )}

        <div className="mt-4 flex gap-2">
          {passo > 0 && (
            <Botao variante="neutro" className="flex-[0_0_37%]" onClick={() => setPasso(passo - 1)}>
              Voltar
            </Botao>
          )}
          {passo < PASSOS.length - 1 ? (
            <Botao className="flex-1" onClick={() => setPasso(passo + 1)}>
              Próximo
            </Botao>
          ) : (
            <Botao className="flex-1" id="sfSalvar" onClick={handleSalvar}>
              Começar a semana
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
}
