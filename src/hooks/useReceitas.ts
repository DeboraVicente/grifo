import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Receita, CategoriaReceita } from '../types'

export type ReceitaForm = {
  nome: string
  valor: number
  data: string
  categoria: CategoriaReceita
  recorrente: boolean
}

export function useReceitas(userId: string | undefined) {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    const q = query(
      collection(db, 'receitas'),
      where('userId', '==', userId),
      orderBy('data', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data()
        return {
          id: d.id,
          ...raw,
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as Receita[]
      setReceitas(data)
      setLoading(false)
    })

    return unsub
  }, [userId])

  const criar = async (form: ReceitaForm) => {
    if (!userId) return
    await addDoc(collection(db, 'receitas'), {
      ...form,
      userId,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }

  const editar = async (id: string, form: Partial<ReceitaForm>) => {
    await updateDoc(doc(db, 'receitas', id), {
      ...form,
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => {
    await deleteDoc(doc(db, 'receitas', id))
  }

  return { receitas, loading, criar, editar, remover }
}
