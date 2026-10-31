import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Configuração web do Firebase. Não é segredo: quem protege os dados são as regras do Firestore.
const firebaseConfig = {
  apiKey: 'AIzaSyAbRbcDfBr5rmiwdG_nbc3E7Q6XNdpbMxo',
  authDomain: 'controle-de-atividades-eb.firebaseapp.com',
  projectId: 'controle-de-atividades-eb',
  storageBucket: 'controle-de-atividades-eb.firebasestorage.app',
  messagingSenderId: '898778658314',
  appId: '1:898778658314:web:6e38aca449ab250e10d1f3',
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
auth.languageCode = 'pt-BR'

export const db = getFirestore(app)

export const DOMINIO_EMPRESA = 'eletricabahiana.com.br'

export const provedorGoogle = new GoogleAuthProvider()
// "hd" faz o Google oferecer só contas da empresa. A checagem que vale fica no ProvedorAcesso e nas regras.
provedorGoogle.setCustomParameters({ hd: DOMINIO_EMPRESA, prompt: 'select_account' })
