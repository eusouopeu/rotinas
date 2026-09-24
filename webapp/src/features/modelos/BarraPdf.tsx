// Faixa com o botão "PDF" à direita, logo abaixo do cabeçalho de um documento
// (Kanban, prós e contras), e a mensagem de erro da exportação, se houver.
import { useState } from "react";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Legenda } from "../../ui/Legenda";

/** `exportar` devolve o resultado de exportPdfView; a barra mostra o erro. */
export function BarraPdf({ exportar }: { exportar: () => Promise<{ ok: boolean; erro?: string }> }) {
  const [erro, setErro] = useState("");
  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-3">
        <BotaoIcone
          rotulo="Exportar PDF"
          onClick={async () => {
            setErro("");
            const r = await exportar();
            if (!r.ok && r.erro) setErro(r.erro);
          }}
        >
          PDF
        </BotaoIcone>
      </div>
      {erro && <Legenda className="mt-3 text-erro">{erro}</Legenda>}
    </>
  );
}
