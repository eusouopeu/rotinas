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
}

export const EXERCICIOS_PRESET: ExercicioPreset[] = [
  // Peito
  { grupo: "Peito", nome: "Supino reto com barra" },
  { grupo: "Peito", nome: "Supino inclinado com halteres" },
  { grupo: "Peito", nome: "Supino declinado" },
  { grupo: "Peito", nome: "Mergulho em paralelas (foco peito)" },
  { grupo: "Peito", nome: "Crucifixo (crossover ou halteres)" },
  { grupo: "Peito", nome: "Peck deck (voador)" },
  { grupo: "Peito", nome: "Flexão de braço" },
  { grupo: "Peito", nome: "Pullover com halter" },
  // Costas
  { grupo: "Costas", nome: "Barra fixa (pull-up)" },
  { grupo: "Costas", nome: "Remada curvada com barra" },
  { grupo: "Costas", nome: "Puxada frontal (lat pulldown)" },
  { grupo: "Costas", nome: "Remada cavalinho (T-bar)" },
  { grupo: "Costas", nome: "Remada unilateral com halter (serrote)" },
  { grupo: "Costas", nome: "Remada baixa na polia" },
  { grupo: "Costas", nome: "Levantamento terra" },
  { grupo: "Costas", nome: "Face pull" },
  // Ombros
  { grupo: "Ombros", nome: "Desenvolvimento militar" },
  { grupo: "Ombros", nome: "Desenvolvimento com halteres sentado" },
  { grupo: "Ombros", nome: "Elevação lateral com halteres" },
  { grupo: "Ombros", nome: "Elevação frontal" },
  { grupo: "Ombros", nome: "Crucifixo inverso (deltoide posterior)" },
  { grupo: "Ombros", nome: "Remada alta" },
  { grupo: "Ombros", nome: "Encolhimento de ombros (trapézio)" },
  // Bíceps
  { grupo: "Bíceps", nome: "Rosca direta com barra" },
  { grupo: "Bíceps", nome: "Rosca alternada com halteres" },
  { grupo: "Bíceps", nome: "Rosca martelo" },
  { grupo: "Bíceps", nome: "Rosca Scott" },
  { grupo: "Bíceps", nome: "Rosca concentrada" },
  { grupo: "Bíceps", nome: "Rosca na polia baixa" },
  { grupo: "Bíceps", nome: "Barra fixa supinada (chin-up)" },
  // Tríceps
  { grupo: "Tríceps", nome: "Mergulho em paralelas (dips)" },
  { grupo: "Tríceps", nome: "Supino fechado" },
  { grupo: "Tríceps", nome: "Tríceps testa (skull crusher)" },
  { grupo: "Tríceps", nome: "Tríceps corda (polia)" },
  { grupo: "Tríceps", nome: "Tríceps francês com halter" },
  { grupo: "Tríceps", nome: "Tríceps banco (bench dip)" },
  // Antebraço
  { grupo: "Antebraço", nome: "Rosca de punho (wrist curl)" },
  { grupo: "Antebraço", nome: "Rosca de punho inversa" },
  { grupo: "Antebraço", nome: "Rosca inversa com barra" },
  { grupo: "Antebraço", nome: "Farmer's walk" },
  { grupo: "Antebraço", nome: "Pendura na barra (dead hang)" },
  { grupo: "Antebraço", nome: "Rolo de punho (wrist roller)" },
  // Abdômen
  { grupo: "Abdômen", nome: "Prancha (plank)" },
  { grupo: "Abdômen", nome: "Prancha lateral" },
  { grupo: "Abdômen", nome: "Elevação de pernas suspenso" },
  { grupo: "Abdômen", nome: "Abdominal supra (crunch)" },
  { grupo: "Abdômen", nome: "Abdominal na polia (crunch ajoelhado)" },
  { grupo: "Abdômen", nome: "Roda abdominal (ab wheel)" },
  { grupo: "Abdômen", nome: "Russian twist" },
  { grupo: "Abdômen", nome: "Dead bug" },
  // Pernas
  { grupo: "Pernas", nome: "Agachamento livre" },
  { grupo: "Pernas", nome: "Levantamento terra sumô" },
  { grupo: "Pernas", nome: "Agachamento frontal" },
  { grupo: "Pernas", nome: "Leg press" },
  { grupo: "Pernas", nome: "Afundo (lunge)" },
  { grupo: "Pernas", nome: "Cadeira extensora (quadríceps)" },
  { grupo: "Pernas", nome: "Mesa flexora (posterior)" },
  { grupo: "Pernas", nome: "Hack squat" },
  // Glúteos
  { grupo: "Glúteos", nome: "Hip thrust" },
  { grupo: "Glúteos", nome: "Agachamento búlgaro" },
  { grupo: "Glúteos", nome: "Levantamento terra romeno (stiff)" },
  { grupo: "Glúteos", nome: "Elevação de quadril (ponte)" },
  { grupo: "Glúteos", nome: "Coice na polia (glute kickback)" },
  { grupo: "Glúteos", nome: "Abdução de quadril (cadeira abdutora)" },
  { grupo: "Glúteos", nome: "Passada (walking lunge)" },
  // Panturrilha
  { grupo: "Panturrilha", nome: "Elevação de panturrilha em pé" },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha sentado" },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha no leg press" },
  { grupo: "Panturrilha", nome: "Elevação de panturrilha unilateral" },
  { grupo: "Panturrilha", nome: "Panturrilha no smith" },
  { grupo: "Panturrilha", nome: "Pulo na corda (resistência)" },
];

export function presetsPorGrupo(): Array<{ grupo: string; itens: ExercicioPreset[] }> {
  const grupos = Array.from(new Set(EXERCICIOS_PRESET.map((p) => p.grupo)));
  return grupos.map((grupo) => ({ grupo, itens: EXERCICIOS_PRESET.filter((p) => p.grupo === grupo) }));
}
