// Estado de navegação da aba Dados (visão, filtro, semana/mês/ano abertos, dia
// selecionado, seções abertas). Vive junto porque trocar de visão preserva o
// período que você estava vendo, e cada visão reseta o dia selecionado.
import { useState } from "react";

export type VisaoDados = "semanal" | "mensal" | "anual";

export function useEstadoDados() {
  const [statsView, setStatsView] = useState<VisaoDados>("semanal");
  const [statsRoutineFilter, setStatsRoutineFilter] = useState<string | null>(null);
  const [calWeek, setCalWeek] = useState<Date>(new Date());
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // quadrimestre do heatmap anual (1 = jan–abr, 2 = mai–ago, 3 = set–dez)
  const [calQuad, setCalQuad] = useState<1 | 2 | 3>(() => (Math.floor(new Date().getMonth() / 4) + 1) as 1 | 2 | 3);
  // seções secundárias de Mensal/Anual começam fechadas; Insights e Cumprimento ficam sempre abertos
  const [abertas, setAbertas] = useState<string[]>([]);
  const aberta = (id: string) => abertas.includes(id);
  const alternar = (id: string) => setAbertas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return {
    statsView, setStatsView, statsRoutineFilter, setStatsRoutineFilter,
    calWeek, setCalWeek, calMonth, setCalMonth, calYear, setCalYear, calQuad, setCalQuad,
    selectedDay, setSelectedDay, aberta, alternar,
  };
}

export type EstadoDados = ReturnType<typeof useEstadoDados>;
