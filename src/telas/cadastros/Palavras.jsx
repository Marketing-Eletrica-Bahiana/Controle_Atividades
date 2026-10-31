import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import Janela from '../../componentes/Janela.jsx'
import SeletorArea, { useAreaEscolhida } from '../../componentes/SeletorArea.jsx'
import { useAreas } from '../../dados/areas.js'
import { excluirPalavra, idDaPalavra, salvarPalavra, usePalavras, useTipos } from '../../dados/tipos.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { normalizar } from '../../lib/texto.js'
import { ErroCampo } from './FormPessoa.jsx'

export default function Palavras() {
  const { dados: areas } = useAreas()
  const [area, setArea] = useAreaEscolhida(areas)
  const palavras = usePalavras(area)
  const { dados: tipos } = useTipos(area)
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const [busca, setBusca] = useState('')
  const [edicao, setEdicao] = useState(null)

  const termo = normalizar(busca)
  const visiveis = (palavras.dados ?? []).filter((p) => normalizar(p.palavra).includes(termo) || normalizar(p.tipo).includes(termo))
  const nomeDaArea = areas?.find((a) => a.id === area)?.nome ?? ''
  const tipoExiste = (nome) => (tipos ?? []).some((t) => t.nome === nome)

  async function excluir(palavra) {
    const sim = await confirmar({
      titulo: `Excluir "${palavra.palavra}"?`,
      texto: 'A palavra-chave deixa de sugerir o tipo nas próximas demandas.',
      botao: 'Excluir',
      perigo: true,
    })
    if (sim) executar(() => excluirPalavra(palavra), 'Palavra-chave excluída.')
  }

  return (
    <section className="bloco">
      <div className="bloco__cabecalho">
        <h2 className="bloco__titulo">Palavras-chave</h2>
        <div className="filtros">
          <SeletorArea areas={areas} valor={area} aoMudar={setArea} />
          <label className="campo campo--compacto campo--busca">
            <span className="campo__rotulo">Buscar</span>
            <Search aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Palavra ou tipo" />
          </label>
          <button
            type="button"
            className="botao botao--principal"
            onClick={() => setEdicao({ palavra: null })}
            disabled={!area || !tipos?.length}
          >
            <Plus aria-hidden="true" />
            Nova palavra-chave
          </button>
        </div>
      </div>
      <p className="texto-suave texto-pequeno">
        Quando o nome de uma demanda contém a palavra-chave, o sistema sugere o tipo ligado a ela. Se mais de uma aparecer,
        vale a mais longa.
      </p>

      {palavras.carregando && <CarregandoBloco />}
      {palavras.erro && <p className="aviso aviso--erro">{mensagemDeErro(palavras.erro)}</p>}
      {tipos && !tipos.length && <p className="aviso">Cadastre os tipos de {nomeDaArea} antes das palavras-chave.</p>}
      {palavras.dados && !palavras.dados.length && tipos?.length > 0 && (
        <EstadoVazio
          titulo={`Nenhuma palavra-chave em ${nomeDaArea}`}
          texto="Cadastre uma nova ou traga a lista inteira pela aba Importar planilha."
        />
      )}
      {visiveis.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Palavra-chave</th>
              <th>Tipo sugerido</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((palavra) => (
              <tr key={palavra.id}>
                <td data-rotulo="Palavra-chave">
                  <strong>{palavra.palavra}</strong>
                </td>
                <td data-rotulo="Tipo sugerido">
                  {palavra.tipo}
                  {tipos && !tipoExiste(palavra.tipo) && <span className="etiqueta etiqueta--alerta">Tipo não cadastrado</span>}
                </td>
                <td className="tabela__acoes">
                  <button type="button" className="botao-icone botao-icone--claro" aria-label={`Editar ${palavra.palavra}`} onClick={() => setEdicao({ palavra })}>
                    <Pencil aria-hidden="true" />
                  </button>
                  <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Excluir ${palavra.palavra}`} onClick={() => excluir(palavra)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {palavras.dados?.length > 0 && !visiveis.length && <p className="texto-suave">Nada encontrado com essa busca.</p>}

      <Janela
        aberta={Boolean(edicao)}
        titulo={edicao?.palavra ? 'Editar palavra-chave' : `Nova palavra-chave em ${nomeDaArea}`}
        aoFechar={() => setEdicao(null)}
        largura={480}
      >
        {edicao && (
          <FormPalavra
            key={edicao.palavra?.id ?? 'nova'}
            area={area}
            palavra={edicao.palavra}
            palavrasDaArea={palavras.dados ?? []}
            tipos={tipos ?? []}
            aoSalvar={(dados) => executar(() => salvarPalavra(area, dados, edicao.palavra), 'Palavra-chave salva.')}
            aoFechar={() => setEdicao(null)}
          />
        )}
      </Janela>
      {janelaConfirmar}
    </section>
  )
}

function FormPalavra({ area, palavra, palavrasDaArea, tipos, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState({ palavra: palavra?.palavra ?? '', tipo: palavra?.tipo ?? '' })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const mudar = (campo, valor) => setDados((atual) => ({ ...atual, [campo]: valor }))

  async function enviar(evento) {
    evento.preventDefault()
    const novosErros = {}
    const texto = dados.palavra.trim().toLowerCase()
    if (!texto) novosErros.palavra = 'Informe a palavra-chave.'
    else if (palavrasDaArea.some((p) => p.id === idDaPalavra(area, texto) && p.id !== palavra?.id)) {
      novosErros.palavra = 'Essa palavra-chave já existe nesta área.'
    }
    if (!dados.tipo) novosErros.tipo = 'Escolha o tipo.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    setSalvando(true)
    const deuCerto = await aoSalvar({ palavra: texto, tipo: dados.tipo })
    setSalvando(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">Palavra-chave</span>
        <input value={dados.palavra} onChange={(e) => mudar('palavra', e.target.value)} aria-invalid={Boolean(erros.palavra)} />
        {erros.palavra && <ErroCampo texto={erros.palavra} />}
      </label>
      <label className="campo">
        <span className="campo__rotulo">Tipo sugerido</span>
        <select value={dados.tipo} onChange={(e) => mudar('tipo', e.target.value)} aria-invalid={Boolean(erros.tipo)}>
          <option value="">Escolha o tipo</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.nome}>
              {t.nome}
            </option>
          ))}
        </select>
        {erros.tipo && <ErroCampo texto={erros.tipo} />}
      </label>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={salvando}>
          Salvar
        </button>
      </div>
    </form>
  )
}
