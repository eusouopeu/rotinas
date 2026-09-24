// O miolo do player, por tipo de etapa: o disco de tempo (etapa de tempo e
// pausa), o exercício (série em andamento / descanso entre séries) e a etapa
// simples (só um "feito").
import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { CirculoCheck } from "../../ui/CirculoCheck";
import { Legenda } from "../../ui/Legenda";
import { cn } from "../../lib/cn";
import { fmtTime } from "../../lib/format";

const TITULO_ETAPA = "font-sans text-lg tracking-[0.04em] text-sub uppercase paisagem:text-sm";

type DiscoProps = { restante: number; total: number; descanso: boolean; titulo: string; nome: string };

/** Anel de progresso (o arco encolhe conforme o tempo passa) com o relógio no meio. */
export function DiscoTempo({ restante, total, descanso, titulo, nome }: DiscoProps) {
  const raio = 116;
  const c = 2 * Math.PI * raio;
  const fracao = Math.max(restante, 0) / (total || 1);
  return (
    <div className="relative my-2 flex size-[min(72vw,280px)] items-center justify-center paisagem:m-0 paisagem:size-[min(36vh,190px)]">
      <svg viewBox="0 0 260 260" className="size-full -rotate-90 transition-[filter] duration-300">
        <circle className="stroke-line" cx={130} cy={130} r={raio} fill="none" strokeWidth={10} />
        <circle
          className={descanso ? "stroke-ok" : "stroke-caneta"}
          cx={130}
          cy={130}
          r={raio}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * fracao}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1.5 font-sans text-lg font-medium">
        <div className={TITULO_ETAPA}>{titulo}</div>
        <div className={cn("text-[50px] tracking-[-1px] paisagem:text-[34px]", restante < 0 && "text-erro")}>
          {fmtTime(restante)}
        </div>
        <div
          className={cn(
            "max-w-[200px] text-center font-titulo text-xl font-medium paisagem:max-w-[150px] paisagem:text-md",
            descanso ? "text-ok" : "text-sub"
          )}
        >
          {nome}
        </div>
      </div>
    </div>
  );
}

function Miolo({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[22px] px-5 py-6 paisagem:flex-none paisagem:gap-3 paisagem:p-2.5">
      {children}
    </div>
  );
}

const Nome = ({ children }: { children: ReactNode }) => (
  <h2 className="text-center text-[26px] paisagem:text-[20px]">{children}</h2>
);

function CampoSerie({
  rotulo,
  largura,
  ...input
}: { rotulo: string; largura: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col items-center gap-1 text-sm text-sub">
      {rotulo}
      <input
        className={cn("rounded-[10px] border-[1.5px] border-line bg-card-2 p-2 text-center text-2xl text-ink", largura)}
        {...input}
      />
    </label>
  );
}

type ExercicioProps = {
  nome: string;
  fase: "set" | "rest" | undefined;
  serieAtual: number;
  series: number;
  descansoRestante: number;
  pesoSerie: number;
  reps: number;
  peso: number;
  onReps: (n: number) => void;
  onPeso: (n: number) => void;
};

export function CorpoExercicio(p: ExercicioProps) {
  if (p.fase === "rest") {
    return (
      <Miolo>
        <div className={TITULO_ETAPA}>Descanso</div>
        <div className={cn("my-1.5 font-sans text-[48px] font-semibold", p.descansoRestante < 0 && "text-erro")}>
          {fmtTime(p.descansoRestante)}
        </div>
        <Nome>{p.nome}</Nome>
        <Legenda>
          série {p.serieAtual} de {p.series} concluída
          {p.pesoSerie ? ` · próxima: ${p.pesoSerie}kg` : ""}
        </Legenda>
      </Miolo>
    );
  }
  return (
    <Miolo>
      <div className={TITULO_ETAPA}>
        Série {p.serieAtual + 1} de {p.series}
      </div>
      <CirculoCheck tamanho="size-[100px] text-[36px]">
        <Icon name="trophy" size={32} />
      </CirculoCheck>
      <Nome>{p.nome}</Nome>
      <div className="mt-3 flex justify-center gap-2.5">
        <CampoSerie
          rotulo="reps"
          largura="w-16"
          type="number"
          inputMode="numeric"
          min={0}
          value={p.reps}
          onChange={(e) => p.onReps(+e.target.value || 0)}
        />
        <CampoSerie
          rotulo="kg"
          largura="w-[72px]"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={p.peso}
          onChange={(e) => p.onPeso(+e.target.value || 0)}
        />
      </div>
    </Miolo>
  );
}

export function CorpoSimples({ posicao, nome }: { posicao: number; nome: string }) {
  return (
    <Miolo>
      <div className={TITULO_ETAPA}>Etapa {posicao}</div>
      <CirculoCheck>
        <Icon name="check" size={14} />
      </CirculoCheck>
      <Nome>{nome}</Nome>
    </Miolo>
  );
}
