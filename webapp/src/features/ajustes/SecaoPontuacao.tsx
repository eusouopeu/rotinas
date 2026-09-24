// Pontuação do boletim: o dia a dia só precisa da nota mínima; hábito
// consolidado, vagas, multiplicadores, bônus e a simulação ficam em "Avançado".
import { useContext, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/Icon";
import { inicioSemanaISO } from "../../lib/gamificacao";
import { simularDistribuicaoSemana } from "../../lib/scoring";
import { Botao } from "../../ui/Botao";
import { LinhaNumero } from "../../ui/CampoNumero";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Switch } from "../../ui/Switch";
import { FiltroAjustes, SecaoAjuste } from "./SecaoAjuste";

const NIVEIS = ["alto", "medio", "baixo"] as const;
const NIVEL_LABEL = { alto: "Alto", medio: "Médio", baixo: "Baixo" };
const PERIODOS = ["mensal", "trimestral", "anual"] as const;

export function SecaoPontuacao() {
  const gam = useAppStore((s) => s.gam);
  const routines = useAppStore((s) => s.routines);
  const updateGamConfig = useAppStore((s) => s.updateGamConfig);
  const busca = useContext(FiltroAjustes);
  const [avancado, setAvancado] = useState(false);
  const c = gam.config;
  const simulacao = useMemo(() => simularDistribuicaoSemana(routines, gam, inicioSemanaISO(new Date())), [routines, gam]);
  const mostrarAvancado = avancado || !!busca.trim();

  return (
    <SecaoAjuste
      titulo="Pontuação do boletim"
      busca="avançado hábito consolidado vagas nível de peso multiplicadores bônus meta simulação"
    >
      <div className="pt-2.5">
        <LinhaNumero
          className="mt-0"
          rotulo="Nota mínima para aprovar"
          min={1}
          max={100}
          value={c.notaMinima}
          onChange={(e) => updateGamConfig({ notaMinima: Math.max(1, +e.target.value || 60) })}
        />
        <Botao
          variante="pilula"
          className="mt-3 inline-flex items-center gap-1.5"
          aria-expanded={mostrarAvancado}
          onClick={() => setAvancado((v) => !v)}
        >
          Avançado
          <Icon name={mostrarAvancado ? "chevronUp" : "chevronDown"} size={13} />
        </Botao>
      </div>
      {mostrarAvancado && (
        <>
          <RotuloSecao>Hábito consolidado</RotuloSecao>
          <div className="pt-2.5">
            <Switch
              checked={c.habito.ativo}
              onChange={(ativo) => updateGamConfig({ habito: { ...c.habito, ativo } })}
            >
              Descontar rotina que virou hábito
            </Switch>
            <LinhaNumero
              className="mt-2.5"
              rotulo="Dias seguidos para virar hábito"
              min={3}
              max={365}
              value={c.habito.streakMin}
              onChange={(e) => updateGamConfig({ habito: { ...c.habito, streakMin: Math.max(3, +e.target.value || 3) } })}
            />
            <LinhaNumero
              rotulo="Quanto ela passa a valer"
              min={0.1}
              max={1}
              step={0.05}
              value={c.habito.fator}
              onChange={(e) => updateGamConfig({ habito: { ...c.habito, fator: +e.target.value || 0.6 } })}
            />
          </div>

          <RotuloSecao>Vagas por nível de peso</RotuloSecao>
          <div className="pt-2.5">
            {NIVEIS.map((nivel) => (
              <LinhaNumero
                key={nivel}
                className={nivel === "alto" ? "mt-0" : undefined}
                rotulo={NIVEL_LABEL[nivel]}
                min={0}
                max={99}
                value={c.vagas[nivel]}
                onChange={(e) => updateGamConfig({ vagas: { ...c.vagas, [nivel]: Math.max(0, +e.target.value || 0) } })}
              />
            ))}
          </div>

          <RotuloSecao>Valor de cada nível de peso</RotuloSecao>
          <div className="pt-2.5">
            {NIVEIS.map((nivel) => (
              <LinhaNumero
                key={nivel}
                className={nivel === "alto" ? "mt-0" : undefined}
                rotulo={NIVEL_LABEL[nivel]}
                step={0.25}
                min={nivel === "baixo" ? 0.25 : nivel === "medio" ? 0.5 : 1}
                max={10}
                value={c.multiplicadores[nivel]}
                onChange={(e) =>
                  updateGamConfig({
                    multiplicadores: { ...c.multiplicadores, [nivel]: +e.target.value || c.multiplicadores[nivel] },
                  })
                }
              />
            ))}
            <LinhaNumero
              rotulo="Duração de referência (min)"
              min={5}
              max={240}
              value={c.divisorDuracao}
              onChange={(e) => updateGamConfig({ divisorDuracao: Math.max(5, +e.target.value || 30) })}
            />
            <Legenda className="mt-3.5 mb-1.5">Bônus por meta concluída, no escopo definido pelo prazo dela.</Legenda>
            {PERIODOS.map((periodo) => (
              <LinhaNumero
                key={periodo}
                className={periodo === "mensal" ? "mt-0" : undefined}
                rotulo={`Meta ${periodo}`}
                min={0}
                max={100}
                value={c.pontosMeta[periodo]}
                onChange={(e) =>
                  updateGamConfig({ pontosMeta: { ...c.pontosMeta, [periodo]: Math.max(0, +e.target.value || 0) } })
                }
              />
            ))}
            <Legenda className="mt-3">Vale para as próximas semanas — a semana atual já está com o fator congelado.</Legenda>

            <RotuloSecao className="mt-3.5 mb-1">Simulação — próxima semana</RotuloSecao>
            {simulacao.length === 0 ? (
              <Legenda className="mt-3">Nada agendado esta semana — a escala padrão vale 100 pts.</Legenda>
            ) : (
              <Legenda className="mt-3">
                {simulacao.slice(0, 6).map((s) => (
                  <div key={s.routineId}>
                    {s.routineName} — {s.pontos.toFixed(1)} pts
                  </div>
                ))}
              </Legenda>
            )}
          </div>
        </>
      )}
    </SecaoAjuste>
  );
}
