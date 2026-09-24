// Aba Rotinas: semana (lista no celular, grade de 7 colunas no desktop), dia
// (grade de horas), lista de rotinas (compacta/expandida, filtros), pausa da
// agenda, popups de criar e de tarefa e o arrasto dos cards.
import { test } from "@playwright/test";
import { arrastarCartao, foto, fotoInteira, preparar } from "./apoio.mjs";

const visao = (page, nome) => page.getByText(nome, { exact: true }).first().click();
const botao = (page, titulo) => page.locator(`button[title="${titulo}"]`);

test("rotinas: semana completa", async ({ page }) => {
  await preparar(page);
  await fotoInteira(page, "rotinas-semana-completa");
});

test("rotinas: próxima semana", async ({ page }) => {
  await preparar(page);
  await botao(page, "Próxima semana").click();
  await foto(page, "rotinas-semana-proxima");
});

test("rotinas: pausar a agenda (escolha)", async ({ page }) => {
  await preparar(page);
  await botao(page, "Pausar agenda").click();
  await foto(page, "rotinas-pausar");
});

test("rotinas: agenda pausada", async ({ page }) => {
  await preparar(page);
  await botao(page, "Pausar agenda").click();
  await page.getByRole("button", { name: "3 dias" }).click();
  await foto(page, "rotinas-pausada");
});

test("rotinas: nova tarefa no dia", async ({ page }) => {
  await preparar(page);
  await botao(page, "Nova tarefa neste dia").first().click();
  await page.getByPlaceholder("O que precisa ser feito?").fill("Ligar para o banco");
  await foto(page, "rotinas-tarefa-nova", { desfocar: true });
});

test("rotinas: editar tarefa", async ({ page }) => {
  await preparar(page);
  await botao(page, "Editar tarefa").first().click();
  await foto(page, "rotinas-tarefa-editar", { desfocar: true });
});

test("rotinas: dia", async ({ page }) => {
  await preparar(page);
  await visao(page, "Dia");
  await foto(page, "rotinas-dia-agenda");
});

test("rotinas: dia, rolado para a tarde", async ({ page }) => {
  await preparar(page);
  await visao(page, "Dia");
  await page.getByText("14:00", { exact: true }).first().scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 200 && getComputedStyle(e).overflowY === "auto");
    if (el) el.scrollTop = 14 * 60 * 1.6 - 120;
  });
  await foto(page, "rotinas-dia-tarde");
});

test("rotinas: dia seguinte", async ({ page }) => {
  await preparar(page);
  await visao(page, "Dia");
  await botao(page, "Próximo dia").click();
  await foto(page, "rotinas-dia-seguinte");
});

test("rotinas: dia, nova tarefa no vão da grade", async ({ page }) => {
  await preparar(page);
  await visao(page, "Dia");
  const caixa = await page.getByText("12:00", { exact: true }).first().boundingBox();
  await page.mouse.click(caixa.x + 190, caixa.y + 24);
  await foto(page, "rotinas-dia-vao", { desfocar: true });
});

test("rotinas: lista completa", async ({ page }) => {
  await preparar(page);
  await visao(page, "Lista");
  await fotoInteira(page, "rotinas-lista-completa");
});

test("rotinas: lista expandida", async ({ page }) => {
  await preparar(page);
  await visao(page, "Lista");
  await botao(page, "Cards expandidos").click();
  await fotoInteira(page, "rotinas-lista-expandida");
});

test("rotinas: lista sem as feitas hoje", async ({ page }) => {
  await preparar(page);
  await visao(page, "Lista");
  await botao(page, "Ocultar as rotinas já feitas hoje").click();
  await foto(page, "rotinas-lista-sem-feitas");
});

test("rotinas: lista só de hoje", async ({ page }) => {
  await preparar(page);
  await visao(page, "Lista");
  await botao(page, "Mostrar só as rotinas de hoje").click();
  await foto(page, "rotinas-lista-hoje");
});

test("rotinas: lista filtrada por área", async ({ page }) => {
  await preparar(page);
  await visao(page, "Lista");
  await page.locator("select").first().selectOption({ label: "Estudos" });
  await foto(page, "rotinas-lista-area");
});

test("rotinas: lista, card arrastado", async ({ page }) => {
  await preparar(page);
  await visao(page, "Lista");
  await arrastarCartao(page, /Treino A/, -100);
  await foto(page, "rotinas-lista-swipe");
});

test("rotinas: lista vazia", async ({ page }) => {
  await preparar(page, { comDados: false });
  await visao(page, "Lista");
  await foto(page, "rotinas-lista-vazia");
});

test("rotinas: popup de evento", async ({ page }) => {
  await preparar(page);
  await page.locator('button[title="Novo"]').dispatchEvent("click");
  await page.getByText("compromisso avulso na agenda").click();
  await foto(page, "rotinas-evento", { desfocar: true });
});
