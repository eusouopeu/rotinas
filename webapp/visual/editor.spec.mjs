// Editor de rotina (nova e existente), etapas de exercício com a biblioteca
// (escolher, sugestões, novo/editar), agendamento, e o detalhe da rotina.
import { test } from "@playwright/test";
import { foto, fotoInteira, preparar } from "./apoio.mjs";

const ROLAGEM = "[data-rolagem], .screen > div:nth-child(2), [data-tela] > div:nth-child(2)";
const botao = (page, titulo) => page.locator(`button[title="${titulo}"]`);

async function novaRotina(page) {
  await preparar(page);
  await botao(page, "Novo").dispatchEvent("click");
  await page.getByText("sequência de etapas com tempo").click();
  await page.getByPlaceholder("Nome da rotina").waitFor();
}
async function abrirDetalhe(page, nome) {
  await preparar(page);
  await page.getByText("Lista", { exact: true }).first().click();
  await page.getByRole("heading", { name: nome }).click();
  await page.getByRole("button", { name: "Editar" }).waitFor();
}
async function abrirEditor(page, nome) {
  await abrirDetalhe(page, nome);
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByPlaceholder("Nome da rotina").waitFor();
}
async function etapaExercicio(page) {
  await page.getByText("exercício", { exact: true }).first().click();
}

test("editor: rotina existente", async ({ page }) => {
  await abrirEditor(page, /Treino A/);
  await fotoInteira(page, "editor-existente", ROLAGEM);
});

test("editor: nova rotina preenchida", async ({ page }) => {
  await novaRotina(page);
  await page.getByPlaceholder("Nome da rotina").fill("Rotina noturna");
  await page.getByPlaceholder("Nome da etapa").fill("Alongar");
  await page.getByText("+ adicionar etapa").click();
  await fotoInteira(page, "editor-nova-preenchida", ROLAGEM);
});

test("editor: horário ativado", async ({ page }) => {
  await novaRotina(page);
  await page.getByText("Ativar horário").click();
  await fotoInteira(page, "editor-horario", ROLAGEM);
});

test("editor: etapa de exercício sem escolha", async ({ page }) => {
  await novaRotina(page);
  await etapaExercicio(page);
  await fotoInteira(page, "editor-exercicio", ROLAGEM);
});

test("editor: escolher exercício", async ({ page }) => {
  await novaRotina(page);
  await etapaExercicio(page);
  await page.getByText("escolher exercício").click();
  await foto(page, "editor-picker", { zerarRolagem: true });
});

test("editor: sugestões por grupo", async ({ page }) => {
  await novaRotina(page);
  await etapaExercicio(page);
  await page.getByText("escolher exercício").click();
  await page.getByText(/Sugestões por grupo muscular/).click();
  await foto(page, "editor-picker-sugestoes", { zerarRolagem: true });
});

test("editor: novo exercício", async ({ page }) => {
  await novaRotina(page);
  await etapaExercicio(page);
  await page.getByText("escolher exercício").click();
  await page.getByText("+ Novo exercício").click();
  await foto(page, "editor-exercicio-novo", { desfocar: true, zerarRolagem: true });
});

test("editor: editar exercício", async ({ page }) => {
  await novaRotina(page);
  await etapaExercicio(page);
  await page.getByText("escolher exercício").click();
  await botao(page, "Editar").first().click();
  await foto(page, "editor-exercicio-editar", { desfocar: true, zerarRolagem: true });
});

test("editor: exercício escolhido", async ({ page }) => {
  await novaRotina(page);
  await etapaExercicio(page);
  await page.getByText("escolher exercício").click();
  await page.getByText("Supino reto").click();
  await fotoInteira(page, "editor-exercicio-escolhido", ROLAGEM);
});

test("detalhe: rotina agendada", async ({ page }) => {
  await abrirDetalhe(page, /Treino A/);
  await foto(page, "detalhe-treino");
});

test("detalhe: rotina feita hoje", async ({ page }) => {
  await abrirDetalhe(page, /Manhã/);
  await foto(page, "detalhe-manha");
});
