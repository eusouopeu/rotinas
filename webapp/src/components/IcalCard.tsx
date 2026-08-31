// Porta de icalCardHtml/wireIcalCard/refreshIcalCard (index.html:14217-14268)
// — card de Configurações → Backup → Calendário externo (URL secreta iCal).
// Disponível nas 3 plataformas (é só um fetch, sem OAuth) — diferente do
// SyncCard, que só existe em desktop/Android. Os eventos importados ficam em
// cache local (lib/ical.ts); a exibição no dia a dia entra quando a agenda
// inline em Rotinas for portada (ver docs/react-migration.md).
import { useState } from "react";
import { atualizarIcal, getIcalCache, getIcalUrl, saveIcalCache, saveIcalUrl, type IcalCache } from "../lib/ical";
import { isDesktop, isNative } from "../lib/storage";

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
          <div className="bar-row">
            <div className="bar-name" style={{ width: "auto", flex: 1 }}>
              Status
            </div>
            <div className="bar-val" style={{ width: "auto", color: "var(--ok)" }}>
              configurado
            </div>
          </div>
          <div className="stat-foot" style={{ marginTop: 6 }}>
            {cache ? `Última busca: ${new Date(cache.fetchedAt).toLocaleString("pt-BR")} · ${cache.eventos.length} evento(s).` : 'Ainda não buscou — toque em "Salvar e atualizar".'}
          </div>
        </>
      )}
      {erro && (
        <div className="stat-foot" style={{ marginTop: 6, color: "var(--erro)" }}>
          ⚠️ {erro}
        </div>
      )}
      <div className="section-label" style={{ margin: url ? "14px 0 4px" : "0 0 4px" }}>
        URL secreta (iCal / .ics)
      </div>
      <input
        type="text"
        className="mk-e-name"
        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
      />
      <div className="stat-foot" style={{ marginTop: 6 }}>
        No Google Calendar: Configurações da agenda → "Endereço secreto em formato iCal". Cole aqui — os eventos aparecem só leitura na agenda, dia a dia.
        {!isDesktop && !isNative ? " No navegador, alguns provedores bloqueiam essa busca (CORS); funciona de forma mais confiável no app instalado (desktop/Android)." : ""}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn-primary" style={{ flex: 1 }} disabled={!inputUrl.trim() || busy !== null} onClick={salvarEAtualizar}>
          {busy === "save" ? "Buscando..." : url ? "Salvar e atualizar" : "Salvar"}
        </button>
        {url && (
          <button className="btn-cancel" style={{ flex: "0 0 auto", padding: "0 14px" }} disabled={busy !== null} onClick={atualizarAgora}>
            {busy === "refresh" ? "Atualizando..." : "Atualizar agora"}
          </button>
        )}
      </div>
      {url && (
        <button className="link-btn" style={{ marginTop: 10, color: "var(--erro)" }} onClick={remover}>
          Remover calendário
        </button>
      )}
    </>
  );
}
