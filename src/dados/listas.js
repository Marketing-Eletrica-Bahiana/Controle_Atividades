import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta } from '../hooks/useConsulta.js'

export const LISTAS_PADRAO = {
  publicos: [
    'Interno', 'Externo', 'Interno e Externo', 'Endomarketing', 'Atividades de Rotina',
    'Compras', 'DP', 'CAE', 'PIPE', 'Facilities',
  ],
  solicitantes: ['Marketing', 'RH', 'Diretoria', 'Comercial', 'Financeiro', 'Logística', 'Marketing / RH'],
}

const refListas = () => doc(db, 'config', 'listas')

export function useListas() {
  return useConsulta('config/listas', refListas)
}

export const criarListasPadrao = () => setDoc(refListas(), LISTAS_PADRAO)

export const salvarLista = (campo, valores) => updateDoc(refListas(), { [campo]: valores })

// Junta valores novos ao fim da lista, sem repetir (sem diferenciar maiúsculas).
export function juntarSemRepetir(lista = [], novos = []) {
  const resultado = [...lista]
  for (const valor of novos) {
    if (!resultado.some((v) => v.toLowerCase() === valor.toLowerCase())) resultado.push(valor)
  }
  return resultado
}
