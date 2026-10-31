import { mascotes } from '../lib/marca.js'

// Tela ou bloco sem conteúdo ainda. Mascotes são permitidos aqui (nunca no Painel).
export default function EstadoVazio({ titulo, texto, mascote = 'ebinha', children }) {
  return (
    <div className="estado-vazio">
      <img className="estado-vazio__mascote" src={mascotes[mascote]} alt="" />
      <div className="estado-vazio__texto">
        <h2>{titulo}</h2>
        {texto && <p>{texto}</p>}
        {children}
      </div>
    </div>
  )
}
