import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDocs, limit,
  serverTimestamp, Timestamp, deleteField,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CartaoCredito, CartaoCreditoForm } from '../types'

export type RemoverCartaoResultado = 'ok' | 'vinculado' | 'erro'

export function useCartoes(userId: string | undefined) {
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])

  useEffect(() => {
    if (!userId) return
    const q = query(
      collection(db, 'cartoes'),
      where('userId', '==', userId),
      orderBy('nome')
    )
    return onSnapshot(q, (snap) => {
      setCartoes(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        criadoEm: (d.data().criadoEm as Timestamp)?.toDate().toISOString() ?? '',
      })) as CartaoCredito[])
    })
  }, [userId])

  const criar = async (form: CartaoCreditoForm) => {
    if (!userId) return
    const dados: Record<string, any> = { ...form, userId, criadoEm: serverTimestamp() }
    if (form.diaVencimento == null) delete dados.diaVencimento
    if (form.melhorDiaCompra == null) delete dados.melhorDiaCompra
    if (form.contaId == null) delete dados.contaId
    await addDoc(collection(db, 'cartoes'), dados)
  }

  const editar = async (id: string, form: CartaoCreditoForm) => {
    await updateDoc(doc(db, 'cartoes', id), {
      nome: form.nome,
      bandeira: form.bandeira ?? deleteField(),
      limite: form.limite ?? deleteField(),
      diaVencimento: form.diaVencimento ?? deleteField(),
      melhorDiaCompra: form.melhorDiaCompra ?? deleteField(),
      contaId: form.contaId ?? deleteField(),
    })
  }

  const remover = async (id: string): Promise<RemoverCartaoResultado> => {
    try {
      // Verifica se há despesas vinculadas a este cartão
      const q = query(
        collection(db, 'despesas'),
        where('userId', '==', userId),
        where('cartaoId', '==', id),
        limit(1)
      )
      const snap = await getDocs(q)
      if (!snap.empty) return 'vinculado'

      await deleteDoc(doc(db, 'cartoes', id))
      return 'ok'
    } catch {
      return 'erro'
    }
  }

  return { cartoes, criar, editar, remover }
}
