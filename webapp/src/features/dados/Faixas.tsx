// Barras separadas em duas faixas coloridas (bom / abaixo): verde suave e
// vermelho suave, cada uma com seu rótulo. Faixa vazia some. As linhas de
// barra ficam numa <GradeBarras> para as colunas alinharem.
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { GradeBarras } from "../../ui/LinhaBarra";

export function Faixas<T>({
  itens,
  ehBom,
  rotulos,
  linha,
}: {
  itens: T[];
  ehBom: (x: T) => boolean;
  rotulos: [string, string];
  linha: (x: T) => ReactNode;
}) {
  const grupos: Array<{ chave: string; bom: boolean; rotulo: string; itens: T[] }> = [
    { chave: "ok", bom: true, rotulo: rotulos[0], itens: itens.filter(ehBom) },
    { chave: "baixo", bom: false, rotulo: rotulos[1], itens: itens.filter((x) => !ehBom(x)) },
  ];
  return (
    <>
      {grupos
        .filter((g) => g.itens.length > 0)
        .map((g) => (
          <div
            key={g.chave}
            className={cn("rounded-app-sm px-3 py-2.5 [&+&]:mt-2", g.bom ? "bg-ok-soft" : "bg-erro-soft")}
          >
            <div className="mb-2 font-sans text-2xs font-semibold tracking-[0.06em] text-sub uppercase">{g.rotulo}</div>
            <GradeBarras>{g.itens.map(linha)}</GradeBarras>
          </div>
        ))}
    </>
  );
}
