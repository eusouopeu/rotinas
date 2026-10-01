// Espelho JSON das rotinas (01/10/2026, pedido do Pedro): cada rotina vira um
// arquivo em Documentos/<pasta de dados>/Rotinas/rotina-<slug>.json assim que
// é criada ou modificada — o mesmo formato e a mesma subpasta do "Exportar" do
// editor (rotinaShareData), então qualquer arquivo dali pode ser importado de
// volta como rotina avulsa.
//
// Mesmas regras do espelho Markdown das notas (lib/mdMirror.ts): mão única (o
// app escreve, nunca lê de volta), nome pelo título com desempate "-2", "-3"
// pela ordem de criação, renomear apaga o arquivo antigo e excluir a rotina
// apaga o dela. A fonte de verdade continua sendo K_ROUTINES.
import { rotinaShareData } from "./backup";
import { dataFolderName, slugify } from "./exportFile";
import { mdDedupSuffix } from "./mdMirror";
import { isDesktop, isNative } from "./storage";
import type { Routine } from "./types";

export const SUBPASTA_ROTINAS = "Rotinas";

/** Caminho relativo a Documentos do .json da rotina. */
export function caminhoJsonRotina(r: Routine, todas: Routine[]): string {
  const base = slugify(r.name || "rotina").slice(0, 40);
  const homonimas = todas
    .filter((x) => slugify(x.name || "rotina").slice(0, 40) === base)
    .map((x) => ({ id: x.id, createdAt: x.createdAt || 0 }));
  return `${dataFolderName()}/${SUBPASTA_ROTINAS}/rotina-${base}${mdDedupSuffix(homonimas, r.id)}.json`;
}

export interface PlanoEspelho {
  gravar: Array<{ caminho: string; texto: string }>;
  apagar: string[];
}

/** Parte pura: o que gravar/apagar entre duas versões da lista de rotinas.
 *  `anterior` null = primeira passada (grava todas). Grava a rotina nova, a
 *  alterada (outra referência) e a que mudou de caminho por desempate. */
export function planoEspelhoRotinas(atual: Routine[], anterior: Routine[] | null): PlanoEspelho {
  const gravar: PlanoEspelho["gravar"] = [];
  const apagar = new Set<string>();
  const antes = new Map((anterior || []).map((r) => [r.id, r]));
  const caminhosAntes = new Map((anterior || []).map((r) => [r.id, caminhoJsonRotina(r, anterior!)]));
  const novosCaminhos = new Set<string>();
  atual.forEach((r) => {
    const caminho = caminhoJsonRotina(r, atual);
    novosCaminhos.add(caminho);
    const velho = caminhosAntes.get(r.id);
    if (anterior === null || antes.get(r.id) !== r || velho !== caminho) {
      gravar.push({ caminho, texto: JSON.stringify(rotinaShareData(r), null, 2) });
    }
    if (velho && velho !== caminho) apagar.add(velho);
  });
  (anterior || []).forEach((r) => {
    if (!atual.some((x) => x.id === r.id)) apagar.add(caminhosAntes.get(r.id)!);
  });
  // nunca apaga um caminho que outra rotina acabou de ocupar
  novosCaminhos.forEach((c) => apagar.delete(c));
  return { gravar, apagar: [...apagar] };
}

/** Grava o plano no disco: Android (Capacitor, DOCUMENTS) ou desktop
 *  (Electron, pasta Documentos do sistema). No navegador não faz nada. */
export async function aplicarEspelhoRotinas(plano: PlanoEspelho): Promise<void> {
  const FS = isNative ? window.Capacitor?.Plugins.Filesystem : undefined;
  const docs = isDesktop ? window.electronBridge?.docs : undefined;
  if (!FS && !docs) return;
  for (const c of plano.apagar) {
    try {
      if (FS) await FS.deleteFile({ path: c, directory: "DOCUMENTS" });
      else await docs!.remove(c);
    } catch {
      /* já não existe */
    }
  }
  for (const g of plano.gravar) {
    try {
      if (FS)
        await FS.writeFile({
          path: g.caminho,
          directory: "DOCUMENTS",
          encoding: "utf8",
          data: g.texto,
          recursive: true,
        });
      else await docs!.write(g.caminho, g.texto);
    } catch (e) {
      console.error("espelho de rotina:", e);
    }
  }
}
