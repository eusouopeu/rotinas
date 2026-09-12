// Biblioteca sugerida de exercícios por grupo muscular em GRUPOS_MUSCULARES
// (lib/constants.ts). Curadoria, não medição — serve de ponto de partida para
// popular a biblioteca do usuário (`Exercicio`, ver ExercicioPickerModal), que
// continua 100% editável depois de adicionada.
//
// Ordem dentro de cada grupo é deliberada e vale como recomendação: primeiro
// os compostos (recrutam mais massa e articulações, maior retorno por série),
// depois os isolados consagrados, e por último as variações de peso do corpo
// ou de equipamento alternativo — quem tem pouco tempo pega os primeiros, quem
// treina sem academia encontra uma opção no fim da lista. Ampliada em
// 11/09/2026 de 3 para 6-8 itens por grupo (30 → 71), a pedido do Pedro: com
// três nomes por grupo a lista quase nunca continha o exercício que a pessoa
// realmente faz, e o caminho virava sempre "cadastrar manualmente".
export interface ExercicioPreset {
  grupo: string;
  nome: string;
  /* multiarticular (agachamento, supino, remada) x monoarticular (rosca,
     elevação lateral). Só serve para o descanso entre séries: composto usa o
     descanso cheio da rotina, isolado usa 0,75x dele. */
  composto: boolean;
}

export const EXERCICIOS_PRESET: ExercicioPreset[] = [
  // Peito
  { grupo: "Peito", nome: "Supino reto com barra", composto: true },
  { grupo: "Peito", nome: "Supino inclinado com halteres", composto: true },
  { grupo: "Peito", nome: "Supino declinado", composto: true },
  { grupo: "Peito", nome: "Mergulho em paralelas (foco peito)", composto: true },
  { grupo: "Peito", nome: "Crucifixo (crossover ou halteres)", composto: false },
  { grupo: "Peito", nome: "Peck deck (voador)", composto: false },
  { grupo: "Peito", nome: "Flexão de braço", composto: true },
  { grupo: "Peito", nome: "Pullover com halter", composto: false },
  // Costas
  { grupo: "Costas", nome: "Barra fixa (pull-up)", composto: true },
  { grupo: "Costas", nome: "Remada curvada com barra", composto: true },
  { grupo: "Costas", nome: "Puxada frontal (lat pulldown)", composto: true },
  { grupo: "Costas", nome: "Remada cavalinho (T-bar)", composto: true },
  { grupo: "Costas", nome: "Remada unilateral com halter (serrote)", composto: true },
  { grupo: "Costas", nome: "Remada baixa na polia", composto: true },
  { grupo: "Costas", nome: "Levantamento terra", composto: true },
  { grupo: "Costas", nome: "Face pull", composto: false },
  // Ombros
  { grupo: "Ombros", nome: "Desenvolvimento militar", composto: true },
  { grupo: "Ombros", nome: "Desenvolvimento com halteres sentado", composto: true },
  { grupo: "Ombros", nome: "Elevação lateral com halteres", composto: false },
  { grupo: "Ombros", nome: "Elevação frontal", composto: false },
  { grupo: "Ombros", nome: "Crucifixo inverso (deltoide posterior)", composto: false },
  { grupo: "Ombros", nome: "Remada alta", composto: true },
  { grupo: "Ombros", nome: "Encolhimento de ombros (trapézio)", composto: false },
  // Bíceps
  { grupo: "Bíceps", nome: "Rosca direta com barra", composto: false },
  { grupo: "Bíceps", nome: "Rosca alternada com halteres", composto: false },
  { grupo: "Bíceps", nome: "Rosca martelo", composto: false },
  { grupo: "Bíceps", nome: "Rosca Scott", composto: false },
  { grupo: "Bíceps", nome: "Rosca concentrada", composto: false },
  { grupo: "Bíceps", nome: "Rosca na polia baixa", composto: false },
  { grupo: "Bíceps", nome: "Barra fixa supinada (chin-up)", composto: true },
  // Tríceps
  { grupo: "Tríceps", nome: "Mergulho em paralelas (dips)", composto: true },
  { grupo: "Tríceps", nome: "Supino fechado", composto: true },
  { grupo: "Tríceps", nome: "Tríceps testa (skull crusher)", composto: false },
  { grupo: "Tríceps", nome: "Tríceps corda (polia)", composto: false },
  { grupo: "Tríceps", nome: "Tríceps francês com halter", composto: false },
  { grupo: "Tríceps", nome: "Tríceps banco (bench dip)", composto: true },
  // Antebraço
  { grupo: "Antebraço", nome: "Rosca de punho (wrist curl)", composto: false },
  { grupo: "Antebraço", nome: "Rosca de punho inversa", composto: false },
  { grupo: "Antebraço", nome: "Rosca inversa com barra", composto: false },
  { grupo: "Antebraço", nome: "Farmer's walk", composto: false },
  { grupo: "Antebraço", nome: "Pendura na barra (dead hang)", composto: false },
  { grupo: "Antebraço", nome: "Rolo de punho (wrist roller)", composto: false },
  // Abdômen
  { grupo: "Abdômen", nome: "Prancha (plank)", composto: false },
  { grupo: "Abdômen", nome: "Prancha lateral", composto: false },
  { grupo: "Abdômen", nome: "Elevação de pernas suspenso", composto: false },
  { grupo: "Abdômen", nome: "Abdominal supra (crunch)", composto: false },
  { grupo: "Abdômen", nome: "Abdominal na polia (crunch ajoelhado)", composto: false },
  { grupo: "Abdômen", nome: "Roda abdominal (ab wheel)", composto: false },
  { grupo: "Abdômen", nome: "Russian twist", composto: false },
  { grupo: "Abdômen", nome: "Dead bug", composto: false },
  // Pernas
  { grupo: "Pernas", nome: "Agachamento livre", composto: true },
  { grupo: "Pernas", nome: "Levantamento terra sumô", composto: true },
  { grupo: "Pernas", nome: "Agachamento frontal", composto: true },
  { grupo: "Pernas", nome: "Leg press", composto: true },
  { grupo: "Pernas", nome: "Afundo (lunge)", composto: true },
  { grupo: "Pernas", nome: "Cadeira extensora (quadríceps)", composto: false },
  { grupo: "Pernas", nome: "Mesa flexora (posterior)", composto: false },
  { grupo: "Pernas", nome: "Hack squat", composto: true },
  // Glúteos
  { grupo: "Glúteos", nome: "Hip thrust", composto: true },
  { grupo: "Glúteos", nome: "Agachamento búlgaro", composto: true },
  { grupo: "Glúteos", nome: "Levantamento terra romeno (stiff)", composto: true },
  { grupo: "Glúteos", nome: "Elevação de quadril (ponte)", composto: true },
  { grupo: "Glúteos", nome: "Coice na polia (glute kickback)", composto: false },
  { grupo: "Glúteos", nome: "Abdução de quadril (cadeira abdutora)", composto: false },
  { grupo: "Glúteos", nome: "Passada (walking lunge)", composto: true },
  // Panturrilha
  { grupo: "Panturrilha", nome: "Elevação de panturrilha em pé", composto: false },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha sentado", composto: false },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha no leg press", composto: false },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha unilateral", composto: false },
  { grupo: "Panturrilha", nome: "Panturrilha no smith", composto: false },
  { grupo: "Panturrilha", nome: "Pulo na corda (resistência)", composto: false },
];

export function presetsPorGrupo(): Array<{ grupo: string; itens: ExercicioPreset[] }> {
  const grupos = Array.from(new Set(EXERCICIOS_PRESET.map((p) => p.grupo)));
  return grupos.map((grupo) => ({ grupo, itens: EXERCICIOS_PRESET.filter((p) => p.grupo === grupo) }));
}
