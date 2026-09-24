// Documentos de Modelos: cabeçalho comum, kanban, registro de pensamentos,
// prós e contras e placar (cada tipo em vários estados). Abre pela busca da
// aba Modelos (a pasta de prós e contras não aparece na lista de pastas).
import { test } from "@playwright/test";
import { aba, foto, fotoInteira, preparar } from "./apoio.mjs";

async function abrir(page, titulo) {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.getByPlaceholder("Buscar modelos...").fill(titulo);
  await page.getByRole("heading", { name: titulo }).click();
  await page.locator("input").first().waitFor();
  await page.waitForTimeout(200);
}
const rolagem = ".screen > div:last-child, [data-tela] > div:last-child";

test("kanban: coluna vazia", async ({ page }) => {
  await abrir(page, "Viagem de fim de ano");
  await foto(page, "doc-kanban-vazia");
});

test("kanban: cartão em edição", async ({ page }) => {
  await abrir(page, "Projeto Casa");
  await page.getByText("Pintar o quarto", { exact: true }).click();
  await foto(page, "doc-kanban-edicao", { desfocar: true, zerarRolagem: true });
});

test("rpd: preenchido", async ({ page }) => {
  await abrir(page, "Reunião de segunda");
  await foto(page, "doc-rpd");
});

test("prós e contras", async ({ page }) => {
  await abrir(page, "Mudar de apartamento");
  await foto(page, "doc-proscons");
});

test("prós e contras: item em edição", async ({ page }) => {
  await abrir(page, "Mudar de apartamento");
  await page.getByText("Varanda", { exact: true }).click();
  await foto(page, "doc-proscons-edicao", { desfocar: true });
});

test("placar: 3 jogadores", async ({ page }) => {
  await abrir(page, "Truco de sábado");
  await fotoInteira(page, "doc-placar", rolagem);
});

test("placar: 6 jogadores, menor vence", async ({ page }) => {
  await abrir(page, "Torneio de dominó");
  await fotoInteira(page, "doc-placar-6", rolagem);
});

test("placar: vazio", async ({ page }) => {
  await abrir(page, "Placar vazio");
  await foto(page, "doc-placar-vazio");
});
