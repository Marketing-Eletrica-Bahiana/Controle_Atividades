// Imagens do cartão do Quadro e da demanda (desde 25/11/2026), guardadas reduzidas no próprio Firestore porque o
// projeto está no plano gratuito, que não guarda arquivos (ver src/lib/imagens.js).
//
// imagens/{id}: { cartaoId, demandaId (um dos dois, o outro null), nome, largura, altura, miniatura, enviadoPor,
//   enviadoNome, criadoEm }. A miniatura vem junto, então abrir o cartão lê pouco.
// imagensConteudo/{id}: { dados, enviadoPor }, com a imagem inteira. Fica à parte e só é lida quando a pessoa abre a imagem.

import { useMemo } from 'react'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta } from '../hooks/useConsulta.js'
import { ordenarImagens } from '../lib/imagens.js'

const colecao = () => collection(db, 'imagens')
const refImagem = (id) => doc(db, 'imagens', id)
const refConteudo = (id) => doc(db, 'imagensConteudo', id)

// "dono" é { cartaoId } ou { demandaId }.
const campoDoDono = (dono) => (dono?.cartaoId ? ['cartaoId', dono.cartaoId] : dono?.demandaId ? ['demandaId', dono.demandaId] : null)
const consultaDoDono = (dono) => {
  const [campo, valor] = campoDoDono(dono)
  return query(colecao(), where(campo, '==', valor))
}

export function useImagens(dono) {
  const campo = campoDoDono(dono)
  const consulta = useConsulta(campo && `imagens/${campo[0]}/${campo[1]}`, () => consultaDoDono(dono))
  const dados = useMemo(() => (consulta.dados ? ordenarImagens(consulta.dados) : null), [consulta.dados])
  return { ...consulta, dados }
}

// Grava a imagem já reduzida: os dados e a miniatura no mesmo lote, para nunca ficar uma sem a outra.
export async function enviarImagem(dono, { nome, dados, miniatura, largura, altura }, pessoa) {
  const ref = doc(colecao())
  const lote = writeBatch(db)
  lote.set(ref, {
    cartaoId: dono.cartaoId ?? null,
    demandaId: dono.demandaId ?? null,
    nome,
    largura,
    altura,
    miniatura,
    enviadoPor: pessoa.email,
    enviadoNome: pessoa.nome,
    criadoEm: serverTimestamp(),
  })
  lote.set(refConteudo(ref.id), { dados, enviadoPor: pessoa.email })
  await lote.commit()
  return ref.id
}

// A imagem inteira, para ver grande e baixar. null se foi excluída.
export async function lerImagemInteira(id) {
  const snap = await getDoc(refConteudo(id))
  return snap.exists() ? snap.data().dados : null
}

export async function excluirImagem(imagem) {
  const lote = writeBatch(db)
  lote.delete(refImagem(imagem.id))
  lote.delete(refConteudo(imagem.id))
  await lote.commit()
}

// Junto com a exclusão do cartão ou da demanda, para não sobrar imagem sem dono ocupando o espaço gratuito.
export async function apagarImagensNoLote(lote, dono) {
  if (!campoDoDono(dono)) return
  const snap = await getDocs(consultaDoDono(dono))
  for (const imagem of snap.docs) {
    lote.delete(imagem.ref)
    lote.delete(refConteudo(imagem.id))
  }
}

// Ao juntar demandas repetidas, as imagens da que sai passam para a que fica.
export async function moverImagensNoLote(lote, deDemandaId, paraDemandaId) {
  const snap = await getDocs(consultaDoDono({ demandaId: deDemandaId }))
  for (const imagem of snap.docs) lote.update(imagem.ref, { demandaId: paraDemandaId })
}
