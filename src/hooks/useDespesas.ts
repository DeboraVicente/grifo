import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Despesa, DespesaForm, Pagamento, Parcela } from '../types'

// Gera lista de parcelas a partir do form
function gerarParcelas(valorTotal: number, qtd: number, dataInicial: string): Parcela[] {
  const valorParcela = parseFloat((valorTotal / qtd).toFixed(2))
  const [ano, mes, dia] = dataInicial.split('-').map(Number)

  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(ano, mes - 1 + i, dia)
    const dataVencimento = d.toISOString().split('T')[0]
    return {
      numero: i + 1,
      valor: valorParcela,
      dataVencimento,
      pago: false,
      pagamentos: [],
    }
  })
}

export function useDespesas(userId: string | undefined) {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    const q = query(
      collection(db, 'despesas'),
      where('userId', '==', userId),
      orderBy('data', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data()
        // Normaliza despesas antigas que usavam "valor" em vez de "valorTotal"
        const valorTotal = raw.valorTotal ?? raw.valor ?? 0
        const valorParcela = raw.valorParcela ?? valorTotal
        const listaParcelas = raw.listaParcelas ?? []
        return {
          id: d.id,
          ...raw,
          valorTotal,
          valorParcela,
          listaParcelas,
          adiantamentos: raw.adiantamentos ?? [],
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as Despesa[]
      setDespesas(data)
      setLoading(false)
    })

    return unsub
  }, [userId])

  const criar = async (form: DespesaForm) => {
    if (!userId) return
    const valorParcela = parseFloat((form.valorTotal / form.parcelas).toFixed(2))
    const listaParcelas = gerarParcelas(form.valorTotal, form.parcelas, form.data)

    // Extrai participantes independente do tipo TS (evita problema com union type)
    const rateioRaw = form.rateio as any
    const participantesIds: string[] = rateioRaw?.ativo === true
      ? (rateioRaw.participantes ?? []).map((p: any) => p.userId)
      : []

    console.log('[Grifo] Criando despesa com rateio:', {
      rateioAtivo: rateioRaw?.ativo,
      participantesIds,
      rateio: rateioRaw,
    })

    await addDoc(collection(db, 'despesas'), {
      nome: form.nome,
      categoria: form.categoria,
      metodoPagamento: form.metodoPagamento,
      parcelas: form.parcelas,
      valorTotal: form.valorTotal,
      valorParcela,
      data: form.data,
      observacoes: form.observacoes,
      rateio: rateioRaw,
      listaParcelas,
      adiantamentos: [],
      pago: false,
      rateioParticipantesIds: participantesIds,
      userId,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }

  const editar = async (id: string, form: Partial<DespesaForm>) => {
    const despesa = despesas.find((d) => d.id === id)
    if (!despesa) return

    const novoTotal = form.valorTotal ?? despesa.valorTotal
    const novasQtd = form.parcelas ?? despesa.parcelas
    const novaData = form.data ?? despesa.data

    // Regenera parcelas se mudou valor, qtd ou data
    const regenerar =
      novoTotal !== despesa.valorTotal ||
      novasQtd !== despesa.parcelas ||
      novaData !== despesa.data

    const listaParcelas = regenerar
      ? gerarParcelas(novoTotal, novasQtd, novaData)
      : despesa.listaParcelas

    await updateDoc(doc(db, 'despesas', id), {
      ...form,
      valorParcela: parseFloat((novoTotal / novasQtd).toFixed(2)),
      listaParcelas,
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => {
    await deleteDoc(doc(db, 'despesas', id))
  }

  // Registra pagamento em uma parcela específica
  const pagarParcela = async (despesaId: string, numeroParcela: number, pagamento: Omit<Pagamento, 'id' | 'userId'>) => {
    const despesa = despesas.find((d) => d.id === despesaId)
    if (!despesa) return

    const listaParcelas = despesa.listaParcelas.map((p) => {
      if (p.numero !== numeroParcela) return p
      const pagamentos = [...p.pagamentos, { ...pagamento, id: crypto.randomUUID(), userId: userId! }]
      const totalPago = pagamentos.reduce((s, pg) => s + pg.valor, 0)
      return { ...p, pagamentos, pago: totalPago >= p.valor }
    })

    const todasParcelasPagas = listaParcelas.every((p) => p.pago)

    // Para rateios, a despesa só é paga quando todos os participantes aceitos também quitaram
    const rateioRaw = despesa.rateio as any
    let participantesQuitados = true
    if (rateioRaw?.ativo === true) {
      participantesQuitados = (rateioRaw.participantes ?? [])
        .filter((p: any) => p.status === 'aceito')
        .every((p: any) => (p.valorPago ?? 0) >= p.valorDevido)
    }

    await updateDoc(doc(db, 'despesas', despesaId), {
      listaParcelas,
      pago: todasParcelasPagas && participantesQuitados,
      atualizadoEm: serverTimestamp(),
    })
  }

  const adicionarAdiantamento = async (id: string, adiantamento: Omit<Pagamento, 'id' | 'userId'>) => {
    const despesa = despesas.find((d) => d.id === id)
    if (!despesa) return
    await updateDoc(doc(db, 'despesas', id), {
      adiantamentos: [...(despesa.adiantamentos || []), { ...adiantamento, id: crypto.randomUUID(), userId: userId! }],
      atualizadoEm: serverTimestamp(),
    })
  }

  return { despesas, loading, criar, editar, remover, pagarParcela, adicionarAdiantamento }
}