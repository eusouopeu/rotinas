// Chaves de storage — porta literal de index.html:49-85. Mesmos valores de
// string (compatibilidade de dados é o ponto: o storageBackend do app novo
// lê/escreve os MESMOS arquivos/registros que o app antigo já usa).
export const K_ROUTINES = "rotinas_v2_routines";
export const K_HISTORY = "rotinas_v2_history";
export const K_NOTES = "rotinas_v2_notes";
export const K_ALERTED = "rotinas_v2_alerted";
export const K_PLAYER = "rotinas_v2_player";
export const K_THEME = "rotinas_v2_theme";
export const K_LASTBACKUP = "rotinas_v2_lastbackup";
export const K_TEMPLATES = "rotinas_v2_templates";
export const K_SNOOZES = "rotinas_v2_snoozes";
export const K_AUTOBAK = "rotinas_v2_autobackup";
export const K_MIGRATED = "rotinas_v2_migrated";
export const K_GAMIFICACAO = "rotinas_v2_gamificacao";
export const K_NUDGE = "rotinas_v2_nudge";
export const K_OVERLAY = "rotinas_v2_overlay"; // legado booleano, só para migração de K_CRONOMODO
export const K_CRONOMODO = "rotinas_v2_crono_modo";
export const K_NUDGEDONE = "rotinas_v2_nudge_done";
export const K_NUDGEMETAS = "rotinas_v2_nudge_metas"; // aviso de meta perto do prazo (React; o legado usa o mesmo K_NUDGE dos três)
export const K_NUDGESTREAK = "rotinas_v2_nudge_streak"; // aviso de sequência em risco
export const K_NUDGEMETASDONE = "rotinas_v2_nudge_metas_done";
export const K_NUDGESTREAKDONE = "rotinas_v2_nudge_streak_done";
export const K_SOMMODO = "rotinas_v2_som_modo"; // "mudo" | "suave" | "normal" — aviso sonoro do cronômetro
export const K_VIBRAR = "rotinas_v2_vibrar"; // vibração nos avisos do cronômetro

export const K_NUDGEDAYS = "rotinas_v2_nudge_days";
export const K_DIARIO = "rotinas_v2_diario";
export const K_NAOFEITAS = "rotinas_v2_naofeitas";
export const K_DIAKANBAN = "rotinas_v2_diakanban";
export const K_SOHOJE = "rotinas_v2_so_hoje";
// preferência de UI da view "Lista" (card compacto x card expandido) — como
// K_SOHOJE/K_RODARESUMOABERTO, não entra no backup.
export const K_LISTAEXPANDIDA = "rotinas_v2_lista_expandida";
export const K_METASSOHOJE = "rotinas_v2_metas_so_hoje";
export const K_METASSUBVIEW = "rotinas_v2_metas_subview"; // legado, só para migração
export const K_METASSUBVIEWSEL = "rotinas_v2_metas_subview_sel";
export const K_HOMEVIEW = "rotinas_v2_homeview";
export const K_RODARESUMOABERTO = "rotinas_v2_roda_resumo_aberto";
export const K_MOTIVAKEY = "rotinas_v2_motiva_key";
export const K_MOTIVACFG = "rotinas_v2_motiva_cfg";
export const K_MOTIVA = "rotinas_v2_motiva_hist";
export const K_MOTIVADONE = "rotinas_v2_motiva_done";
export const K_DATAFOLDER = "rotinas_v2_datafolder";
export const K_WEEKSTART = "rotinas_v2_weekstart";
export const K_HORASBUDGET = "rotinas_v2_horasbudget";
export const K_ICALURL = "rotinas_v2_icalurl";
export const K_ICALCACHE = "rotinas_v2_icalcache";
export const K_FONTSCALE = "rotinas_v2_fontscale";
export const K_DIGESTSEMANAL = "rotinas_v2_digest_semanal";
export const K_PIN = "rotinas_v2_pin";
export const K_EXERCICIOS = "rotinas_v2_exercicios";
export const K_COMPROMISSOS = "rotinas_v2_compromissos";
export const K_MKFREQ = "rotinas_v2_mkfreq";
// Backup automático em arquivo no navegador (index.html:10812-10816).
export const K_BAKHANDLE = "rotinas_v2_bakhandle";
export const K_BAKWEB = "rotinas_v2_bakweb_ts";
export const K_BAKSEENAT = "rotinas_v2_bakseenat";
export const K_PREFIX = "rotinas_v2_";
export const K_SIDEBARCOLLAPSED = "rotinas_v2_sidebar_collapsed";

export const DIAS_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
// Nome por extenso do dia da semana — usado nos cabeçalhos das visões
// "semana" e "dia" da aba Rotinas (a grade de 7 colunas do desktop segue
// abreviada, não há largura de coluna para o nome inteiro).
// sem "-feira" (pedido do Pedro, 12/09/2026): o cabeçalho de dia e de semana
// ficam mais curtos e a data cabe do lado sem apertar.
export const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Grupos musculares do editor de exercício (index.html:518) — chips
// multi-seleção, opcionais, sem efeito em pontuação/agenda.
export const GRUPOS_MUSCULARES = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Antebraço", "Abdômen", "Pernas", "Glúteos", "Panturrilha"];

export const BADGE_CHAR: Record<string, string> = {
  diamante: "◆",
  ouro: "●",
  prata: "○",
  bronze: "◇",
};

export const BADGE_COR: Record<string, string> = {
  diamante: "var(--caneta-2)",
  ouro: "#D4AF37",
  prata: "var(--sub)",
  bronze: "#B08D57",
};
export const BADGE_NOME: Record<string, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  diamante: "Diamante",
};
