import { FORMATOS, FORMATOS_INTERNOS, GRUPOS_INTERNOS, mudarPostagem, REDES, rotuloDaData } from '../lib/postagens.js'
import CampoData from './CampoData.jsx'
import { CampoLista } from './Campos.jsx'
import IconeDaRede from './IconeDaRede.jsx'

// As caixas de postagem e envio. Usadas no cartão e no cronômetro.
export function OpcoesDaPostagem({ redeSocial, interna, envio, mostrarInterna, aoMudarRedeSocial, aoMudarInterna, aoMudarEnvio }) {
  return (
    <div className="janela-cartao__opcoes">
      <label className="opcao">
        <input type="checkbox" checked={redeSocial} onChange={(e) => aoMudarRedeSocial(e.target.checked)} />
        É postagem em rede social
      </label>
      {mostrarInterna && (
        <>
          <label className="opcao">
            <input type="checkbox" checked={interna} onChange={(e) => aoMudarInterna(e.target.checked)} />
            É postagem interna
          </label>
          <label className="opcao">
            <input type="checkbox" checked={envio} onChange={(e) => aoMudarEnvio(e.target.checked)} />
            Envio Interno
          </label>
        </>
      )}
    </div>
  )
}

// Data, redes e formato de uma postagem. Usado no cartão, no cronômetro e no calendário.
// Data e formato são os mesmos para as duas opções; cada lista só aparece com a opção dela marcada.
export default function CamposDaPostagem({ valor, aoMudar, redeSocial = true, interna = true, envio = false }) {
  const mudar = (campo, novo) => aoMudar(mudarPostagem(valor, campo, novo))
  const redes = valor.redes ?? []
  const alternarRede = (rede) => mudar('redes', redes.includes(rede) ? redes.filter((r) => r !== rede) : [...redes, rede])

  const opcoes = (rotulo, lista) => (
    <fieldset className="campo">
      <legend className="campo__rotulo">{rotulo}</legend>
      <div className="janela-cartao__opcoes">
        {lista.map((rede) => (
          <label key={rede} className="opcao">
            <input type="checkbox" checked={redes.includes(rede)} onChange={() => alternarRede(rede)} />
            <IconeDaRede rede={rede} />
            {rede}
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="campos-postagem">
      <div className="grade-duas grade-duas--formulario">
        <CampoData rotulo={rotuloDaData({ redeSocial, interna, envio })} valor={valor.data} aoMudar={(v) => mudar('data', v)} />
        <CampoLista rotulo="Formato" valor={valor.formato} opcoes={interna || envio ? [...FORMATOS, ...FORMATOS_INTERNOS] : FORMATOS} aoMudar={(v) => mudar('formato', v)} />
      </div>
      {redeSocial && opcoes('Redes', REDES)}
      {interna && opcoes('Grupos internos', GRUPOS_INTERNOS)}
      {valor.estimada && <p className="aviso aviso--erro">Data estimada a partir do Trello. Confira e ajuste se precisar.</p>}
      {valor.redeAConfirmar && <p className="aviso aviso--erro">O cartão do Trello não dizia a rede. Marque onde foi postado.</p>}
    </div>
  )
}
