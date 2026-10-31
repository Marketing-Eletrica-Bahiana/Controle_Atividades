import { useEffect, useRef } from 'react'
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Legend, LinearScale, LineController, LineElement,
  PointElement, Tooltip,
} from 'chart.js'
import { formatarTempo } from '../lib/tempo.js'

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip)
Chart.defaults.font.family = "'EB Lato', 'Lato', Arial, sans-serif"
Chart.defaults.font.size = 15

// Só as cores da paleta, nesta ordem; depois, as mesmas com transparência.
const BASE = [
  [0, 23, 128],
  [0, 55, 255],
  [64, 105, 255],
  [212, 18, 26],
  [169, 42, 46],
]
// No modo apresentação (fundo escuro), o branco vem primeiro e o marinho, que sumiria no fundo, sai.
const BASE_NO_ESCURO = [
  [255, 255, 255],
  [64, 105, 255],
  [0, 55, 255],
  [212, 18, 26],
  [169, 42, 46],
]

export function coresDaPaleta(quantidade, escuro = false) {
  const base = escuro ? BASE_NO_ESCURO : BASE
  return Array.from({ length: quantidade }, (_, i) => {
    const [r, g, b] = base[i % base.length]
    const opacidade = [1, 0.6, 0.35][Math.floor(i / base.length) % 3]
    return `rgba(${r}, ${g}, ${b}, ${opacidade})`
  })
}

const segundosEmHoras = (s) => Math.round((s / 3600) * 100) / 100
const horasEmTexto = (h) => formatarTempo(Math.round(h * 3600))

// Configuração de barras. "tempo" faz eixo e dicas aparecerem em HH:MM:SS.
export function configBarras({ rotulos, valores, tempo = false, horizontal = false, escuro = false, cores }) {
  const texto = escuro ? '#ffffff' : '#000000'
  const grade = escuro ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 23, 128, 0.1)'
  const eixoDeValor = { beginAtZero: true, ticks: { color: texto, callback: (v) => (tempo ? horasEmTexto(v) : v), precision: tempo ? undefined : 0 }, grid: { color: grade } }
  const eixoDeRotulo = { ticks: { color: texto, autoSkip: false, callback: function (v) { const r = this.getLabelForValue(v); return r.length > 28 ? `${r.slice(0, 27)}...` : r } }, grid: { display: false } }
  return {
    type: 'bar',
    data: {
      labels: rotulos,
      datasets: [{ data: tempo ? valores.map(segundosEmHoras) : valores, backgroundColor: cores ?? coresDaPaleta(1, escuro)[0], borderRadius: 4, maxBarThickness: 40 }],
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => (tempo ? horasEmTexto(c.parsed[horizontal ? 'x' : 'y']) : `${c.parsed[horizontal ? 'x' : 'y']}`) } } },
      scales: horizontal ? { x: eixoDeValor, y: eixoDeRotulo } : { x: eixoDeRotulo, y: eixoDeValor },
    },
  }
}

export function configRosca({ rotulos, valores, escuro = false }) {
  return {
    type: 'doughnut',
    data: { labels: rotulos, datasets: [{ data: valores, backgroundColor: coresDaPaleta(valores.length, escuro), borderColor: escuro ? '#000000' : '#ffffff', borderWidth: 2 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: escuro ? '#ffffff' : '#000000', boxWidth: 16 } } },
    },
  }
}

// Evolução mês a mês: barras de horas e linha de demandas.
export function configEvolucao({ rotulos, segundos, demandas, escuro = false }) {
  const [corHoras, corDemandas] = escuro ? ['#ffffff', '#d4121a'] : ['#001780', '#d4121a']
  const texto = escuro ? '#ffffff' : '#000000'
  const grade = escuro ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 23, 128, 0.1)'
  return {
    type: 'bar',
    data: {
      labels: rotulos,
      datasets: [
        { type: 'bar', label: 'Horas', data: segundos.map(segundosEmHoras), backgroundColor: corHoras, borderRadius: 4, yAxisID: 'horas', maxBarThickness: 48 },
        { type: 'line', label: 'Demandas', data: demandas, borderColor: corDemandas, backgroundColor: corDemandas, borderWidth: 3, pointRadius: 5, yAxisID: 'demandas' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: texto } },
        tooltip: { callbacks: { label: (c) => (c.dataset.yAxisID === 'horas' ? `Horas: ${horasEmTexto(c.parsed.y)}` : `Demandas: ${c.parsed.y}`) } },
      },
      scales: {
        x: { ticks: { color: texto }, grid: { display: false } },
        horas: { position: 'left', beginAtZero: true, ticks: { color: texto, callback: (v) => horasEmTexto(v) }, grid: { color: grade } },
        demandas: { position: 'right', beginAtZero: true, ticks: { color: texto, precision: 0 }, grid: { display: false } },
      },
    },
  }
}

export default function Grafico({ titulo, configuracao, altura = 320, vazio = false }) {
  const tela = useRef(null)
  useEffect(() => {
    if (vazio || !tela.current) return undefined
    const grafico = new Chart(tela.current, configuracao)
    return () => grafico.destroy()
  }, [configuracao, vazio])

  return (
    <figure className="grafico">
      <figcaption>{titulo}</figcaption>
      {vazio ? (
        <p className="grafico__vazio">Sem dados no período.</p>
      ) : (
        <div className="grafico__area" style={{ height: altura }}>
          <canvas ref={tela} role="img" aria-label={titulo} />
        </div>
      )}
    </figure>
  )
}
