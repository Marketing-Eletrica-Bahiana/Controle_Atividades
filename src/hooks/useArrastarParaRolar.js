import { useState } from 'react'

// Onde o arraste do fundo não começa: cartões (têm o próprio arraste), botões, campos e links.
const SEM_ARRASTE = '.cartao-quadro, button, a, input, select, textarea, label, form'

// Clique na barra de rolagem (da coluna ou do próprio Quadro) continua sendo da barra.
// Elemento em linha tem largura 0 e não tem barra.
const naBarraDeRolagem = (alvo, evento) =>
  (alvo.clientWidth > 0 && evento.offsetX > alvo.clientWidth) || (alvo.clientHeight > 0 && evento.offsetY > alvo.clientHeight)

// Segurar e arrastar o fundo com o mouse rola para os lados, como no Trello. No toque não precisa: a rolagem do
// navegador já faz isso. Uso: const rolagem = useArrastarParaRolar(); <div onPointerDown={rolagem.onPointerDown}>.
export function useArrastarParaRolar() {
  const [rolando, setRolando] = useState(false)

  function onPointerDown(evento) {
    if (evento.pointerType !== 'mouse' || evento.button !== 0) return
    const alvo = evento.target
    if (alvo.closest(SEM_ARRASTE) || naBarraDeRolagem(alvo, evento)) return
    const caixa = evento.currentTarget
    const inicio = { x: evento.clientX, rolagem: caixa.scrollLeft }
    const mover = (e) => {
      caixa.scrollLeft = inicio.rolagem - (e.clientX - inicio.x)
    }
    const parar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', parar)
      window.removeEventListener('pointercancel', parar)
      setRolando(false)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', parar)
    window.addEventListener('pointercancel', parar)
    setRolando(true)
    // Sem isso, o arraste seleciona os textos das colunas.
    evento.preventDefault()
  }

  return { rolando, onPointerDown }
}
