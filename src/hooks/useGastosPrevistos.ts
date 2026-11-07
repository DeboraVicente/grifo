import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { hojeISO, somarMeses } from '../lib/previstos'
import type { GastoPrevisto, GastoPrevistoForm, MovimentoPrevisto } from '../types'

const semUndefined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

export function useGastosPrevistos(userId: string | undefined) {
  const [previstos, setPrevistos] = useState<GastoPrevisto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const q = query(collection(db, 'gastosPrevistos'), where('userId', '==', userId))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data()
        return {
          id: d.id,
          ...raw,
          valorReservado: raw.valorReservado ?? 0,
          avisarDiasAntes: raw.avisarDiasAntes ?? 15,
          historico: raw.historico ?? [],
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as GastoPrevisto[]
      // Mais próximos primeiro
      data.sort((a, b) => a.proximaData.localeCompare(b.proximaData))
      setPrevistos(data)
      setLoading(false)
    }, (err) => {
      console.error('Gastos previstos:', err)
      setLoading(false)
    })
    return unsub
  }, [userId])

  const criar = async (form: GastoPrevistoForm) => {
    if (!userId) return
    const inicial = form.valorJaReservado ?? 0
    const historico: MovimentoPrevisto[] = inicial > 0
      ? [{ id: crypto.randomUUID(), tipo: 'ajuste', valor: inicial, data: hojeISO(), observacao: 'Valor já guardado' }]
      : []
    await addDoc(collection(db, 'gastosPrevistos'), semUndefined({
      nome: form.nome,
      categoria: form.categoria,
      valorEstimado: form.valorEstimado,
      intervaloMeses: form.intervaloMeses,
      proximaData: form.proximaData,
      avisarDiasAntes: form.avisarDiasAntes,
      observacoes: form.observacoes || undefined,
      valorReservado: inicial,
      historico,
      userId,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }))
  }

  const editar = async (id: string, form: GastoPrevistoForm) => {
    const { valorJaReservado: _ignorado, ...resto } = form
    await updateDoc(doc(db, 'gastosPrevistos', id), {
      ...semUndefined(resto as unknown as Record<string, unknown>),
      observacoes: form.observacoes ?? '',
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => {
    await deleteDoc(doc(db, 'gastosPrevistos', id))
  }

  /** Guarda dinheiro para o gasto (entrada > 0) ou tira (entrada < 0) */
  const reservar = async (id: string, valor: number, data: string, observacao?: string) => {
    const g = previstos.find((p) => p.id === id)
    if (!g) return
    const mov: MovimentoPrevisto = semUndefined({
      id: crypto.randomUUID(), tipo: valor >= 0 ? 'reserva' : 'ajuste', valor, data, observacao: observacao || undefined,
    }) as unknown as MovimentoPrevisto
    await updateDoc(doc(db, 'gastosPrevistos', id), {
      valorReservado: Math.max(0, g.valorReservado + valor),
      historico: [...g.historico, mov],
      atualizadoEm: serverTimestamp(),
    })
  }

  /**
   * Marca o gasto como feito: usa o que estava reservado, agenda a próxima
   * ocorrência e (opcionalmente) atualiza a estimativa com o valor real.
   */
  const concluir = async (id: string, dados: { valorReal: number; data: string; atualizarEstimativa: boolean }) => {
    const g = previstos.find((p) => p.id === id)
    if (!g) return
    const usado = Math.min(g.valorReservado, dados.valorReal)
    const mov: MovimentoPrevisto = {
      id: crypto.randomUUID(), tipo: 'uso', valor: dados.valorReal, data: dados.data, observacao: 'Gasto realizado',
    }
    await updateDoc(doc(db, 'gastosPrevistos', id), {
      valorReservado: Math.max(0, g.valorReservado - usado),
      proximaData: somarMeses(dados.data, g.intervaloMeses),
      ...(dados.atualizarEstimativa ? { valorEstimado: dados.valorReal } : {}),
      historico: [...g.historico, mov],
      atualizadoEm: serverTimestamp(),
    })
  }

  return { previstos, loading, criar, editar, remover, reservar, concluir }
}
