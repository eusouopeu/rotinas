// Aba Metas: listas (recorrentes e prazos), estados vazios, contadores, cards
// arrastados, popups e os dois formulários (nova/editar, negativa, áreas).
import { test } from "@playwright/test";
import { aba, arrastarCartao, foto, preparar } from "./apoio.mjs";

async function abrirMetas(page, opcoes) {
  await preparar(page, opcoes);
  await aba(page, "Metas");
  await page.getByText("Recorrentes", { exact: true }).first().waitFor();
}
const alternar = (page, nome) => page.getByText(nome, { exact: true }).first().click();
const fab = (page) => page.locator('button[title="Novo"]');

test("metas: só recorrentes", async ({ page }) => {
  await abrirMetas(page);
  await foto(page, "metas-recorrentes");
});

test("metas: só prazos", async ({ page }) => {
  await abrirMetas(page);
  await alternar(page, "Prazos");
  await alternar(page, "Recorrentes");
  await foto(page, "metas-prazos");
});

test("metas: vazio", async ({ page }) => {
  await abrirMetas(page, { comDados: false });
  await foto(page, "metas-vazio-recorrentes");
});

test("metas: vazio (prazos)", async ({ page }) => {
  await abrirMetas(page, { comDados: false });
  await alternar(page, "Prazos");
  await alternar(page, "Recorrentes");
  await foto(page, "metas-vazio-prazos");
});

test("metas: contadores (concluída e excedida)", async ({ page }) => {
  await abrirMetas(page);
  const mais = page.getByRole("button", { name: "Mais um" });
  await mais.nth(0).click(); // Beber 2 L de água: 1/1 → concluída
  await mais.nth(2).click(); // Redes sociais (limite 2)...
  await mais.nth(2).click();
  await mais.nth(2).click(); // ...passou do limite
  await foto(page, "metas-contadores");
});

test("metas: card arrastado (excluir e duplicar)", async ({ page }) => {
  await abrirMetas(page);
  await arrastarCartao(page, "Treinar", -100);
  await arrastarCartao(page, "Beber 2 L de água", 100);
  await foto(page, "metas-swipe");
});

test("metas: roda da vida recolhida", async ({ page }) => {
  await abrirMetas(page);
  await page.getByRole("button", { name: /Roda da vida/ }).first().click();
  await foto(page, "metas-roda-recolhida");
});

test("metas: roda da vida, próxima página (setas do desktop)", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("desktop"), "as setas só existem no desktop");
  await abrirMetas(page);
  await page.locator('button[aria-label="Próximas áreas"]').click();
  await foto(page, "metas-roda-pagina2");
});

test("metas: escolher o tipo (recorrentes + prazos)", async ({ page }) => {
  await abrirMetas(page);
  await alternar(page, "Prazos");
  await fab(page).dispatchEvent("click");
  await foto(page, "metas-criar-tipo");
});

test("metas: nova meta recorrente", async ({ page }) => {
  await abrirMetas(page);
  await fab(page).dispatchEvent("click");
  await page.getByPlaceholder("Alvo (ex.: Beber água)").fill("Alongar");
  await foto(page, "metas-form-rec", { desfocar: true });
});

test("metas: nova meta recorrente negativa com lembretes", async ({ page }) => {
  await abrirMetas(page);
  await fab(page).dispatchEvent("click");
  await page.getByPlaceholder("Alvo (ex.: Beber água)").fill("Doce");
  await page.getByRole("button", { name: "Meta negativa" }).click();
  await foto(page, "metas-form-rec-negativa", { desfocar: true });
});

test("metas: lembretes ligados", async ({ page }) => {
  await abrirMetas(page);
  await fab(page).dispatchEvent("click");
  await page.getByRole("button", { name: "Lembrar em horários fixos" }).click();
  await foto(page, "metas-form-rec-lembretes", { desfocar: true });
});

test("metas: editar meta recorrente", async ({ page }) => {
  await abrirMetas(page);
  await page.getByRole("heading", { name: "Treinar" }).click();
  await foto(page, "metas-form-rec-editar", { desfocar: true });
});

test("metas: nova meta com prazo", async ({ page }) => {
  await abrirMetas(page);
  await alternar(page, "Prazos");
  await alternar(page, "Recorrentes");
  await fab(page).dispatchEvent("click");
  await page.getByPlaceholder("Alvo (ex.: Prova SEFAZ-BA)").fill("Prova de inglês");
  await page.getByLabel("Quantos itens").fill("40");
  await page.getByLabel("Tipo do item").fill("questões");
  await page.getByLabel("Prazo", { exact: true }).fill("15102026");
  await page.getByRole("button", { name: /Área|área/ }).first().isVisible().catch(() => {});
  await foto(page, "metas-form-prazo", { desfocar: true });
});

test("metas: prazo com áreas, dias e sugestões", async ({ page }) => {
  await abrirMetas(page);
  await alternar(page, "Prazos");
  await alternar(page, "Recorrentes");
  await fab(page).dispatchEvent("click");
  await page.getByPlaceholder("Alvo (ex.: Prova SEFAZ-BA)").fill("Prova de inglês");
  await page.getByLabel("Prazo", { exact: true }).fill("15102026");
  await page.getByLabel("Adicionar área").fill("Saúde");
  await page.getByLabel("Adicionar área").press("Enter");
  await page.getByText("S", { exact: true }).nth(1).click();
  await page.getByLabel("Adicionar área").click();
  await foto(page, "metas-form-prazo-areas");
});

test("metas: editar meta com prazo", async ({ page }) => {
  await abrirMetas(page);
  await alternar(page, "Prazos");
  await alternar(page, "Recorrentes");
  await page.getByRole("heading", { name: "Terminar o curso de inglês" }).click();
  await foto(page, "metas-form-prazo-editar", { desfocar: true });
});
