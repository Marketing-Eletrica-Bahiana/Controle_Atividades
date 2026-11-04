import { useMemo, useState } from 'react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import { useAreas } from '../../dados/areas.js'
import { esquecerDemanda, useColunas } from '../../dados/cartoes.js'
import { concluir, criarEIniciar, pausar, retomar, situacaoDaDemanda, useCronometro } from '../../dados/demandas.js'
import { useMembros } from '../../dados/membros.js'
import { podeExcluirCartao, podeMexerNoQuadro } from '../../lib/papeis.js'
import JanelaCartao from './JanelaCartao.jsx'
import JanelaIniciarCartao from './JanelaIniciarCartao.jsx'

const SEM_COLUNAS = []

// O que o Quadro e o calendário fazem com um cartão: abrir, ligar o cronômetro e oferecer a conclusão ao entregar.
// "janelas" precisa ser colocado na tela que usa o hook.
export function useAcoesDoCartao(cartoes) {
  const { membro } = useAcesso()
  const pessoa = useMemo(() => ({ email: membro.email, nome: membro.nome }), [membro.email, membro.nome])
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const podeMexer = podeMexerNoQuadro(membro)
  const colunas = useColunas()
  const { dados: membros } = useMembros()
  const { dados: todasAsAreas } = useAreas()
  const cronometro = useCronometro(podeMexer ? membro.email : null)
  const [abertoId, setAbertoId] = useState(null)
  const [iniciando, setIniciando] = useState(null)

  const listaDeColunas = colunas.dados ?? SEM_COLUNAS
  const nomeDaColuna = (id) => listaDeColunas.find((c) => c.id === id)?.nome ?? id
  const nomeDaPessoa = (email) => membros?.find((m) => m.id === email)?.nome ?? email
  const aberto = cartoes.find((c) => c.id === abertoId)

  const minhasAreas = (membro.areas ?? [])
    .map((id) => todasAsAreas?.find((a) => a.id === id) ?? { id, nome: id, ativa: true })
    .filter((a) => a.ativa !== false)
  const podeUsarCronometro = podeMexer && minhasAreas.length > 0
  const rodandoId = cronometro.dados?.rodando ? cronometro.dados.demandaId : null
  const estaRodando = (cartao) => Boolean(rodandoId) && (cartao.vinculos ?? []).some((v) => v.demandaId === rodandoId)
  const minhaDemanda = (cartao) => (cartao.vinculos ?? []).find((v) => v.email === membro.email)

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
    // A demanda pode ter sido excluída antes de o cartão aprender a se limpar: recomeça em vez de dar erro.
    const situacao = await situacaoDaDemanda(minha.demandaId).catch(() => undefined)
    if (situacao === null) {
      if (await executar(() => esquecerDemanda(cartao, minha.demandaId))) setIniciando(cartao)
      return
    }
    if (await podeTrocar(cartao.titulo)) executar(() => retomar(minha.demandaId, pessoa), `Cronômetro rodando: ${cartao.titulo}`)
  }

  async function iniciarDoCartao(cartao, dados) {
    if (!(await podeTrocar(dados.nome))) return false
    return executar(() => criarEIniciar({ ...dados, cartaoId: cartao.id }, pessoa), `Cronômetro rodando: ${dados.nome}`)
  }

  // O cartão entregue não conclui a demanda sozinho: quem entregou decide sobre a própria demanda.
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

  const janelas = (
    <>
      <JanelaCartao
        cartao={aberto}
        colunas={listaDeColunas}
        membros={membros ?? []}
        membro={membro}
        pessoa={pessoa}
        podeMexer={podeMexer}
        podeApagar={podeExcluirCartao(membro)}
        podeUsarCronometro={podeUsarCronometro}
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
      <JanelaIniciarCartao cartao={iniciando} pessoa={pessoa} areas={minhasAreas} aoIniciar={iniciarDoCartao} aoFechar={() => setIniciando(null)} />
      {janelaConfirmar}
    </>
  )

  return {
    membro,
    pessoa,
    podeMexer,
    podeUsarCronometro,
    colunas,
    membros,
    nomeDaColuna,
    nomeDaPessoa,
    abrir: setAbertoId,
    usarCronometro,
    estaRodando,
    temDemanda: (cartao) => Boolean(minhaDemanda(cartao)),
    oferecerConcluir,
    janelas,
  }
}
