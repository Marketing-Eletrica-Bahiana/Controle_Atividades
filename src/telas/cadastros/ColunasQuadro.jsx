import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import { contarCartoesNaColuna, salvarColunas, useColunas } from '../../dados/cartoes.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { COLUNA_ENTREGUES } from '../../lib/quadro.js'
import { normalizar, paraId } from '../../lib/texto.js'
import { JanelaNome } from './Areas.jsx'

// Colunas do Quadro. Entregues pode mudar de nome e de lugar, mas não sai: é ela que marca a entrega.
export default function ColunasQuadro() {
  const colunas = useColunas()
  const { avisar, executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const [nova, setNova] = useState('')
  const [erro, setErro] = useState('')
  const [renomeando, setRenomeando] = useState(null)

  if (colunas.carregando) return <CarregandoBloco />
  if (colunas.erro) return <p className="aviso aviso--erro">{mensagemDeErro(colunas.erro)}</p>

  const lista = colunas.dados
  const gravar = (novaLista, mensagem) => executar(() => salvarColunas(novaLista), mensagem)
  const jaExiste = (nome, ignorar) => lista.some((c) => c.id !== ignorar && normalizar(c.nome) === normalizar(nome))

  async function adicionar(evento) {
    evento.preventDefault()
    const nome = nova.trim()
    if (!nome) return
    if (jaExiste(nome)) {
      setErro('Já existe uma coluna com esse nome.')
      return
    }
    setErro('')
    if (await gravar([...lista, { id: paraId(nome), nome }], `Coluna "${nome}" criada.`)) setNova('')
  }

  function mover(i, direcao) {
    const nova = [...lista]
    ;[nova[i], nova[i + direcao]] = [nova[i + direcao], nova[i]]
    gravar(nova)
  }

  async function remover(coluna) {
    const quantos = await contarCartoesNaColuna(coluna.id).catch(() => null)
    if (quantos == null) {
      avisar('Não foi possível conferir os cartões dessa coluna. Tente de novo.', 'erro')
      return
    }
    if (quantos > 0) {
      avisar(`A coluna "${coluna.nome}" tem ${quantos === 1 ? '1 cartão' : `${quantos} cartões`}. Mova antes de remover.`, 'erro')
      return
    }
    const sim = await confirmar({ titulo: 'Remover coluna?', texto: `"${coluna.nome}" sai do Quadro.`, botao: 'Remover', perigo: true })
    if (sim) gravar(lista.filter((c) => c.id !== coluna.id), 'Coluna removida.')
  }

  function renomear(nome) {
    if (jaExiste(nome, renomeando.id)) {
      avisar('Já existe uma coluna com esse nome.', 'erro')
      return false
    }
    return gravar(lista.map((c) => (c.id === renomeando.id ? { ...c, nome } : c)), 'Coluna renomeada.')
  }

  return (
    <section className="bloco">
      <h2 className="bloco__titulo">Colunas do Quadro</h2>
      <ol className="lista-editavel">
        {lista.map((coluna, i) => (
          <li key={coluna.id} className="lista-editavel__item">
            <span>{coluna.nome}</span>
            <div className="acoes acoes--juntas">
              <button type="button" className="botao-icone botao-icone--claro" aria-label={`Subir ${coluna.nome}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                <ArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                className="botao-icone botao-icone--claro"
                aria-label={`Descer ${coluna.nome}`}
                disabled={i === lista.length - 1}
                onClick={() => mover(i, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </button>
              <button type="button" className="botao-icone botao-icone--claro" aria-label={`Renomear ${coluna.nome}`} onClick={() => setRenomeando(coluna)}>
                <Pencil aria-hidden="true" />
              </button>
              <button
                type="button"
                className="botao-icone botao-icone--perigo"
                aria-label={`Remover ${coluna.nome}`}
                disabled={coluna.id === COLUNA_ENTREGUES}
                onClick={() => remover(coluna)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <form className="linha-de-campo" onSubmit={adicionar}>
        <label className="campo">
          <span className="campo__rotulo">Nova coluna</span>
          <input value={nova} onChange={(e) => setNova(e.target.value)} aria-invalid={Boolean(erro)} />
          {erro && (
            <span className="campo__erro" role="alert">
              {erro}
            </span>
          )}
        </label>
        <button type="submit" className="botao botao--principal">
          <Plus aria-hidden="true" />
          Adicionar
        </button>
      </form>
      <JanelaNome
        aberta={renomeando != null}
        titulo="Renomear coluna"
        rotulo="Novo nome"
        inicial={renomeando?.nome ?? ''}
        aoSalvar={renomear}
        aoFechar={() => setRenomeando(null)}
      />
      {janelaConfirmar}
    </section>
  )
}
