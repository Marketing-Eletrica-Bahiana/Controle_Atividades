import { caixasDosLogos, logos } from '../lib/marca.js'

// Logo oficial. Só recorta a sobra transparente do arquivo; nunca muda cor, sombra ou rotação.
export default function Logo({ formato = 'linha', cor = 'branco', altura = 32, className = '' }) {
  const caixa = caixasDosLogos[formato]
  return (
    <span
      className={`logo ${className}`}
      style={{ height: altura, aspectRatio: `${caixa.largura} / ${caixa.altura}` }}
    >
      <img
        src={logos[formato][cor]}
        alt="Elétrica Bahiana"
        style={{
          width: `${(caixa.lado / caixa.largura) * 100}%`,
          left: `${(-caixa.x / caixa.largura) * 100}%`,
          top: `${(-caixa.y / caixa.altura) * 100}%`,
        }}
      />
    </span>
  )
}
