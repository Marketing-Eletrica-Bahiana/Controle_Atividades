import { createContext, useContext, useEffect, useState } from 'react'
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, DOMINIO_EMPRESA, provedorGoogle } from '../firebase.js'
import { mensagemDeErro } from '../lib/erros.js'
import { papelValido } from '../lib/papeis.js'

const ContextoAcesso = createContext(null)

const JANELA_FECHADA = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']
const POPUP_NAO_FUNCIONA = ['auth/popup-blocked', 'auth/operation-not-supported-in-environment']

const ehCelular = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const ehEmailDaEmpresa = (email) => (email ?? '').toLowerCase().endsWith(`@${DOMINIO_EMPRESA}`)

// situacao: 'carregando' | 'fora' | 'sem-cadastro' | 'inativo' | 'sem-papel' | 'erro' | 'dentro'
export function ProvedorAcesso({ children }) {
  const [usuario, setUsuario] = useState(undefined)
  const [membro, setMembro] = useState(null)
  const [situacao, setSituacao] = useState('carregando')
  const [erro, setErro] = useState('')

  useEffect(() => {
    getRedirectResult(auth).catch((e) => setErro(mensagemDeErro(e)))
    return onAuthStateChanged(auth, (u) => {
      if (u && !ehEmailDaEmpresa(u.email)) {
        setErro(`Use o seu e-mail @${DOMINIO_EMPRESA} para entrar.`)
        signOut(auth)
        return
      }
      setUsuario(u)
    })
  }, [])

  useEffect(() => {
    if (usuario === undefined) return undefined
    if (!usuario) {
      setMembro(null)
      setSituacao('fora')
      return undefined
    }
    setSituacao('carregando')
    return onSnapshot(
      doc(db, 'membros', usuario.email.toLowerCase()),
      (snap) => {
        if (!snap.exists()) {
          setMembro(null)
          setSituacao('sem-cadastro')
          return
        }
        const dados = { email: snap.id, ...snap.data() }
        setMembro(dados)
        if (dados.ativo !== true) setSituacao('inativo')
        else if (!papelValido(dados.papel)) setSituacao('sem-papel')
        else setSituacao('dentro')
      },
      (e) => {
        setMembro(null)
        // Para quem não tem cadastro, as regras podem negar até a leitura do próprio documento.
        if (e.code === 'permission-denied') {
          setSituacao('sem-cadastro')
          return
        }
        setErro(mensagemDeErro(e))
        setSituacao('erro')
      },
    )
  }, [usuario])

  async function entrar() {
    setErro('')
    try {
      await signInWithPopup(auth, provedorGoogle)
    } catch (e) {
      const tentarRedirecionar = POPUP_NAO_FUNCIONA.includes(e.code) || (ehCelular() && !JANELA_FECHADA.includes(e.code))
      if (!tentarRedirecionar) {
        setErro(mensagemDeErro(e))
        return
      }
      try {
        await signInWithRedirect(auth, provedorGoogle)
      } catch (e2) {
        setErro(mensagemDeErro(e2))
      }
    }
  }

  function sair() {
    setErro('')
    return signOut(auth)
  }

  function pedirAcesso() {
    const email = usuario.email.toLowerCase()
    return setDoc(doc(db, 'solicitacoes', email), {
      nome: usuario.displayName || email,
      email,
      criadoEm: serverTimestamp(),
    })
  }

  const valor = { situacao, usuario, membro, erro, entrar, sair, pedirAcesso }
  return <ContextoAcesso value={valor}>{children}</ContextoAcesso>
}

export function useAcesso() {
  return useContext(ContextoAcesso)
}
