import type { Tag } from "../../lib/types";

export const ESCOPO_LABEL = { mensal: "mensal", trimestral: "trimestral", anual: "anual" };
export const TAGS: Tag[] = ["nenhum", "baixo", "medio", "alto"];
export const TAG_LABEL: Record<Tag, string> = { nenhum: "Nenhum", baixo: "Baixo", medio: "Médio", alto: "Alto" };
export const TAG_OPCOES = TAGS.map((t) => ({ key: t, label: TAG_LABEL[t].toLowerCase() }));
