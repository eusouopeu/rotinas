// Documentos de Modelos, parte 2: lista de mercado (normal, modo compra,
// edição, gôndolas), lista de viagem e matriz (grade, expandida, edição).
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
const rolagem = ".screen > div:last-child";
const botao = (page, nome) => page.locator(`button[aria-label="${nome}"]`);

test("mercado: lista", async ({ page }) => {
  await abrir(page, "Compras do mês");
  await fotoInteira(page, "doc-mercado", rolagem);
});

test("mercado: sugestões ao digitar", async ({ page }) => {
  await abrir(page, "Compras do mês");
  await page.getByPlaceholder("Item").fill("ar");
  await foto(page, "doc-mercado-sugestoes", { desfocar: true });
});

test("mercado: modo compra", async ({ page }) => {
  await abrir(page, "Compras do mês");
  await botao(page, "Modo compra").click();
  await foto(page, "doc-mercado-compra");
});

test("mercado: item em edição", async ({ page }) => {
  await abrir(page, "Compras do mês");
  await page.getByText("tomate", { exact: true }).click();
  await foto(page, "doc-mercado-edicao", { desfocar: true, zerarRolagem: true });
});

test("mercado: ordenar gôndolas", async ({ page }) => {
  await abrir(page, "Compras do mês");
  await page.getByText("ordenar gôndolas").click();
  await fotoInteira(page, "doc-mercado-gondolas", rolagem);
});

test("mercado: vazia", async ({ page }) => {
  await abrir(page, "Lista vazia");
  await foto(page, "doc-mercado-vazia");
});

test("viagem: lista", async ({ page }) => {
  await abrir(page, "Praia em janeiro");
  await fotoInteira(page, "doc-viagem", rolagem);
});

test("viagem: item em edição", async ({ page }) => {
  await abrir(page, "Praia em janeiro");
  await page.getByText("camisetas", { exact: true }).click();
  await foto(page, "doc-viagem-edicao", { desfocar: true, zerarRolagem: true });
});

test("viagem: sugestões", async ({ page }) => {
  await abrir(page, "Praia em janeiro");
  await page.getByPlaceholder("Item").fill("ca");
  await foto(page, "doc-viagem-sugestoes", { desfocar: true });
});

test("viagem: vazia", async ({ page }) => {
  await abrir(page, "Mala vazia");
  await foto(page, "doc-viagem-vazia");
});

test("matriz: grade", async ({ page }) => {
  await abrir(page, "Prioridades da semana");
  await foto(page, "doc-matriz");
});

test("matriz: quadrante expandido", async ({ page }) => {
  await abrir(page, "Prioridades da semana");
  await botao(page, "Expandir").nth(1).click();
  await foto(page, "doc-matriz-expandido");
});

test("matriz: item em edição", async ({ page }) => {
  await abrir(page, "Prioridades da semana");
  await page.getByText("Marcar dentista", { exact: true }).click();
  await foto(page, "doc-matriz-edicao", { desfocar: true });
});

test("matriz: rótulos dos eixos", async ({ page }) => {
  await abrir(page, "Prioridades da semana");
  await botao(page, "Rótulos dos eixos").click();
  await foto(page, "doc-matriz-eixos", { desfocar: true });
});
