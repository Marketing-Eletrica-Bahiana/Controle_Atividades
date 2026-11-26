import { useMemo, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { lerDemanda, pausar, retomar, useCronometro } from '../dados/demandas.js'
import { ativosDoCronometro } from '../lib/cronometro.js'
import { escolherComoIniciar } from '../telas/cronometro/escolherComoIniciar.js'
import { useAvisos } from './Avisos.jsx'

// Botão do cronômetro na janela de detalhes da demanda (pedido da pessoa em 26/11/2026): retoma a contagem de uma
// demanda pausada, reabre e retoma uma concluída, e pausa a que está rodando. O cronômetro é de cada pessoa, então o
// botão só aparece para quem é responsável pela demanda, se for admin ou equipe.
export default function BotaoCronometroDaDemanda({ demanda, confirmar }) {
  const { membro } = useAcesso()
  const { executar } = useAvisos()
  const pessoa = useMemo(() => ({ email: membro.email, nome: membro.nome }), [membro.email, membro.nome])
  const daPessoa = ['admin', 'equipe'].includes(membro.papel) && demanda.responsavelEmail === membro.email
  const cronometro = useCronometro(daPessoa ? membro.email : null)
  const ativos = useMemo(() => ativosDoCronometro(cronometro.dados), [cronometro.dados])
  const [ocupado, setOcupado] = useState(false)

  if (!daPessoa) return null
  const rodando = ativos.some((a) => a.demandaId === demanda.id)
  const concluida = demanda.status === 'concluida'

  async function agir(acao, mensagem) {
    setOcupado(true)
    await executar(acao, mensagem)
    setOcupado(false)
  }

  async function ligar() {
    if (concluida) {
      const sim = await confirmar({
        titulo: 'Reabrir e retomar?',
        texto: `"${demanda.nome}" volta para em andamento e o cronômetro começa a contar agora, somando ao tempo que ela já tem. Ao concluir de novo, a entrega passa a ser a nova data.`,
        botao: 'Reabrir e retomar',
      })
      if (!sim) return
    }
    // Com outra demanda rodando, a pessoa escolhe rodar junto ou pausar. As rodando podem ser de outro mês, por isso
    // os nomes são lidos aqui.
    const outras = ativos.filter((a) => a.demandaId !== demanda.id)
    const nomes = await Promise.all(outras.map((a) => lerDemanda(a.demandaId).then((d) => d?.nome ?? 'uma demanda').catch(() => 'uma demanda')))
    const escolha = await escolherComoIniciar(confirmar, demanda.nome, nomes)
    if (!escolha) return
    agir(() => retomar(demanda.id, pessoa, escolha), `Cronômetro rodando: ${demanda.nome}`)
  }

  if (rodando) {
    return (
      <button type="button" className="botao botao--secundario botao--pequeno" disabled={ocupado} onClick={() => agir(() => pausar(pessoa, demanda.id), `${demanda.nome} pausada.`)}>
        <Pause aria-hidden="true" />
        Pausar cronômetro
      </button>
    )
  }
  return (
    <button type="button" className="botao botao--principal botao--pequeno" disabled={ocupado || cronometro.carregando} onClick={ligar}>
      <Play aria-hidden="true" />
      {concluida ? 'Reabrir e retomar' : 'Retomar cronômetro'}
    </button>
  )
}
