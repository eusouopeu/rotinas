// Biblioteca sugerida de exercícios por grupo muscular — os 3 exercícios
// mais completos/eficientes de cada grupo em GRUPOS_MUSCULARES (lib/constants.ts),
// priorizando movimentos compostos (recrutam mais massa muscular e
// articulações, maior retorno por série) e completando com o isolado mais
// consagrado do grupo quando não há um terceiro composto relevante. Curadoria,
// não medição — serve de ponto de partida para popular a biblioteca do
// usuário (`Exercicio`, ver ExercicioPickerModal), que continua 100% editável
// depois de adicionado.
export interface ExercicioPreset {
  grupo: string;
  nome: string;
}

export const EXERCICIOS_PRESET: ExercicioPreset[] = [
  // Peito
  { grupo: "Peito", nome: "Supino reto com barra" },
  { grupo: "Peito", nome: "Supino inclinado com halteres" },
  { grupo: "Peito", nome: "Crucifixo (crossover ou halteres)" },
  // Costas
  { grupo: "Costas", nome: "Barra fixa (pull-up)" },
  { grupo: "Costas", nome: "Remada curvada com barra" },
  { grupo: "Costas", nome: "Puxada frontal (lat pulldown)" },
  // Ombros
  { grupo: "Ombros", nome: "Desenvolvimento militar" },
  { grupo: "Ombros", nome: "Elevação lateral com halteres" },
  { grupo: "Ombros", nome: "Remada alta" },
  // Bíceps
  { grupo: "Bíceps", nome: "Rosca direta com barra" },
  { grupo: "Bíceps", nome: "Rosca alternada com halteres" },
  { grupo: "Bíceps", nome: "Rosca Scott" },
  // Tríceps
  { grupo: "Tríceps", nome: "Mergulho em paralelas (dips)" },
  { grupo: "Tríceps", nome: "Tríceps testa (skull crusher)" },
  { grupo: "Tríceps", nome: "Tríceps corda (polia)" },
  // Antebraço
  { grupo: "Antebraço", nome: "Rosca de punho (wrist curl)" },
  { grupo: "Antebraço", nome: "Rosca inversa" },
  { grupo: "Antebraço", nome: "Farmer's walk" },
  // Abdômen
  { grupo: "Abdômen", nome: "Prancha (plank)" },
  { grupo: "Abdômen", nome: "Elevação de pernas" },
  { grupo: "Abdômen", nome: "Abdominal supra (crunch)" },
  // Pernas
  { grupo: "Pernas", nome: "Agachamento livre" },
  { grupo: "Pernas", nome: "Levantamento terra" },
  { grupo: "Pernas", nome: "Leg press" },
  // Glúteos
  { grupo: "Glúteos", nome: "Hip thrust" },
  { grupo: "Glúteos", nome: "Agachamento búlgaro" },
  { grupo: "Glúteos", nome: "Levantamento terra romeno (stiff)" },
  // Panturrilha
  { grupo: "Panturrilha", nome: "Elevação de panturrilha em pé" },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha sentado" },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha no leg press" },
];

export function presetsPorGrupo(): Array<{ grupo: string; itens: ExercicioPreset[] }> {
  const grupos = Array.from(new Set(EXERCICIOS_PRESET.map((p) => p.grupo)));
  return grupos.map((grupo) => ({ grupo, itens: EXERCICIOS_PRESET.filter((p) => p.grupo === grupo) }));
}
