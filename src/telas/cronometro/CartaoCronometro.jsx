import { CircleCheck, Clock, Pause } from 'lucide-react'
import { patterns } from '../../lib/marca.js'
import { SITUACOES } from '../../lib/regras.js'
import { formatarTempo } from '../../lib/tempo.js'

// Cartão principal: gradiente com o pattern de circuito, números grandes e os botões do cronômetro.
// Desde 25/11/2026 podem rodar várias demandas ao mesmo tempo: cada uma aparece com o próprio tempo e os
// próprios botões. "rodando" é a lista de { demanda, inicio, decorrido }.
export default function CartaoCronometro({ rodando, totalDoDia, variasAreas, nomeDaArea, ocupado, aoPausar, aoConcluir, aoCorrigir }) {
  const quantas = rodando.length
  const rotulo = quantas === 0 ? 'Nenhum cronômetro rodando' : quantas === 1 ? 'Cronômetro rodando' : `${quantas} cronômetros rodando`
  return (
    <section
      className={`cartao-cronometro ${quantas ? 'rodando' : ''} ${quantas > 1 ? 'cartao-cronometro--varias' : ''}`}
      style={{ '--pattern': `url("${patterns.circuito}")` }}
      aria-live="polite"
    >
      <div className="cartao-cronometro__topo">
        <span className="cartao-cronometro__rotulo">{rotulo}</span>
        {quantas > 0 && <span className={`etiqueta-situacao ${SITUACOES.em_andamento.classe}`}>{SITUACOES.em_andamento.rotulo}</span>}
      </div>

      {quantas === 0 ? (
        <>
          <p className="cartao-cronometro__tempo">{formatarTempo(0)}</p>
          <p className="cartao-cronometro__nome">Escolha uma demanda abaixo e aperte Iniciar.</p>
        </>
      ) : (
        rodando.map((r) => (
          <div key={r.demanda.id} className="cartao-cronometro__item">
            <p className="cartao-cronometro__tempo">{formatarTempo((r.demanda.tempoGastoSeg ?? 0) + r.decorrido)}</p>
            <p className="cartao-cronometro__nome">{r.demanda.nome}</p>
            <p className="cartao-cronometro__detalhe">
              {r.demanda.tipo}
              {nomeDaArea(r.demanda.area) && ` · ${nomeDaArea(r.demanda.area)}`} · nesta sessão {formatarTempo(r.decorrido)}
            </p>
            <div className="linha-circuito linha-circuito--viva" aria-hidden="true" />
            <div className="cartao-cronometro__acoes">
              <button type="button" className="botao-claro-link" onClick={() => aoCorrigir(r)} disabled={ocupado}>
                <Clock aria-hidden="true" />
                Corrigir início
              </button>
              <button type="button" className="botao botao--pausar botao--grande-largo" onClick={() => aoPausar(r.demanda)} disabled={ocupado}>
                <Pause aria-hidden="true" />
                Pausar
              </button>
              <button type="button" className="botao botao--concluir botao--grande-largo" onClick={() => aoConcluir(r.demanda)} disabled={ocupado}>
                <CircleCheck aria-hidden="true" />
                Concluir
              </button>
            </div>
          </div>
        ))
      )}

      <div className="cartao-cronometro__rodape">
        <p className="cartao-cronometro__total">
          {variasAreas ? 'Total do dia, todas as áreas' : 'Total do dia'} <strong>{formatarTempo(totalDoDia)}</strong>
        </p>
        {quantas > 1 && <p className="cartao-cronometro__detalhe">Rodando juntas, o tempo do relógio entra uma vez só no total do dia.</p>}
      </div>
    </section>
  )
}
