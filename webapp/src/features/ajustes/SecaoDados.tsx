// Dados, backup, nuvem e diagnóstico num accordion só (pedido do Pedro,
// 22/09/2026). montarSempre porque o BackupCard precisa checar/avisar sobre
// backup mais recente de outro aparelho mesmo com a seção fechada.
import { isDesktop, isNative } from "../../lib/storage";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { BackupCard } from "./BackupCard";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { SecaoAjuste } from "./SecaoAjuste";
import { SyncCard } from "./SyncCard";

export function SecaoDados() {
  return (
    <SecaoAjuste
      titulo="Dados e backup"
      busca="dados rotinas notas modelos execuções backup exportar importar arquivo automático sincronização nuvem drive google conflito diagnóstico pontes nativas teste"
      montarSempre
    >
      <BackupCard />

      {(isDesktop || isNative) && (
        <>
          <RotuloSecao>Sincronização com nuvem</RotuloSecao>
          <div className="pt-2.5">
            <SyncCard />
          </div>
        </>
      )}

      <RotuloSecao>Diagnóstico</RotuloSecao>
      <DiagnosticsCard />
    </SecaoAjuste>
  );
}
