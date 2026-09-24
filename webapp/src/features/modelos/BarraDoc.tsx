// Faixa de botões-ícone à direita, logo abaixo do cabeçalho de um documento
// (modo compra, recomprar, compartilhar, PDF…).
import type { ReactNode } from "react";

export function BarraDoc({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex items-center justify-end gap-3">{children}</div>;
}
