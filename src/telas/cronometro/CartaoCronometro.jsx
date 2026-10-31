import { CircleCheck, Clock, Pause } from 'lucide-react'
import { patterns } from '../../lib/marca.js'
import { SITUACOES } from '../../lib/regras.js'
import { formatarTempo } from '../../lib/tempo.js'

// Cartão principal: gradiente com o pattern de circuito, números grandes e os botões do cronômetro.
export default function CartaoCronometro({ demanda, decorrido, totalDoDia, nomeDaArea, ocupado, aoPausar, aoConcluir, aoCorrigir }) {
  const rodando = Boolean(demanda)
  return (
    <section className={`cartao-cronometro ${rodando ? 'rodando' : ''}`} style={{ '--pattern': `url("${patterns.circuito}")` }} aria-live="polite">
      <div className="cartao-cronometro__topo">
        <span className="cartao-cronometro__rotulo">{rodando ? 'Cronômetro rodando' : 'Nenhum cronômetro rodando'}</span>
        {rodando && <span className={`etiqueta-situacao ${SITUACOES.em_andamento.classe}`}>{SITUACOES.em_andamento.rotulo}</span>}
      </div>

      <p className="cartao-cronometro__tempo">{formatarTempo(rodando ? (demanda.tempoGastoSeg ?? 0) + decorrido : 0)}</p>
      {rodando ? (
        <>
          <p className="cartao-cronometro__nome">{demanda.nome}</p>
          <p className="cartao-cronometro__detalhe">
            {demanda.tipo}
            {nomeDaArea && ` · ${nomeDaArea}`} · nesta sessão {formatarTempo(decorrido)}
          </p>
          <div className="linha-circuito linha-circuito--viva" aria-hidden="true" />
        </>
      ) : (
        <p className="cartao-cronometro__nome">Escolha uma demanda abaixo e aperte Iniciar.</p>
      )}

      <div className="cartao-cronometro__rodape">
        <p className="cartao-cronometro__total">
          Total do dia <strong>{formatarTempo(totalDoDia)}</strong>
        </p>
        {rodando && (
          <div className="cartao-cronometro__acoes">
            <button type="button" className="botao-claro-link" onClick={aoCorrigir} disabled={ocupado}>
              <Clock aria-hidden="true" />
              Corrigir início
            </button>
            <button type="button" className="botao botao--pausar botao--grande-largo" onClick={aoPausar} disabled={ocupado}>
              <Pause aria-hidden="true" />
              Pausar
            </button>
            <button type="button" className="botao botao--concluir botao--grande-largo" onClick={() => aoConcluir(demanda)} disabled={ocupado}>
              <CircleCheck aria-hidden="true" />
              Concluir
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
