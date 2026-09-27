// Diagnóstico do cronômetro fora do app (recomendação 12 de 26/09/2026): a
// Now Bar depende do One UI aceitar a notificação como "em tempo real", e isso
// não aparece em lugar nenhum. Aqui o app mostra o que o sistema permite e
// dispara uma contagem de teste de 10 s para conferir na tela de bloqueio.
import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  abrirAjustesNotificacao,
  cronometroStatus,
  overlayHide,
  overlayShow,
  type CronometroStatus,
} from "../../lib/nativeBridge";
import { Botao } from "../../ui/Botao";
import { Legenda } from "../../ui/Legenda";
import { LinhaValor } from "../../ui/LinhaValor";

const TESTE_MS = 10_000;

function estado(ok: boolean | null | undefined): { txt: string; cor?: string } {
  if (ok == null) return { txt: "não se aplica" };
  return ok ? { txt: "permitido", cor: "var(--ok)" } : { txt: "bloqueado", cor: "var(--erro)" };
}

export function DiagnosticoCronometro() {
  const cronometroModo = useAppStore((s) => s.cronometroModo);
  const emRotina = useAppStore((s) => !!s.playerState);
  const [st, setSt] = useState<CronometroStatus | null>(null);
  const [testando, setTestando] = useState(false);

  const atualizar = () => void cronometroStatus().then(setSt);
  useEffect(() => {
    atualizar();
    const onVis = () => {
      if (!document.hidden) atualizar();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!testando) return;
    const id = setTimeout(() => {
      overlayHide();
      setTestando(false);
    }, TESTE_MS + 5000);
    return () => clearTimeout(id);
  }, [testando]);

  function testar() {
    const fim = Date.now() + TESTE_MS;
    overlayShow({
      endTs: fim,
      remainingMs: TESTE_MS,
      paused: false,
      auto: false,
      visible: false,
      modo: cronometroModo === "bolha" ? "bolha" : "barra",
      label: "Teste do cronômetro",
      queue: "[]",
    });
    setTestando(true);
  }

  if (!st) return <Legenda className="mt-3">Diagnóstico indisponível nesta versão do app.</Legenda>;
  const linhas = [
    { rotulo: "Notificações do app", ...estado(st.notificacoes) },
    { rotulo: "Notificações em tempo real (Now Bar)", ...estado(st.promovidas) },
    { rotulo: "Sobrepor a outros apps (bolha)", ...estado(st.sobreposicao) },
  ];
  return (
    <div className="mt-3">
      {linhas.map((l) => (
        <LinhaValor key={l.rotulo} rotulo={l.rotulo} valor={l.txt} corValor={l.cor} />
      ))}
      <div className="mt-2 flex flex-wrap gap-2">
        <Botao variante="pilula" disabled={testando || emRotina} onClick={testar}>
          {testando ? "contando…" : "testar 10 s"}
        </Botao>
        <Botao variante="pilula" onClick={abrirAjustesNotificacao}>
          ajustes de notificação
        </Botao>
      </div>
      <Legenda className="mt-2">
        {emRotina
          ? "Há uma rotina em andamento: o teste fica desligado para não encerrar o cronômetro dela."
          : "Toque em testar e bloqueie o celular: a contagem deve aparecer na Now Bar. Android " + st.sdk + "."}
      </Legenda>
    </div>
  );
}
