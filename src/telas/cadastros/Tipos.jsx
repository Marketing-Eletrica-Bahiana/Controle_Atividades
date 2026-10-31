import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import Janela from '../../componentes/Janela.jsx'
import SeletorArea, { useAreaEscolhida } from '../../componentes/SeletorArea.jsx'
import { useAreas } from '../../dados/areas.js'
import { useListas } from '../../dados/listas.js'
import { contarPalavrasDoTipo, excluirTipo, idDoTipo, salvarTipo, useTipos } from '../../dados/tipos.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { formatarTempo, horasParaSegundos, lerTempo, segundosParaHoras } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'
import { ErroCampo } from './FormPessoa.jsx'

export default function Tipos() {
  const { dados: areas } = useAreas()
  const [area, setArea] = useAreaEscolhida(areas)
  const tipos = useTipos(area)
  const { dados: listas } = useListas()
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const [busca, setBusca] = useState('')
  const [edicao, setEdicao] = useState(null)

  const visiveis = (tipos.dados ?? []).filter((t) => normalizar(t.nome).includes(normalizar(busca)))
  const nomeDaArea = areas?.find((a) => a.id === area)?.nome ?? ''

  async function excluir(tipo) {
    const palavras = await contarPalavrasDoTipo(area, tipo.nome).catch(() => 0)
    const sim = await confirmar({
      titulo: `Excluir "${tipo.nome}"?`,
      texto: [
        `O tipo sai da tabela de ${nomeDaArea}.`,
        palavras === 1 && 'A palavra-chave ligada a ele também será excluída.',
        palavras > 1 && `As ${palavras} palavras-chave ligadas a ele também serão excluídas.`,
        'Demandas já registradas continuam com esse tipo.',
      ]
        .filter(Boolean)
        .join(' '),
      botao: 'Excluir',
      perigo: true,
    })
    if (sim) executar(() => excluirTipo(tipo), 'Tipo excluído.')
  }

  return (
    <section className="bloco">
      <div className="bloco__cabecalho">
        <h2 className="bloco__titulo">Tipos de atividade</h2>
        <div className="filtros">
          <SeletorArea areas={areas} valor={area} aoMudar={setArea} />
          <label className="campo campo--compacto campo--busca">
            <span className="campo__rotulo">Buscar</span>
            <Search aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do tipo" />
          </label>
          <button type="button" className="botao botao--principal" onClick={() => setEdicao({ tipo: null })} disabled={!area}>
            <Plus aria-hidden="true" />
            Novo tipo
          </button>
        </div>
      </div>

      {!areas?.length && <p className="aviso">Cadastre as áreas antes dos tipos.</p>}
      {tipos.carregando && <CarregandoBloco />}
      {tipos.erro && <p className="aviso aviso--erro">{mensagemDeErro(tipos.erro)}</p>}
      {tipos.dados && !tipos.dados.length && (
        <EstadoVazio
          titulo={`Nenhum tipo em ${nomeDaArea}`}
          texto="Cadastre um tipo novo ou traga a tabela inteira pela aba Importar planilha."
        />
      )}
      {visiveis.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Tempo mínimo</th>
              <th>Tempo máximo</th>
              <th>Prazo estimado</th>
              <th>Público</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((tipo) => (
              <tr key={tipo.id}>
                <td data-rotulo="Tipo">
                  <strong>{tipo.nome}</strong>
                </td>
                <td data-rotulo="Tempo mínimo" className="numero">
                  {formatarTempo(horasParaSegundos(tipo.minH))}
                </td>
                <td data-rotulo="Tempo máximo" className="numero">
                  {formatarTempo(horasParaSegundos(tipo.maxH))}
                </td>
                <td data-rotulo="Prazo estimado">
                  {tipo.prazoEstimadoDias != null ? `${tipo.prazoEstimadoDias} ${tipo.prazoEstimadoDias === 1 ? 'dia' : 'dias'}` : ''}
                </td>
                <td data-rotulo="Público">{tipo.publico}</td>
                <td className="tabela__acoes">
                  <button type="button" className="botao-icone botao-icone--claro" aria-label={`Editar ${tipo.nome}`} onClick={() => setEdicao({ tipo })}>
                    <Pencil aria-hidden="true" />
                  </button>
                  <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Excluir ${tipo.nome}`} onClick={() => excluir(tipo)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tipos.dados?.length > 0 && !visiveis.length && <p className="texto-suave">Nenhum tipo com esse nome.</p>}

      <Janela aberta={Boolean(edicao)} titulo={edicao?.tipo ? 'Editar tipo' : `Novo tipo em ${nomeDaArea}`} aoFechar={() => setEdicao(null)}>
        {edicao && (
          <FormTipo
            key={edicao.tipo?.id ?? 'novo'}
            area={area}
            tipo={edicao.tipo}
            tiposDaArea={tipos.dados ?? []}
            publicos={listas?.publicos ?? []}
            aoSalvar={(dados) => executar(() => salvarTipo(area, dados, edicao.tipo), 'Tipo salvo.')}
            aoFechar={() => setEdicao(null)}
          />
        )}
      </Janela>
      {janelaConfirmar}
    </section>
  )
}

function FormTipo({ area, tipo, tiposDaArea, publicos, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState({
    nome: tipo?.nome ?? '',
    min: tipo ? formatarTempo(horasParaSegundos(tipo.minH)) : '',
    max: tipo ? formatarTempo(horasParaSegundos(tipo.maxH)) : '',
    prazo: tipo?.prazoEstimadoDias != null ? String(tipo.prazoEstimadoDias) : '',
    publico: tipo?.publico ?? '',
  })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const mudar = (campo, valor) => setDados((atual) => ({ ...atual, [campo]: valor }))
  const opcoesPublico = dados.publico && !publicos.includes(dados.publico) ? [dados.publico, ...publicos] : publicos

  async function enviar(evento) {
    evento.preventDefault()
    const minSeg = lerTempo(dados.min)
    const maxSeg = lerTempo(dados.max)
    const prazo = dados.prazo.trim() === '' ? null : Number(dados.prazo)
    const novosErros = {}
    if (!dados.nome.trim()) novosErros.nome = 'Informe o nome do tipo.'
    else if (tiposDaArea.some((t) => t.id === idDoTipo(area, dados.nome) && t.id !== tipo?.id)) novosErros.nome = 'Já existe um tipo com esse nome nesta área.'
    if (minSeg == null) novosErros.min = 'Use o formato HH:MM:SS, por exemplo 00:30:00.'
    if (maxSeg == null) novosErros.max = 'Use o formato HH:MM:SS, por exemplo 02:00:00.'
    else if (minSeg != null && maxSeg < minSeg) novosErros.max = 'O tempo máximo não pode ser menor que o mínimo.'
    if (prazo != null && (!Number.isInteger(prazo) || prazo < 0)) novosErros.prazo = 'Use um número inteiro de dias, como 2.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    setSalvando(true)
    const deuCerto = await aoSalvar({
      nome: dados.nome.trim(),
      minH: segundosParaHoras(minSeg),
      maxH: segundosParaHoras(maxSeg),
      publico: dados.publico,
      prazoEstimadoDias: prazo,
    })
    setSalvando(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">Nome do tipo</span>
        <input value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} aria-invalid={Boolean(erros.nome)} />
        {erros.nome && <ErroCampo texto={erros.nome} />}
        {tipo && dados.nome.trim() !== tipo.nome && (
          <span className="campo__ajuda">As palavras-chave deste tipo acompanham o novo nome.</span>
        )}
      </label>
      <div className="grade-duas grade-duas--formulario">
        <label className="campo">
          <span className="campo__rotulo">Tempo mínimo sem IA</span>
          <input value={dados.min} onChange={(e) => mudar('min', e.target.value)} placeholder="00:00:00" inputMode="numeric" aria-invalid={Boolean(erros.min)} />
          {erros.min && <ErroCampo texto={erros.min} />}
        </label>
        <label className="campo">
          <span className="campo__rotulo">Tempo máximo sem IA</span>
          <input value={dados.max} onChange={(e) => mudar('max', e.target.value)} placeholder="00:00:00" inputMode="numeric" aria-invalid={Boolean(erros.max)} />
          {erros.max && <ErroCampo texto={erros.max} />}
        </label>
      </div>
      <div className="grade-duas grade-duas--formulario">
        <label className="campo">
          <span className="campo__rotulo">Prazo estimado (dias)</span>
          <input value={dados.prazo} onChange={(e) => mudar('prazo', e.target.value)} inputMode="numeric" aria-invalid={Boolean(erros.prazo)} />
          {erros.prazo && <ErroCampo texto={erros.prazo} />}
        </label>
        <label className="campo">
          <span className="campo__rotulo">Público padrão</span>
          <select value={dados.publico} onChange={(e) => mudar('publico', e.target.value)}>
            <option value="">Sem público padrão</option>
            {opcoesPublico.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
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
