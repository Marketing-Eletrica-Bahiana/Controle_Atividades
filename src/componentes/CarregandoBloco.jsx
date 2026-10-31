import { LoaderCircle } from 'lucide-react'

// Indicador de carregamento dentro das telas (a tela cheia fica em telas/Carregando.jsx).
export default function CarregandoBloco({ texto = 'Carregando...' }) {
  return (
    <p className="carregando-bloco" role="status">
      <LoaderCircle className="girando" aria-hidden="true" />
      {texto}
    </p>
  )
}
