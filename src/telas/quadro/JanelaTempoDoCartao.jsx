import { useState } from 'react'
import CampoData from '../../componentes/CampoData.jsx'
import Janela from '../../componentes/Janela.jsx'
import { hojeISO } from '../../lib/datas.js'
import { publicoDaEtiqueta } from '../../lib/quadro.js'
import { lerTempo } from '../../lib/tempo.js'
import { CamposDaClassificacao, CampoTipo, useCamposDaDemanda } from '../cronometro/CamposDaDemanda.jsx'
import {
  BotoesDaJanela, CamposDoTempoManual, erroDaSolicitacao, errosDoTempoManual, TEXTOS_DO_TEMPO_MANUAL,
} from '../cronometro/JanelasDoCronometro.jsx'

// Tempo feito sem o cronômetro, lançado pelo cartão. "pedido" é { cartao, demandaId }: quem já tem demanda no cartão soma
// nela; na primeira vez, a janela também cria a demanda, como "Iniciar o cronômetro", mas sem ligar o cronômetro.
export default function JanelaTempoDoCartao({ pedido, pessoa, areas, aoCriar, aoSomar, aoFechar }) {
  return (
    <Janela aberta={Boolean(pedido)} titulo="Adicionar tempo manual" aoFechar={aoFechar} largura={640}>
      {pedido && (
        <>
          <p className="janela-iniciar__titulo">
            <strong>{pedido.cartao.titulo}</strong>
          </p>
          {pedido.demandaId ? (
            <FormSomar demandaId={pedido.demandaId} aoSomar={aoSomar} aoFechar={aoFechar} />
          ) : (
            <NovaDemanda cartao={pedido.cartao} pessoa={pessoa} areas={areas} aoCriar={aoCriar} aoFechar={aoFechar} />
          )}
        </>
      )}
    </Janela>
  )
}

// Os erros aparecem depois da primeira tentativa e somem conforme a pessoa corrige.
function useEnvio(validar, gravar, aoFechar) {
  const [tentou, setTentou] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const erros = tentou ? validar() : {}

  async function enviar(evento) {
    evento.preventDefault()
    setTentou(true)
    if (Object.keys(validar()).length) return
    setOcupado(true)
    const deuCerto = await gravar()
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  return { erros, ocupado, enviar }
}

function FormSomar({ demandaId, aoSomar, aoFechar }) {
  const [data, setData] = useState(hojeISO())
  const [tempo, setTempo] = useState('')
  const segundos = lerTempo(tempo)
  const { erros, ocupado, enviar } = useEnvio(() => errosDoTempoManual(data, segundos), () => aoSomar(demandaId, { data, segundos }), aoFechar)

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <CamposDoTempoManual rotuloDaData="Data" data={data} aoMudarData={setData} tempo={tempo} aoMudarTempo={setTempo} erros={erros} />
      <p className="texto-suave texto-pequeno">Soma na sua demanda deste cartão. {TEXTOS_DO_TEMPO_MANUAL.existente}</p>
      <BotoesDaJanela aoFechar={aoFechar} ocupado={ocupado} rotulo="Adicionar" />
    </form>
  )
}

function NovaDemanda({ cartao, pessoa, areas, aoCriar, aoFechar }) {
  const [area, setArea] = useState(areas[0]?.id ?? '')
  return (
    <>
      {areas.length > 1 && (
        <label className="campo janela-iniciar__area">
          <span className="campo__rotulo">Área</span>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      {/* Cada área tem os próprios tipos: trocar a área recomeça a classificação. */}
      <FormNova key={area} cartao={cartao} area={area} pessoa={pessoa} aoCriar={aoCriar} aoFechar={aoFechar} />
    </>
  )
}

function FormNova({ cartao, area, pessoa, aoCriar, aoFechar }) {
  const campos = useCamposDaDemanda(area, pessoa, { nome: cartao.titulo, publico: publicoDaEtiqueta(cartao.etiquetas) })
  const [data, setData] = useState(hojeISO())
  const [tempo, setTempo] = useState('')
  // Cartão em Entregues já vem com a demanda concluída; nos outros, ela fica pausada para continuar depois.
  const [concluida, setConcluida] = useState(Boolean(cartao.entregue))
  // A solicitação acompanha a outra data até a pessoa mexer nela.
  const [solicitacaoEscolhida, setSolicitacaoEscolhida] = useState(undefined)
  const dataSolicitacao = solicitacaoEscolhida === undefined ? data : solicitacaoEscolhida
  const segundos = lerTempo(tempo)

  function validar() {
    const achados = errosDoTempoManual(data, segundos)
    if (!campos.tipo) achados.tipo = 'Escolha o tipo.'
    const solicitacao = erroDaSolicitacao(dataSolicitacao, data)
    if (solicitacao) achados.dataSolicitacao = solicitacao
    return achados
  }

  const { erros, ocupado, enviar } = useEnvio(validar, () => aoCriar(cartao, campos.paraGravar(dataSolicitacao), { data, segundos, concluida }), aoFechar)

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <CampoTipo campos={campos} erro={erros.tipo} />
      <CamposDaClassificacao campos={campos}>
        <CampoData rotulo="Data de Solicitação" valor={dataSolicitacao} aoMudar={setSolicitacaoEscolhida} erro={erros.dataSolicitacao} obrigatorio />
      </CamposDaClassificacao>
      <CamposDoTempoManual
        rotuloDaData={concluida ? 'Data de Entrega' : 'Data do trabalho'}
        data={data}
        aoMudarData={setData}
        tempo={tempo}
        aoMudarTempo={setTempo}
        erros={erros}
      />
      <label className="opcao">
        <input type="checkbox" checked={concluida} onChange={(e) => setConcluida(e.target.checked)} />
        Essa demanda já foi concluída
      </label>
      <p className="texto-suave texto-pequeno">
        Você ainda não tem demanda neste cartão: ela é criada já com o tempo, sem ligar o cronômetro.{' '}
        {TEXTOS_DO_TEMPO_MANUAL[concluida ? 'concluida' : 'aberta']}
      </p>
      <BotoesDaJanela aoFechar={aoFechar} ocupado={ocupado} rotulo="Adicionar" />
    </form>
  )
}
