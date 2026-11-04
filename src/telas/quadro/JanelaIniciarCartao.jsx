import { useState } from 'react'
import { Play } from 'lucide-react'
import CampoData from '../../componentes/CampoData.jsx'
import Janela from '../../componentes/Janela.jsx'
import { hojeISO } from '../../lib/datas.js'
import { publicoDaEtiqueta } from '../../lib/quadro.js'
import { CamposDaClassificacao, CampoTipo, useCamposDaDemanda } from '../cronometro/CamposDaDemanda.jsx'

// Primeira vez de uma pessoa neste cartão: cria a demanda dela, com os dados que o cronômetro precisa.
export default function JanelaIniciarCartao({ cartao, pessoa, areas, aoIniciar, aoFechar }) {
  return (
    <Janela aberta={Boolean(cartao)} titulo="Iniciar o cronômetro" aoFechar={aoFechar} largura={640}>
      {cartao && <Conteudo cartao={cartao} pessoa={pessoa} areas={areas} aoIniciar={aoIniciar} aoFechar={aoFechar} />}
    </Janela>
  )
}

function Conteudo({ cartao, pessoa, areas, aoIniciar, aoFechar }) {
  const [area, setArea] = useState(areas[0]?.id ?? '')
  return (
    <>
      <p className="janela-iniciar__titulo">
        <strong>{cartao.titulo}</strong>
      </p>
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
      <Formulario key={area} cartao={cartao} area={area} pessoa={pessoa} aoIniciar={aoIniciar} aoFechar={aoFechar} />
    </>
  )
}

function Formulario({ cartao, area, pessoa, aoIniciar, aoFechar }) {
  const campos = useCamposDaDemanda(area, pessoa, { nome: cartao.titulo, publico: publicoDaEtiqueta(cartao.etiquetas) })
  const [dataSolicitacao, setDataSolicitacao] = useState(hojeISO())
  const [erros, setErros] = useState({})
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!campos.tipo) novosErros.tipo = 'Escolha o tipo.'
    if (!dataSolicitacao) novosErros.dataSolicitacao = 'Informe a data de solicitação.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    setOcupado(true)
    const deuCerto = await aoIniciar(cartao, campos.paraGravar(dataSolicitacao))
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <CampoTipo campos={campos} erro={erros.tipo} />
      <CamposDaClassificacao campos={campos}>
        <CampoData rotulo="Data de Solicitação" valor={dataSolicitacao} aoMudar={setDataSolicitacao} erro={erros.dataSolicitacao} obrigatorio />
      </CamposDaClassificacao>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={ocupado}>
          <Play aria-hidden="true" />
          Iniciar
        </button>
      </div>
    </form>
  )
}
