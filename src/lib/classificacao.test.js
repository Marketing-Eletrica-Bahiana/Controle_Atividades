import { describe, expect, it } from 'vitest'
import { classificar, palavrasDoNome, prepararHistorico, sugerirPelasPalavras, textoDaOrigem } from './classificacao.js'

const tipos = [
  { nome: 'Conteúdo para Redes Sociais' },
  { nome: 'Datas Especiais (artes para papelaria/mimos)' },
  { nome: 'Card Comunicação Interna' },
  { nome: 'Card de Reconhecimento' },
  { nome: 'Vídeo Comunicação Interna' },
]

const palavras = [
  { palavra: 'reels', tipo: 'Conteúdo para Redes Sociais' },
  { palavra: 'carrossel', tipo: 'Conteúdo para Redes Sociais' },
  { palavra: 'dia dos pais', tipo: 'Datas Especiais (artes para papelaria/mimos)' },
  { palavra: 'card', tipo: 'Card Comunicação Interna' },
  { palavra: 'card de reconhecimento', tipo: 'Card de Reconhecimento' },
  { palavra: 'vídeo', tipo: 'Vídeo Comunicação Interna' },
]

describe('palavras do nome', () => {
  it('ignora acentos, pontuação, números, palavras vazias e o nome da pessoa depois de " - "', () => {
    expect(palavrasDoNome('Card de Reconhecimento - Leidiane')).toEqual(['card', 'reconhecimento'])
    expect(palavrasDoNome('Vídeo para o Dia dos Animais 04/10')).toEqual(['video', 'dia', 'animais'])
    expect(palavrasDoNome('')).toEqual([])
  })
})

describe('palavras-chave', () => {
  it('escolhe a mais específica, ou seja, a mais longa', () => {
    expect(sugerirPelasPalavras('Card de Reconhecimento - Ana', palavras)[0].tipo).toBe('Card de Reconhecimento')
  })

  it('formato de rede social ganha de data comemorativa', () => {
    const [primeira] = sugerirPelasPalavras('Reels Dia dos Pais', palavras)
    expect(primeira.palavra).toBe('reels')
  })

  it('só aceita a palavra inteira e sem diferenciar acentos', () => {
    expect(sugerirPelasPalavras('Video institucional', palavras)[0].tipo).toBe('Vídeo Comunicação Interna')
    expect(sugerirPelasPalavras('Cardápio do evento', palavras)).toEqual([])
  })
})

describe('classificar', () => {
  const historico = prepararHistorico([
    { nome: 'Card Aniversariantes de Empresa - Outubro', tipo: 'Card Comunicação Interna', mes: '2026-10', responsavelEmail: 'b@x' },
    { nome: 'Card Aniversariantes de Empresa', tipo: 'Datas Especiais (artes para papelaria/mimos)', mes: '2026-07', responsavelEmail: 'a@x' },
    { nome: 'Card Aniversariantes de Empresa', tipo: 'Datas Especiais (artes para papelaria/mimos)', mes: '2026-09', responsavelEmail: 'a@x' },
    { nome: 'Sem tipo', tipo: '', mes: '2026-09' },
  ])

  it('o histórico vem antes das palavras-chave e prefere as demandas da própria pessoa', () => {
    const resultado = classificar('Card Aniversariantes de Empresa - Novembro', { historico, palavras, tipos, email: 'a@x', mesAtual: '2026-11' })
    expect(resultado).toMatchObject({ tipo: 'Datas Especiais (artes para papelaria/mimos)', origem: 'historico', quantidade: 3 })
    expect(resultado.alternativas).toEqual(['Card Comunicação Interna'])
    expect(textoDaOrigem(resultado)).toBe('Sugerido pelo histórico: 3 demandas parecidas')
  })

  it('sem histórico parecido, usa a palavra-chave e oferece até 3 alternativas', () => {
    const resultado = classificar('Carrossel com vídeo do Dia dos Pais', { historico, palavras, tipos })
    expect(resultado).toMatchObject({ tipo: 'Conteúdo para Redes Sociais', origem: 'palavra', palavra: 'carrossel' })
    expect(resultado.alternativas).toEqual(['Vídeo Comunicação Interna'])
    expect(textoDaOrigem(resultado)).toBe("Sugerido pela palavra-chave 'carrossel'")
  })

  it('sem nenhuma pista, deixa o tipo em branco', () => {
    expect(classificar('Planejamento geral', { historico, palavras, tipos })).toMatchObject({ tipo: '', origem: null, alternativas: [] })
  })

  it('não sugere tipo que não está na tabela da área', () => {
    const resultado = classificar('Reels de lançamento', { palavras, tipos: [{ nome: 'Card Comunicação Interna' }] })
    expect(resultado.tipo).toBe('')
  })
})
