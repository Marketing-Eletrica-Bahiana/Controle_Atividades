import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react'
import { formatarData, hojeISO, lerData, montarISO, NOMES_MESES } from '../lib/datas.js'
import { posicaoFlutuante } from '../lib/flutuante.js'

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Coloca as barras enquanto a pessoa digita: 01102026 vira 01/10/2026.
function mascarar(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 8)
  if (numeros.length > 4) return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`
  if (numeros.length > 2) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`
  return numeros
}

// Campo de data próprio: aceita digitar DD/MM/AAAA e tem calendário em português começando no domingo.
// Não depende do formato de data do navegador. Valor sempre em "AAAA-MM-DD" (ou null).
export default function CampoData({ rotulo, valor, aoMudar, erro, obrigatorio = false, compacto = false }) {
  const [texto, setTexto] = useState(formatarData(valor))
  const [erroLocal, setErroLocal] = useState('')
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  const linha = useRef(null)
  const id = useId()

  useEffect(() => {
    if (lerData(texto) !== valor) setTexto(formatarData(valor))
    // Só quando o valor muda por fora (calendário, outro campo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  useEffect(() => {
    if (!aberto) return undefined
    const fecharFora = (evento) => !caixa.current?.contains(evento.target) && setAberto(false)
    const fecharEsc = (evento) => evento.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fecharFora)
    document.addEventListener('keydown', fecharEsc)
    return () => {
      document.removeEventListener('mousedown', fecharFora)
      document.removeEventListener('keydown', fecharEsc)
    }
  }, [aberto])

  function digitar(evento) {
    const novo = mascarar(evento.target.value)
    setTexto(novo)
    if (!novo) {
      setErroLocal(obrigatorio ? 'Informe a data.' : '')
      aoMudar(null)
    } else if (novo.length === 10) {
      const iso = lerData(novo)
      setErroLocal(iso ? '' : 'Data inválida. Use DD/MM/AAAA.')
      if (iso) aoMudar(iso)
    }
  }

  function sair() {
    if (texto && !lerData(texto)) setErroLocal('Data inválida. Use DD/MM/AAAA.')
  }

  const mensagem = erroLocal || erro
  return (
    <div className={`campo campo-data ${compacto ? 'campo--compacto' : ''}`} ref={caixa}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <div className="campo-data__linha" ref={linha}>
        <input
          id={id}
          value={texto}
          onChange={digitar}
          onBlur={sair}
          placeholder="DD/MM/AAAA"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(mensagem)}
        />
        <button
          type="button"
          className="botao-icone campo-data__botao"
          aria-label={`Abrir calendário de ${rotulo}`}
          aria-expanded={aberto}
          onClick={() => setAberto((a) => !a)}
        >
          <CalendarDays aria-hidden="true" />
        </button>
      </div>
      {mensagem && (
        <span className="campo__erro" role="alert">
          <CircleAlert aria-hidden="true" />
          {mensagem}
        </span>
      )}
      {aberto && (
        <Calendario
          ancora={linha}
          valor={valor}
          aoEscolher={(iso) => {
            aoMudar(iso)
            setTexto(formatarData(iso))
            setErroLocal('')
            setAberto(false)
          }}
        />
      )}
    </div>
  )
}

// Flutua por cima de tudo (camada do topo, quando o navegador tem) e sempre dentro da tela: as janelas rolam por
// dentro e cortavam o calendário preso ao campo. Acompanha o campo quando a página ou a janela rola.
export function Calendario({ valor, aoEscolher, ancora }) {
  const hoje = hojeISO()
  const [mesVisivel, setMesVisivel] = useState((valor ?? hoje).slice(0, 7))
  const flutuante = useRef(null)
  const [posicao, setPosicao] = useState(null)

  useLayoutEffect(() => {
    try {
      flutuante.current?.showPopover?.()
    } catch {
      // Sem camada do topo: continua fixo na tela, na mesma posição.
    }
  }, [])

  // Recalcula ao trocar de mês: com 5 ou 6 semanas, a altura muda.
  useLayoutEffect(() => {
    const caixaDoCalendario = flutuante.current
    if (!ancora?.current || !caixaDoCalendario) return undefined
    function posicionar() {
      const tela = { largura: document.documentElement.clientWidth, altura: document.documentElement.clientHeight }
      const tamanho = { largura: caixaDoCalendario.offsetWidth, altura: caixaDoCalendario.offsetHeight }
      setPosicao(posicaoFlutuante(ancora.current.getBoundingClientRect(), tamanho, tela))
    }
    posicionar()
    window.addEventListener('resize', posicionar)
    window.addEventListener('scroll', posicionar, true)
    return () => {
      window.removeEventListener('resize', posicionar)
      window.removeEventListener('scroll', posicionar, true)
    }
  }, [ancora, mesVisivel])
  const [ano, mes] = mesVisivel.split('-').map(Number)
  const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay() // domingo = 0
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const casas = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

  function andar(delta) {
    const data = new Date(Date.UTC(ano, mes - 1 + delta, 1))
    setMesVisivel(`${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div
      ref={flutuante}
      className="calendario"
      popover="manual"
      role="dialog"
      aria-label="Calendário"
      style={posicao ? { top: posicao.top, left: posicao.left } : { visibility: 'hidden' }}
    >
      <div className="calendario__topo">
        <button type="button" className="botao-icone" onClick={() => andar(-1)} aria-label="Mês anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <strong>
          {NOMES_MESES[mes - 1]} {ano}
        </strong>
        <button type="button" className="botao-icone" onClick={() => andar(1)} aria-label="Próximo mês">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="calendario__grade">
        {DIAS_DA_SEMANA.map((d) => (
          <span key={d} className="calendario__semana">
            {d}
          </span>
        ))}
        {casas.map((dia, i) => {
          if (!dia) return <span key={`v${i}`} />
          const iso = montarISO(ano, mes, dia)
          return (
            <button
              key={iso}
              type="button"
              className={`calendario__dia ${iso === valor ? 'escolhido' : ''} ${iso === hoje ? 'hoje' : ''}`}
              aria-pressed={iso === valor}
              aria-label={`${dia} de ${NOMES_MESES[mes - 1].toLowerCase()} de ${ano}`}
              onClick={() => aoEscolher(iso)}
            >
              {dia}
            </button>
          )
        })}
      </div>
      <button type="button" className="botao botao--secundario calendario__hoje" onClick={() => aoEscolher(hoje)}>
        Hoje
      </button>
    </div>
  )
}
