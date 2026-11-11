import { useMemo, useState } from 'react'
import { CalendarCheck, CircleCheck, ExternalLink, LoaderCircle, SquareKanban, Upload } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import Indicadores from '../../componentes/Indicadores.jsx'
import { salvarColunas, useColunas } from '../../dados/cartoes.js'
import { cartoesImportados, gravarImportacaoDoTrello } from '../../dados/importacaoTrello.js'
import { useMembros } from '../../dados/membros.js'
import { formatarMes } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { sugerirPessoa } from '../../lib/importacao.js'
import { enderecoDoArquivo, lerArquivoDoTrello, planejarImportacao, resumoDasPostagens } from '../../lib/trello.js'

const QUADRO_DO_TRELLO = 'a0UK7Nfs'
const SEM_MEMBROS = []

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

// Traz os cartões do Trello para o Quadro e o histórico de postagens para o calendário. Pode ser repetida.
export default function ImportarTrello() {
  const { membro } = useAcesso()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const colunas = useColunas()
  const { dados: membros } = useMembros()

  const [etapa, setEtapa] = useState('escolher')
  const [arrastando, setArrastando] = useState(false)
  const [nomeDoArquivo, setNomeDoArquivo] = useState('')
  const [lido, setLido] = useState(null)
  const [existentes, setExistentes] = useState([])
  const [escolhasDePessoa, setEscolhasDePessoa] = useState({})
  const [trocarConflitos, setTrocarConflitos] = useState(false)
  const [progresso, setProgresso] = useState(null)
  const [gravados, setGravados] = useState(0)
  const [erro, setErro] = useState('')

  const pessoasAtivas = useMemo(() => (membros ?? SEM_MEMBROS).filter((m) => m.ativo !== false), [membros])
  const plano = useMemo(() => (lido ? planejarImportacao(lido.itens, existentes) : null), [lido, existentes])
  const resumo = useMemo(() => (lido ? resumoDasPostagens(lido.itens) : null), [lido])

  // Sugere pelo nome; o admin pode trocar na prévia. Sem pessoa, o cartão entra sem esse responsável.
  const emailDaPessoa = (pessoa) =>
    escolhasDePessoa[pessoa.id] !== undefined ? escolhasDePessoa[pessoa.id] : (sugerirPessoa(pessoa.nome, pessoasAtivas)?.id ?? '')
  const pessoaDoTrello = (id) => {
    const pessoa = lido?.pessoas.find((p) => p.id === id)
    return pessoa ? emailDaPessoa(pessoa) || null : null
  }

  async function abrirArquivo(arquivo) {
    if (!arquivo) return
    setErro('')
    setEtapa('lendo')
    try {
      const lidoAgora = lerArquivoDoTrello(await arquivo.text(), colunas.dados)
      setExistentes(await cartoesImportados())
      setLido(lidoAgora)
      setNomeDoArquivo(arquivo.name)
      setEscolhasDePessoa({})
      setTrocarConflitos(false)
      setEtapa('previa')
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEtapa('escolher')
    }
  }

  function recomecar() {
    setLido(null)
    setExistentes([])
    setErro('')
    setEtapa('escolher')
  }

  async function importar() {
    const atualizar = trocarConflitos ? [...plano.atualizar, ...plano.conflitos] : plano.atualizar
    const sim = await confirmar({
      titulo: 'Importar do Trello?',
      texto: `${plural(plano.novos.length, 'cartão novo entra', 'cartões novos entram')} e ${plural(atualizar.length, 'é atualizado', 'são atualizados')}. Depois, a importação pode ser repetida sem duplicar.`,
      botao: 'Importar',
    })
    if (!sim) return
    setErro('')
    setEtapa('gravando')
    setProgresso({ feitos: 0, total: plano.novos.length + atualizar.length })
    try {
      // As colunas vêm antes: um cartão nunca fica em coluna que ainda não existe.
      if (lido.colunasNovas.length) await salvarColunas([...colunas.dados, ...lido.colunasNovas])
      const total = await gravarImportacaoDoTrello(
        { novos: plano.novos, atualizar, existentes, quem: membro.email, pessoaDoTrello },
        (feitos, totalDeOperacoes) => setProgresso({ feitos, total: totalDeOperacoes }),
      )
      setGravados(total)
      setEtapa('pronto')
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEtapa('previa')
    }
  }

  if (colunas.carregando || !membros) return <CarregandoBloco />

  if (etapa === 'pronto') {
    return (
      <section className="bloco">
        <h2 className="bloco__titulo">
          <CircleCheck aria-hidden="true" />
          Importação concluída
        </h2>
        <p>{plural(gravados, 'cartão gravado', 'cartões gravados')}. Mandou bem!</p>
        <div className="acoes">
          <NavLink to="/quadro" className="botao botao--principal">
            <SquareKanban aria-hidden="true" />
            Ver o Quadro
          </NavLink>
          <NavLink to="/calendario" className="botao botao--secundario">
            <CalendarCheck aria-hidden="true" />
            Ver o Calendário
          </NavLink>
          <button type="button" className="botao botao--secundario" onClick={recomecar}>
            Importar outro arquivo
          </button>
        </div>
      </section>
    )
  }

  if (etapa === 'gravando') {
    return (
      <section className="bloco">
        <h2 className="bloco__titulo">
          <LoaderCircle className="girando" aria-hidden="true" />
          Gravando...
        </h2>
        <p className="numero">
          {progresso?.feitos ?? 0} de {progresso?.total ?? 0} cartões
        </p>
        <p className="texto-suave texto-pequeno">Não feche esta tela até terminar.</p>
      </section>
    )
  }

  if (etapa === 'previa' && lido) {
    const nadaParaFazer = !plano.novos.length && !plano.atualizar.length && !(trocarConflitos && plano.conflitos.length)
    const meses = [...resumo.porMes.entries()].sort(([a], [b]) => a.localeCompare(b))
    return (
      <>
        <section className="bloco">
          <h2 className="bloco__titulo">Confira antes de gravar</h2>
          <p className="texto-suave texto-pequeno">
            Quadro {lido.nome} · arquivo {nomeDoArquivo}. Nada foi gravado ainda.
          </p>
          <Indicadores
            itens={[
              { rotulo: 'Cartões no arquivo', valor: lido.itens.length },
              { rotulo: 'Novos', valor: plano.novos.length },
              { rotulo: 'Para atualizar', valor: plano.atualizar.length },
              { rotulo: 'Sem mudança', valor: plano.semMudanca.length },
            ]}
          />
          {lido.arquivados > 0 && (
            <p className="texto-suave texto-pequeno">{plural(lido.arquivados, 'cartão arquivado no Trello fica', 'cartões arquivados no Trello ficam')} de fora.</p>
          )}
          {plano.foraDoArquivo.length > 0 && (
            <p className="texto-suave texto-pequeno">
              {plural(plano.foraDoArquivo.length, 'cartão importado antes não está', 'cartões importados antes não estão')} neste arquivo, por ter saído do Trello. Nada é
              apagado no site.
            </p>
          )}
          {lido.colunasNovas.length > 0 && (
            <p className="aviso">Colunas novas no Quadro: {lido.colunasNovas.map((c) => c.nome).join(', ')}.</p>
          )}
          {lido.comentariosNoLimite && (
            <p className="aviso aviso--erro">O Trello entrega no máximo 1000 comentários por arquivo. Os mais antigos podem ter ficado de fora.</p>
          )}
        </section>

        {plano.conflitos.length > 0 && (
          <section className="bloco">
            <h2 className="bloco__titulo">Mudaram nos dois lugares</h2>
            <p>
              {plural(plano.conflitos.length, 'cartão mudou', 'cartões mudaram')} no Trello e também no site. Sem marcar a opção abaixo, fica a versão do site.
            </p>
            <ul className="lista-compacta">
              {plano.conflitos.map((item) => (
                <li key={item.id}>{item.titulo}</li>
              ))}
            </ul>
            <label className="opcao">
              <input type="checkbox" checked={trocarConflitos} onChange={(e) => setTrocarConflitos(e.target.checked)} />
              Trocar esses cartões pela versão do Trello
            </label>
          </section>
        )}

        <section className="bloco">
          <h2 className="bloco__titulo">Postagens que vão para o calendário</h2>
          <Indicadores
            itens={[
              { rotulo: 'Com data certa', valor: resumo.exatas },
              { rotulo: 'Data estimada', valor: resumo.estimadas },
              { rotulo: 'Rede a confirmar', valor: resumo.redeAConfirmar },
              { rotulo: 'Sem data', valor: resumo.semData },
            ]}
          />
          <p className="texto-suave texto-pequeno">
            Data certa vem do modelo "Postagem nas Redes Sociais". Estimada vem de um comentário, da descrição, do prazo ou da entrega do cartão: confira no calendário
            quando puder. Ao mudar a data ou as redes de uma postagem, a marca some.
          </p>
          {meses.length > 0 && (
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Postagens</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map(([mes, quantidade]) => (
                    <tr key={mes}>
                      <td>{formatarMes(mes)}</td>
                      <td className="numero">{quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bloco">
          <h2 className="bloco__titulo">Pessoas</h2>
          <p className="texto-suave texto-pequeno">Ligação entre os membros do Trello e as pessoas cadastradas aqui.</p>
          <div className="grade-duas grade-duas--formulario">
            {lido.pessoas.map((pessoa) => (
              <label key={pessoa.id} className="campo">
                <span className="campo__rotulo">{pessoa.nome}</span>
                <select value={emailDaPessoa(pessoa)} onChange={(e) => setEscolhasDePessoa((atual) => ({ ...atual, [pessoa.id]: e.target.value }))}>
                  <option value="">Sem responsável</option>
                  {pessoasAtivas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        {erro && (
          <p className="aviso aviso--erro" role="alert">
            {erro}
          </p>
        )}
        <div className="acoes acoes--fim">
          <button type="button" className="botao botao--secundario" onClick={recomecar}>
            Cancelar
          </button>
          <button type="button" className="botao botao--principal" onClick={importar} disabled={nadaParaFazer}>
            Importar
          </button>
        </div>
        {nadaParaFazer && <p className="texto-suave texto-pequeno">Nada mudou no Trello desde a última importação.</p>}
        {janelaConfirmar}
      </>
    )
  }

  return (
    <section className="bloco">
      <h2 className="bloco__titulo">Importar do Trello</h2>
      <ol className="passos-importacao">
        <li>
          Com o Trello aberto neste navegador,{' '}
          <a href={enderecoDoArquivo(QUADRO_DO_TRELLO)} target="_blank" rel="noreferrer">
            abra o arquivo do quadro
            <ExternalLink aria-hidden="true" />
          </a>
          .
        </li>
        <li>
          Na página que abrir, aperte <kbd>Ctrl</kbd> + <kbd>S</kbd> e salve o arquivo.
        </li>
        <li>Envie o arquivo aqui embaixo. Antes de gravar, você confere tudo.</li>
      </ol>
      <label
        className={`area-envio ${arrastando ? 'area-envio--ativa' : ''} ${etapa === 'lendo' ? 'botao--ocupado' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          abrirArquivo(e.dataTransfer.files?.[0])
        }}
      >
        {etapa === 'lendo' ? <LoaderCircle className="girando" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        <strong>{etapa === 'lendo' ? 'Lendo o arquivo...' : 'Arraste o arquivo aqui ou clique para escolher'}</strong>
        <span className="texto-suave texto-pequeno">
          O Trello continua em uso: dá para importar de novo quando quiser. Cartão repetido não duplica, e o que mudou no site não é trocado sem você pedir.
        </span>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            abrirArquivo(e.target.files?.[0])
            e.target.value = ''
          }}
          disabled={etapa === 'lendo'}
        />
      </label>
      {erro && (
        <p className="aviso aviso--erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  )
}
