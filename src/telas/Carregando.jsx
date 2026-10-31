import { LoaderCircle } from 'lucide-react'
import FundoMarca from '../componentes/FundoMarca.jsx'
import Logo from '../componentes/Logo.jsx'

export default function Carregando() {
  return (
    <FundoMarca>
      <div className="carregando" role="status">
        <Logo formato="linha" cor="branco" altura={40} />
        <LoaderCircle className="girando" aria-hidden="true" />
        <span>Carregando...</span>
      </div>
    </FundoMarca>
  )
}
