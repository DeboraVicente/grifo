import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDocs, limit,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Conta, ContaForm } from '../types'

export type RemoverContaResultado = 'ok' | 'vinculada' | 'erro'

export function useContas(userId: string | undefined) {
  const [contas, setContas] = useState<Conta[]>([])

  useEffect(() => {
    if (!userId) return
    const q = query(
      collection(db, 'contas'),
      where('userId', '==', userId),
      orderBy('nome')
    )
    return onSnapshot(q, (snap) => {
      setContas(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        criadoEm: (d.data().criadoEm as Timestamp)?.toDate().toISOString() ?? '',
      })) as Conta[])
    })
  }, [userId])

  const criar = async (form: ContaForm) => {
    if (!userId) return
    await addDoc(collection(db, 'contas'), { ...form, userId, criadoEm: serverTimestamp() })
  }

  const editar = async (id: string, form: ContaForm) => {
    await updateDoc(doc(db, 'contas', id), { nome: form.nome, tipo: form.tipo })
  }

  const remover = async (id: string): Promise<RemoverContaResultado> => {
    try {
      // Verifica se há despesas vinculadas
      const qd = query(collection(db, 'despesas'), where('userId', '==', userId), where('contaId', '==', id), limit(1))
      const sd = await getDocs(qd)
      if (!sd.empty) return 'vinculada'

      // Verifica se há cartões vinculados
      const qc = query(collection(db, 'cartoes'), where('userId', '==', userId), where('contaId', '==', id), limit(1))
      const sc = await getDocs(qc)
      if (!sc.empty) return 'vinculada'

      await deleteDoc(doc(db, 'contas', id))
      return 'ok'
    } catch {
      return 'erro'
    }
  }

  return { contas, criar, editar, remover }
}
