import { patterns } from '../lib/marca.js'
import Assinatura from './Assinatura.jsx'

// Fundo de impacto: gradiente principal com o pattern de circuito nas duas laterais.
export default function FundoMarca({ children }) {
  return (
    <div className="fundo-marca" style={{ '--pattern': `url("${patterns.circuito}")` }}>
      <main className="fundo-marca__conteudo">{children}</main>
      <footer className="fundo-marca__rodape">
        <Assinatura clara />
      </footer>
    </div>
  )
}
