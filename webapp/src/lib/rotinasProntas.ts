// Biblioteca de rotinas prontas — porta de ROTINAS_PRONTAS/importarRotinaPronta
// (index.html:3788-3836), recomendação 4 de 27/09/2026. A "Estudo com
// Pomodoro" do legado virou "Bloco de estudo" (o Pomodoro foi removido como
// recurso, ver feature-status.md) e entrou a "Revisão semanal". A rotina
// criada passa por importRotinaShare: ids novos, agenda desligada e sufixo
// "(importada)" se o nome colidir.
import type { Exercicio, Routine, RoutineStep, Tag } from "./types";

type PassoPronto =
  | { name: string; type: "timer"; seconds: number; isRest?: boolean }
  | { name: string; type: "checklist" }
  | { type: "exercicio"; exNome: string; exGrupo: string; sets: number; reps: string };

export interface RotinaPronta {
  name: string;
  icon: string;
  descricao: string;
  tagValor: Tag;
  sound: "normal" | "suave";
  restSeconds?: number;
  steps: PassoPronto[];
}

export const ROTINAS_PRONTAS: RotinaPronta[] = [
  {
    name: "Manhã produtiva",
    icon: "☀️",
    descricao: "água, planejar o dia, cama e leitura",
    tagValor: "medio",
    sound: "suave",
    steps: [
      { name: "Água + alongar", seconds: 180, type: "timer" },
      { name: "Planejar o dia", seconds: 300, type: "timer" },
      { name: "Arrumar a cama", type: "checklist" },
      { name: "Ler 10 páginas", seconds: 600, type: "timer" },
    ],
  },
  {
    name: "Treino de força A",
    icon: "🏋️",
    descricao: "aquecimento, 3 exercícios e alongamento",
    tagValor: "alto",
    sound: "normal",
    restSeconds: 120,
    steps: [
      { name: "Aquecimento", seconds: 300, type: "timer" },
      { type: "exercicio", exNome: "Agachamento", exGrupo: "Pernas", sets: 4, reps: "8-10" },
      { type: "exercicio", exNome: "Supino reto", exGrupo: "Peito", sets: 4, reps: "8-10" },
      { type: "exercicio", exNome: "Remada curvada", exGrupo: "Costas", sets: 3, reps: "10-12" },
      { name: "Alongamento final", seconds: 180, type: "timer" },
    ],
  },
  {
    name: "Bloco de estudo",
    icon: "📚",
    descricao: "dois focos de 45 min com pausa",
    tagValor: "medio",
    sound: "suave",
    steps: [
      { name: "Separar material", type: "checklist" },
      { name: "Foco 1", seconds: 2700, type: "timer" },
      { name: "Pausa", seconds: 600, type: "timer", isRest: true },
      { name: "Foco 2", seconds: 2700, type: "timer" },
      { name: "Anotar onde parou", type: "checklist" },
    ],
  },
  {
    name: "Revisão semanal",
    icon: "🗓️",
    descricao: "caixa de entrada, agenda, metas e próxima semana",
    tagValor: "medio",
    sound: "suave",
    steps: [
      { name: "Esvaziar a caixa de entrada", seconds: 600, type: "timer" },
      { name: "Olhar a agenda da semana passada", seconds: 300, type: "timer" },
      { name: "Conferir as metas", seconds: 300, type: "timer" },
      { name: "Escolher o foco da próxima semana", type: "checklist" },
    ],
  },
];

/** Monta a rotina a partir do modelo. Exercício é casado pelo nome na
 * biblioteca (sem diferenciar maiúsculas); se não existir, `criarExercicio`
 * cria — como no legado. Os ids provisórios são trocados na importação. */
export function montarRotinaPronta(
  tpl: RotinaPronta,
  exercicios: Exercicio[],
  criarExercicio: (nome: string, grupo: string) => Exercicio
): Routine {
  const steps: RoutineStep[] = tpl.steps.map((s, i) => {
    if (s.type === "exercicio") {
      const ex =
        exercicios.find((x) => x.nome.toLowerCase() === s.exNome.toLowerCase()) || criarExercicio(s.exNome, s.exGrupo);
      return { id: "p" + i, name: ex.nome, type: "exercicio", exercicioId: ex.id, sets: s.sets, reps: s.reps };
    }
    return { id: "p" + i, ...s };
  });
  return {
    id: "pronta",
    name: tpl.name,
    icon: tpl.icon,
    tagValor: tpl.tagValor,
    sound: tpl.sound,
    restSeconds: tpl.restSeconds ?? 0,
    steps,
    schedule: { enabled: false, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: Date.now(),
  };
}
