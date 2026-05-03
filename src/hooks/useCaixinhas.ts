import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Caixinha, CaixinhaForm, MovimentoCaixinha } from '../types'

export function useCaixinhas(userId: string | undefined) {
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const q = query(
      collection(db, 'caixinhas'),
      where('userId', '==', userId),
      orderBy('criadoEm', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        criadoEm: (d.data().criadoEm as Timestamp)?.toDate().toISOString() ?? '',
        atualizadoEm: (d.data().atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
      })) as Caixinha[]
      setCaixinhas(data)
      setLoading(false)
    })
    return unsub
  }, [userId])

  const criar = async (form: CaixinhaForm) => {
    if (!userId) return
    await addDoc(collection(db, 'caixinhas'), {
      ...form,
      valorMeta: form.valorMeta ?? null,
      valorAtual: 0,
      historico: [],
      userId,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }

  const editar = async (id: string, form: Partial<CaixinhaForm>) => {
    await updateDoc(doc(db, 'caixinhas', id), {
      ...form,
      valorMeta: form.valorMeta ?? null,
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => {
    await deleteDoc(doc(db, 'caixinhas', id))
  }

  const adicionarMovimento = async (
    id: string,
    tipo: 'entrada' | 'saida',
    dados: { valor: number; data: string; observacao: string }
  ) => {
    const caixinha = caixinhas.find((c) => c.id === id)
    if (!caixinha) return

    const novoSaldo =
      tipo === 'entrada'
        ? caixinha.valorAtual + dados.valor
        : Math.max(0, caixinha.valorAtual - dados.valor)

    const movimento: MovimentoCaixinha = {
      id: crypto.randomUUID(),
      tipo,
      valor: dados.valor,
      data: dados.data,
      observacao: dados.observacao || undefined,
    }

    await updateDoc(doc(db, 'caixinhas', id), {
      valorAtual: novoSaldo,
      historico: [...(caixinha.historico ?? []), movimento],
      atualizadoEm: serverTimestamp(),
    })
  }

  return { caixinhas, loading, criar, editar, remover, adicionarMovimento }
}
