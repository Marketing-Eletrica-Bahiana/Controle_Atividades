import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { useNomesDasAreas } from '../hooks/useNomesDasAreas.js'
import { mascotes } from '../lib/marca.js'
import { PAPEIS } from '../lib/papeis.js'
import { primeiroNome } from '../lib/texto.js'

// Ocupa o lugar de cada tela até a fase em que ela é construída.
export default function TelaProvisoria({ tela }) {
  const { membro } = useAcesso()
  const areas = useNomesDasAreas(membro.areas ?? [])
  const ehTelaInicial = PAPEIS[membro.papel].telaInicial === tela.caminho
  const mascote = tela.caminho === '/painel' ? null : ehTelaInicial ? mascotes.ebinho : mascotes.ebinha
  const { Icone } = tela
  const veTodasAsAreas = membro.papel === 'gestor' || membro.papel === 'diretoria'
  const textoAreas = areas.length ? areas.join(', ') : veTodasAsAreas ? 'Todas as áreas' : 'Nenhuma área cadastrada'

  return (
    <section className="cartao tela-provisoria">
      {mascote && <img className="tela-provisoria__mascote" src={mascote} alt="" />}
      <div className="tela-provisoria__texto">
        <h1 className="titulo-pagina">
          <Icone aria-hidden="true" />
          {tela.rotulo}
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
        {ehTelaInicial && <p className="destaque">Que bom ter você aqui, {primeiroNome(membro.nome)}!</p>}
        <p>
          Esta tela ganha vida na Fase {tela.fase}. Por enquanto, confira lá em cima se o seu nome e o seu papel
          aparecem certinhos.
        </p>
        <dl className="ficha">
          <div>
            <dt>Papel</dt>
            <dd>{PAPEIS[membro.papel].rotulo}</dd>
          </div>
          <div>
            <dt>{areas.length === 1 ? 'Área' : 'Áreas'}</dt>
            <dd>{textoAreas}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
