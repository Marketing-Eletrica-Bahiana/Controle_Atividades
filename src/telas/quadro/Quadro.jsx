import { useMemo, useState } from 'react'
import { CalendarClock, Megaphone, MessageSquare, Pause, Play, Plus, SquareKanban, Timer, X } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import BolinhasDePessoas from '../../componentes/BolinhasDePessoas.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { SeletorMes, useMesEscolhido } from '../../componentes/Seletores.jsx'
import { criarCartao, moverCartao, useCartoesDoQuadro } from '../../dados/cartoes.js'
import { formatarData, hojeISO } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import {
  agruparPorColuna, cartaoAtrasado, classeDaEtiqueta, COLUNA_ENTREGUES, etiquetaDaColuna, ETIQUETAS, filtrarCartoes, ordemParaSoltar,
} from '../../lib/quadro.js'
import { useAcoesDoCartao } from './useAcoesDoCartao.jsx'

const SEM_CARTOES = []

export default function Quadro() {
  const { executar } = useAvisos()
  const [mes, setMes] = useMesEscolhido()
  const consulta = useCartoesDoQuadro(mes)
  const cartoes = consulta.dados ?? SEM_CARTOES
  const acoes = useAcoesDoCartao(cartoes)
  const { membro, pessoa, podeMexer, podeUsarCronometro, colunas, membros, nomeDaColuna, nomeDaPessoa } = acoes

  const [filtros, setFiltros] = useState({ busca: '', etiqueta: '', pessoa: '' })
  const [arrastandoId, setArrastandoId] = useState(null)
  const [alvo, setAlvo] = useState(null)

  const listaDeColunas = colunas.dados ?? SEM_CARTOES
  const grupos = useMemo(() => agruparPorColuna(filtrarCartoes(cartoes, filtros), listaDeColunas), [cartoes, filtros, listaDeColunas])
  const hoje = hojeISO()
  const filtrando = Boolean(filtros.busca || filtros.etiqueta || filtros.pessoa)
  const mudarFiltro = (campo, valor) => setFiltros((atual) => ({ ...atual, [campo]: valor }))

  async function soltar(colunaId, antesDe) {
    const cartao = cartoes.find((c) => c.id === arrastandoId)
    setArrastandoId(null)
    setAlvo(null)
    if (!cartao || antesDe === cartao.id) return
    const ordem = ordemParaSoltar(grupos.get(colunaId) ?? [], cartao.id, antesDe)
    const deuCerto = await executar(() => moverCartao(cartao, colunaId, ordem, membro.email, nomeDaColuna))
    if (deuCerto && colunaId === COLUNA_ENTREGUES && !cartao.entregue) acoes.oferecerConcluir(cartao)
  }

  if (colunas.carregando || consulta.carregando) return <CarregandoBloco />
  if (consulta.erro) return <p className="aviso aviso--erro">{mensagemDeErro(consulta.erro)}</p>

  return (
    <section className="pagina pagina--quadro">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <SquareKanban aria-hidden="true" />
          Quadro
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>

      <div className="quadro-filtros">
        <label className="campo">
          <span className="campo__rotulo">Buscar pelo nome</span>
          <input value={filtros.busca} onChange={(e) => mudarFiltro('busca', e.target.value)} autoComplete="off" />
        </label>
        <label className="campo">
          <span className="campo__rotulo">Etiqueta</span>
          <select value={filtros.etiqueta} onChange={(e) => mudarFiltro('etiqueta', e.target.value)}>
            <option value="">Todas</option>
            {ETIQUETAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Pessoa</span>
          <select value={filtros.pessoa} onChange={(e) => mudarFiltro('pessoa', e.target.value)}>
            <option value="">Todas</option>
            {(membros ?? [])
              .filter((m) => m.ativo !== false)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
          </select>
        </label>
        {filtrando && (
          <button type="button" className="botao botao--secundario" onClick={() => setFiltros({ busca: '', etiqueta: '', pessoa: '' })}>
            <X aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="quadro">
        {listaDeColunas.map((coluna) => {
          const lista = grupos.get(coluna.id) ?? []
          const ehEntregues = coluna.id === COLUNA_ENTREGUES
          return (
            <section
              key={coluna.id}
              className={`quadro-coluna ${alvo?.coluna === coluna.id ? 'quadro-coluna--alvo' : ''}`}
              aria-label={coluna.nome}
              onDragOver={(evento) => {
                if (!arrastandoId) return
                evento.preventDefault()
                if (alvo?.coluna !== coluna.id || alvo?.antesDe) setAlvo({ coluna: coluna.id, antesDe: null })
              }}
              onDrop={(evento) => {
                evento.preventDefault()
                soltar(coluna.id, alvo?.coluna === coluna.id ? alvo.antesDe : null)
              }}
            >
              <header className="quadro-coluna__topo">
                <h2>{coluna.nome}</h2>
                <span className="quadro-coluna__total numero">{lista.length}</span>
              </header>
              {ehEntregues && (
                <div className="quadro-coluna__mes">
                  <SeletorMes mes={mes} aoMudar={setMes} />
                </div>
              )}
              <ol className="quadro-coluna__cartoes">
                {lista.map((cartao) => (
                  <CartaoDoQuadro
                    key={cartao.id}
                    cartao={cartao}
                    hoje={hoje}
                    nomeDaPessoa={nomeDaPessoa}
                    podeMexer={podeMexer}
                    podeUsarCronometro={podeUsarCronometro}
                    rodando={acoes.estaRodando(cartao)}
                    temDemanda={acoes.temDemanda(cartao)}
                    arrastando={arrastandoId === cartao.id}
                    soltarAqui={alvo?.antesDe === cartao.id}
                    aoAbrir={() => acoes.abrir(cartao.id)}
                    aoCronometro={() => acoes.usarCronometro(cartao)}
                    aoArrastar={() => setArrastandoId(cartao.id)}
                    aoSoltarArraste={() => {
                      setArrastandoId(null)
                      setAlvo(null)
                    }}
                    aoPassarPorCima={() => setAlvo({ coluna: coluna.id, antesDe: cartao.id })}
                  />
                ))}
              </ol>
              {podeMexer && !ehEntregues && (
                <NovoCartao
                  aoCriar={(titulo) => {
                    const etiqueta = etiquetaDaColuna(coluna.nome)
                    return executar(() => criarCartao({ titulo, coluna: coluna.id, etiquetas: etiqueta ? [etiqueta] : [] }, pessoa), 'Cartão criado.')
                  }}
                />
              )}
            </section>
          )
        })}
      </div>

      {acoes.janelas}
    </section>
  )
}

function CartaoDoQuadro({
  cartao, hoje, nomeDaPessoa, podeMexer, podeUsarCronometro, rodando, temDemanda, arrastando, soltarAqui,
  aoAbrir, aoCronometro, aoArrastar, aoSoltarArraste, aoPassarPorCima,
}) {
  const comentarios = (cartao.comentarios ?? []).length
  const classes = ['cartao-quadro', arrastando && 'cartao-quadro--arrastando', soltarAqui && 'cartao-quadro--antes', rodando && 'cartao-quadro--rodando']
  return (
    <li
      className={classes.filter(Boolean).join(' ')}
      draggable={podeMexer}
      onClick={aoAbrir}
      onDragStart={(evento) => {
        evento.dataTransfer.effectAllowed = 'move'
        evento.dataTransfer.setData('text/plain', cartao.id)
        aoArrastar()
      }}
      onDragEnd={aoSoltarArraste}
      onDragOver={(evento) => {
        evento.preventDefault()
        evento.stopPropagation()
        aoPassarPorCima()
      }}
    >
      {(cartao.etiquetas ?? []).length > 0 && (
        <div className="etiquetas-cartao">
          {cartao.etiquetas.map((etiqueta) => (
            <span key={etiqueta} className={`etiqueta-cartao ${classeDaEtiqueta(etiqueta)}`}>
              {etiqueta}
            </span>
          ))}
        </div>
      )}
      <button type="button" className="cartao-quadro__titulo" onClick={aoAbrir}>
        {cartao.titulo}
      </button>
      <div className="cartao-quadro__rodape">
        <div className="cartao-quadro__info">
          {rodando && (
            <span className="cartao-quadro__rodando">
              <Timer aria-hidden="true" />
              Rodando
            </span>
          )}
          {cartao.prazo && (
            <span className={`cartao-quadro__dado numero ${cartaoAtrasado(cartao, hoje) ? 'cartao-quadro__dado--atrasado' : ''}`} title="Prazo">
              <CalendarClock aria-hidden="true" />
              {formatarData(cartao.prazo)}
            </span>
          )}
          {cartao.postagem?.data && (
            <span className="cartao-quadro__dado numero" title="Data da postagem">
              <Megaphone aria-hidden="true" />
              {formatarData(cartao.postagem.data)}
            </span>
          )}
          {comentarios > 0 && (
            <span className="cartao-quadro__dado" title="Comentários">
              <MessageSquare aria-hidden="true" />
              {comentarios}
            </span>
          )}
        </div>
        <div className="cartao-quadro__acoes">
          <BolinhasDePessoas emails={cartao.responsaveis} nomeDaPessoa={nomeDaPessoa} />
          {podeUsarCronometro && (
            <button
              type="button"
              className="botao-icone botao-icone--claro"
              aria-label={`${rodando ? 'Pausar' : temDemanda ? 'Retomar' : 'Iniciar'} ${cartao.titulo}`}
              title={rodando ? 'Pausar o cronômetro' : temDemanda ? 'Retomar o cronômetro' : 'Iniciar o cronômetro'}
              onClick={(evento) => {
                evento.stopPropagation()
                aoCronometro()
              }}
            >
              {rodando ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function NovoCartao({ aoCriar }) {
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('')

  async function enviar(evento) {
    evento.preventDefault()
    if (!titulo.trim()) return
    if (await aoCriar(titulo)) setTitulo('')
  }

  if (!aberto) {
    return (
      <button type="button" className="quadro-coluna__adicionar" onClick={() => setAberto(true)}>
        <Plus aria-hidden="true" />
        Adicionar um cartão
      </button>
    )
  }
  return (
    <form className="quadro-coluna__novo" onSubmit={enviar}>
      <label className="campo">
        <span className="campo__rotulo">Título do cartão</span>
        <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} autoComplete="off" />
      </label>
      <div className="acoes">
        <button type="submit" className="botao botao--principal botao--pequeno">
          Adicionar
        </button>
        <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </div>
    </form>
  )
}
