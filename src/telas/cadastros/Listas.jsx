import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import { criarListasPadrao, salvarLista, useListas } from '../../dados/listas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { JanelaNome } from './Areas.jsx'

const LISTAS = [
  { campo: 'publicos', titulo: 'Público' },
  { campo: 'solicitantes', titulo: 'Solicitante' },
]

export default function Listas() {
  const listas = useListas()
  const { executar } = useAvisos()

  if (listas.carregando) return <CarregandoBloco />
  if (listas.erro) return <p className="aviso aviso--erro">{mensagemDeErro(listas.erro)}</p>
  if (!listas.dados) {
    return (
      <EstadoVazio titulo="As listas ainda não foram criadas" texto="Comece pelas listas padrão de Público e Solicitante.">
        <button type="button" className="botao botao--principal" onClick={() => executar(criarListasPadrao, 'Listas criadas!')}>
          <Plus aria-hidden="true" />
          Criar listas padrão
        </button>
      </EstadoVazio>
    )
  }

  return (
    <div className="grade-duas">
      {LISTAS.map(({ campo, titulo }) => (
        <EditorLista key={campo} campo={campo} titulo={titulo} valores={listas.dados[campo] ?? []} />
      ))}
    </div>
  )
}

function EditorLista({ campo, titulo, valores }) {
  const { avisar, executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const [novo, setNovo] = useState('')
  const [erro, setErro] = useState('')
  const [renomeando, setRenomeando] = useState(null)

  const jaExiste = (valor, ignorar = -1) => valores.some((v, i) => i !== ignorar && v.toLowerCase() === valor.toLowerCase())
  const gravar = (lista, mensagem) => executar(() => salvarLista(campo, lista), mensagem)

  async function adicionar(evento) {
    evento.preventDefault()
    const valor = novo.trim()
    if (!valor) return
    if (jaExiste(valor)) {
      setErro('Esse item já está na lista.')
      return
    }
    setErro('')
    if (await gravar([...valores, valor], `"${valor}" adicionado.`)) setNovo('')
  }

  function mover(i, direcao) {
    const lista = [...valores]
    ;[lista[i], lista[i + direcao]] = [lista[i + direcao], lista[i]]
    gravar(lista)
  }

  async function remover(i) {
    const sim = await confirmar({
      titulo: 'Remover da lista?',
      texto: `"${valores[i]}" sai das opções. Demandas que já usam esse valor continuam com ele.`,
      botao: 'Remover',
      perigo: true,
    })
    if (sim) gravar(valores.filter((_, j) => j !== i), 'Item removido.')
  }

  function renomear(valor) {
    if (jaExiste(valor, renomeando)) {
      avisar('Esse item já está na lista.', 'erro')
      return false
    }
    return gravar(valores.map((v, j) => (j === renomeando ? valor : v)), 'Item renomeado.')
  }

  return (
    <section className="bloco">
      <h2 className="bloco__titulo">{titulo}</h2>
      <ol className="lista-editavel">
        {valores.map((valor, i) => (
          <li key={valor} className="lista-editavel__item">
            <span>{valor}</span>
            <div className="acoes acoes--juntas">
              <button type="button" className="botao-icone botao-icone--claro" aria-label={`Subir ${valor}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                <ArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                className="botao-icone botao-icone--claro"
                aria-label={`Descer ${valor}`}
                disabled={i === valores.length - 1}
                onClick={() => mover(i, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </button>
              <button type="button" className="botao-icone botao-icone--claro" aria-label={`Renomear ${valor}`} onClick={() => setRenomeando(i)}>
                <Pencil aria-hidden="true" />
              </button>
              <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Remover ${valor}`} onClick={() => remover(i)}>
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <form className="linha-de-campo" onSubmit={adicionar}>
        <label className="campo">
          <span className="campo__rotulo">Novo item</span>
          <input value={novo} onChange={(e) => setNovo(e.target.value)} aria-invalid={Boolean(erro)} />
          {erro && <span className="campo__erro" role="alert">{erro}</span>}
        </label>
        <button type="submit" className="botao botao--principal">
          <Plus aria-hidden="true" />
          Adicionar
        </button>
      </form>
      <JanelaNome
        aberta={renomeando != null}
        titulo={`Renomear item de ${titulo}`}
        rotulo="Novo nome"
        inicial={renomeando != null ? valores[renomeando] : ''}
        aoSalvar={renomear}
        aoFechar={() => setRenomeando(null)}
      />
      {janelaConfirmar}
    </section>
  )
}
