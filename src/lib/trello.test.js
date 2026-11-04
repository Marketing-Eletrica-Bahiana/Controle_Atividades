import { describe, expect, it } from 'vitest'
import { COLUNAS_PADRAO } from './quadro.js'
import {
  alteracoesDoTrello, campoDoModelo, cartaoNovoDoTrello, dataDoTexto, enderecoDoArquivo, foiMudadoNoSite, lerArquivoDoTrello, mesDaLista, planejarImportacao,
  postagemDoCartao, redesDoTexto, resumoDasPostagens,
} from './trello.js'

const MODELO = (redes, data, formato) => `Postagem nas Redes Sociais\n\nRedes: _**${redes}**_\n\nPostagem: _**${data}**_\n\nFormato: _**${formato}**_`
const momento = (ms) => ({ toMillis: () => ms })

describe('datas escritas à mão', () => {
  it('sem ano, a data vem depois da criação do cartão, mesmo se estiver longe', () => {
    expect(dataDoTexto('26 de Novembro', '2026-05-10')).toBe('2026-11-26')
    expect(dataDoTexto('14/02', '2026-03-20')).toBe('2026-02-14')
    expect(dataDoTexto('10/01', '2026-03-20')).toBe('2027-01-10')
  })

  it('lê por extenso, com barra e sem ano, perto da criação do cartão', () => {
    expect(dataDoTexto('09 de Novembro', '2026-10-20')).toBe('2026-11-09')
    expect(dataDoTexto('14/07', '2026-07-01')).toBe('2026-07-14')
    expect(dataDoTexto('14/07/2025', '2026-07-01')).toBe('2025-07-14')
    expect(dataDoTexto('21 março', '2026-03-01')).toBe('2026-03-21')
  })

  it('aceita o mês em inglês que apareceu no quadro', () => {
    expect(dataDoTexto('03 de November', '2026-10-20')).toBe('2026-11-03')
  })

  it('passa de ano quando a data fica mais perto do ano seguinte', () => {
    expect(dataDoTexto('05 de janeiro', '2025-12-20')).toBe('2026-01-05')
    expect(dataDoTexto('28 de dezembro', '2026-01-03')).toBe('2025-12-28')
  })

  it('recusa data que não existe e texto sem data', () => {
    expect(dataDoTexto('31/02', '2026-02-01')).toBeNull()
    expect(dataDoTexto('14/13', '2026-02-01')).toBeNull()
    expect(dataDoTexto('Sem previsão', '2026-02-01')).toBeNull()
    expect(dataDoTexto('', '2026-02-01')).toBeNull()
  })
})

describe('modelo do cartão', () => {
  it('acha o campo com a marcação do Trello e não confunde o título do modelo', () => {
    const texto = MODELO('Instagram', '30 de Outubro', 'Story Estatico')
    expect(campoDoModelo(texto, 'postagem')).toBe('30 de outubro')
    expect(campoDoModelo(texto, 'redes')).toBe('instagram')
    expect(campoDoModelo('Postagem nas Redes Sociais', 'postagem')).toBeNull()
  })

  it('junta as linhas de um campo até o próximo rótulo', () => {
    const texto = 'Redes: _**Instagram (Stories)**_\nLinkedin (Feed) - marcar\nPostagem: _**21 de Outubro**_'
    expect(redesDoTexto(campoDoModelo(texto, 'redes'))).toEqual(['Instagram', 'LinkedIn'])
    expect(campoDoModelo(texto, 'postagem')).toBe('21 de outubro')
  })

  it('acha "Postagem:" no meio da linha', () => {
    expect(campoDoModelo('Prazo para entrega: **10/07** Postagem: **14/07**', 'postagem')).toBe('14/07')
  })

  it('reconhece as redes', () => {
    expect(redesDoTexto('INSTAGRAM e LinkedIn (Reels)')).toEqual(['Instagram', 'LinkedIn'])
    expect(redesDoTexto('LinkedIn do CAE (Carrossel)')).toEqual(['LinkedIn do CAE'])
    expect(redesDoTexto('LinkedIn e LinkedIn do CAE')).toEqual(['LinkedIn', 'LinkedIn do CAE'])
    expect(redesDoTexto('Canal do YouTube')).toEqual(['YouTube'])
    expect(redesDoTexto('YouTube Shorts')).toEqual(['YouTube Shorts'])
    expect(redesDoTexto('YouTube e Shorts')).toEqual(['YouTube', 'YouTube Shorts'])
    expect(redesDoTexto('Instagram e Shorts')).toEqual(['Instagram', 'YouTube Shorts'])
    expect(redesDoTexto('TikTok')).toEqual([])
    expect(redesDoTexto('instalação')).toEqual([])
  })
})

describe('postagem do cartão', () => {
  const base = { nome: 'Reels Promoção', etiquetas: ['Comunicação Externa'], criadoEm: '2026-10-01' }

  it('com o modelo, a data é exata e o prazo é ignorado', () => {
    expect(postagemDoCartao({ ...base, descricao: MODELO('Instagram e LinkedIn (Reels)', '26 de Outubro', 'Vídeo Reels'), prazo: '2026-10-22' })).toEqual({
      data: '2026-10-26',
      redes: ['Instagram', 'LinkedIn'],
      formato: 'Reels',
    })
  })

  it('o modelo vale mesmo sem a etiqueta externa', () => {
    expect(postagemDoCartao({ ...base, etiquetas: [], descricao: MODELO('Instagram', '26 de Outubro', 'Reels') })?.data).toBe('2026-10-26')
  })

  it('modelo só com outra rede fica fora do calendário, e o YouTube entra', () => {
    expect(postagemDoCartao({ ...base, descricao: MODELO('TikTok', '26 de Outubro', 'Vídeo') })).toBeNull()
    expect(postagemDoCartao({ ...base, descricao: MODELO('YouTube', '26 de Outubro', 'Vídeo') })).toMatchObject({ data: '2026-10-26', redes: ['YouTube'] })
  })

  it('reprogramação em comentário passa à frente e fica como estimada', () => {
    const comentarios = [{ texto: 'Programado' }, { texto: 'Reprogramado por uma colega para 28/10 às 08:30' }]
    expect(postagemDoCartao({ ...base, descricao: MODELO('Instagram', '26 de Outubro', 'Reels'), comentarios })).toMatchObject({ data: '2026-10-28', estimada: true })
  })

  it('sem o modelo, usa o que estiver escrito e marca como estimada', () => {
    const comum = { ...base, criadoEm: '2026-07-01', prazo: '2026-07-10' }
    expect(postagemDoCartao({ ...comum, descricao: 'Prazo: **10/07**\nPostagem: **14/07**\nPOSTAGEM EM LINKEDIN.' })).toEqual({
      data: '2026-07-14',
      redes: ['LinkedIn'],
      formato: 'Reels',
      estimada: true,
    })
    expect(postagemDoCartao({ ...comum, descricao: '', comentarios: [{ texto: 'Vamos postar dia 15/07 no Instagram' }] })).toMatchObject({ data: '2026-07-15', redes: ['Instagram'] })
  })

  it('não usa data de prazo nem de outro assunto', () => {
    const comum = { ...base, criadoEm: '2026-06-01', prazo: '2026-06-20' }
    expect(postagemDoCartao({ ...comum, descricao: 'Prazo para postar: 18/06' }).data).toBe('2026-06-20')
    expect(postagemDoCartao({ ...comum, descricao: 'As lojas fecham no dia 24/06' }).data).toBe('2026-06-20')
  })

  it('cai no prazo, depois na entrega; sem nada, fica sem data e sem marca de estimada', () => {
    const comum = { ...base, descricao: '', criadoEm: '2026-06-01' }
    expect(postagemDoCartao({ ...comum, prazo: '2026-06-20' })).toEqual({ data: '2026-06-20', redes: [], formato: 'Reels', estimada: true, redeAConfirmar: true })
    expect(postagemDoCartao({ ...comum, entregueEm: '2026-06-30' }).data).toBe('2026-06-30')
    expect(postagemDoCartao(comum)).toEqual({ data: null, redes: [], formato: 'Reels', redeAConfirmar: true })
  })

  it('cartão sem etiqueta externa e sem modelo não é postagem', () => {
    expect(postagemDoCartao({ ...base, etiquetas: ['Endomarketing'], descricao: 'Texto' })).toBeNull()
  })
})

// IDs do Trello começam com o momento da criação: 6a000000 é maio de 2026.
const quadroDeExemplo = () => ({
  name: 'Quadro de exemplo',
  lists: [
    { id: 'l1', name: 'COMUNICAÇÃO EXTERNA', closed: false },
    { id: 'l2', name: 'OUTUBRO - PRONTOS E ENTREGUES', closed: false },
    { id: 'l3', name: 'JULHO - PRONTO E ENTREGUES', closed: false },
    { id: 'l4', name: 'APROVAÇÃO IVIE -> TAÍS', closed: false },
    { id: 'l5', name: 'LISTA NOVA', closed: false },
    { id: 'l6', name: 'AJUSTES', closed: true },
  ],
  labels: [{ id: 'e1', name: 'Comunicação Externa' }, { id: 'e2', name: 'endomarketing' }],
  members: [{ id: 'm1', fullName: 'Pessoa Um' }],
  cards: [
    { id: '6a0000000000000000000001', name: 'Reels A', desc: MODELO('Instagram', '26 de Outubro', 'Reels'), idList: 'l1', idLabels: ['e1'], idMembers: ['m1'], due: '2026-10-22T15:00:00.000Z', dateLastActivity: '2026-10-20T10:00:00.000Z', shortUrl: 'https://trello.com/c/a', pos: 100 },
    { id: '6a0000000000000000000002', name: 'Post antigo', desc: '', idList: 'l2', idLabels: ['e1'], idMembers: [], due: '2026-10-05T15:00:00.000Z', dateLastActivity: '2026-11-01T10:00:00.000Z', pos: 200 },
    { id: '6a0000000000000000000003', name: 'Card interno', desc: '', idList: 'l3', idLabels: ['e2'], idMembers: [], due: null, dateLastActivity: '2026-08-02T10:00:00.000Z', pos: 300 },
    { id: '6a0000000000000000000004', name: 'Em aprovação', desc: '', idList: 'l4', idLabels: [], idMembers: [], dateLastActivity: '2026-10-20T10:00:00.000Z', pos: 400 },
    { id: '6a0000000000000000000005', name: 'Outra lista', desc: '', idList: 'l5', idLabels: [], idMembers: [], dateLastActivity: '2026-10-20T10:00:00.000Z', pos: 500 },
    { id: '6a0000000000000000000006', name: 'Arquivado', closed: true, desc: '', idList: 'l1', idLabels: [], idMembers: [], pos: 600 },
    { id: '6a0000000000000000000007', name: 'Em lista fechada', desc: '', idList: 'l6', idLabels: [], idMembers: [], pos: 700 },
  ],
  actions: [
    { id: 'a2', type: 'commentCard', date: '2026-10-21T10:00:00.000Z', idMemberCreator: 'm1', memberCreator: { fullName: 'Pessoa Um' }, data: { card: { id: '6a0000000000000000000001' }, text: 'Segundo' } },
    { id: 'a1', type: 'commentCard', date: '2026-10-20T10:00:00.000Z', idMemberCreator: 'm1', memberCreator: { fullName: 'Pessoa Um' }, data: { card: { id: '6a0000000000000000000001' }, text: 'Primeiro' } },
    { id: 'a3', type: 'updateCard', date: '2026-10-20T10:00:00.000Z', data: { card: { id: '6a0000000000000000000001' } } },
  ],
})

describe('ano das listas de entregues', () => {
  it('vale o último mês até a atividade do cartão', () => {
    expect(mesDaLista('OUTUBRO - PRONTOS E ENTREGUES', '2026-11-04')).toBe('2026-10')
    expect(mesDaLista('Março - Prontos e entregues', '2026-08-01')).toBe('2026-03')
    expect(mesDaLista('DEZEMBRO - PRONTOS', '2026-01-10')).toBe('2025-12')
  })

  it('cartão adiantado em dezembro é do janeiro seguinte', () => {
    expect(mesDaLista('JANEIRO - PRONTOS e ENTREGUES', '2025-12-30')).toBe('2026-01')
  })

  it('cartão de janeiro mexido bem depois continua naquele janeiro', () => {
    expect(mesDaLista('JANEIRO - PRONTOS e ENTREGUES', '2026-08-15')).toBe('2026-01')
    expect(mesDaLista('JANEIRO - PRONTOS e ENTREGUES', '2026-11-15')).toBe('2026-01')
  })

  it('lista que não é de entregues não tem mês', () => {
    expect(mesDaLista('COMUNICAÇÃO EXTERNA', '2026-11-04')).toBeNull()
    expect(mesDaLista('MAIO', '2026-11-04')).toBeNull()
  })
})

describe('leitura do arquivo', () => {
  const lido = lerArquivoDoTrello(JSON.stringify(quadroDeExemplo()), COLUNAS_PADRAO)
  const item = (titulo) => lido.itens.find((i) => i.titulo === titulo)

  it('ignora os arquivados e as listas fechadas', () => {
    expect(lido.itens.length).toBe(5)
    expect(lido.arquivados).toBe(2)
    expect(lido.pessoas).toEqual([{ id: 'm1', nome: 'Pessoa Um' }])
  })

  it('liga as listas às colunas, mesmo com a seta escrita diferente', () => {
    expect(item('Reels A').coluna).toBe('comunicacao-externa')
    expect(item('Em aprovação').coluna).toBe('aprovacao-ivie-tais')
  })

  it('lista desconhecida vira coluna nova', () => {
    expect(item('Outra lista').coluna).toBe('lista-nova')
    expect(lido.colunasNovas).toEqual([{ id: 'lista-nova', nome: 'LISTA NOVA' }])
  })

  it('as listas de cada mês viram Entregues, no mês certo', () => {
    expect(item('Post antigo')).toMatchObject({ coluna: 'entregues', entregue: true, mesEntrega: '2026-10', entregueEm: '2026-10-05' })
    expect(item('Card interno')).toMatchObject({ entregue: true, mesEntrega: '2026-07', entregueEm: '2026-07-01' })
    expect(item('Reels A')).toMatchObject({ entregue: false, entregueEm: null, mesEntrega: null })
  })

  it('padroniza a etiqueta e guarda os comentários do mais antigo para o mais novo', () => {
    expect(item('Card interno').etiquetas).toEqual(['Endomarketing'])
    expect(item('Reels A').comentarios.map((c) => c.texto)).toEqual(['Primeiro', 'Segundo'])
  })

  it('monta a postagem e resume', () => {
    expect(item('Reels A').postagem.data).toBe('2026-10-26')
    expect(item('Post antigo').postagem).toMatchObject({ data: '2026-10-05', estimada: true, redeAConfirmar: true })
    expect(item('Card interno').postagem).toBeNull()
    const resumo = resumoDasPostagens(lido.itens)
    expect(resumo).toMatchObject({ total: 2, exatas: 1, estimadas: 1, redeAConfirmar: 1, semData: 0 })
    expect(resumo.porMes.get('2026-10')).toBe(2)
  })

  it('avisa com mensagem clara se o arquivo estiver errado', () => {
    expect(() => lerArquivoDoTrello('não é json', COLUNAS_PADRAO)).toThrow('JSON válido')
    expect(() => lerArquivoDoTrello('{"a":1}', COLUNAS_PADRAO)).toThrow('quadro do Trello')
  })

  it('o endereço do arquivo pede todos os cartões e os comentários', () => {
    const url = enderecoDoArquivo('abc')
    expect(url).toContain('/boards/abc?')
    expect(url).toContain('cards=all')
    expect(url).toContain('actions=commentCard')
  })
})

describe('reimportação', () => {
  const opcoes = {
    quem: 'admin@x',
    agora: momento(5000),
    pessoaDoTrello: (id) => ({ m1: 'um@x' })[id] ?? null,
    paraMomento: (iso) => iso,
  }
  const lido = lerArquivoDoTrello(JSON.stringify(quadroDeExemplo()), COLUNAS_PADRAO)
  const primeiro = lido.itens[0]
  const ja = (extra = {}) => ({
    id: primeiro.id,
    trello: { ultimaAtividade: primeiro.ultimaAtividade, importadoEm: momento(1000) },
    atualizadoEm: momento(1000),
    ...extra,
  })

  it('separa novos, sem mudança, atualizações, conflitos e o que saiu do arquivo', () => {
    const outro = { ...ja(), id: 'trello-sumiu' }
    expect(planejarImportacao([primeiro], [])).toMatchObject({ novos: [primeiro] })
    expect(planejarImportacao([primeiro], [ja()]).semMudanca).toEqual([primeiro])
    const mudouNoTrello = ja({ trello: { ultimaAtividade: 'antes', importadoEm: momento(1000) } })
    expect(planejarImportacao([primeiro], [mudouNoTrello]).atualizar).toEqual([primeiro])
    expect(planejarImportacao([primeiro], [{ ...mudouNoTrello, atualizadoEm: momento(2000) }]).conflitos).toEqual([primeiro])
    expect(planejarImportacao([primeiro], [ja(), outro]).foraDoArquivo).toEqual([outro])
  })

  it('reconhece o que foi mudado no site depois da importação', () => {
    expect(foiMudadoNoSite(ja())).toBe(false)
    expect(foiMudadoNoSite(ja({ atualizadoEm: momento(1001) }))).toBe(true)
  })

  it('o cartão novo guarda a origem, as pessoas ligadas e nada indefinido', () => {
    const novo = cartaoNovoDoTrello(primeiro, opcoes)
    expect(novo).toMatchObject({ origem: 'trello', responsaveis: ['um@x'], postagemMes: '2026-10', vinculos: [], criadoPor: 'admin@x' })
    expect(novo.trello).toEqual({ id: primeiro.idDoTrello, url: 'https://trello.com/c/a', ultimaAtividade: primeiro.ultimaAtividade, importadoEm: opcoes.agora })
    expect(novo.comentarios[0]).toMatchObject({ email: 'um@x', nome: 'Pessoa Um', texto: 'Primeiro' })
    expect(Object.values(novo)).not.toContain(undefined)
    expect(novo.atualizadoEm).toBe(novo.trello.importadoEm)
  })

  it('pessoa sem cadastro fica de fora, sem quebrar', () => {
    const novo = cartaoNovoDoTrello(primeiro, { ...opcoes, pessoaDoTrello: () => null })
    expect(novo.responsaveis).toEqual([])
    expect(novo.comentarios[0].email).toBe('')
  })

  it('atualizar mantém os comentários e o tempo do site', () => {
    const atual = {
      vinculos: [{ demandaId: 'd1' }],
      historico: [{ acao: 'criacao' }],
      comentarios: [{ idDoTrello: 'a1', texto: 'antigo do Trello' }, { texto: 'feito no site' }],
    }
    const novos = alteracoesDoTrello(primeiro, atual, opcoes)
    expect(novos.comentarios.map((c) => c.texto)).toEqual(['feito no site', 'Primeiro', 'Segundo'])
    expect(novos.vinculos).toBeUndefined()
    expect(novos.historico.at(-1).acao).toBe('importacao')
    expect(novos.atualizadoEm).toBe(opcoes.agora)
  })
})
