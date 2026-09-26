// Porta parcial de renderRoutineDetail (index.html:3908-4013) — nome/ícone,
// meta (etapas/duração), chip de horário+dias, lista de etapas só leitura e
// os botões Editar/Começar. Ficam para depois: reordenar etapa por arrastar,
// editar etapa direto daqui (openStepEditor), duplicar/excluir etapa por
// swipe — dependem do hook de drag-and-drop único (ainda não consolidado, ver
// CLAUDE.md) em vez de reimplementar aqui. Ainda não existe a variante split
// (lista + detalhe lado a lado) do desktop (`.home-split-detail` no app
// antigo, index.html:3891) — sem ela, `.routine-list` viraria grid de 2
// colunas em telas largas (regra pensada pra lista de cards, app.css:1310),
// por isso a lista aqui é uma coluna flex própria, não o ListaCartoes.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { StreakTag } from "../components/StreakTag";
import { fmtTime } from "../lib/format";
import { estimadorSerie, routineDurationRaw } from "../lib/routines";
import { computeSchedule, diasChipLabel } from "../lib/schedule";
import { corDaRotina, fillStyle } from "../lib/scoring";
import { descansoEntreSeries } from "../lib/exercicios";
import { BarraAcoes } from "../ui/BarraAcoes";
import { BarraDetalhe } from "../ui/BarraDetalhe";
import { Botao } from "../ui/Botao";
import { CartaoInfo, CartaoLista, CartaoTitulo } from "../ui/CartaoLista";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Legenda } from "../ui/Legenda";
import { PontoCor } from "../ui/PontoCor";
import { RotuloSecao } from "../ui/RotuloSecao";
import { tela } from "../ui/Tela";

export function RoutineDetail() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const exercicios = useAppStore((s) => s.exercicios);
  const goTo = useAppStore((s) => s.goTo);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const id = useAppStore((s) => s.view.id);

  const r = routines.find((x) => x.id === id);

  if (!r) {
    return (
      <div {...tela({})}>
        <BarraDetalhe onVoltar={() => goTo({ tab: "home", screen: "home" })} />
        <EstadoVazio titulo="Rotina não encontrada" />
      </div>
    );
  }

  const dur = routineDurationRaw(r, estimadorSerie(history));
  const sched = computeSchedule(r);

  return (
    <div {...tela({})}>
      {/* barra superior: voltar (ícone) + título na mesma linha, subtítulo colado embaixo */}
      <BarraDetalhe
        onVoltar={() => goTo({ tab: "home", screen: "home" })}
        titulo={
          <>
            <PontoCor cor={fillStyle(corDaRotina(r, gam))} />
            {r.icon ? r.icon + " " : ""}
            {r.name}
          </>
        }
      />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-[110px]">
        <Legenda className="mb-1">
          {r.steps.length} etapa{r.steps.length !== 1 ? "s" : ""} ·{" "}
          {dur > 0 ? fmtTime(dur).replace("+", "") : "sem tempo fixo"}
          <StreakTag routineId={r.id} routines={routines} history={history} />
        </Legenda>
        {sched && (
          <>
            <div className="mt-1.5 inline-flex items-center gap-1 font-sans text-xs text-caneta">
              <Icon name="clock" size={13} /> {sched.startStr} &rarr; {sched.endStr}
            </div>
            <div className="mt-1.5 flex items-center gap-1 font-sans text-xs text-sub">{diasChipLabel(r)}</div>
            <div className="h-2.5" />
          </>
        )}
        <RotuloSecao>Etapas</RotuloSecao>

        {r.steps.length === 0 ? (
          <EstadoVazio className="min-h-[20vh]" texto="Esta rotina não tem etapas." />
        ) : (
          r.steps.map((s, i) => {
            const iconName = s.type === "timer" ? "clock" : s.type === "exercicio" ? "trophy" : "check";
            let metaTxt: string;
            if (s.type === "timer") metaTxt = fmtTime(s.seconds || 0).replace("+", "");
            else if (s.type === "exercicio")
              metaTxt = `${s.sets || 1}x · ${descansoEntreSeries(
                r.restSeconds ?? 120,
                exercicios.find((e) => e.id === s.exercicioId)
              )}s descanso`;
            else metaTxt = "checklist";
            if (s.journaling) metaTxt += " · anotações";
            return (
              <CartaoLista className="gap-2.5" key={s.id}>
                <CartaoInfo className="flex items-start gap-2.5">
                  <span className="flex-none text-xl text-sub">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <CartaoTitulo className="flex items-center gap-1 text-lg">
                      <Icon name={iconName} size={13} /> {s.name || "sem nome"}
                    </CartaoTitulo>
                    <Legenda className="mt-0.5">{metaTxt}</Legenda>
                  </div>
                </CartaoInfo>
              </CartaoLista>
            );
          })
        )}
      </div>
      <BarraAcoes>
        <Botao variante="perigo" className="border-line text-sub" onClick={() => openEditor(r.id)}>
          Editar
        </Botao>
        <Botao className="flex-1" disabled={r.steps.length === 0} onClick={() => startPlayer(r.id)}>
          <Icon name="play" size={16} /> Começar
        </Botao>
      </BarraAcoes>
    </div>
  );
}
