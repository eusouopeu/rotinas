// Estatísticas de uma rotina e o player (etapas de tempo, descanso, exercício,
// painel de etapas, nota anexada, lançamento rápido e tela de conclusão).
import { test } from "@playwright/test";
import { aba, foto, fotoInteira, preparar } from "./apoio.mjs";
import { seedLocalStorage } from "./seed.mjs";

const rotinas = seedLocalStorage.rotinas_v2_routines;
// rotina com etapa de exercício, uma tarefa simples e uma nota anexada
const treinoB = {
  id: "r-treino-b",
  name: "Treino B",
  eixo: "ar-saude",
  steps: [
    { id: "b1", name: "Supino reto", type: "exercicio", exercicioId: "ex1", sets: 3, reps: "8-12" },
    { id: "b2", name: "Guardar o material", type: "checklist" },
    { id: "b3", name: "Alongar", type: "timer", seconds: 300 },
  ],
  restSeconds: 60,
  tagValor: "medio",
  createdAt: 0,
  notaId: "n1",
  schedule: null,
};
const EXTRA = { extra: { rotinas_v2_routines: [...rotinas, treinoB] } };

const botao = (page, titulo) => page.locator(`button[aria-label="${titulo}"]`);
/** Ações do topo moram no menu "⋯" desde 03/10/2026. */
async function menu(page, item) {
  await botao(page, "Mais ações").click();
  await page.getByRole("menuitem", { name: item }).click();
}

async function iniciar(page, nome, opcoes = EXTRA) {
  await preparar(page, opcoes);
  await page.getByText("Lista", { exact: true }).first().click();
  const card = page
    .getByRole("heading", { name: nome })
    .locator("xpath=ancestor::*[.//button[@title='Iniciar rotina']][1]");
  await card.locator("button[title='Iniciar rotina']").first().dispatchEvent("click");
  await page.getByRole("button", { name: "Sair da rotina" }).waitFor();
}

test("stats de rotina: completo", async ({ page }) => {
  await preparar(page);
  await aba(page, "Dados");
  await page.getByText("Mensal", { exact: true }).first().click();
  for (let i = 0; i < 30; i++) {
    const fechado = page.locator('button[aria-expanded="false"]');
    if ((await fechado.count()) === 0) break;
    await fechado.first().click();
  }
  await page.locator('text="Treino A" >> visible=true').first().click();
  await page.getByText("Resumo geral").waitFor();
  await fotoInteira(page, "rotina-stats", ".screen > div:nth-child(2), [data-tela] > div:nth-child(2)");
});

test("player: etapa de tempo", async ({ page }) => {
  await iniciar(page, "Treino A");
  await foto(page, "player-timer");
});

test("player: pausado", async ({ page }) => {
  await iniciar(page, "Treino A");
  await botao(page, "Reiniciar o temporizador da etapa").locator("+ button").click();
  await foto(page, "player-pausado");
});

test("player: descanso entre etapas", async ({ page }) => {
  await iniciar(page, "Treino A");
  await botao(page, "Concluir etapa").click();
  await foto(page, "player-descanso");
});

test("player: adiar mostra aviso", async ({ page }) => {
  await iniciar(page, "Treino A");
  await botao(page, "Adiar etapa").click();
  await foto(page, "player-adiado");
});

test("player: painel de etapas", async ({ page }) => {
  await iniciar(page, "Treino A");
  await botao(page, "Concluir etapa").click();
  await menu(page, "Etapas");
  await foto(page, "player-etapas");
});

test("player: exercício, série", async ({ page }) => {
  await iniciar(page, "Treino B");
  await foto(page, "player-exercicio");
});

test("player: exercício, sugestão de carga", async ({ page }) => {
  // última execução do Supino reto com as 3 séries no topo da faixa (8-12)
  const anterior = {
    date: "2026-09-21",
    ts: new Date("2026-09-21T19:00:00-03:00").getTime(),
    startedTs: 0,
    routineId: "r-treino-b",
    routineName: "Treino B",
    plannedSec: 180,
    actualSec: 400,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    steps: [
      {
        id: "b1",
        name: "Supino reto",
        tag: "medio",
        isRest: false,
        planned: 180,
        actual: 180,
        skipped: false,
        exercicioId: "ex1",
        elapsedSec: 330,
        series: [1, 2, 3].map(() => ({ reps: 12, peso: 60 })),
      },
    ],
  };
  await iniciar(page, "Treino B", {
    extra: { ...EXTRA.extra, rotinas_v2_history: [...seedLocalStorage.rotinas_v2_history, anterior] },
  });
  await foto(page, "player-exercicio-sugestao");
});

test("player: exercício, descanso da série", async ({ page }) => {
  await iniciar(page, "Treino B");
  await botao(page, "Concluir série").click();
  await foto(page, "player-exercicio-descanso");
});

test("player: etapa simples", async ({ page }) => {
  await iniciar(page, "Treino B");
  for (let i = 0; i < 2; i++) {
    await botao(page, "Concluir série").click();
    await botao(page, "Pular descanso").click();
  }
  await botao(page, "Concluir série").click();
  await botao(page, "Concluir etapa").click(); // a pausa depois do exercício
  await foto(page, "player-simples");
});

test("player: nota anexada", async ({ page }) => {
  await iniciar(page, "Treino B");
  await menu(page, "Nota anexada");
  await foto(page, "player-nota");
});

test("player: nota anexada, edição", async ({ page }) => {
  await iniciar(page, "Treino B");
  await menu(page, "Nota anexada");
  await botao(page, "Editar").click();
  await foto(page, "player-nota-edicao", { desfocar: true });
});

test("player: lançar rápido, escolha", async ({ page }) => {
  await iniciar(page, "Treino A");
  await menu(page, "Lançar rápido");
  await foto(page, "player-rapido");
});

for (const [opcao, nome] of [
  ["Nota simples", "nota"],
  ["Nova despesa", "despesa"],
  ["Cartão a fazer", "kanban"],
  ["Compromisso", "compromisso"],
]) {
  test(`player: lançar rápido, ${nome}`, async ({ page }) => {
    await iniciar(page, "Treino A");
    await menu(page, "Lançar rápido");
    await page.getByText(opcao, { exact: true }).click();
    await foto(page, `player-rapido-${nome}`, { desfocar: true });
  });
}

test("player: lançar rápido, nota nova", async ({ page }) => {
  await iniciar(page, "Treino A");
  await menu(page, "Lançar rápido");
  await page.getByText("Nota simples", { exact: true }).click();
  await page.getByText("+ Nova nota").click();
  await foto(page, "player-rapido-nota-form", { desfocar: true });
});

test("concluída", async ({ page }) => {
  await iniciar(page, "Leitura");
  await botao(page, "Concluir etapa").click();
  await page.getByText("Leitura concluída").waitFor();
  await foto(page, "rotina-concluida");
});
