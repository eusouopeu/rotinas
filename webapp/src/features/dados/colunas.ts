// No desktop a página de Dados vira um painel em 2 colunas (3 acima de 1400px):
// todo filho direto do painel evita quebrar no meio de uma coluna e tem 14px
// de margem embaixo. Aplique NO_PAINEL em cada bloco que é filho direto de
// <PainelDados>; a navegação de período ocupa a faixa toda (NAV_PAINEL).
export const NO_PAINEL = "desktop:mb-3.5 desktop:break-inside-avoid";
export const NAV_PAINEL = "desktop:mb-2 desktop:[column-span:all]";
