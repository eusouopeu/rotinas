// Cartão fixo "Backup atrasado" (recomendação 11, 27/09/2026): aparece quando
// a última proteção dos dados passou de 7 dias. Tocar leva a Ajustes (Dados e
// backup); o "x" esconde só até o app ser reaberto.
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { diasSemBackup } from "../../lib/avisoBackup";
import { K_AUTOBAK } from "../../lib/constants";
import { getSyncBridge } from "../../lib/nativeBridge";
import { load } from "../../lib/storage";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { CartaoFixo } from "./CartaoFixo";

let dispensadoNaSessao = false;

export function AvisoBackup() {
  const lastBackupAt = useAppStore((s) => s.lastBackupAt);
  const routines = useAppStore((s) => s.routines);
  const notes = useAppStore((s) => s.notes);
  const goTo = useAppStore((s) => s.goTo);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [oculto, setOculto] = useState(dispensadoNaSessao);

  useEffect(() => {
    const bridge = getSyncBridge();
    if (!bridge) return;
    let vivo = true;
    bridge
      .getStatus()
      .then((st) => vivo && st.connected && setLastSyncAt(st.lastSyncAt || null))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  if (oculto) return null;
  const criados = [...routines.map((r) => r.createdAt || 0), ...notes.map((n) => n.createdAt || 0)].filter((t) => t > 0);
  const dias = diasSemBackup({
    marcas: [lastBackupAt, load<number>(K_AUTOBAK, 0), lastSyncAt],
    desde: criados.length ? Math.min(...criados) : null,
  });
  if (dias === null) return null;

  return (
    <CartaoFixo
      titulo="Backup atrasado"
      detalhe={`${dias} dias sem cópia dos seus dados — toque para fazer backup`}
      onClick={() => goTo({ tab: "settings", screen: "settings" })}
      acoes={
        <BotaoIcone
          rotulo="Lembrar depois"
          onClick={(e) => {
            e.stopPropagation();
            dispensadoNaSessao = true;
            setOculto(true);
          }}
        >
          <Icon name="xmark" size={14} />
        </BotaoIcone>
      }
    />
  );
}
