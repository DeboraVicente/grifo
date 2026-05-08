import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, updateDoc,
  doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Despesa, Pagamento, RateioAtivo } from '../types'

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
    resposta: 'aceito' | 'recusado',
    renda?: number
  ) => {
    if (!despesa.rateio?.ativo) return
    const rateio = despesa.rateio as any

    let participantes = rateio.participantes.map((p: any) =>
      p.userId === userId ? { ...p, status: resposta, ...(renda && renda > 0 ? { renda } : {}) } : p
    )

    if (resposta === 'aceito' && rateio.tipo === 'renda' && renda && renda > 0) {
      const rendaCriador: number = rateio.rendaCriador ?? 0
      const aceitos: any[] = participantes.filter((p: any) => p.status === 'aceito' && (p.renda ?? 0) > 0)
      const rendaTotal = rendaCriador + aceitos.reduce((s: number, p: any) => s + p.renda, 0)

      if (rendaTotal > 0) {
        const valorTotal: number = despesa.valorTotal ?? 0
        const parcelas: number = despesa.parcelas ?? 1
        participantes = participantes.map((p: any) => {
          if (p.status !== 'aceito' || !(p.renda > 0)) return p
          const percentual = (p.renda / rendaTotal) * 100
          const valorDevido = (percentual / 100) * valorTotal
          return {
            ...p,
            percentual,
            valorDevido,
            valorDevidoParcela: valorDevido / parcelas,
          }
        })
      }
    }

    await updateDoc(doc(db, 'despesas', despesaId), {
      'rateio.participantes': participantes,
      atualizadoEm: serverTimestamp(),
    })
  }

  const pagarParteRateio = async (
    despesaId: string,
    despesa: Despesa,
    userId: string,
    pagamento: Omit<Pagamento, 'id' | 'userId'>
  ) => {
    if (!despesa.rateio?.ativo) return
    const rateio = despesa.rateio as RateioAtivo

    const participantes = rateio.participantes.map((p) => {
      if (p.userId !== userId) return p
      const novoPagamento: Pagamento = {
        id: crypto.randomUUID(),
        userId,
        valor: pagamento.valor,
        data: pagamento.data,
        observacao: pagamento.observacao,
      }
      const pagamentosAtualizados = [...(p.pagamentos ?? []), novoPagamento]
      const novoValorPago = pagamentosAtualizados.reduce((s, pg) => s + pg.valor, 0)
      return { ...p, pagamentos: pagamentosAtualizados, valorPago: novoValorPago }
    })

    await updateDoc(doc(db, 'despesas', despesaId), {
      'rateio.participantes': participantes,
      atualizadoEm: serverTimestamp(),
    })
  }

  return { despesasRateadas, loading, responderRateio, pagarParteRateio }
}

// Despesas que alguém criou para o usuário ("para amigo")
export function useCompartilhadoRecebido(userId: string | undefined) {
  const [despesasCompartilhadas, setDespesasCompartilhadas] = useState<Despesa[]>([])

  useEffect(() => {
    if (!userId) return
    const q = query(
      collection(db, 'despesas'),
      where('compartilhadoComIds', 'array-contains', userId)
    )
    return onSnapshot(q, (snap) => {
      setDespesasCompartilhadas(snap.docs.map((d) => {
        const raw = d.data()
        return {
          id: d.id,
          ...raw,
          valorTotal: raw.valorTotal ?? 0,
          valorParcela: raw.valorParcela ?? 0,
          listaParcelas: raw.listaParcelas ?? [],
          adiantamentos: raw.adiantamentos ?? [],
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as Despesa[])
    })
  }, [userId])

  const responderCompartilhamento = async (
    despesaId: string,
    resposta: 'aceito' | 'recusado'
  ) => {
    await updateDoc(doc(db, 'despesas', despesaId), {
      statusCompartilhamento: resposta,
      atualizadoEm: serverTimestamp(),
    })
  }

  return { despesasCompartilhadas, responderCompartilhamento }
}