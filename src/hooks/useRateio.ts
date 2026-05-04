import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, updateDoc,
  doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Despesa } from '../types'

// Despesas rateadas onde o usuário é participante (criadas por outro usuário)
export function useRateioRecebido(userId: string | undefined) {
  const [despesasRateadas, setDespesasRateadas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    // Query pelo array de IDs dos participantes
    const q = query(
      collection(db, 'despesas'),
      where('rateioParticipantesIds', 'array-contains', userId)
    )

    const unsub = onSnapshot(q, (snap) => {
      console.log('[Grifo] useRateioRecebido snap size:', snap.size, 'userId:', userId)
      const data = snap.docs.map((d) => {
        const raw = d.data()
        console.log('[Grifo] despesa rateada encontrada:', d.id, raw.nome, raw.rateioParticipantesIds)
        return {
          id: d.id,
          ...raw,
          valorTotal: raw.valorTotal ?? raw.valor ?? 0,
          valorParcela: raw.valorParcela ?? raw.valorTotal ?? 0,
          listaParcelas: raw.listaParcelas ?? [],
          adiantamentos: raw.adiantamentos ?? [],
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as Despesa[]
      setDespesasRateadas(data)
      setLoading(false)
    }, (err) => {
      console.error('useRateioRecebido error:', err.code, err.message)
      // Se faltar índice, o erro aparece aqui com o link para criar
      setLoading(false)
    })

    return unsub
  }, [userId])

  const responderRateio = async (
    despesaId: string,
    despesa: Despesa,
    userId: string,
    resposta: 'aceito' | 'recusado'
  ) => {
    if (!despesa.rateio?.ativo) return
    const rateio = despesa.rateio as any
    const participantes = rateio.participantes.map((p: any) =>
      p.userId === userId ? { ...p, status: resposta } : p
    )
    await updateDoc(doc(db, 'despesas', despesaId), {
      'rateio.participantes': participantes,
      atualizadoEm: serverTimestamp(),
    })
  }

  return { despesasRateadas, loading, responderRateio }
}