import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Caixinha, CaixinhaForm, MovimentoCaixinha } from '../types'

export function useCaixinhas(userId: string | undefined) {
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    // Sem orderBy para evitar índice composto — ordenamos no cliente
    const q = query(
      collection(db, 'caixinhas'),
      where('userId', '==', userId),
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data()
        return {
          id: d.id,
          ...raw,
          valorAtual: raw.valorAtual ?? 0,
          historico: raw.historico ?? [],
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as Caixinha[]
      // Ordena no cliente: mais recentes primeiro
      data.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      setCaixinhas(data)
      setLoading(false)
    }, (err) => {
      console.error('Caixinhas error:', err)
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
    const novoSaldo = tipo === 'entrada'
      ? caixinha.valorAtual + dados.valor
      : Math.max(0, caixinha.valorAtual - dados.valor)
    const movimento: MovimentoCaixinha = {
      id: crypto.randomUUID(),
      tipo,
      valor: dados.valor,
      data: dados.data,
      observacao: dados.observacao || '',
    }
    await updateDoc(doc(db, 'caixinhas', id), {
      valorAtual: novoSaldo,
      historico: [...(caixinha.historico ?? []), movimento],
      atualizadoEm: serverTimestamp(),
    })
  }

  return { caixinhas, loading, criar, editar, remover, adicionarMovimento }
}
