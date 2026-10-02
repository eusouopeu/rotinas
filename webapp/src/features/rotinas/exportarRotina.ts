// Exporta uma rotina como .json compartilhável (botão do topo do detalhe e do
// editor, mockup de 02/10/2026). Mesmo formato do import (rotinaShareData).
import { rotinaShareData } from "../../lib/backup";
import { downloadFile, slugify } from "../../lib/exportFile";
import type { Routine } from "../../lib/types";

export async function exportarRotina(r: Routine): Promise<void> {
  const filename = "rotina-" + slugify(r.name || "rotina") + ".json";
  await downloadFile(filename, JSON.stringify(rotinaShareData(r), null, 2), "application/json", "Rotinas");
}
