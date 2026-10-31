import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { useAreas } from '../dados/areas.js'
import { formatarMes, hojeISO, mesDe } from '../lib/datas.js'
import { veTodasAsAreas } from '../lib/papeis.js'
import { SITUACOES } from '../lib/regras.js'

export const TODAS = '__todas__'

// Áreas que a pessoa pode ver e a escolha atual. Admin, gestão e diretoria têm "Todas as áreas".
export function useAreasVisiveis() {
  const { membro } = useAcesso()
  const { dados: todas } = useAreas()
  const todasAsAreas = veTodasAsAreas(membro.papel)
  const opcoes = (todas ?? []).filter((a) => (todasAsAreas ? true : (membro.areas ?? []).includes(a.id)))
  const [escolha, setEscolha] = useState(todasAsAreas ? TODAS : '')
  const valida = escolha === TODAS ? todasAsAreas : opcoes.some((a) => a.id === escolha)
  const atual = valida ? escolha : (opcoes[0]?.id ?? '')
  const ids = atual === TODAS ? opcoes.map((a) => a.id) : atual ? [atual] : []
  const nome = atual === TODAS ? 'Todas as áreas' : (opcoes.find((a) => a.id === atual)?.nome ?? '')
  // Função estável enquanto as áreas não mudam (o Painel refaz os gráficos quando ela muda).
  const nomeDaArea = useCallback((id) => (todas ?? []).find((a) => a.id === id)?.nome ?? id, [todas])
  return { opcoes, atual, setAtual: setEscolha, ids, nome, todasAsAreas, nomeDaArea, carregando: !todas }
}

export function SeletorDeAreas({ areas }) {
  return (
    <label className="campo campo--compacto">
      <span className="campo__rotulo">Área</span>
      <select value={areas.atual} onChange={(e) => areas.setAtual(e.target.value)}>
        {areas.todasAsAreas && <option value={TODAS}>Todas as áreas</option>}
        {areas.opcoes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
            {a.ativa ? '' : ' (desativada)'}
          </option>
        ))}
      </select>
    </label>
  )
}

const somarMeses = (mes, delta) => {
  const [ano, numero] = mes.split('-').map(Number)
  const data = new Date(Date.UTC(ano, numero - 1 + delta, 1))
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`
}

export function useMesEscolhido() {
  return useState(mesDe(hojeISO()))
}

export function SeletorMes({ mes, aoMudar }) {
  return (
    <div className="campo campo--compacto">
      <span className="campo__rotulo">Mês</span>
      <div className="seletor-periodo">
        <button type="button" className="botao-icone" onClick={() => aoMudar(somarMeses(mes, -1))} aria-label="Mês anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <strong>{formatarMes(mes)}</strong>
        <button type="button" className="botao-icone" onClick={() => aoMudar(somarMeses(mes, 1))} aria-label="Próximo mês">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function EtiquetaSituacao({ status }) {
  const situacao = SITUACOES[status] ?? SITUACOES.pausada
  return <span className={`etiqueta-situacao ${situacao.classe}`}>{situacao.rotulo}</span>
}
