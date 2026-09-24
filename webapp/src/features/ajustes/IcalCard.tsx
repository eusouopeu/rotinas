// Porta de icalCardHtml/wireIcalCard/refreshIcalCard (index.html:14217-14268)
// — card de Configurações → Backup → Calendário externo (URL secreta iCal).
// Disponível nas 3 plataformas (é só um fetch, sem OAuth) — diferente do
// SyncCard, que só existe em desktop/Android. Os eventos importados ficam em
// cache local (lib/ical.ts); a exibição no dia a dia entra quando a agenda
// inline em Rotinas for portada (ver docs/react-migration.md).
import { useState } from "react";
import { atualizarIcal, getIcalCache, getIcalUrl, saveIcalCache, saveIcalUrl, type IcalCache } from "../../lib/ical";
import { isDesktop, isNative } from "../../lib/storage";
import { Botao } from "../../ui/Botao";
import { Campo } from "../../ui/Campo";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { LinhaValor } from "../../ui/LinhaValor";

export function IcalCard() {
  const [url, setUrl] = useState(getIcalUrl());
  const [cache, setCache] = useState<IcalCache | null>(getIcalCache());
  const [inputUrl, setInputUrl] = useState(url);
  const [busy, setBusy] = useState<"save" | "refresh" | null>(null);
  const [erro, setErro] = useState("");

  async function salvarEAtualizar() {
    const u = inputUrl.trim();
    if (!u) return;
    setBusy("save");
    setErro("");
    saveIcalUrl(u);
    setUrl(u);
    try {
      setCache(await atualizarIcal(u));
    } catch {
      setErro("Não deu para buscar o calendário — confira a URL ou tente de novo mais tarde");
    }
    setBusy(null);
  }

  async function atualizarAgora() {
    setBusy("refresh");
    setErro("");
    try {
      setCache(await atualizarIcal(url));
    } catch {
      setErro("Não deu para buscar o calendário — confira a URL ou tente de novo mais tarde");
    }
    setBusy(null);
  }

  function remover() {
    if (!window.confirm("Remover o calendário externo? Os eventos somem da agenda.")) return;
    saveIcalUrl("");
    saveIcalCache(null);
    setUrl("");
    setInputUrl("");
    setCache(null);
    setErro("");
  }

  return (
    <>
      {url && (
        <>
          <LinhaValor rotulo="Status" valor="configurado" corValor="var(--ok)" />
          <Legenda className="mt-1.5">
            {cache
              ? `Última busca: ${new Date(cache.fetchedAt).toLocaleString("pt-BR")} · ${cache.eventos.length} evento(s).`
              : 'Ainda não buscou — toque em "Salvar e atualizar".'}
          </Legenda>
        </>
      )}
      {erro && <Legenda className="mt-1.5 text-erro">⚠️ {erro}</Legenda>}
      <RotuloSecao className={url ? "mt-3.5 mb-1" : "mt-0 mb-1"}>URL secreta (iCal / .ics)</RotuloSecao>
      <Campo
        variante="modelo"
        type="text"
        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
      />
      <Legenda className="mt-1.5">
        No Google Calendar: Configurações da agenda → "Endereço secreto em formato iCal". Cole aqui — os eventos
        aparecem só leitura na agenda, dia a dia.
        {!isDesktop && !isNative
          ? " No navegador, alguns provedores bloqueiam essa busca (CORS); funciona de forma mais confiável no app instalado (desktop/Android)."
          : ""}
      </Legenda>
      <div className="mt-2.5 flex gap-2">
        <Botao className="flex-1" disabled={!inputUrl.trim() || busy !== null} onClick={salvarEAtualizar}>
          {busy === "save" ? "Buscando..." : url ? "Salvar e atualizar" : "Salvar"}
        </Botao>
        {url && (
          <Botao variante="neutro" className="shrink-0 px-3.5 py-0" disabled={busy !== null} onClick={atualizarAgora}>
            {busy === "refresh" ? "Atualizando..." : "Atualizar agora"}
          </Botao>
        )}
      </div>
      {url && (
        <Botao variante="pilula" className="mt-2.5 text-erro" onClick={remover}>
          Remover calendário
        </Botao>
      )}
    </>
  );
}
