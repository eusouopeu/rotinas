// Catálogo de primitivos (/#/ui, ver src/ui/Catalogo.tsx):
//  - paridade: cada primitivo novo tem de ter os MESMOS estilos computados que
//    o elemento equivalente feito com as classes do app.css legado;
//  - captura: foto do catálogo inteiro, para pegar regressão de qualquer variante.
// A paridade só roda nos perfis de celular: no desktop o lado legado ganha as
// sobreposições de >=900px do app.css, que os primitivos reproduzem por
// variante (`desktop:`) mas que não cabem numa comparação de estilo único.
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/ui", { waitUntil: "domcontentloaded" });
  await page.locator("[data-catalogo]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "* { caret-color: transparent !important; }" });
});

const PROPS = [
  "display", "position", "boxSizing", "flexGrow", "flexShrink", "flexBasis", "flexDirection", "alignItems",
  "justifyContent", "gap", "zIndex", "top", "right", "bottom", "left",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  "backgroundColor", "color", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform",
  "textAlign", "opacity", "cursor", "content", "transform", "translate", "maxWidth", "minWidth", "minHeight",
];

// Encerrada na harmonização (24/09/2026): fonte e escala de texto mudaram de propósito,
// então o legado deixou de ser a régua. Serviu à migração; a régua agora é a captura.
test.skip("paridade: primitivos = classes legadas", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("desktop"), "paridade só no celular");
  const diffs = await page.evaluate((props) => {
    const fam = (s) => s.split(",")[0].replace(/["']/g, "").trim();
    const ler = (el, pseudo) => {
      const cs = getComputedStyle(el, pseudo || null);
      const out = {};
      for (const p of props) out[p] = cs[p];
      // cor de borda só importa se a borda existe (largura 0 = invisível)
      for (const s of ["Top", "Right", "Bottom", "Left"])
        if (cs[`border${s}Width`] === "0px") out[`border${s}Color`] = "sem borda";
      out.fontFamily = fam(cs.fontFamily);
      if (!pseudo) {
        const r = el.getBoundingClientRect();
        out.largura = Math.round(r.width * 10) / 10;
        out.altura = Math.round(r.height * 10) / 10;
      }
      return out;
    };
    const alvo = (raiz, a) => {
      const base = a.sel ? raiz.querySelector(a.sel) : raiz.firstElementChild;
      if (!base) return null;
      return { el: base, pseudo: a.pseudo };
    };
    const res = [];
    const nomes = [...new Set([...document.querySelectorAll("[data-par]")].map((e) => e.dataset.par))];
    for (const nome of nomes) {
      const [leg, nov] = ["legado", "novo"].map((l) => document.querySelector(`[data-par="${nome}"][data-lado="${l}"]`));
      const cl = JSON.parse(leg.dataset.comparar), cn = JSON.parse(nov.dataset.comparar);
      const ign = new Set(JSON.parse(leg.dataset.ignorar || "[]"));
      cl.forEach((al, i) => {
        const a = alvo(leg, al), b = alvo(nov, cn[i]);
        const rot = `${nome} › ${al.sel || "raiz"}${al.pseudo || ""}`;
        if (!a || !b) return res.push(`${rot}: elemento não encontrado (${a ? "novo" : "legado"})`);
        const x = ler(a.el, a.pseudo), y = ler(b.el, b.pseudo);
        for (const k of Object.keys(x)) if (x[k] !== y[k] && !ign.has(k)) res.push(`${rot}: ${k} legado=${x[k]} novo=${y[k]}`);
      });
    }
    return res;
  }, PROPS);
  expect(diffs, "diferenças legado × novo:\n" + diffs.join("\n")).toEqual([]);
});

test("catálogo", async ({ page }) => {
  // o catálogo rola dentro do #app: estica a janela até caber tudo numa foto só
  const alturaTotal = await page.locator("[data-catalogo]").evaluate((el) => el.scrollHeight);
  const { width } = page.viewportSize();
  await page.setViewportSize({ width, height: alturaTotal + 40 });
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("catalogo.png", { fullPage: false });
});
