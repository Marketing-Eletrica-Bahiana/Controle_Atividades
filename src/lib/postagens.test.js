import { describe, expect, it } from 'vitest'
import {
  agruparPorDia, camposDaPostagem, diasDoCalendario, ehInterno, ehPostagem, etiquetasDasRedes, formatoDoNome, FORMATOS, FORMATOS_INTERNOS, GRUPOS_INTERNOS, mudarPostagem, POSTAGEM_VAZIA, postagemDasOpcoes, postagemPadrao, postagensDoMes,
  postagensIguais, postagensSemData, publicoDePostagem, publicoInterno, REDES, resumoDaPostagem, resumoDoMes, rotuloDaData, situacaoDaPostagem, SO_EXTERNAS, SO_INTERNAS, tiposDaPostagem,
} from './postagens.js'

const HOJE = '2026-11-04'

describe('grupos internos: WhatsApp e Lideranças', () => {
  it('aparecem para Comunicação Interna e Endomarketing, e nos públicos internos', () => {
    expect(ehInterno(['Comunicação Interna'])).toBe(true)
    expect(ehInterno(['Endomarketing', 'CAE'])).toBe(true)
    expect(ehInterno(['Comunicação Externa'])).toBe(false)
    expect(ehInterno()).toBe(false)
    expect(publicoInterno('Interno')).toBe(true)
    expect(publicoInterno('Interno e Externo')).toBe(true)
    expect(publicoInterno('Endomarketing')).toBe(true)
    expect(publicoInterno('Externo')).toBe(false)
    expect(publicoInterno('Atividades de Rotina')).toBe(false)
  })

  it('não contam como postagem sozinhos: o cartão interno só entra marcando a opção', () => {
    expect(postagemPadrao(['Comunicação Interna'])).toBeNull()
    expect(ehPostagem({ etiquetas: ['Comunicação Interna'] })).toBe(false)
    expect(publicoDePostagem('Interno')).toBe(false)
  })

  it('o leitor do Trello continua procurando só as redes externas', () => {
    for (const grupo of GRUPOS_INTERNOS) expect(REDES).not.toContain(grupo)
  })

  it('Grupos do CAE conta como interno, não como o LinkedIn do CAE', () => {
    const cartao = (redes) => ({ etiquetas: [], postagem: { data: null, redes, formato: '' } })
    expect(tiposDaPostagem(cartao(['Grupos do CAE']))).toEqual({ redeSocial: false, interna: true, envio: false })
    expect(tiposDaPostagem(cartao(['LinkedIn do CAE']))).toEqual({ redeSocial: true, interna: false, envio: false })
    expect(etiquetasDasRedes(['Grupos do CAE'])).toEqual(['Comunicação Interna'])
    expect(postagemDasOpcoes({ redes: ['Grupos do CAE', 'Instagram'] }, { redeSocial: true, interna: false }).redes).toEqual(['Instagram'])
  })

  it('Envio Interno: é uma caixa própria e fica gravado sem precisar de rede', () => {
    const cartao = (postagem, etiquetas = ['Endomarketing']) => ({ etiquetas, postagem: { data: '2026-11-10', redes: [], formato: '', ...postagem } })
    expect(tiposDaPostagem(cartao({ envio: true }))).toEqual({ redeSocial: false, interna: false, envio: true })
    expect(tiposDaPostagem(cartao({ envio: true, redes: ['WhatsApp'] }))).toEqual({ redeSocial: false, interna: true, envio: true })
    expect(tiposDaPostagem(cartao({ envio: true }, ['Comunicação Externa']))).toEqual({ redeSocial: false, interna: false, envio: true })
    const base = { data: '2026-11-10', redes: ['Instagram', 'WhatsApp'], formato: 'Apresentação' }
    expect(postagemDasOpcoes(base, { redeSocial: false, interna: false, envio: true })).toEqual({ data: '2026-11-10', redes: [], formato: 'Apresentação', envio: true })
    const semEnvio = postagemDasOpcoes({ ...base, envio: true }, { redeSocial: true, interna: true, envio: false })
    expect('envio' in semEnvio).toBe(false)
    expect(postagemDasOpcoes({ ...base, envio: true }, { redeSocial: false, interna: false, envio: false })).toBeNull()
    expect(postagensIguais({ ...base, envio: true }, base)).toBe(false)
    expect(resumoDaPostagem({ data: '2026-11-10', redes: [], formato: 'Card', envio: true })).toBe('10/11/2026, Card, Envio Interno')
  })

  it('a data muda de nome conforme o que está marcado', () => {
    expect(rotuloDaData({ redeSocial: true, interna: false, envio: false })).toBe('Data da postagem')
    expect(rotuloDaData({ redeSocial: false, interna: true, envio: false })).toBe('Data da postagem')
    expect(rotuloDaData({ redeSocial: false, interna: false, envio: true })).toBe('Data do Envio')
    expect(rotuloDaData({ redeSocial: true, interna: false, envio: true })).toBe('Data da postagem e do envio')
    expect(rotuloDaData({ redeSocial: false, interna: true, envio: true })).toBe('Data da postagem e do envio')
  })

  it('os formatos internos não entram na lista das redes sociais', () => {
    expect(FORMATOS_INTERNOS).toEqual(['Foto de Perfil', 'Assinatura de e-Mail', 'Apresentação'])
    for (const formato of FORMATOS_INTERNOS) expect(FORMATOS).not.toContain(formato)
  })

  it('a postagem nova ganha a etiqueta que as redes pedem', () => {
    expect(etiquetasDasRedes([])).toEqual(['Comunicação Externa'])
    expect(etiquetasDasRedes(['Instagram'])).toEqual(['Comunicação Externa'])
    expect(etiquetasDasRedes(['WhatsApp', 'Lideranças'])).toEqual(['Comunicação Interna'])
    expect(etiquetasDasRedes(['WhatsApp', 'Instagram'])).toEqual(['Comunicação Externa', 'Comunicação Interna'])
  })

  it('as duas caixas vêm das redes; sem rede, a etiqueta decide', () => {
    const cartao = (redes, etiquetas = []) => ({ etiquetas, postagem: { data: null, redes, formato: '' } })
    expect(tiposDaPostagem(cartao(['Instagram']))).toEqual({ redeSocial: true, interna: false, envio: false })
    expect(tiposDaPostagem(cartao(['WhatsApp']))).toEqual({ redeSocial: false, interna: true, envio: false })
    expect(tiposDaPostagem(cartao(['Lideranças', 'LinkedIn']))).toEqual({ redeSocial: true, interna: true, envio: false })
    expect(tiposDaPostagem(cartao([]))).toEqual({ redeSocial: true, interna: false, envio: false })
    expect(tiposDaPostagem(cartao([], ['Comunicação Externa']))).toEqual({ redeSocial: true, interna: false, envio: false })
    expect(tiposDaPostagem(cartao([], ['Comunicação Interna']))).toEqual({ redeSocial: false, interna: true, envio: false })
    expect(tiposDaPostagem(cartao([], ['Endomarketing', 'Comunicação Externa']))).toEqual({ redeSocial: true, interna: false, envio: false })
    expect(tiposDaPostagem({ etiquetas: ['Comunicação Interna'], postagem: null })).toEqual({ redeSocial: false, interna: false, envio: false })
    expect(tiposDaPostagem({ etiquetas: ['Comunicação Externa'] })).toEqual({ redeSocial: true, interna: false, envio: false })
  })

  it('desmarcar uma caixa tira as redes dela; sem nenhuma, não é postagem', () => {
    const postagem = { data: '2026-11-10', redes: ['Instagram', 'WhatsApp'], formato: 'Reels' }
    expect(postagemDasOpcoes(postagem, { redeSocial: true, interna: true })).toEqual(postagem)
    expect(postagemDasOpcoes(postagem, { redeSocial: true, interna: false })).toEqual({ ...postagem, redes: ['Instagram'] })
    expect(postagemDasOpcoes(postagem, { redeSocial: false, interna: true })).toEqual({ ...postagem, redes: ['WhatsApp'] })
    expect(postagemDasOpcoes(postagem, { redeSocial: false, interna: false })).toBeNull()
    expect(postagensIguais(postagemDasOpcoes(POSTAGEM_VAZIA, { redeSocial: true, interna: false }), POSTAGEM_VAZIA)).toBe(true)
  })

  it('o calendário filtra externas e internas; sem rede conta como externa', () => {
    const cartao = (id, redes) => ({ id, etiquetas: [], postagem: { data: '2026-11-10', redes, formato: '' } })
    const cartoes = [cartao('externa', ['Instagram']), cartao('interna', ['WhatsApp']), cartao('as-duas', ['Lideranças', 'LinkedIn']), cartao('sem-rede', [])]
    const ids = (filtro) => postagensDoMes(cartoes, '2026-11', filtro).map((c) => c.id)
    expect(ids('')).toEqual(['externa', 'interna', 'as-duas', 'sem-rede'])
    expect(ids(SO_EXTERNAS)).toEqual(['externa', 'as-duas', 'sem-rede'])
    expect(ids(SO_INTERNAS)).toEqual(['interna', 'as-duas'])
    expect(ids('WhatsApp')).toEqual(['interna'])
    const semRedeInterna = { id: 'interna-sem-rede', etiquetas: ['Comunicação Interna'], postagem: { data: '2026-11-10', redes: [], formato: '' } }
    expect(postagensDoMes([semRedeInterna], '2026-11', SO_INTERNAS)).toHaveLength(1)
    expect(postagensDoMes([semRedeInterna], '2026-11', SO_EXTERNAS)).toHaveLength(0)
    const soEnvio = { id: 'envio', etiquetas: ['Endomarketing'], postagem: { data: '2026-11-10', redes: [], formato: '', envio: true } }
    expect(postagensDoMes([soEnvio], '2026-11', SO_INTERNAS)).toHaveLength(1)
    expect(postagensDoMes([soEnvio], '2026-11', SO_EXTERNAS)).toHaveLength(0)
  })
})

describe('o que é postagem', () => {
  it('sem o campo, a etiqueta decide; null quer dizer que não é', () => {
    expect(ehPostagem({ etiquetas: ['Comunicação Externa'] })).toBe(true)
    expect(ehPostagem({ etiquetas: ['Endomarketing'] })).toBe(false)
    expect(ehPostagem({ etiquetas: ['Comunicação Externa'], postagem: null })).toBe(false)
    expect(ehPostagem({ etiquetas: [], postagem: POSTAGEM_VAZIA })).toBe(true)
  })

  it('o padrão do cartão novo vem da etiqueta e o da demanda vem do público', () => {
    expect(postagemPadrao(['Comunicação Externa'])).toEqual(POSTAGEM_VAZIA)
    expect(postagemPadrao(['CAE'])).toBeNull()
    expect(postagemPadrao()).toBeNull()
    expect(publicoDePostagem('Externo')).toBe(true)
    expect(publicoDePostagem('Interno e Externo')).toBe(true)
    expect(publicoDePostagem('Interno')).toBe(false)
    expect(publicoDePostagem('')).toBe(false)
  })

  it('reconhece o formato pelo nome', () => {
    expect(formatoDoNome('Reels Dia do Cliente')).toBe('Reels')
    expect(formatoDoNome('Story Interativo - Automação')).toBe('Stories')
    expect(formatoDoNome('Carrossel - Aniversariantes')).toBe('Carrossel')
    expect(formatoDoNome('Vídeo Novembro Azul')).toBe('Vídeo')
    expect(formatoDoNome('Cards Campanha')).toBe('Card')
    expect(formatoDoNome('Cardápio do mês')).toBe('')
    expect(formatoDoNome('')).toBe('')
  })
})

describe('gravação', () => {
  it('guarda o mês para o calendário consultar', () => {
    expect(camposDaPostagem({ ...POSTAGEM_VAZIA, data: '2026-10-30' }).postagemMes).toBe('2026-10')
    expect(camposDaPostagem(POSTAGEM_VAZIA).postagemMes).toBeNull()
    expect(camposDaPostagem(null)).toEqual({ postagem: null, postagemMes: null })
  })

  it('mexer na data ou nas redes confirma o que era estimado', () => {
    const estimada = { data: '2026-07-14', redes: [], formato: '', estimada: true, redeAConfirmar: true }
    expect(mudarPostagem(estimada, 'data', '2026-07-15')).toEqual({ data: '2026-07-15', redes: [], formato: '', redeAConfirmar: true })
    expect(mudarPostagem(estimada, 'redes', ['Instagram'])).toEqual({ data: '2026-07-14', redes: ['Instagram'], formato: '', estimada: true })
    expect(mudarPostagem(estimada, 'formato', 'Reels')).toMatchObject({ estimada: true, redeAConfirmar: true })
  })

  it('compara sem depender da ordem', () => {
    const a = { data: '2026-11-04', redes: ['Instagram', 'LinkedIn'], formato: 'Reels' }
    expect(postagensIguais(a, { formato: 'Reels', redes: ['LinkedIn', 'Instagram'], data: '2026-11-04' })).toBe(true)
    expect(postagensIguais(a, { ...a, data: '2026-11-05' })).toBe(false)
    expect(postagensIguais(a, { ...a, estimada: true })).toBe(false)
    expect(postagensIguais(null, undefined)).toBe(true)
    expect(postagensIguais(a, null)).toBe(false)
  })

  it('resume para o histórico', () => {
    expect(resumoDaPostagem({ data: '2026-11-04', redes: ['Instagram', 'LinkedIn'], formato: 'Reels' })).toBe('04/11/2026, Instagram e LinkedIn, Reels')
    expect(resumoDaPostagem(POSTAGEM_VAZIA)).toBe('Sem data')
    expect(resumoDaPostagem(null)).toBe('Não é postagem')
  })
})

describe('situação', () => {
  const cartao = (data, extra = {}) => ({ coluna: 'comunicacao-externa', postagem: { data }, ...extra })

  it('em produção até a data, atrasada depois dela', () => {
    expect(situacaoDaPostagem(cartao('2026-11-10'), HOJE)).toBe('producao')
    expect(situacaoDaPostagem(cartao(HOJE), HOJE)).toBe('producao')
    expect(situacaoDaPostagem(cartao('2026-11-03'), HOJE)).toBe('atrasada')
    expect(situacaoDaPostagem(cartao(null), HOJE)).toBe('producao')
  })

  it('pronta fica programada até a data e postada depois', () => {
    expect(situacaoDaPostagem(cartao('2026-11-10', { coluna: 'legendado-programado' }), HOJE)).toBe('programada')
    expect(situacaoDaPostagem(cartao('2026-11-03', { coluna: 'legendado-programado' }), HOJE)).toBe('postada')
    expect(situacaoDaPostagem(cartao(HOJE, { entregue: true }), HOJE)).toBe('postada')
    expect(situacaoDaPostagem(cartao('2026-11-10', { entregue: true }), HOJE)).toBe('programada')
  })

  it('conta por situação', () => {
    const lista = [cartao('2026-11-10'), cartao('2026-11-03'), cartao('2026-11-01', { entregue: true })]
    expect(resumoDoMes(lista, HOJE)).toEqual({ total: 3, producao: 1, programada: 0, postada: 1, atrasada: 1 })
  })
})

describe('calendário', () => {
  it('a semana começa no domingo: novembro de 2026 começa num domingo, sem dias vazios no início', () => {
    const dias = diasDoCalendario('2026-11')
    expect(dias[0]).toBe('2026-11-01')
    expect(dias.length).toBe(35)
    expect(dias.filter(Boolean).length).toBe(30)
    expect(dias.filter(Boolean).at(-1)).toBe('2026-11-30')
  })

  it('mês que começa na segunda tem um dia vazio, o domingo', () => {
    const dias = diasDoCalendario('2026-06')
    expect(dias.slice(0, 2)).toEqual([null, '2026-06-01'])
    expect(dias.filter(Boolean).length).toBe(30)
    expect(dias.length).toBe(35)
  })

  it('fevereiro cabe em quatro semanas quando começa no domingo', () => {
    const dias = diasDoCalendario('2026-02')
    expect(dias.length).toBe(28)
    expect(dias.filter(Boolean).length).toBe(28)
  })

  it('mês longo ocupa seis semanas e não perde dias', () => {
    const dias = diasDoCalendario('2026-08')
    expect(dias.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-08-01'])
    expect(dias.length).toBe(42)
    expect(dias.filter(Boolean).length).toBe(31)
  })

  it('agrupa por dia em ordem de nome', () => {
    const grupos = agruparPorDia([
      { titulo: 'B', postagem: { data: '2026-11-04' } },
      { titulo: 'A', postagem: { data: '2026-11-04' } },
      { titulo: 'Sem data', postagem: { data: null } },
    ])
    expect(grupos.get('2026-11-04').map((c) => c.titulo)).toEqual(['A', 'B'])
    expect(grupos.size).toBe(1)
  })

  it('filtra pelo mês, pela rede e separa as sem data', () => {
    const cartoes = [
      { id: '1', postagem: { data: '2026-11-04', redes: ['Instagram'] } },
      { id: '2', postagem: { data: '2026-11-05', redes: ['LinkedIn'] } },
      { id: '3', postagem: { data: '2026-10-05', redes: ['LinkedIn'] } },
      { id: '4', postagem: null, etiquetas: ['Comunicação Externa'] },
      { id: '5', etiquetas: ['Comunicação Externa'] },
      { id: '6', postagem: { data: null, redes: [] }, entregue: true },
      { id: '7', postagem: { data: null, redes: [] }, coluna: 'ideias' },
    ]
    expect(postagensDoMes(cartoes, '2026-11').map((c) => c.id)).toEqual(['1', '2'])
    expect(postagensDoMes(cartoes, '2026-11', 'LinkedIn').map((c) => c.id)).toEqual(['2'])
    expect(postagensSemData(cartoes).map((c) => c.id)).toEqual(['5'])
  })
})
