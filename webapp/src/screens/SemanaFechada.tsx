// Porta da tela ritual "Semana fechada" (renderSemanaFechada,
// index.html:13515-13565) — exibida após a virada de semana com a nota final,
// badge conquistado, delta em relação à semana anterior não dispensada,
// destaques de pontuação e campo de reflexão que vira nota comum.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME } from "../lib/constants";
import {
  semanaFechadaPendente,
  calcularDeltaSemana,
  calcularCorSemana,
  formatarPeriodoSemana,
  tituloNotaReflexao,
} from "../lib/semanaFechada";

export function SemanaFechada() {
  const gam = useAppStore((s) => s.gam);
  const goTo = useAppStore((s) => s.goTo);
  const marcarSemanaVista = useAppStore((s) => s.marcarSemanaVista);
  const addNote = useAppStore((s) => s.addNote);

  const [reflexao, setReflexao] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const semanas = gam.historico.semanas;
  const sem = semanaFechadaPendente(gam) || (semanas.length > 0 ? semanas[semanas.length - 1] : null);

  useEffect(() => {
    if (!sem) {
      goTo({ tab: "home", screen: "home" });
    }
  }, [sem, goTo]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [reflexao]);

  if (!sem) return null;

  const delta = calcularDeltaSemana(sem, semanas);
  const cor = calcularCorSemana(sem, gam.config.notaMinima);
  const { label: periodoLabel } = formatarPeriodoSemana(sem.inicioISO);

  const handleSkip = () => {
    marcarSemanaVista();
    goTo({ tab: "home", screen: "home" });
  };

  const handleSalvar = () => {
    const txt = reflexao.trim();
    if (txt) {
      const titulo = tituloNotaReflexao(sem.inicioISO, sem.nota);
      addNote(titulo, txt);
    }
    marcarSemanaVista();
    goTo({ tab: "home", screen: "home" });
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link-btn muted" id="sfSkip" onClick={handleSkip}>
          Depois
        </button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
        <div className="home-header" style={{ marginBottom: 2 }}>
          <h1>Semana fechada</h1>
        </div>
        <div className="routine-meta" style={{ marginBottom: 12 }}>
          {periodoLabel}
        </div>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 48,
              fontWeight: 600,
              color: cor,
            }}
          >
            {sem.nota.toFixed(1)}
          </div>
          {sem.dispensada ? (
            <div className="routine-meta">semana dispensada — não entra na média do mês</div>
          ) : (
            <div className="routine-meta">
              {sem.nota >= gam.config.notaMinima
                ? "aprovado"
                : `abaixo da nota mínima (${gam.config.notaMinima})`}
            </div>
          )}
          {sem.badge && (
            <div style={{ marginTop: 10, fontSize: 18, color: BADGE_COR[sem.badge] }}>
              {BADGE_CHAR[sem.badge]} {BADGE_NOME[sem.badge]}
            </div>
          )}
          {delta !== null && (
            <div className="dev-n" style={{ marginTop: 6 }}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} em relação à semana anterior
            </div>
          )}
        </div>

        {(sem.destaques || []).length > 0 && (
          <>
            <div className="section-label">O que mais somou</div>
            <div className="stat-card">
              {sem.destaques!.map((d, i) => (
                <div className="bar-row" key={i}>
                  <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                    {d.nome}
                  </div>
                  <div className="bar-val">{d.pontos.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-label">O que você leva dessa semana</div>
        <textarea
          id="sfReflexao"
          ref={textareaRef}
          className="mk-e-name"
          rows={1}
          placeholder="O que funcionou, o que atrapalhou, o que muda na semana que começa..."
          style={{ width: "100%", resize: "none", overflow: "hidden", lineHeight: 1.5 }}
          value={reflexao}
          onChange={(e) => setReflexao(e.target.value)}
          onInput={handleTextareaInput}
        />
        <button
          className="btn-primary"
          id="sfSalvar"
          style={{ width: "100%", marginTop: 14 }}
          onClick={handleSalvar}
        >
          Começar a semana
        </button>
      </div>
    </div>
  );
}
