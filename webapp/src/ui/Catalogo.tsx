// Catálogo de desenvolvimento dos primitivos de ui/ — abra /#/ui com o
// `npm run dev:react` (não existe no build de produção: main.tsx só o importa
// em DEV). Cada linha mostra o componente NOVO ao lado do MESMO elemento feito
// com as classes do app.css antigo. Duas utilidades:
//   1. olho: ver todas as variantes, nos dois temas (botão "tema"), num lugar só;
//   2. teste: webapp/visual/catalogo.spec.mjs compara os estilos computados dos
//      dois lados e reprova se o primitivo divergir do legado (paridade).
// Ao criar um primitivo novo, acrescente aqui uma linha <Par> — é o que prova
// que ele bate com o que existia.
import { useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { GradePastas, PastaTile, SeparadorSecao } from "../features/modelos/PastaTile";
import { AlcaArrasto } from "./AlcaArrasto";
import { CampoNome } from "./CampoNome";
import { BotaoLink } from "./BotaoLink";
import { Selecao } from "./Selecao";
import { CelNegrito, CelNota, CelRotulo, LinhaTabela } from "./LinhaTabela";
import { Botao } from "./Botao";
import { BotaoRedondo } from "./BotaoRedondo";
import { Fato, Fatos } from "./Fatos";
import { LinhaBarra } from "./LinhaBarra";
import { OpcaoCriar } from "./OpcaoCriar";
import { CartaoInfo, CartaoLista, CartaoTitulo } from "./CartaoLista";
import { CampoBusca } from "./CampoBusca";
import { CampoCor } from "./CampoCor";
import { CampoNumero, LinhaNumero } from "./CampoNumero";
import { ChipsDia } from "./ChipsDia";
import { Legenda } from "./Legenda";
import { LinhaDado } from "./LinhaDado";
import { BotaoIcone } from "./BotaoIcone";
import { CabecalhoTela } from "./CabecalhoTela";
import { AreaTexto, Campo } from "./Campo";
import { CampoDuracao } from "./CampoDuracao";
import { Cartao } from "./Cartao";
import { Chip } from "./Chip";
import { EstadoVazio } from "./EstadoVazio";
import { Fab } from "./Fab";
import { Modal, ModalAcoes, ModalTexto } from "./Modal";
import { RotuloSecao } from "./RotuloSecao";
import { SegPill, Toggle } from "./Segmentado";
import { Switch } from "./Switch";

/** O que comparar num lado do par: o elemento raiz ({}), um descendente
 *  ({sel}) e/ou um pseudo-elemento ({pseudo}). */
type Alvo = { sel?: string; pseudo?: string };

function Par({
  nome,
  legado,
  novo,
  cmp = [{}],
  cmpNovo,
  contem,
  ignorar,
}: {
  nome: string;
  legado: ReactNode;
  novo: ReactNode;
  cmp?: Alvo[];
  cmpNovo?: Alvo[];
  /** cria um bloco próprio para filhos `position: fixed` (FAB, Modal) */
  contem?: boolean;
  /** propriedades que DIFEREM de propósito (comente o motivo no uso) */
  ignorar?: string[];
}) {
  const lado = (rotulo: "legado" | "novo", conteudo: ReactNode, alvos: Alvo[]) => (
    <div
      data-par={nome}
      data-lado={rotulo}
      data-comparar={JSON.stringify(alvos)}
      data-ignorar={JSON.stringify(ignorar ?? [])}
      className={contem ? "relative h-40 overflow-hidden rounded-md border border-dashed border-line [transform:translateZ(0)]" : "min-w-0"}
    >
      {conteudo}
    </div>
  );
  return (
    <div className="mb-4">
      <RotuloSecao className="mt-0 mb-1.5">{nome}</RotuloSecao>
      <div className="grid grid-cols-2 items-start gap-3">
        {lado("legado", legado, cmp)}
        {lado("novo", novo, cmpNovo ?? cmp)}
      </div>
    </div>
  );
}

const icone = <Icon name="settings" size={16} />;
const noop = () => {};

export function Catalogo() {
  const [escuro, setEscuro] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", escuro);

  return (
    <div className="screen">
      <div data-catalogo className="tab-scroll pb-16">
        <CabecalhoTela titulo="ui/">
          <Botao variante="neutro" onClick={() => setEscuro(!escuro)}>
            tema
          </Botao>
        </CabecalhoTela>
        <p className="mb-4 text-sm text-sub">Esquerda: app.css legado. Direita: primitivo novo. Devem ser idênticos.</p>

        {/* .btn-primary traz flex:1 (encher a linha de botões); o Botao não: quem quer usa className="flex-1" */}
        <Par
          nome="botao-primario"
          legado={<button className="btn-primary">Salvar</button>}
          novo={<Botao>Salvar</Botao>}
          ignorar={["flexGrow", "flexBasis"]}
        />
        <Par
          nome="botao-neutro"
          legado={<button className="btn-cancel">Cancelar</button>}
          novo={<Botao variante="neutro">Cancelar</Botao>}
        />
        <Par
          nome="botao-perigo"
          legado={<button className="btn-danger-outline">Excluir</button>}
          novo={<Botao variante="perigo">Excluir</Botao>}
        />
        <Par
          nome="botao-solido"
          legado={<button className="btn-confirm" style={{ background: "var(--caneta)" }}>Mesclar</button>}
          novo={<Botao variante="solido">Mesclar</Botao>}
        />
        <Par
          nome="botao-destrutivo"
          legado={<button className="btn-confirm">Remover</button>}
          novo={<Botao variante="destrutivo">Remover</Botao>}
        />
        <Par
          nome="botao-pilula"
          legado={<button className="link-btn">tocar</button>}
          novo={<Botao variante="pilula">tocar</Botao>}
        />
        <Par
          nome="botoes-modal"
          legado={
            <div className="confirm-actions">
              <button className="btn-cancel">Cancelar</button>
              <button className="btn-primary">Ok</button>
            </div>
          }
          novo={
            <ModalAcoes>
              <Botao variante="neutro" tamanho="modal">
                Cancelar
              </Botao>
              <Botao tamanho="modal">Ok</Botao>
            </ModalAcoes>
          }
          cmp={[{}, { sel: "button:first-child" }, { sel: "button:last-child" }]}
        />

        <Par
          nome="icone-padrao"
          legado={<button className="icon-btn">{icone}</button>}
          novo={<BotaoIcone rotulo="Ajustes">{icone}</BotaoIcone>}
          cmp={[{}, { pseudo: "::after" }]}
        />
        <Par
          nome="icone-ligado"
          legado={<button className="icon-btn on">{icone}</button>}
          novo={
            <BotaoIcone rotulo="Ajustes" ligado>
              {icone}
            </BotaoIcone>
          }
        />
        <Par
          nome="icone-sem-borda"
          legado={<button className="icon-btn borderless">{icone}</button>}
          novo={
            <BotaoIcone rotulo="Ajustes" semBorda>
              {icone}
            </BotaoIcone>
          }
        />
        {/* .bell-btn é inline-block; o primitivo centra o ícone com flex (mesmo tamanho) */}
        <Par
          ignorar={["display", "flexShrink", "alignItems", "justifyContent"]}
          nome="icone-pequeno"
          legado={<button className="bell-btn">{icone}</button>}
          novo={
            <BotaoIcone rotulo="Boletim" tamanho="sm">
              {icone}
            </BotaoIcone>
          }
        />

        <Par nome="fab" contem legado={<button className="fab" title="Novo">+</button>} novo={<Fab rotulo="Novo" onClick={noop} />} />

        <Par
          nome="chip"
          legado={<span className="area-chip">Saúde</span>}
          novo={<Chip>Saúde</Chip>}
        />
        <Par
          nome="chip-ativo"
          legado={
            <span className="area-chip sel" style={{ "--chip": "var(--ok)" } as React.CSSProperties}>
              Saúde
            </span>
          }
          novo={
            <Chip ativo cor="var(--ok)">
              Saúde
            </Chip>
          }
        />

        <Par
          nome="segpill-cheia"
          legado={
            <div className="type-toggle seg-pill view-toggle">
              <span className="active">Semana</span>
              <span>Dia</span>
              <span>Lista</span>
            </div>
          }
          novo={
            <SegPill
              cheia
              options={[
                { key: "a", label: "Semana" },
                { key: "b", label: "Dia" },
                { key: "c", label: "Lista" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          nome="segpill-auto"
          legado={
            <div className="type-toggle seg-pill">
              <span className="active">Notas</span>
              <span>Outros</span>
            </div>
          }
          novo={
            <SegPill
              options={[
                { key: "a", label: "Notas" },
                { key: "b", label: "Outros" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        {/* cursor de mão nas opções: melhoria intencional para o desktop */}
        <Par
          ignorar={["cursor"]}
          nome="toggle"
          legado={
            <div className="type-toggle">
              <span className="active">Baixo</span>
              <span>Médio</span>
            </div>
          }
          novo={
            <Toggle
              options={[
                { key: "a", label: "Baixo" },
                { key: "b", label: "Médio" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          ignorar={["cursor"]}
          nome="toggle-largo"
          legado={
            <div className="type-toggle mf-wide">
              <span className="active">Baixo</span>
              <span>Médio</span>
            </div>
          }
          novo={
            <Toggle
              larga
              options={[
                { key: "a", label: "Baixo" },
                { key: "b", label: "Médio" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          ignorar={["cursor"]}
          nome="toggle-ajustes"
          legado={
            <div className="type-toggle mf-wide set-toggle">
              <span className="active">claro</span>
              <span>escuro</span>
            </div>
          }
          novo={
            <Toggle
              larga
              grande
              className="mb-1"
              options={[
                { key: "a", label: "claro" },
                { key: "b", label: "escuro" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />

        <Par
          ignorar={["transform", "translate"]} /* translateX() vs propriedade translate: mesmo efeito */
          nome="switch-ligado"
          legado={
            <label className="switch-row">
              <span>Ativar horário</span>
              <input type="checkbox" defaultChecked />
            </label>
          }
          novo={
            <Switch checked onChange={noop}>
              Ativar horário
            </Switch>
          }
          cmp={[{}, { sel: "span" }, { sel: "input" }, { sel: "input", pseudo: "::before" }]}
        />
        <Par
          nome="switch-desligado"
          legado={
            <label className="switch-row">
              <span>Ativar horário</span>
              <input type="checkbox" />
            </label>
          }
          novo={
            <Switch checked={false} onChange={noop}>
              Ativar horário
            </Switch>
          }
          cmp={[{}, { sel: "input" }, { sel: "input", pseudo: "::before" }]}
        />

        <Par
          nome="campo-duracao"
          legado={
            <label className="dur-field">
              <input className="dur-input" type="number" defaultValue={5} />
              <span className="dur-un">m</span>
            </label>
          }
          novo={<CampoDuracao unidade="m" defaultValue={5} />}
          cmp={[{}, { sel: "input" }, { sel: "span" }]}
        />
        {/* no legado o input é item de flex (.sched-time-row) e vira block; aqui ele é o próprio elemento */}
        <Par
          ignorar={["display", "minWidth", "minHeight"]}
          nome="campo"
          legado={
            <div className="sched-time-row" style={{ marginTop: 0 }}>
              <input type="time" defaultValue="06:30" />
            </div>
          }
          novo={<Campo type="time" defaultValue="06:30" />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
        />

        <Par
          nome="legenda"
          legado={<div className="routine-meta">Nenhuma área — adicione abaixo.</div>}
          novo={<Legenda>Nenhuma área — adicione abaixo.</Legenda>}
        />
        <Par
          nome="chips-dia"
          legado={
            <div className="day-chips">
              <span className="day-chip active">D</span>
              <span className="day-chip">S</span>
              <span className="day-chip">T</span>
            </div>
          }
          novo={<ChipsDia className="mt-3.5" rotulos={["D", "S", "T"]} ativos={[0]} onToggle={noop} />}
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
          ignorar={["cursor"]}
        />
        <Par
          nome="campo-modelo"
          legado={<input type="text" className="mk-e-name" defaultValue="Texto" />}
          novo={<Campo variante="modelo" type="text" defaultValue="Texto" />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
          ignorar={["display", "minWidth", "minHeight"]}
        />
        <Par
          nome="area-texto"
          legado={<textarea className="mk-e-name" rows={2} readOnly defaultValue="Texto" />}
          novo={<AreaTexto rows={2} readOnly defaultValue="Texto" />}
          cmp={[{ sel: "textarea" }]}
          cmpNovo={[{}]}
        />
        <Par
          nome="campo-numero"
          legado={<input type="number" className="dur-input" defaultValue={5} />}
          novo={<CampoNumero defaultValue={5} />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
        />
        <Par
          nome="linha-numero"
          legado={
            <div className="sched-time-row">
              <span style={{ flex: 1 }}>Nota mínima</span>
              <input type="number" className="dur-input" defaultValue={60} />
            </div>
          }
          novo={<LinhaNumero rotulo="Nota mínima" defaultValue={60} />}
          cmp={[{}, { sel: "span" }, { sel: "input" }]}
        />
        <Par
          nome="campo-busca"
          legado={<input type="text" className="set-busca" placeholder="Buscar" />}
          novo={<CampoBusca className="my-4 mb-3.5" placeholder="Buscar" />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
          ignorar={["display", "minWidth", "minHeight"]}
        />
        <Par
          nome="campo-cor"
          legado={<input type="color" className="area-color-swatch" defaultValue="#6d28d9" />}
          novo={<CampoCor defaultValue="#6d28d9" />}
          cmp={[{ sel: "input" }, { sel: "input", pseudo: "::-webkit-color-swatch" }, { sel: "input", pseudo: "::-webkit-color-swatch-wrapper" }]}
          cmpNovo={[{}, { pseudo: "::-webkit-color-swatch" }, { pseudo: "::-webkit-color-swatch-wrapper" }]}
        />
        <Par
          nome="linha-dado"
          legado={
            <div className="dev-row">
              <span>notes</span>
              <b className="dev-n wide" style={{ color: "var(--erro)" }}>conflito</b>
            </div>
          }
          novo={<LinhaDado rotulo="notes" valor="conflito" cor="var(--erro)" />}
          cmp={[{}, { sel: "span" }, { sel: "b" }]}
        />

        <Par
          nome="chip-tag"
          legado={<span className="tag-chip">#casa</span>}
          novo={<Chip variante="tag">#casa</Chip>}
          ignorar={["cursor"]}
        />
        <Par
          nome="chip-tag-ativo"
          legado={<span className="tag-chip active">#casa</span>}
          novo={<Chip variante="tag" ativo>#casa</Chip>}
          ignorar={["cursor"]}
        />
        <Par
          nome="busca-caixa"
          legado={<input type="search" className="note-search" placeholder="Buscar notas..." />}
          novo={<CampoBusca forma="caixa" type="search" className="mb-3.5" placeholder="Buscar notas..." />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
          ignorar={["display", "minWidth", "minHeight"]}
        />
        <Par
          nome="cartao-lista"
          legado={
            <div className="note-card">
              <div className="note-info">
                <h3>Compras da semana</h3>
                <div className="routine-meta">2h · casa</div>
              </div>
            </div>
          }
          novo={
            <CartaoLista>
              <CartaoInfo>
                <CartaoTitulo>Compras da semana</CartaoTitulo>
                <Legenda>2h · casa</Legenda>
              </CartaoInfo>
            </CartaoLista>
          }
          cmp={[{}, { sel: ".note-info, div > div" }, { sel: "h3" }]}
          cmpNovo={[{}, { sel: "div > div" }, { sel: "h3" }]}
        />
        <Par
          nome="pasta-tile"
          legado={
            <div className="tmpl-new-grid">
              <button className="tmpl-new">
                <span className="tmpl-ic"><Icon name="settings" size={22} /></span>
                <span>Kanbans</span>
              </button>
            </div>
          }
          novo={
            <GradePastas>
              <PastaTile icone="settings" rotulo="Kanbans" />
            </GradePastas>
          }
          cmp={[{}, { sel: "button" }, { sel: "button > span:first-child" }]}
        />
        <Par
          nome="separador-secao"
          legado={
            <div className="tmpl-sep">
              <span>Geral</span>
            </div>
          }
          novo={<SeparadorSecao>Geral</SeparadorSecao>}
          cmp={[{}, { sel: "span" }, { pseudo: "::before" }, { pseudo: "::after" }]}
        />
        <Par
          nome="botao-redondo-pequeno"
          legado={<button className="ctrl-btn" style={{ width: 36, height: 36, fontSize: 15 }}>+</button>}
          novo={<BotaoRedondo rotulo="Mais um" tamanho="sm">+</BotaoRedondo>}
        />
        <Par
          nome="botao-redondo"
          legado={<button className="ctrl-btn">+</button>}
          novo={<BotaoRedondo rotulo="Mais um">+</BotaoRedondo>}
        />
        <Par
          nome="alca-arrasto"
          legado={<span className="drag-handle">{icone}</span>}
          novo={<AlcaArrasto />}
          cmp={[{ sel: "span" }]}
          cmpNovo={[{}]}
          ignorar={["display", "largura"]}
        />
        <Par
          nome="opcao-criar"
          legado={
            <button className="novo-opcao">
              <Icon name="arrowPath" size={16} />
              <b>Meta recorrente</b>
              <span className="dev-n">hábito ou limite que repete</span>
            </button>
          }
          novo={<OpcaoCriar icone="arrowPath" titulo="Meta recorrente" descricao="hábito ou limite que repete" />}
          cmp={[{}, { sel: "b" }, { sel: "span" }, { sel: "svg" }]}
        />
        <Par
          nome="fatos"
          legado={
            <div className="routine-meta routine-meta-line">
              <span className="rc-fact">{icone} Médio</span>
              <span className="rc-fact">{icone} 3x por semana</span>
            </div>
          }
          novo={
            <Fatos>
              <Fato>{icone} Médio</Fato>
              <Fato>{icone} 3x por semana</Fato>
            </Fatos>
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          nome="linha-barra"
          legado={
            <div className="bar-row">
              <div className="bar-name" style={{ color: "var(--ok)" }}>Saúde</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: "40%", background: "var(--ok)" }} /></div>
              <div className="bar-val">12 / 42</div>
            </div>
          }
          novo={<LinhaBarra rotulo="Saúde" cor="var(--ok)" corRotulo="var(--ok)" pct={40} valor="12 / 42" />}
          cmp={[{}, { sel: ".bar-name" }, { sel: ".bar-track" }, { sel: ".bar-fill" }, { sel: ".bar-val" }]}
          cmpNovo={[{}, { sel: ":scope > div > div:nth-child(1)" }, { sel: ":scope > div > div:nth-child(2)" }, { sel: ":scope > div > div:nth-child(2) > div" }, { sel: ":scope > div > div:nth-child(3)" }]}
        />
        <Par
          nome="selecao"
          legado={<select className="routine-select"><option>Todas as rotinas</option></select>}
          novo={<Selecao><option>Todas as rotinas</option></Selecao>}
          cmp={[{ sel: "select" }]}
          cmpNovo={[{}]}
          ignorar={["display", "minWidth", "minHeight"]}
        />
        <Par
          nome="botao-link"
          legado={<div className="topbar" style={{ marginBottom: 0 }}><button className="link-btn muted">Depois</button></div>}
          novo={<div><BotaoLink tom="suave">Depois</BotaoLink></div>}
          cmp={[{ sel: "button" }]}
          cmpNovo={[{ sel: "button" }]}
          ignorar={["display", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius", "minWidth", "minHeight"]} /* sem borda: o raio 999 herdado do link-btn não aparece; display vem do flex do .topbar */
        />
        <Par
          nome="linha-tabela"
          legado={
            <div className="dev-row">
              <span>Treino A — Supino</span>
              <b className="late">+00:50</b>
              <span className="dev-n">15:00→15:50 · 10x</span>
            </div>
          }
          novo={
            <LinhaTabela>
              <CelRotulo>Treino A — Supino</CelRotulo>
              <CelNegrito status="atraso">+00:50</CelNegrito>
              <CelNota>15:00→15:50 · 10x</CelNota>
            </LinhaTabela>
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "b" }, { sel: "span:last-child" }]}
        />
        <Par
          nome="campo-nome"
          legado={<input type="text" className="name-input" placeholder="Nome da rotina" />}
          novo={<CampoNome placeholder="Nome da rotina" />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
          ignorar={["display", "minWidth", "minHeight"]}
        />
        <Par
          nome="cartao"
          legado={
            <div className="stat-card" style={{ marginBottom: 0 }}>
              Conteúdo
            </div>
          }
          novo={<Cartao>Conteúdo</Cartao>}
        />
        <Par
          nome="cartao-formulario"
          legado={<div className="schedule-box">Conteúdo</div>}
          novo={<Cartao raio="lg">Conteúdo</Cartao>}
        />

        <Par
          nome="modal"
          contem
          legado={
            <div className="confirm-overlay">
              <div className="confirm-box">
                <p>Excluir esta rotina?</p>
                <div className="confirm-actions">
                  <button className="btn-cancel">Cancelar</button>
                  <button className="btn-primary">Excluir</button>
                </div>
              </div>
            </div>
          }
          novo={
            <Modal>
              <ModalTexto>Excluir esta rotina?</ModalTexto>
              <ModalAcoes>
                <Botao variante="neutro" tamanho="modal">
                  Cancelar
                </Botao>
                <Botao tamanho="modal">Excluir</Botao>
              </ModalAcoes>
            </Modal>
          }
          cmp={[{}, { sel: ".confirm-box" }, { sel: "p" }, { sel: ".confirm-actions" }]}
          cmpNovo={[{}, { sel: "[role=dialog]" }, { sel: "p" }, { sel: "[role=dialog] > div" }]}
        />

        <Par
          nome="estado-vazio"
          legado={
            <div className="empty-state">
              <h2>Nenhuma nota ainda</h2>
              <p>Listas de compras, tarefas, notas de estudo — tudo rápido.</p>
              <button className="btn-primary">+ Nova nota</button>
            </div>
          }
          novo={
            <EstadoVazio titulo="Nenhuma nota ainda" texto="Listas de compras, tarefas, notas de estudo — tudo rápido.">
              <Botao>+ Nova nota</Botao>
            </EstadoVazio>
          }
          cmp={[{}, { sel: "h2" }, { sel: "p" }, { sel: "button" }]}
        />
        <Par
          nome="rotulo-secao"
          legado={<div className="section-label">Etapas</div>}
          novo={<RotuloSecao>Etapas</RotuloSecao>}
        />
        <Par
          ignorar={["display", "flexShrink", "alignItems", "justifyContent"]} /* botão bell-btn: ver icone-pequeno */
          nome="cabecalho-tela"
          legado={
            <div className="home-header">
              <h1>Rotinas</h1>
              <button className="bell-btn">{icone}</button>
            </div>
          }
          novo={
            <CabecalhoTela titulo="Rotinas">
              <BotaoIcone rotulo="Boletim" tamanho="sm">
                {icone}
              </BotaoIcone>
            </CabecalhoTela>
          }
          cmp={[{}, { sel: "h1" }, { sel: "button" }]}
        />
      </div>
    </div>
  );
}
