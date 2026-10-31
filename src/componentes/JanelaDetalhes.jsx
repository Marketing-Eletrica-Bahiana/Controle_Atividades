import { formatarAjustes, formatarData, formatarMes } from '../lib/datas.js'
import { formatarTempo } from '../lib/tempo.js'
import Janela from './Janela.jsx'
import { EtiquetaSituacao } from './Seletores.jsx'

const ACOES = {
  criacao: 'Criou a demanda',
  conclusao: 'Concluiu',
  reabertura: 'Reabriu',
  edicao: 'Editou',
  edicao_tempo: 'Editou o tempo',
  tempo_manual: 'Adicionou tempo manual',
  juncao: 'Juntou demandas',
  importacao: 'Importou da planilha',
}

const dataHora = (ts) => {
  const data = ts?.toDate?.() ?? (ts instanceof Date ? ts : null)
  if (!data) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(data).replace(',', '')
}

// Detalhes da demanda com todos os campos e o histórico de alterações.
export default function JanelaDetalhes({ demanda, nomeDaPessoa = (email) => email, aoFechar }) {
  const campos = demanda
    ? [
        ['Nº', demanda.numero],
        ['Mês', formatarMes(demanda.mes)],
        ['Responsável', demanda.responsavelNome],
        ['Tipo de Demanda', demanda.tipo || 'Sem tipo'],
        ['Público', demanda.publico],
        ['Solicitante', demanda.solicitante],
        ['Uso de IA', demanda.usoIA],
        ['Uso de Template', demanda.usoTemplate],
        ['Data de Solicitação', formatarData(demanda.dataSolicitacao)],
        ['Ajuste', formatarAjustes(demanda.datasAjuste ?? [])],
        ['Data de Entrega', formatarData(demanda.dataEntrega)],
        ['Tempo Gasto', formatarTempo(demanda.tempoGastoSeg ?? 0)],
        ['Tempo estimado sem IA', `${formatarTempo(demanda.tempoMinSeg)} a ${formatarTempo(demanda.tempoMaxSeg)}`],
        ['Tempo economizado com IA', `${formatarTempo(demanda.economizadoMinSeg)} a ${formatarTempo(demanda.economizadoMaxSeg)}`],
        ['Prazo cumprido (dias)', demanda.prazoDias ?? ''],
        ['Origem', demanda.importada ? `Importada de ${demanda.arquivoOrigem}` : 'Cronômetro'],
      ]
    : []
  const historico = [...(demanda?.historico ?? [])].reverse()

  return (
    <Janela aberta={Boolean(demanda)} titulo="Detalhes da demanda" aoFechar={aoFechar} largura={720}>
      {demanda && (
        <div className="detalhes-demanda">
          <div className="detalhes-demanda__topo">
            <h3 className="nome-demanda nome-demanda--grande">{demanda.nome}</h3>
            <EtiquetaSituacao status={demanda.status} />
          </div>
          <dl className="ficha ficha--grade">
            {campos.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor === '' || valor == null ? <span className="texto-suave">Não informado</span> : valor}</dd>
              </div>
            ))}
          </dl>
          <h3 className="bloco__subtitulo">Histórico</h3>
          {historico.length ? (
            <ol className="historico">
              {historico.map((h, i) => (
                <li key={i}>
                  <span className="historico__quando">{dataHora(h.quando)}</span>
                  <span>
                    <strong>{nomeDaPessoa(h.quem)}</strong> {(ACOES[h.acao] ?? h.acao).toLowerCase()}
                    {h.campo && ` ${h.campo}`}
                    {(h.antes || h.depois) && (
                      <span className="texto-suave">
                        {': '}
                        {h.antes || 'vazio'} para {h.depois || 'vazio'}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="texto-suave">Sem registros.</p>
          )}
          {(demanda.sessoes ?? []).length > 0 && (
            <>
              <h3 className="bloco__subtitulo">Sessões de cronômetro</h3>
              <ol className="historico">
                {demanda.sessoes.map((s, i) => (
                  <li key={i}>
                    <span className="historico__quando">{dataHora(s.inicio)}</span>
                    <span>
                      {formatarTempo(s.seg)}
                      {s.manual ? ' (tempo manual)' : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </Janela>
  )
}
