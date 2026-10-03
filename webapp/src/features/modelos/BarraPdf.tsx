// Faixa com o botão de PDF (ícone desde 03/10/2026) à direita, logo abaixo do cabeçalho de um documento
// (Kanban, prós e contras), e a mensagem de erro da exportação, se houver.
import { useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Legenda } from "../../ui/Legenda";
import { BarraDoc } from "./BarraDoc";

/** `antes`: outros botões da faixa, à esquerda do PDF. `exportar` devolve o resultado de exportPdfView; a barra mostra o erro. */
export function BarraPdf({
  exportar,
  antes,
}: {
  exportar: () => Promise<{ ok: boolean; erro?: string }>;
  antes?: ReactNode;
}) {
  const [erro, setErro] = useState("");
  return (
    <>
      <BarraDoc>
        {antes}
        <BotaoIcone
          rotulo="Exportar PDF"
          onClick={async () => {
            setErro("");
            const r = await exportar();
            if (!r.ok && r.erro) setErro(r.erro);
          }}
        >
          <Icon name="clipboard" size={15} />
        </BotaoIcone>
      </BarraDoc>
      {erro && <Legenda className="mt-3 text-erro">{erro}</Legenda>}
    </>
  );
}
