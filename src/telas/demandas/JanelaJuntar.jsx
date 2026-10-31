import { useState } from 'react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import Janela from '../../componentes/Janela.jsx'
import { juntarDemandas } from '../../dados/demandas.js'
import { formatarData } from '../../lib/datas.js'
import { formatarTempo } from '../../lib/tempo.js'

// Junta duas demandas repetidas: a escolhida fica, a outra é somada a ela e apagada.
export default function JanelaJuntar({ demandas, aoFechar, aoJuntar }) {
  return (
    <Janela aberta={Boolean(demandas)} titulo="Juntar demandas repetidas" aoFechar={aoFechar} largura={560}>
      {demandas && <Formulario key={demandas.map((d) => d.id).join()} demandas={demandas} aoFechar={aoFechar} aoJuntar={aoJuntar} />}
    </Janela>
  )
}

function Formulario({ demandas, aoFechar, aoJuntar }) {
  const { membro } = useAcesso()
  const { executar } = useAvisos()
  const [ficaId, setFicaId] = useState(demandas[0].id)
  const [ocupado, setOcupado] = useState(false)
  const fica = demandas.find((d) => d.id === ficaId)
  const sai = demandas.find((d) => d.id !== ficaId)
  const entrega = [fica.dataEntrega, sai.dataEntrega].filter(Boolean).sort().at(-1)

  async function juntar(evento) {
    evento.preventDefault()
    setOcupado(true)
    const deuCerto = await executar(() => juntarDemandas(fica, sai, membro.email), 'Demandas juntadas.')
    setOcupado(false)
    if (deuCerto) {
      aoJuntar()
      aoFechar()
    }
  }

  return (
    <form className="formulario" onSubmit={juntar}>
      <fieldset className="campo">
        <legend className="campo__rotulo">Qual fica?</legend>
        <div className="opcoes opcoes--coluna">
          {demandas.map((d) => (
            <label key={d.id} className="opcao">
              <input type="radio" name="fica" checked={ficaId === d.id} onChange={() => setFicaId(d.id)} />
              <span>
                <strong>
                  Nº {d.numero}: {d.nome}
                </strong>
                <span className="tabela__detalhe">
                  {formatarTempo(d.tempoGastoSeg)} · entrega {formatarData(d.dataEntrega) || 'sem data'}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p>
        Resultado: <strong>{fica.nome}</strong> com {formatarTempo((fica.tempoGastoSeg ?? 0) + (sai.tempoGastoSeg ?? 0))}, entrega{' '}
        {formatarData(entrega) || 'sem data'}. As outras datas vão para o Ajuste, os históricos se juntam e o mês é renumerado.
      </p>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={ocupado}>
          Juntar
        </button>
      </div>
    </form>
  )
}
