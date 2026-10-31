// Classificação automática do tipo de atividade, com os dados da área da demanda.
// Ordem: 1) histórico de demandas parecidas; 2) palavra-chave mais específica; 3) sem pista.

import { normalizar } from './texto.js'

const PALAVRAS_VAZIAS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'para', 'pra', 'pro', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas',
  'com', 'por', 'ao', 'aos', 'um', 'uma', 'ft',
])

// Formatos de rede social ganham de datas comemorativas quando os dois aparecem no nome.
const FORMATOS_DE_REDE = new Set(['reels', 'carrossel', 'story', 'stories', 'post', 'artigo'])
const DATAS_COMEMORATIVAS = [
  'natal', 'pascoa', 'carnaval', 'sao joao', 'ano novo', 'black friday', 'outubro rosa', 'novembro azul',
  'setembro amarelo', 'janeiro branco', 'maio amarelo', 'dezembro vermelho', 'aniversario',
]

const MAXIMO_DE_ALTERNATIVAS = 3
const SEMELHANCA_MINIMA = 0.5

// Palavras que importam no nome: sem acento, sem pontuação, sem números, sem nomes de pessoas depois de " - ".
export function palavrasDoNome(nome) {
  const semPessoa = String(nome ?? '').split(' - ')[0]
  return [...new Set(normalizar(semPessoa).split(' '))].filter(
    (p) => p.length > 1 && !PALAVRAS_VAZIAS.has(p) && !/\d/.test(p),
  )
}

// Semelhança entre dois conjuntos de palavras (coeficiente de Dice): 1 = iguais, 0 = nada em comum.
function semelhanca(a, b) {
  if (!a.length || !b.length) return 0
  const conjuntoB = new Set(b)
  const comuns = a.filter((p) => conjuntoB.has(p)).length
  return (2 * comuns) / (a.length + b.length)
}

// Prepara o histórico uma vez, para a classificação rodar a cada letra digitada.
// Demandas cujo nome é só o próprio tipo (planilhas antigas sem nome) ficam de fora: não dizem nada
// sobre nomes parecidos e, nos dados reais, derrubavam o acerto de 59% para 52%.
export function prepararHistorico(demandas) {
  return demandas
    .filter((d) => d.tipo && d.nome && normalizar(d.nome) !== normalizar(d.tipo))
    .map((d) => ({ tipo: d.tipo, palavras: palavrasDoNome(d.nome), mes: d.mes ?? '', responsavelEmail: d.responsavelEmail }))
    .filter((d) => d.palavras.length)
}

function mesesEntre(mesA, mesB) {
  if (!mesA || !mesB) return 12
  const [anoA, numA] = mesA.split('-').map(Number)
  const [anoB, numB] = mesB.split('-').map(Number)
  return Math.abs((anoB - anoA) * 12 + (numB - numA))
}

// Tipos sugeridos pelo histórico, do mais provável ao menos provável, com quantas demandas parecidas cada um tem.
export function sugerirPeloHistorico(nome, historico, { email, mesAtual } = {}) {
  const palavras = palavrasDoNome(nome)
  if (!palavras.length) return []
  const placar = new Map()
  for (const demanda of historico) {
    const nota = semelhanca(palavras, demanda.palavras)
    if (nota < SEMELHANCA_MINIMA) continue
    // Preferência para as demandas da própria pessoa e para as mais recentes.
    const peso = nota * (demanda.responsavelEmail === email ? 1.5 : 1) * (1 / (1 + mesesEntre(demanda.mes, mesAtual) / 6))
    const atual = placar.get(demanda.tipo) ?? { tipo: demanda.tipo, peso: 0, quantidade: 0 }
    placar.set(demanda.tipo, { ...atual, peso: atual.peso + peso, quantidade: atual.quantidade + 1 })
  }
  return [...placar.values()].sort((a, b) => b.peso - a.peso)
}

const contemExpressao = (texto, expressao) => ` ${texto} `.includes(` ${expressao} `)

const ehDataComemorativa = (palavra) => {
  const texto = normalizar(palavra.palavra)
  const tipo = normalizar(palavra.tipo)
  return (
    tipo.includes('datas especiais') ||
    tipo.includes('datas comemorativas') ||
    texto.startsWith('dia d') ||
    DATAS_COMEMORATIVAS.some((data) => contemExpressao(texto, data))
  )
}

// Palavras-chave da área que aparecem no nome, da mais específica (mais longa) à menos.
export function sugerirPelasPalavras(nome, palavras) {
  const texto = normalizar(nome)
  if (!texto) return []
  let achadas = palavras.filter((p) => p.tipo && normalizar(p.palavra) && contemExpressao(texto, normalizar(p.palavra)))
  const temFormato = achadas.some((p) => FORMATOS_DE_REDE.has(normalizar(p.palavra)))
  if (temFormato) achadas = achadas.filter((p) => !ehDataComemorativa(p))
  return achadas.sort((a, b) => {
    const formatoA = FORMATOS_DE_REDE.has(normalizar(a.palavra)) ? 1 : 0
    const formatoB = FORMATOS_DE_REDE.has(normalizar(b.palavra)) ? 1 : 0
    return formatoB - formatoA || normalizar(b.palavra).length - normalizar(a.palavra).length
  })
}

// Resultado: { tipo, origem: 'historico' | 'palavra' | null, quantidade, palavra, alternativas: [até 3 tipos] }.
// Só sugere tipos que existem na tabela da área.
export function classificar(nome, { historico = [], palavras = [], tipos = [], email, mesAtual } = {}) {
  const existentes = new Set(tipos.map((t) => t.nome))
  const pelaHistoria = sugerirPeloHistorico(nome, historico, { email, mesAtual }).filter((s) => existentes.has(s.tipo))
  const pelasPalavras = sugerirPelasPalavras(nome, palavras).filter((p) => existentes.has(p.tipo))

  let escolha = { tipo: '', origem: null, quantidade: 0, palavra: '' }
  if (pelaHistoria.length) {
    escolha = { tipo: pelaHistoria[0].tipo, origem: 'historico', quantidade: pelaHistoria.reduce((s, x) => s + x.quantidade, 0), palavra: '' }
  } else if (pelasPalavras.length) {
    escolha = { tipo: pelasPalavras[0].tipo, origem: 'palavra', quantidade: 0, palavra: pelasPalavras[0].palavra }
  }

  const alternativas = []
  for (const tipo of [...pelaHistoria.map((s) => s.tipo), ...pelasPalavras.map((p) => p.tipo)]) {
    if (tipo !== escolha.tipo && !alternativas.includes(tipo)) alternativas.push(tipo)
    if (alternativas.length === MAXIMO_DE_ALTERNATIVAS) break
  }
  return { ...escolha, alternativas }
}

export function textoDaOrigem({ origem, quantidade, palavra }) {
  if (origem === 'historico') return `Sugerido pelo histórico: ${quantidade} ${quantidade === 1 ? 'demanda parecida' : 'demandas parecidas'}`
  if (origem === 'palavra') return `Sugerido pela palavra-chave '${palavra}'`
  return ''
}
