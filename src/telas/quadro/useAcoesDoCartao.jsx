import { useMemo, useState } from 'react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import { useAreas } from '../../dados/areas.js'
import { esquecerDemanda, useColunas } from '../../dados/cartoes.js'
import {
  adicionarTempoManual, concluir, criarDemandaManual, criarEIniciar, lerDemanda, pausar, retomar, situacaoDaDemanda, trocarTempoGasto, useCronometro,
} from '../../dados/demandas.js'
import { useMembros } from '../../dados/membros.js'
import { ativosDoCronometro } from '../../lib/cronometro.js'
import { podeExcluirCartao, podeMexerNoQuadro } from '../../lib/papeis.js'
import { formatarTempo } from '../../lib/tempo.js'
import { escolherComoIniciar } from '../cronometro/escolherComoIniciar.js'
import JanelaCartao from './JanelaCartao.jsx'
import JanelaIniciarCartao from './JanelaIniciarCartao.jsx'
import JanelaTempoDoCartao from './JanelaTempoDoCartao.jsx'

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
  const [lancando, setLancando] = useState(null)

  const listaDeColunas = colunas.dados ?? SEM_COLUNAS
  const nomeDaColuna = (id) => listaDeColunas.find((c) => c.id === id)?.nome ?? id
  const nomeDaPessoa = (email) => membros?.find((m) => m.id === email)?.nome ?? email
  const aberto = cartoes.find((c) => c.id === abertoId)

  const minhasAreas = (membro.areas ?? [])
    .map((id) => todasAsAreas?.find((a) => a.id === id) ?? { id, nome: id, ativa: true })
    .filter((a) => a.ativa !== false)
  const podeUsarCronometro = podeMexer && minhasAreas.length > 0
  // Várias demandas da pessoa podem rodar ao mesmo tempo (desde 25/11/2026).
  const rodandoIds = useMemo(() => new Set(ativosDoCronometro(cronometro.dados).map((a) => a.demandaId)), [cronometro.dados])
  const minhaDemanda = (cartao) => (cartao.vinculos ?? []).find((v) => v.email === membro.email)
  const estaRodando = (cartao) => rodandoIds.has(minhaDemanda(cartao)?.demandaId)

  // Com outra demanda rodando, a pessoa escolhe: rodar junto ou pausar. O nome mostrado é o do cartão, quando ele
  // está na tela; senão, "uma demanda".
  function comoIniciar(nomeNovo) {
    const nomes = [...rodandoIds].map(
      (id) => cartoes.find((c) => (c.vinculos ?? []).some((v) => v.demandaId === id))?.titulo ?? 'uma demanda do Meu Cronômetro',
    )
    return escolherComoIniciar(confirmar, nomeNovo, nomes)
  }

  async function usarCronometro(cartao) {
    if (estaRodando(cartao)) {
      executar(() => pausar(pessoa, minhaDemanda(cartao).demandaId), `${cartao.titulo} pausada.`)
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
    const escolha = await comoIniciar(cartao.titulo)
    if (escolha) executar(() => retomar(minha.demandaId, pessoa, escolha), `Cronômetro rodando: ${cartao.titulo}`)
  }

  async function iniciarDoCartao(cartao, dados) {
    const escolha = await comoIniciar(dados.nome)
    if (!escolha) return false
    return executar(() => criarEIniciar({ ...dados, cartaoId: cartao.id }, pessoa, escolha), `Cronômetro rodando: ${dados.nome}`)
  }

  // Tempo feito sem o cronômetro. Soma na demanda da pessoa no cartão; sem demanda, a janela também cria a dela.
  // Não mexe no cronômetro que estiver rodando.
  async function lancarTempo(cartao) {
    const minha = minhaDemanda(cartao)
    if (!minha) {
      setLancando({ cartao, demandaId: null })
      return
    }
    // A demanda pode ter sido excluída antes de o cartão aprender a se limpar: cria outra em vez de dar erro.
    // O tempo atual aparece na janela, com a conta, para ninguém somar achando que corrige.
    const demanda = await lerDemanda(minha.demandaId).catch(() => undefined)
    if (demanda === null) {
      if (await executar(() => esquecerDemanda(cartao, minha.demandaId))) setLancando({ cartao, demandaId: null })
      return
    }
    setLancando({ cartao, demandaId: minha.demandaId, tempoAtual: demanda ? (demanda.tempoGastoSeg ?? 0) : null })
  }

  const somado = (cartao, segundos) => `${formatarTempo(segundos)} adicionado em ${cartao.titulo}.`

  const criarComTempo = (cartao, dados, lancamento) =>
    executar(() => criarDemandaManual({ ...dados, cartaoId: cartao.id }, lancamento, pessoa), somado(cartao, lancamento.segundos))

  const somarTempo = (cartao, demandaId, lancamento) =>
    executar(() => adicionarTempoManual(demandaId, lancamento, membro.email), somado(cartao, lancamento.segundos))

  const corrigirTempo = (cartao, demandaId, segundos) =>
    executar(() => trocarTempoGasto(demandaId, segundos, membro.email), `Tempo de ${cartao.titulo} corrigido para ${formatarTempo(segundos)}.`)

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
        aoTempoManual={(cartao) => {
          setAbertoId(null)
          lancarTempo(cartao)
        }}
        aoEntregar={oferecerConcluir}
        aoFechar={() => setAbertoId(null)}
      />
      <JanelaIniciarCartao cartao={iniciando} pessoa={pessoa} areas={minhasAreas} aoIniciar={iniciarDoCartao} aoFechar={() => setIniciando(null)} />
      <JanelaTempoDoCartao
        pedido={lancando}
        pessoa={pessoa}
        areas={minhasAreas}
        aoCriar={criarComTempo}
        aoSomar={(demandaId, lancamento) => somarTempo(lancando.cartao, demandaId, lancamento)}
        aoCorrigir={(demandaId, segundos) => corrigirTempo(lancando.cartao, demandaId, segundos)}
        aoFechar={() => setLancando(null)}
      />
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
    confirmar,
    janelas,
  }
}
