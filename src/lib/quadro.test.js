import { describe, expect, it } from 'vitest'
import {
  agruparPorColuna, camposDeEntrega, cartaoAtrasado, colunaDaEtiqueta, COLUNA_ENTREGUES, COLUNAS_PADRAO, corDaPessoa, etiquetaDaColuna, etiquetaDoPublico,
  filtrarCartoes, iniciais, ordemEntre, ordemParaSoltar, publicoDaEtiqueta, vaiParaOQuadro, vinculosSemDemanda,
} from './quadro.js'

const colunas = [
  { id: 'a', nome: 'Comunicação Externa' },
  { id: COLUNA_ENTREGUES, nome: 'Entregues' },
  { id: 'b', nome: 'Ajustar' },
]

describe('colunas', () => {
  it('as colunas padrão têm IDs únicos e incluem Entregues', () => {
    const ids = COLUNAS_PADRAO.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(COLUNA_ENTREGUES)
  })

  it('agrupa em ordem e usa a primeira coluna quando a do cartão não existe mais', () => {
    const grupos = agruparPorColuna(
      [
        { id: '1', coluna: 'b', ordem: 20 },
        { id: '2', coluna: 'b', ordem: 10 },
        { id: '3', coluna: 'sumiu', ordem: 5 },
      ],
      colunas,
    )
    expect(grupos.get('b').map((c) => c.id)).toEqual(['2', '1'])
    expect(grupos.get('a').map((c) => c.id)).toEqual(['3'])
  })

  it('Entregues mostra primeiro o que foi entregue por último', () => {
    const grupos = agruparPorColuna(
      [
        { id: 'velho', entregue: true, entregueEm: '2026-10-01', coluna: COLUNA_ENTREGUES },
        { id: 'novo', entregue: true, entregueEm: '2026-10-20', coluna: COLUNA_ENTREGUES },
      ],
      colunas,
    )
    expect(grupos.get(COLUNA_ENTREGUES).map((c) => c.id)).toEqual(['novo', 'velho'])
  })
})

describe('arrastar', () => {
  const lista = [
    { id: 'x', ordem: 100 },
    { id: 'y', ordem: 200 },
    { id: 'z', ordem: 300 },
  ]

  it('calcula a ordem entre vizinhos', () => {
    expect(ordemEntre(null, null)).toBe(1000)
    expect(ordemEntre(100, null)).toBe(1100)
    expect(ordemEntre(null, 100)).toBe(-900)
    expect(ordemEntre(100, 200)).toBe(150)
  })

  it('solta antes de um cartão, no começo e no fim', () => {
    expect(ordemParaSoltar(lista, 'novo', 'y')).toBe(150)
    expect(ordemParaSoltar(lista, 'novo', 'x')).toBe(-900)
    expect(ordemParaSoltar(lista, 'novo')).toBe(1300)
  })

  it('ignora o próprio cartão ao mudar de posição na mesma coluna', () => {
    expect(ordemParaSoltar(lista, 'z', 'y')).toBe(150)
    expect(ordemParaSoltar(lista, 'x')).toBe(1300)
    expect(ordemParaSoltar(lista, 'y', 'z')).toBe(200)
  })

  it('coluna vazia', () => {
    expect(ordemParaSoltar([], 'novo')).toBe(1000)
  })
})

describe('público e etiquetas', () => {
  it('liga o público da demanda à etiqueta do cartão', () => {
    expect(etiquetaDoPublico('Externo')).toBe('Comunicação Externa')
    expect(etiquetaDoPublico('Interno e Externo')).toBe('Comunicação Externa')
    expect(etiquetaDoPublico('endomarketing')).toBe('Endomarketing')
    expect(etiquetaDoPublico('Atividades de Rotina')).toBeNull()
    expect(etiquetaDoPublico('')).toBeNull()
  })

  it('rotina não vai para o quadro', () => {
    expect(vaiParaOQuadro('Externo')).toBe(true)
    expect(vaiParaOQuadro('Atividades de Rotina')).toBe(false)
    expect(vaiParaOQuadro('')).toBe(false)
  })

  it('traz o público de volta da etiqueta', () => {
    expect(publicoDaEtiqueta(['Nova Identidade Visual', 'CAE'])).toBe('CAE')
    expect(publicoDaEtiqueta(['Comunicação Visual'])).toBe('')
    expect(publicoDaEtiqueta()).toBe('')
  })

  it('acha a coluna pela etiqueta e a etiqueta pela coluna', () => {
    expect(colunaDaEtiqueta('Comunicação Externa', colunas)).toBe('a')
    expect(colunaDaEtiqueta(null, colunas)).toBe('a')
    expect(colunaDaEtiqueta('Endomarketing', [{ id: COLUNA_ENTREGUES, nome: 'Entregues' }, { id: 'b', nome: 'Ajustar' }])).toBe('b')
    expect(etiquetaDaColuna('comunicacao externa')).toBe('Comunicação Externa')
    expect(etiquetaDaColuna('Ajustar')).toBeNull()
  })
})

describe('vínculos com demandas', () => {
  const a = { demandaId: 'a', email: 'um@x' }
  const b = { demandaId: 'b', email: 'dois@x' }

  it('tira a demanda apagada e mantém as outras', () => {
    expect(vinculosSemDemanda([a, b], 'a')).toEqual([b])
    expect(vinculosSemDemanda([a], 'sumiu')).toEqual([a])
    expect(vinculosSemDemanda(undefined, 'a')).toEqual([])
  })

  it('ao juntar, a demanda que ficou entra no lugar, sem repetir', () => {
    const nova = { demandaId: 'c', email: 'um@x' }
    expect(vinculosSemDemanda([a, b], 'a', nova)).toEqual([b, nova])
    expect(vinculosSemDemanda([a, b], 'a', b)).toEqual([b])
  })
})

describe('filtros e situação', () => {
  const cartoes = [
    { id: '1', titulo: 'Reels Promoção', etiquetas: ['Comunicação Externa'], responsaveis: ['a@x'] },
    { id: '2', titulo: 'Card Boas-vindas', etiquetas: ['Endomarketing'], responsaveis: ['b@x'] },
    { id: '3', titulo: 'Sem nada' },
  ]

  it('filtra por nome sem diferenciar acento, por etiqueta e por pessoa', () => {
    expect(filtrarCartoes(cartoes, { busca: 'PROMOCAO' }).map((c) => c.id)).toEqual(['1'])
    expect(filtrarCartoes(cartoes, { etiqueta: 'Endomarketing' }).map((c) => c.id)).toEqual(['2'])
    expect(filtrarCartoes(cartoes, { pessoa: 'a@x' }).map((c) => c.id)).toEqual(['1'])
    expect(filtrarCartoes(cartoes).length).toBe(3)
  })

  it('atrasado só com prazo vencido e sem entrega', () => {
    expect(cartaoAtrasado({ prazo: '2026-11-03' }, '2026-11-04')).toBe(true)
    expect(cartaoAtrasado({ prazo: '2026-11-04' }, '2026-11-04')).toBe(false)
    expect(cartaoAtrasado({ prazo: '2026-11-03', entregue: true }, '2026-11-04')).toBe(false)
    expect(cartaoAtrasado({}, '2026-11-04')).toBe(false)
  })

  it('entrega marca e desmarca junto com a coluna', () => {
    expect(camposDeEntrega(COLUNA_ENTREGUES, '2026-10-30')).toEqual({ entregue: true, entregueEm: '2026-10-30', mesEntrega: '2026-10' })
    expect(camposDeEntrega('ajustar', '2026-10-30')).toEqual({ entregue: false, entregueEm: null, mesEntrega: null })
  })

  it('cada pessoa da equipe tem uma cor diferente, sem depender de acento nem sobrenome', () => {
    const cores = ['Ivie Cidreira', 'Taís', 'Adelaide da Costa', 'Gleidiane'].map(corDaPessoa)
    expect(new Set(cores).size).toBe(4)
    expect(corDaPessoa('Tais Amorim')).toBe(corDaPessoa('Taís'))
    expect(corDaPessoa('Gleide')).toBe(corDaPessoa('Gleidiane'))
  })

  it('quem entrar depois também recebe uma cor, sempre a mesma', () => {
    expect(corDaPessoa('Pessoa Nova')).toBe(corDaPessoa('Pessoa Nova'))
    expect(corDaPessoa('Pessoa Nova')).toBeTruthy()
    expect(corDaPessoa('')).toBeTruthy()
  })

  it('iniciais do nome', () => {
    expect(iniciais('Maria da Silva')).toBe('MS')
    expect(iniciais('Ana')).toBe('A')
    expect(iniciais('')).toBe('')
  })
})
