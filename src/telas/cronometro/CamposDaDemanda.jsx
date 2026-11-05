import { useId, useMemo, useState } from 'react'
import { CampoLista, ErroCampo, SimNao } from '../../componentes/Campos.jsx'
import CamposDaPostagem from '../../componentes/CamposDaPostagem.jsx'
import { useHistoricoDaArea } from '../../dados/demandas.js'
import { useListas } from '../../dados/listas.js'
import { usePalavras, useTipos } from '../../dados/tipos.js'
import { classificar, prepararHistorico, textoDaOrigem } from '../../lib/classificacao.js'
import { hojeISO, mesDe } from '../../lib/datas.js'
import { formatoDoNome, POSTAGEM_VAZIA, publicoDePostagem, publicoInterno, rotuloDaPostagem } from '../../lib/postagens.js'
import { vaiParaOQuadro } from '../../lib/quadro.js'
import { regraAutomatica } from '../../lib/regras.js'
import { formatarTempo, horasParaSegundos } from '../../lib/tempo.js'

const VAZIO = { nome: '', tipo: '', publico: '', solicitante: '', usoIA: '', usoTemplate: '' }

// Campos de uma demanda nova, usados no formulário do cronômetro e no lançamento manual.
// Classifica o tipo enquanto o nome é digitado. Campos mexidos à mão param de mudar sozinhos.
export function useCamposDaDemanda(area, pessoa, inicial = {}) {
  const { dados: tipos } = useTipos(area)
  const { dados: palavras } = usePalavras(area)
  const { dados: listas } = useListas()
  const historicoBruto = useHistoricoDaArea(area)
  const historico = useMemo(() => prepararHistorico(historicoBruto ?? []), [historicoBruto])

  const [dados, setDados] = useState({ ...VAZIO, ...inicial })
  const [manual, setManual] = useState({})
  // Sem escolha da pessoa, o público dá o padrão de "Criar cartão no Quadro".
  const [noQuadroEscolhido, setNoQuadro] = useState(null)
  const [ehPostEscolhido, setEhPost] = useState(null)
  const [dadosDaPostagem, setPostagem] = useState(POSTAGEM_VAZIA)

  const classificacao = useMemo(
    () => classificar(dados.nome, { historico, palavras: palavras ?? [], tipos: tipos ?? [], email: pessoa.email, mesAtual: mesDe(hojeISO()) }),
    [dados.nome, historico, palavras, tipos, pessoa.email],
  )
  const tipo = manual.tipo ? dados.tipo : classificacao.tipo
  const tipoDaTabela = tipos?.find((t) => t.nome === tipo)
  const regra = regraAutomatica(dados.nome, tipo)
  const valor = (campo) => (manual[campo] ? dados[campo] : (regra?.[campo] ?? dados[campo]))
  const publico = manual.publico ? dados.publico : (tipoDaTabela?.publico ?? dados.publico)
  const solicitante = valor('solicitante')
  const usoIA = valor('usoIA')
  const usoTemplate = valor('usoTemplate')
  const noQuadro = noQuadroEscolhido ?? vaiParaOQuadro(publico)
  // A postagem mora no cartão: sem cartão não há postagem. Com o público Externo, marcar o cartão já marca a postagem.
  const ehPost = noQuadro && (ehPostEscolhido ?? publicoDePostagem(publico))
  const postagem = { ...dadosDaPostagem, formato: dadosDaPostagem.formato || formatoDoNome(dados.nome) }

  return {
    noQuadro,
    setNoQuadro,
    ehPost,
    setEhPost,
    postagem,
    setPostagem,
    tipos,
    listas,
    classificacao,
    regra,
    tipoManual: Boolean(manual.tipo),
    nome: dados.nome,
    tipo,
    publico,
    solicitante,
    usoIA,
    usoTemplate,
    tipoDaTabela,
    mudarNome: (nome) => setDados((atual) => ({ ...atual, nome })),
    mudar: (campo, novo) => {
      setDados((atual) => ({ ...atual, [campo]: novo }))
      setManual((atual) => ({ ...atual, [campo]: true }))
    },
    // Trocar o tipo à mão para a sugestão automática e faz o Público acompanhar o tipo novo.
    escolherTipo: (novo) => {
      setDados((atual) => ({ ...atual, tipo: novo }))
      setManual((atual) => ({ ...atual, tipo: true, publico: false }))
    },
    limpar: () => {
      setDados(VAZIO)
      setManual({})
      setNoQuadro(null)
      setEhPost(null)
      setPostagem(POSTAGEM_VAZIA)
    },
    paraGravar: (dataSolicitacao) => ({
      area,
      nome: dados.nome.trim(),
      tipo,
      tipoDaTabela,
      publico,
      solicitante,
      usoIA,
      usoTemplate,
      dataSolicitacao,
      noQuadro,
      postagem: ehPost ? postagem : null,
    }),
  }
}

export function CampoTipo({ campos, erro }) {
  const { nome, tipo, tipos, tipoDaTabela, classificacao, tipoManual, escolherTipo } = campos
  const id = useId()
  const semTipo = nome.trim() && !tipo
  return (
    <div className={`campo campo-tipo ${semTipo ? 'campo-tipo--faltando' : ''}`}>
      <label className="campo__rotulo" htmlFor={id}>
        Tipo
      </label>
      <select id={id} value={tipo} onChange={(e) => escolherTipo(e.target.value)} aria-invalid={Boolean(semTipo || erro)}>
        <option value="">Escolha o tipo</option>
        {(tipos ?? []).map((t) => (
          <option key={t.id} value={t.nome}>
            {t.nome}
          </option>
        ))}
      </select>
      <ErroCampo texto={erro} />
      {!tipoManual && classificacao.origem && <span className="campo__ajuda">{textoDaOrigem(classificacao)}</span>}
      {tipoManual && tipo && <span className="campo__ajuda">Escolhido por você</span>}
      {!tipoManual && classificacao.alternativas.length > 0 && (
        <div className="alternativas" aria-label="Outros tipos possíveis">
          {classificacao.alternativas.map((alternativa) => (
            <button key={alternativa} type="button" className="etiqueta-clicavel" onClick={() => escolherTipo(alternativa)}>
              {alternativa}
            </button>
          ))}
        </div>
      )}
      {tipoDaTabela && (
        <span className="campo__ajuda">
          Estimativa sem IA: {formatarTempo(horasParaSegundos(tipoDaTabela.minH))} a {formatarTempo(horasParaSegundos(tipoDaTabela.maxH))}
        </span>
      )}
    </div>
  )
}

export function CampoNoQuadro({ campos }) {
  return (
    <>
      <label className="opcao">
        <input type="checkbox" checked={campos.noQuadro} onChange={(e) => campos.setNoQuadro(e.target.checked)} />
        Criar cartão no Quadro
      </label>
      {!campos.noQuadro && <p className="campo__ajuda">Sem cartão, a demanda fica só no cronômetro e não entra no calendário de postagens.</p>}
    </>
  )
}

export function CampoDaPostagem({ campos }) {
  const interno = publicoInterno(campos.publico)
  if (!campos.noQuadro) return null
  return (
    <>
      <label className="opcao">
        <input type="checkbox" checked={campos.ehPost} onChange={(e) => campos.setEhPost(e.target.checked)} />
        {rotuloDaPostagem(interno)}
      </label>
      {campos.ehPost && (
        <>
          <CamposDaPostagem valor={campos.postagem} aoMudar={campos.setPostagem} interno={interno} />
          <p className="campo__ajuda">Com a data, a postagem já entra no calendário. Sem data, ela fica na lista Sem data, na tela Postagens.</p>
        </>
      )}
    </>
  )
}

// Público, Solicitante, Uso de IA e Uso de Template. "children" entra no fim da primeira linha (a data de solicitação).
export function CamposDaClassificacao({ campos, children }) {
  const { listas, publico, solicitante, usoIA, usoTemplate, regra, mudar } = campos
  return (
    <>
      <div className="grade-tres">
        <CampoLista rotulo="Público" valor={publico} opcoes={listas?.publicos} aoMudar={(v) => mudar('publico', v)} />
        <CampoLista rotulo="Solicitante" valor={solicitante} opcoes={listas?.solicitantes} aoMudar={(v) => mudar('solicitante', v)} />
        {children}
        <SimNao rotulo="Uso de IA" valor={usoIA} aoMudar={(v) => mudar('usoIA', v)} />
        <SimNao rotulo="Uso de Template" valor={usoTemplate} aoMudar={(v) => mudar('usoTemplate', v)} />
      </div>
      {regra && <p className="campo__ajuda">Uso de IA, Template e Solicitante preenchidos pela regra: {regra.motivo}.</p>}
    </>
  )
}
