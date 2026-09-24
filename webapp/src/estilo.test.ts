// Guarda de estilo (fase 4 da migração Tailwind, docs/design-system.md):
//  - nenhuma cor hexadecimal solta nos componentes (use os tokens: `text-caneta`,
//    `var(--x)`); exceções: o <meta theme-color> e o valor inicial do seletor de
//    cor da roda, que precisam de hex de verdade;
//  - `style={...}` só para valor que vem do dado (largura de barra, cor escolhida
//    pelo usuário…): cada arquivo tem um teto; passou dele, vire utilitário ou
//    suba o teto de propósito;
//  - nada de `@apply` nem de CSS novo fora de src/styles/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname);

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else acc.push(p);
  }
  return acc;
}
const todos = arquivos(RAIZ).map((p) => ({ rel: relative(RAIZ, p), texto: readFileSync(p, "utf8") }));
const componentes = todos.filter((f) => /\.tsx$/.test(f.rel) && !/\.test\./.test(f.rel) && f.rel !== "ui/Catalogo.tsx");

const HEX_PERMITIDO = new Set(["App.tsx", "features/ajustes/SecaoRoda.tsx"]);
// `&#9733;` é entidade HTML, não cor
const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g;

// teto de `style={` por arquivo (valores vindos do dado); ver docs/design-system.md
const ESTILO_EM_LINHA: Record<string, number> = {
  "components/StreakTag.tsx": 1,
  "features/ajustes/SecaoRoda.tsx": 1,
  "features/boletim/pecas.tsx": 3,
  "features/dados/Calendarios.tsx": 2,
  "features/dados/Graficos.tsx": 5,
  "features/gastos/GraficosGastos.tsx": 2,
  "features/metas/CartaoMeta.tsx": 3,
  "features/metas/CartaoPrazo.tsx": 1,
  "features/modelos/GradePlacar.tsx": 1,
  "features/modelos/QuadranteMatriz.tsx": 4,
  "features/player/Controles.tsx": 1,
  "features/roda/RodaVidaResumo.tsx": 1,
  "features/rotinas/GradeDia.tsx": 4,
  "screens/Boletim.tsx": 4,
  "screens/Home.tsx": 2,
  "screens/Metas.tsx": 1,
  "screens/SemanaFechada.tsx": 2,
  "ui/Chip.tsx": 1,
  "ui/ItemChecklist.tsx": 1,
  "ui/LinhaBarra.tsx": 6,
  "ui/LinhaDado.tsx": 1,
  "ui/LinhaValor.tsx": 1,
  "ui/PontoCor.tsx": 1,
  "ui/Segmentado.tsx": 1,
};

describe("guarda de estilo", () => {
  it("sem cor hexadecimal solta nos componentes", () => {
    const achados = componentes
      .filter((f) => !HEX_PERMITIDO.has(f.rel))
      .flatMap((f) => (f.texto.match(HEX) || []).map((h) => `${f.rel}: ${h}`));
    expect(achados).toEqual([]);
  });

  it("style={...} dentro do teto de cada arquivo", () => {
    const acima = componentes
      .map((f) => ({ rel: f.rel, n: (f.texto.match(/style=\{/g) || []).length }))
      .filter((f) => f.n > (ESTILO_EM_LINHA[f.rel] ?? 0))
      .map((f) => `${f.rel}: ${f.n} (teto ${ESTILO_EM_LINHA[f.rel] ?? 0})`);
    expect(acima).toEqual([]);
  });

  it("sem @apply e sem CSS fora de src/styles/", () => {
    const css = todos.filter((f) => f.rel.endsWith(".css") && !f.rel.startsWith("styles/"));
    expect(css.map((f) => f.rel)).toEqual([]);
    expect(todos.filter((f) => /@apply\b/.test(f.texto) && f.rel !== "estilo.test.ts").map((f) => f.rel)).toEqual([]);
  });

  it("o React não importa o app.css legado (só o catálogo de desenvolvimento)", () => {
    const quem = todos
      .filter(
        (f) =>
          /import[^;]*app\.css/.test(f.texto) &&
          f.rel !== "ui/Catalogo.tsx" &&
          f.rel !== "estilo.test.ts" &&
          /\.tsx?$/.test(f.rel)
      )
      .map((f) => f.rel);
    expect(quem).toEqual([]);
  });
});
