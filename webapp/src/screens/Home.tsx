// Aba Rotinas (porta parcial de renderHome, index.html:3531-3762): cabeçalho +
// resumo da roda + cartões fixos (rotina em andamento, semana fechada) + visões
// Semana / Dia (agenda, em features/rotinas/) / Lista (cartões de rotina, com
// filtros) + o popup de criar. Editar/criar rotina passa pelo RoutineEditor, o
// detalhe por RoutineDetail e "iniciar" pelo Player.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { RodaVidaResumo } from "../features/roda/RodaVidaResumo";
import { AgendaDia } from "../features/rotinas/AgendaDia";
import { AgendaSemana } from "../features/rotinas/AgendaSemana";
import { CartaoRotina } from "../features/rotinas/CartaoRotina";
import { CartaoFixo } from "../features/rotinas/CartaoFixo";
import { SelecaoArea } from "../features/rotinas/SelecaoArea";
import { TarefaPopup } from "../features/rotinas/TarefaPopup";
import { rotinaCabeEmHoje, rotinasOrdenadas } from "../lib/routines";
import { areaDaRotina } from "../lib/scoring";
import { localKey } from "../lib/gamificacao";
import { BADGE_CHAR, BADGE_COR, BADGE_NOME } from "../lib/constants";
import { semanaFechadaPendente } from "../lib/semanaFechada";
import { attachSwipeDownSearch } from "../lib/swipe";
import { execucaoDoDia } from "../lib/history";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { BotaoPlay } from "../ui/BotaoPlay";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Fab } from "../ui/Fab";
import { Legenda } from "../ui/Legenda";
import { ListaCartoes } from "../ui/ListaCartoes";
import { Modal, ModalAcoes, ModalTexto } from "../ui/Modal";
import { OpcaoCriar } from "../ui/OpcaoCriar";
import { SegPill } from "../ui/Segmentado";

export function Home() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const deleteRoutineWithUndo = useAppStore((s) => s.deleteRoutineWithUndo);
  const duplicateRoutine = useAppStore((s) => s.duplicateRoutine);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const playerSnapshot = useAppStore((s) => s.playerSnapshot);
  const resumePlayer = useAppStore((s) => s.resumePlayer);
  const descartarPlayerSnapshot = useAppStore((s) => s.descartarPlayerSnapshot);
  const goTo = useAppStore((s) => s.goTo);
  const homeView = useAppStore((s) => s.homeView);
  const setHomeView = useAppStore((s) => s.setHomeView);
  const soHoje = useAppStore((s) => s.soHoje);
  const setSoHoje = useAppStore((s) => s.setSoHoje);
  const listaExpandida = useAppStore((s) => s.listaExpandida);
  const setListaExpandida = useAppStore((s) => s.setListaExpandida);
  const ocultarFeitas = useAppStore((s) => s.ocultarFeitas);
  const setOcultarFeitas = useAppStore((s) => s.setOcultarFeitas);
  const filtroArea = useAppStore((s) => s.filtroArea);
  const setFiltroArea = useAppStore((s) => s.setFiltroArea);
  const openSearch = useAppStore((s) => s.openSearch);
  const headerRef = useRef<HTMLDivElement>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoEvento, setNovoEvento] = useState(false);

  const semFechada = semanaFechadaPendente(gam);
  /* Rotina deixada pela metade (index.html:3616-3637): só vale se a rotina
     ainda existir — apagada, o snapshot é lixo e some do cartão. */
  const rotinaEmAndamento = playerSnapshot && routines.some((r) => r.id === playerSnapshot.routineId) ? playerSnapshot : null;
  const hojeISO = localKey();
  /* Mesma ordem do legado (index.html:3645-3646): sempre por horário de início,
     e o filtro "hoje" esconde só quem tem dia fixo em outro dia. */
  /* Três filtros independentes da visão Lista: "só hoje" (dia), área da roda
     e "esconder as já feitas hoje". Os dois últimos entraram em 22/09/2026. */
  const visiveis = rotinasOrdenadas(routines)
    .filter((r) => !soHoje || rotinaCabeEmHoje(r))
    .filter((r) => !filtroArea || (filtroArea === "sem" ? !areaDaRotina(r, gam) : areaDaRotina(r, gam) === filtroArea))
    .filter((r) => !ocultarFeitas || !execucaoDoDia(history, r.id, hojeISO));

  // Puxar o cabeçalho pra baixo abre a busca global (wireSwipeDownSearch,
  // index.html:2955-2966) — só no topo da tela mesmo, sem scroll acima dele.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    return attachSwipeDownSearch(el, openSearch);
  }, [openSearch]);

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header mb-2.5" ref={headerRef}>
          <h1>Rotinas</h1>
          <BotaoIcone rotulo="Boletim da semana" tamanho="sm" onClick={() => goTo({ tab: "home", screen: "boletim" })}>
            <Icon name="trophy" size={16} />
          </BotaoIcone>
        </div>

        <RodaVidaResumo />

        {rotinaEmAndamento && (
          <CartaoFixo
            titulo="Rotina em andamento"
            detalhe={`${rotinaEmAndamento.routineName} · etapa ${rotinaEmAndamento.idx + 1}/${rotinaEmAndamento.steps.length}`}
            acoes={
              <>
                <BotaoIcone
                  rotulo="Descartar rotina em andamento"
                  onClick={() => {
                    if (window.confirm("Descartar a rotina em andamento?")) descartarPlayerSnapshot();
                  }}
                >
                  <Icon name="xmark" size={14} />
                </BotaoIcone>
                <BotaoPlay rotulo="Retomar rotina" onClick={resumePlayer} />
              </>
            }
          />
        )}

        {semFechada && (
          <CartaoFixo
            className="cursor-pointer"
            onClick={() => goTo({ tab: "home", screen: "semanaFechada" })}
            titulo={
              <>
                Semana fechada
                {semFechada.badge && (
                  <>
                    {" · "}
                    <span style={{ color: BADGE_COR[semFechada.badge] }}>
                      {BADGE_CHAR[semFechada.badge]} {BADGE_NOME[semFechada.badge]}
                    </span>
                  </>
                )}
              </>
            }
            detalhe={`Nota ${semFechada.nota.toFixed(1)} — toque para ver o fechamento`}
          />
        )}

        <SegPill
          cheia
          style={{ marginBottom: 14 }}
          options={[
            { key: "semana", label: "Semana" },
            { key: "dia", label: "Dia" },
            { key: "rotinas", label: "Lista" },
          ]}
          active={homeView}
          onSelect={setHomeView}
        />

        {homeView === "rotinas" && (
          <div className="mb-3.5 flex items-center gap-0.5">
            {gam.config.roda.areas.length > 0 ? (
              <SelecaoArea
                aria-label="Filtrar rotinas por área da roda da vida"
                title="Filtrar por área da roda da vida"
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
              >
                <option value="">Todas as áreas</option>
                {gam.config.roda.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
                <option value="sem">Sem área</option>
              </SelecaoArea>
            ) : (
              <span className="min-w-1.5 flex-auto" />
            )}
            <BotaoIcone
              className="ml-1.5"
              ligado={ocultarFeitas}
              rotulo={ocultarFeitas ? "Mostrar as rotinas já feitas hoje" : "Ocultar as rotinas já feitas hoje"}
              aria-pressed={ocultarFeitas}
              onClick={() => setOcultarFeitas(!ocultarFeitas)}
            >
              <Icon name="eye" size={15} />
            </BotaoIcone>
            <BotaoIcone
              className="ml-1.5"
              ligado={soHoje}
              rotulo="Mostrar só as rotinas de hoje"
              aria-pressed={soHoje}
              onClick={() => setSoHoje(!soHoje)}
            >
              <Icon name="calendar" size={15} />
            </BotaoIcone>
            <BotaoIcone
              className="ml-1.5"
              ligado={listaExpandida}
              rotulo={listaExpandida ? "Cards compactos" : "Cards expandidos"}
              aria-pressed={listaExpandida}
              onClick={() => setListaExpandida(!listaExpandida)}
            >
              <Icon name={listaExpandida ? "arrowsPointingIn" : "arrowsPointingOut"} size={15} />
            </BotaoIcone>
          </div>
        )}

        {homeView === "semana" ? (
          <AgendaSemana />
        ) : homeView === "dia" ? (
          <AgendaDia />
        ) : routines.length === 0 ? (
          <EstadoVazio titulo="Nenhuma rotina ainda" texto="Crie sua primeira sequência de etapas com tempo — igual um ritual de prática.">
            <Botao className="mt-3.5" onClick={() => openEditor(null)}>
              + Nova rotina
            </Botao>
          </EstadoVazio>
        ) : visiveis.length === 0 ? (
          <EstadoVazio titulo="Nada agendado para hoje" texto='Desligue o "hoje" para ver todas as rotinas.' />
        ) : (
          <ListaCartoes>
            {visiveis.map((r) => (
              <CartaoRotina
                key={r.id}
                r={r}
                routines={routines}
                gam={gam}
                history={history}
                hojeISO={hojeISO}
                expandido={listaExpandida}
                onExcluir={() => deleteRoutineWithUndo(r.id)}
                onDuplicar={() => duplicateRoutine(r.id)}
                onAbrir={() => goTo({ tab: "home", screen: "routineDetail", id: r.id })}
                onIniciar={() => startPlayer(r.id)}
              />
            ))}
          </ListaCartoes>
        )}
      </div>

      {/* um único FAB nas três visões: abre a escolha entre rotina e evento */}
      <Fab rotulo="Novo" onClick={() => setNovoAberto(true)} />
      {novoAberto && (
        <Modal onFechar={() => setNovoAberto(false)} className="text-left">
          <ModalTexto className="mb-3">Criar</ModalTexto>
          <div className="flex flex-col gap-2">
            <OpcaoCriar
              icone="play"
              titulo="Rotina"
              descricao="sequência de etapas com tempo"
              onClick={() => {
                setNovoAberto(false);
                openEditor(null);
              }}
            />
            <OpcaoCriar
              icone="calendar"
              titulo="Evento"
              descricao="compromisso avulso na agenda"
              onClick={() => {
                setNovoAberto(false);
                setNovoEvento(true);
              }}
            />
          </div>
          <ModalAcoes className="mt-3.5">
            <Botao variante="neutro" tamanho="modal" onClick={() => setNovoAberto(false)}>
              Cancelar
            </Botao>
          </ModalAcoes>
        </Modal>
      )}
      {novoEvento && <TarefaPopup iso={hojeISO} card={null} onClose={() => setNovoEvento(false)} />}
      <Tabbar />
    </div>
  );
}
