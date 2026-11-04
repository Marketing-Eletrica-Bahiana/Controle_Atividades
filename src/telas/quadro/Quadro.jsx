import { useMemo, useState } from 'react'
import { CalendarClock, MessageSquare, Pause, Play, Plus, SquareKanban, Timer, X } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import { SeletorMes, useMesEscolhido } from '../../componentes/Seletores.jsx'
import { useAreas } from '../../dados/areas.js'
import { criarCartao, moverCartao, useCartoesDoQuadro, useColunas } from '../../dados/cartoes.js'
import { concluir, criarEIniciar, pausar, retomar, situacaoDaDemanda, useCronometro } from '../../dados/demandas.js'
import { useMembros } from '../../dados/membros.js'
import { formatarData, hojeISO } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { podeExcluirCartao, podeMexerNoQuadro } from '../../lib/papeis.js'
import {
  agruparPorColuna, cartaoAtrasado, classeDaEtiqueta, COLUNA_ENTREGUES, etiquetaDaColuna, ETIQUETAS, filtrarCartoes, iniciais, ordemParaSoltar,
} from '../../lib/quadro.js'
import JanelaCartao from './JanelaCartao.jsx'
import JanelaIniciarCartao from './JanelaIniciarCartao.jsx'

const SEM_CARTOES = []

export default function Quadro() {
  const { membro } = useAcesso()
  const pessoa = useMemo(() => ({ email: membro.email, nome: membro.nome }), [membro.email, membro.nome])
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const podeMexer = podeMexerNoQuadro(membro)

  const [mes, setMes] = useMesEscolhido()
  const colunas = useColunas()
  const consulta = useCartoesDoQuadro(mes)
  const { dados: membros } = useMembros()
  const { dados: todasAsAreas } = useAreas()
  const cronometro = useCronometro(podeMexer ? membro.email : null)

  const [filtros, setFiltros] = useState({ busca: '', etiqueta: '', pessoa: '' })
  const [abertoId, setAbertoId] = useState(null)
  const [iniciando, setIniciando] = useState(null)
  const [arrastandoId, setArrastandoId] = useState(null)
  const [alvo, setAlvo] = useState(null)

  const cartoes = consulta.dados ?? SEM_CARTOES
  const listaDeColunas = colunas.dados ?? SEM_CARTOES
  const grupos = useMemo(() => agruparPorColuna(filtrarCartoes(cartoes, filtros), listaDeColunas), [cartoes, filtros, listaDeColunas])
  const nomeDaColuna = (id) => listaDeColunas.find((c) => c.id === id)?.nome ?? id
  const nomeDaPessoa = (email) => membros?.find((m) => m.id === email)?.nome ?? email
  const aberto = cartoes.find((c) => c.id === abertoId)
  const hoje = hojeISO()

  const minhasAreas = (membro.areas ?? [])
    .map((id) => todasAsAreas?.find((a) => a.id === id) ?? { id, nome: id, ativa: true })
    .filter((a) => a.ativa !== false)
  const rodandoId = cronometro.dados?.rodando ? cronometro.dados.demandaId : null
  const estaRodando = (cartao) => Boolean(rodandoId) && (cartao.vinculos ?? []).some((v) => v.demandaId === rodandoId)
  const minhaDemanda = (cartao) => (cartao.vinculos ?? []).find((v) => v.email === membro.email)
  const filtrando = Boolean(filtros.busca || filtros.etiqueta || filtros.pessoa)
  const mudarFiltro = (campo, valor) => setFiltros((atual) => ({ ...atual, [campo]: valor }))

  async function podeTrocar(nomeNovo) {
    if (!rodandoId) return true
    return confirmar({
      titulo: 'Pausar o cronômetro atual?',
      texto: `O cronômetro que está rodando será pausado para começar "${nomeNovo}".`,
      botao: 'Pausar e começar',
    })
  }

  async function usarCronometro(cartao) {
    if (estaRodando(cartao)) {
      executar(() => pausar(pessoa), 'Cronômetro pausado.')
      return
    }
    const minha = minhaDemanda(cartao)
    if (!minha) {
      setIniciando(cartao)
      return
    }
    if (await podeTrocar(cartao.titulo)) executar(() => retomar(minha.demandaId, pessoa), `Cronômetro rodando: ${cartao.titulo}`)
  }

  async function iniciarDoCartao(cartao, dados) {
    if (!(await podeTrocar(dados.nome))) return false
    return executar(() => criarEIniciar({ ...dados, cartaoId: cartao.id }, pessoa), `Cronômetro rodando: ${dados.nome}`)
  }

  // O cartão entregue não conclui a demanda sozinho: quem está arrastando decide sobre a própria demanda.
  async function oferecerConcluir(cartao) {
    const minha = minhaDemanda(cartao)
    if (!minha) return
    const situacao = await situacaoDaDemanda(minha.demandaId).catch(() => null)
    if (!situacao || situacao === 'concluida') return
    const sim = await confirmar({
      titulo: 'Concluir sua demanda também?',
      texto: `"${cartao.titulo}" foi para Entregues, e a sua demanda dela ainda está aberta no cronômetro.`,
      botao: 'Concluir',
    })
    if (sim) executar(() => concluir(minha.demandaId, pessoa), `${cartao.titulo} concluída. Mandou bem!`)
  }

  async function soltar(colunaId, antesDe) {
    const cartao = cartoes.find((c) => c.id === arrastandoId)
    setArrastandoId(null)
    setAlvo(null)
    if (!cartao || antesDe === cartao.id) return
    const ordem = ordemParaSoltar(grupos.get(colunaId) ?? [], cartao.id, antesDe)
    const deuCerto = await executar(() => moverCartao(cartao, colunaId, ordem, membro.email, nomeDaColuna))
    if (deuCerto && colunaId === COLUNA_ENTREGUES && !cartao.entregue) oferecerConcluir(cartao)
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
                    podeUsarCronometro={podeMexer && minhasAreas.length > 0}
                    rodando={estaRodando(cartao)}
                    temDemanda={Boolean(minhaDemanda(cartao))}
                    arrastando={arrastandoId === cartao.id}
                    soltarAqui={alvo?.antesDe === cartao.id}
                    aoAbrir={() => setAbertoId(cartao.id)}
                    aoCronometro={() => usarCronometro(cartao)}
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

      <JanelaCartao
        cartao={aberto}
        colunas={listaDeColunas}
        membros={membros ?? []}
        membro={membro}
        pessoa={pessoa}
        podeMexer={podeMexer}
        podeApagar={podeExcluirCartao(membro)}
        podeUsarCronometro={podeMexer && minhasAreas.length > 0}
        rodando={aberto ? estaRodando(aberto) : false}
        temDemanda={aberto ? Boolean(minhaDemanda(aberto)) : false}
        nomeDaColuna={nomeDaColuna}
        nomeDaPessoa={nomeDaPessoa}
        confirmar={confirmar}
        aoCronometro={(cartao) => {
          setAbertoId(null)
          usarCronometro(cartao)
        }}
        aoEntregar={oferecerConcluir}
        aoFechar={() => setAbertoId(null)}
      />
      <JanelaIniciarCartao
        cartao={iniciando}
        pessoa={pessoa}
        areas={minhasAreas}
        aoIniciar={iniciarDoCartao}
        aoFechar={() => setIniciando(null)}
      />
      {janelaConfirmar}
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
          {comentarios > 0 && (
            <span className="cartao-quadro__dado" title="Comentários">
              <MessageSquare aria-hidden="true" />
              {comentarios}
            </span>
          )}
        </div>
        <div className="cartao-quadro__acoes">
          <span className="pessoas-cartao">
            {(cartao.responsaveis ?? []).map((email) => (
              <span key={email} className="pessoa-cartao" title={nomeDaPessoa(email)}>
                {iniciais(nomeDaPessoa(email))}
              </span>
            ))}
          </span>
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
