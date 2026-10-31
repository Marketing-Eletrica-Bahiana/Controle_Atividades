import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

// Janela sobre a tela (dialog nativo: prende o foco e fecha com Esc).
export default function Janela({ aberta, titulo, aoFechar, children, largura = 560 }) {
  const ref = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberta && !dialogo.open) dialogo.showModal()
    if (!aberta && dialogo.open) dialogo.close()
  }, [aberta])

  return (
    <dialog
      ref={ref}
      className="janela-modal"
      style={{ maxWidth: largura }}
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault()
        aoFechar?.()
      }}
    >
      {aberta && (
        <>
          <header className="janela-modal__cabecalho">
            <h2 id={idTitulo}>{titulo}</h2>
            <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="janela-modal__corpo">{children}</div>
        </>
      )}
    </dialog>
  )
}
