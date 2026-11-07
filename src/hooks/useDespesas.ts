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
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Despesa, DespesaForm, Pagamento, Parcela } from '../types'



function avancarMes(dateStr: string, meses: number): string {
  const [ano, mes, dia] = dateStr.split('-').map(Number)
  const d = new Date(ano, mes - 1 + meses, dia)
  return d.toISOString().split('T')[0]
}

// Gera lista de parcelas a partir do form
function gerarParcelas(valorTotal: number, qtd: number, dataInicial: string, valorParcelaOverride?: number): Parcela[] {
  const valorParcela = valorParcelaOverride ?? parseFloat((valorTotal / qtd).toFixed(2))
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
        const listaParcelas = (() => {
          if (raw.listaParcelas?.length > 0) return raw.listaParcelas
          // Reconstrói para despesas antigas sem listaParcelas
          if (valorTotal > 0 && raw.data) {
            const qtd = raw.parcelas ?? 1
            const parcelas = gerarParcelas(valorTotal, qtd, raw.data, raw.valorParcela)
            // Se a despesa está paga, marca todas as parcelas como pagas
            if (raw.pago) return parcelas.map((p: any) => ({ ...p, pago: true }))
            return parcelas
          }
          return []
        })()
        return {
          id: d.id,
          ...raw,
          valorTotal,
          valorParcela,
          listaParcelas,
          adiantamentos: raw.adiantamentos ?? [],
          tipoGasto: raw.tipoGasto ?? (raw.recorrente ? 'fixo' : 'variavel'),
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
          atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
        }
      }) as Despesa[]
      setDespesas(data)
      setLoading(false)
    })

    return unsub
  }, [userId])

  const criar = async (form: DespesaForm, opcoes?: { jaPago?: boolean }) => {
    if (!userId) return
    const valorParcela = form.valorParcelaCustom
      ? parseFloat(form.valorParcelaCustom.toFixed(2))
      : parseFloat((form.valorTotal / form.parcelas).toFixed(2))

    const baseDoc = {
      nome: form.nome,
      categoria: form.categoria,
      metodoPagamento: form.metodoPagamento,
      tipoGasto: form.recorrente ? 'fixo' : (form.tipoGasto ?? 'variavel'),
      cartaoId: form.cartaoId ?? null,
      contaId: form.contaId ?? null,
      tipo: form.tipo ?? 'padrao',
      parcelas: form.parcelas,
      valorTotal: form.valorTotal,
      valorParcela,
      minhaParte: form.minhaParte ?? null,
      saldoDevedor: form.tipo === 'financiamento' ? form.valorTotal : null,
      observacoes: form.observacoes,
      adiantamentos: [],
      pago: false,
      userId,
    }

    if (form.recorrente) {
      const meses = form.recorrenciaMeses ?? 12
      const recorrenciaId = crypto.randomUUID()
      const batch = writeBatch(db)
      for (let i = 0; i < meses; i++) {
        const data = avancarMes(form.data, i)
        const dataCompra = avancarMes(form.dataCompra || form.data, i)
        const listaParcelas = gerarParcelas(form.valorTotal, 1, data)
        batch.set(doc(collection(db, 'despesas')), {
          ...baseDoc,
          data,
          dataCompra,
          listaParcelas,
          recorrente: true,
          recorrenciaId,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        })
      }
      await batch.commit()
    } else {
      let listaParcelas = gerarParcelas(form.valorTotal, form.parcelas, form.data, form.valorParcelaCustom)
      // Gasto que já aconteceu (ex.: concluído a partir de um gasto previsto)
      if (opcoes?.jaPago) {
        listaParcelas = listaParcelas.map((p) => ({
          ...p, pago: true,
          pagamentos: [{ id: crypto.randomUUID(), userId, valor: p.valor, data: form.data }],
        }))
      }
      await addDoc(collection(db, 'despesas'), {
        ...baseDoc,
        pago: !!opcoes?.jaPago,
        dataCompra: form.dataCompra || null,
        data: form.data,
        listaParcelas,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
    }
  }

  const editar = async (id: string, form: Partial<DespesaForm>) => {
    const despesa = despesas.find((d) => d.id === id)
    if (!despesa) return

    const novoTotal = form.valorTotal ?? despesa.valorTotal
    const novasQtd = form.parcelas ?? despesa.parcelas
    const novaData = form.data ?? despesa.data
    const novaParcelaCustom = form.valorParcelaCustom ?? undefined

    const regenerar =
      novoTotal !== despesa.valorTotal ||
      novasQtd !== despesa.parcelas ||
      novaData !== despesa.data ||
      (novaParcelaCustom !== undefined && novaParcelaCustom !== despesa.valorParcela)

    const novaValorParcela = novaParcelaCustom
      ? parseFloat(novaParcelaCustom.toFixed(2))
      : parseFloat((novoTotal / novasQtd).toFixed(2))

    const listaParcelas = regenerar
      ? gerarParcelas(novoTotal, novasQtd, novaData, novaParcelaCustom).map((nova) => {
          const existente = despesa.listaParcelas.find((e) => e.numero === nova.numero)
          if (existente?.pago) return { ...nova, pago: true, pagamentos: existente.pagamentos }
          return { ...nova, pagamentos: existente?.pagamentos ?? [] }
        })
      : despesa.listaParcelas

    await updateDoc(doc(db, 'despesas', id), {
      ...stripUndefined(form as Record<string, any>),
      valorParcela: novaValorParcela,
      ...(form.tipo === 'financiamento' ? { saldoDevedor: novoTotal } : {}),
      listaParcelas,
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => {
    await deleteDoc(doc(db, 'despesas', id))
  }

  // Remove valores undefined de um objeto antes de salvar no Firestore
  const stripUndefined = (obj: Record<string, any>): Record<string, any> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

  // Registra pagamento em uma parcela específica
  const pagarParcela = async (despesaId: string, numeroParcela: number, pagamento: Omit<Pagamento, 'id' | 'userId'>) => {
    const despesa = despesas.find((d) => d.id === despesaId)
    if (!despesa) return

    const novoPagamento = stripUndefined({ ...pagamento, id: crypto.randomUUID(), userId: userId! })

    const listaParcelas = despesa.listaParcelas.map((p) => {
      if (p.numero !== numeroParcela) return p
      const pagamentos = [...p.pagamentos, novoPagamento as Pagamento]
      const totalPago = pagamentos.reduce((s, pg) => s + pg.valor, 0)
      return { ...p, pagamentos, pago: totalPago >= p.valor }
    })

    const todasParcelasPagas = listaParcelas.every((p) => p.pago)

    await updateDoc(doc(db, 'despesas', despesaId), {
      listaParcelas,
      pago: todasParcelasPagas,
      atualizadoEm: serverTimestamp(),
    })
  }

  const adicionarAdiantamento = async (
    id: string,
    adiantamento: Omit<Pagamento, 'id' | 'userId'>,
    parcelasQuitadas?: number
  ) => {
    const despesa = despesas.find((d) => d.id === id)
    if (!despesa) return
    const novoAdiantamento = stripUndefined({ ...adiantamento, id: crypto.randomUUID(), userId: userId! }) as Pagamento
    const updates: Record<string, any> = {
      adiantamentos: [...(despesa.adiantamentos || []), novoAdiantamento],
      atualizadoEm: serverTimestamp(),
    }
    if (despesa.tipo === 'financiamento') {
      updates.saldoDevedor = Math.max(0, (despesa.saldoDevedor ?? despesa.valorTotal) - adiantamento.valor)

      if (parcelasQuitadas && parcelasQuitadas > 0) {
        // Quita as últimas N parcelas não pagas (amortização reduz o prazo pelo final)
        const impagas = [...(despesa.listaParcelas ?? [])]
          .filter((p) => !p.pago)
          .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
          .slice(0, parcelasQuitadas)
        const numerosQuitados = new Set(impagas.map((p) => p.numero))
        const novaLista = (despesa.listaParcelas ?? []).map((p) =>
          numerosQuitados.has(p.numero) ? { ...p, pago: true } : p
        )
        updates.listaParcelas = novaLista
        updates.pago = novaLista.every((p) => p.pago)
      }
    }
    await updateDoc(doc(db, 'despesas', id), updates)
  }

  const removerPagamento = async (despesaId: string, numeroParcela: number, pagamentoId: string) => {
    const despesa = despesas.find((d) => d.id === despesaId)
    if (!despesa) return

    const listaParcelas = despesa.listaParcelas.map((p) => {
      if (p.numero !== numeroParcela) return p
      const pagamentos = p.pagamentos.filter((pg) => pg.id !== pagamentoId)
      const totalPago = pagamentos.reduce((s, pg) => s + pg.valor, 0)
      return { ...p, pagamentos, pago: totalPago >= p.valor }
    })

    const todasParcelasPagas = listaParcelas.every((p) => p.pago)

    await updateDoc(doc(db, 'despesas', despesaId), {
      listaParcelas,
      pago: todasParcelasPagas,
      atualizadoEm: serverTimestamp(),
    })
  }

  return { despesas, loading, criar, editar, remover, pagarParcela, removerPagamento, adicionarAdiantamento }
}