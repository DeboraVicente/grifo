import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  deleteField,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { assinarDonos, donosVisiveis, donoPorEscopo } from '../lib/escopo'
import { calcularPagamento } from '../lib/pagamentos'
import type { Despesa, DespesaForm, Pagamento, Parcela } from '../types'

function avancarMes(dateStr: string, meses: number): string {
  const [ano, mes, dia] = dateStr.split('-').map(Number)
  const d = new Date(ano, mes - 1 + meses, dia)
  return d.toISOString().split('T')[0]
}

function gerarParcelas(valorTotal: number, qtd: number, dataInicial: string, valorParcelaOverride?: number): Parcela[] {
  const valorParcela = valorParcelaOverride ?? parseFloat((valorTotal / qtd).toFixed(2))
  const [ano, mes, dia] = dataInicial.split('-').map(Number)
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(ano, mes - 1 + i, dia)
    return { numero: i + 1, valor: valorParcela, dataVencimento: d.toISOString().split('T')[0], pago: false, pagamentos: [] }
  })
}

function normalizarDespesa(d: any): Despesa {
  const raw = d.data()
  const valorTotal = raw.valorTotal ?? raw.valor ?? 0
  const valorParcela = raw.valorParcela ?? valorTotal
  const listaParcelas = (() => {
    if (raw.listaParcelas?.length > 0) return raw.listaParcelas
    if (valorTotal > 0 && raw.data) {
      const qtd = raw.parcelas ?? 1
      const parcelas = gerarParcelas(valorTotal, qtd, raw.data, raw.valorParcela)
      if (raw.pago) return parcelas.map((p: any) => ({ ...p, pago: true }))
      return parcelas
    }
    return []
  })()
  return {
    id: d.id, ...raw, valorTotal, valorParcela, listaParcelas,
    adiantamentos: raw.adiantamentos ?? [],
    tipoGasto: raw.tipoGasto ?? (raw.recorrente ? 'fixo' : 'variavel'),
    escopo: raw.escopo ?? 'familiar',
    criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
    atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
  } as Despesa
}

const stripUndefined = (obj: Record<string, any>): Record<string, any> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

export function useDespesas(familiaId: string | undefined, meuUid?: string) {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familiaId) { setLoading(false); return }
    return assinarDonos(
      donosVisiveis(familiaId, meuUid),
      (userId) => query(collection(db, 'despesas'), where('userId', '==', userId), orderBy('data', 'desc')),
      normalizarDespesa,
      (itens) => {
        itens.sort((a, b) => b.data.localeCompare(a.data))
        setDespesas(itens)
        setLoading(false)
      },
    )
  }, [familiaId, meuUid])

  const criar = async (form: DespesaForm, opcoes?: { jaPago?: boolean }) => {
    if (!familiaId) return
    const uid = donoPorEscopo(form.escopo, familiaId, meuUid)
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
      escopo: form.escopo ?? 'familiar',
      // Pessoal é sempre de quem lançou; familiar usa quem foi escolhido no formulário
      pagoPor: form.escopo === 'pessoal' ? (meuUid ?? null) : (form.pagoPor ?? meuUid ?? null),
      criadoPor: meuUid ?? null,
      adiantamentos: [],
      pago: false,
      userId: uid,
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
          ...baseDoc, data, dataCompra, listaParcelas,
          recorrente: true, recorrenciaId,
          criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
        })
      }
      await batch.commit()
    } else {
      let listaParcelas = gerarParcelas(form.valorTotal, form.parcelas, form.data, form.valorParcelaCustom)
      if (opcoes?.jaPago) {
        listaParcelas = listaParcelas.map((p) => ({
          ...p, pago: true,
          pagamentos: [{ id: crypto.randomUUID(), userId: uid, valor: p.valor, data: form.data }],
        }))
      }
      await addDoc(collection(db, 'despesas'), {
        ...baseDoc, pago: !!opcoes?.jaPago,
        dataCompra: form.dataCompra || null, data: form.data, listaParcelas,
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      })
    }
  }

  // Dono dos dados conforme o escopo: pessoal = meu uid, familiar = família
  const editar = async (id: string, form: Partial<DespesaForm>, opcoes?: { aplicarProximas?: boolean }) => {
    const despesa = despesas.find((d) => d.id === id)
    if (!despesa) return
    // Recorrência: aplica a mesma alteração nos meses seguintes ainda não pagos
    const proximas = opcoes?.aplicarProximas && despesa.recorrente ? proximasDaRecorrencia(despesa) : []
    if (proximas.length > 0) {
      const batch = writeBatch(db)
      const valor = form.valorTotal ?? despesa.valorTotal
      const campos = stripUndefined({
        nome: form.nome, categoria: form.categoria, metodoPagamento: form.metodoPagamento,
        tipoGasto: form.tipoGasto, observacoes: form.observacoes, escopo: form.escopo,
      } as Record<string, any>)
      for (const d of proximas) {
        batch.update(doc(db, 'despesas', d.id), {
          ...campos,
          // Campos que podem ter sido removidos no formulário
          ...('cartaoId' in form ? { cartaoId: form.cartaoId ?? deleteField() } : {}),
          ...('contaId' in form ? { contaId: form.contaId ?? deleteField() } : {}),
          ...('minhaParte' in form ? { minhaParte: form.minhaParte ?? deleteField() } : {}),
          ...(form.escopo && familiaId ? { userId: donoPorEscopo(form.escopo, familiaId, meuUid) } : {}),
          ...(form.escopo === 'pessoal' && meuUid ? { pagoPor: meuUid } : form.pagoPor ? { pagoPor: form.pagoPor } : {}),
          valorTotal: valor,
          valorParcela: valor,
          listaParcelas: gerarParcelas(valor, 1, d.data),
          atualizadoEm: serverTimestamp(),
        })
      }
      await batch.commit()
    }
    const novoTotal = form.valorTotal ?? despesa.valorTotal
    const novasQtd = form.parcelas ?? despesa.parcelas
    const novaData = form.data ?? despesa.data
    const novaParcelaCustom = form.valorParcelaCustom ?? undefined
    const regenerar = novoTotal !== despesa.valorTotal || novasQtd !== despesa.parcelas ||
      novaData !== despesa.data || (novaParcelaCustom !== undefined && novaParcelaCustom !== despesa.valorParcela)
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
      ...(despesa.recorrente && 'minhaParte' in form ? { minhaParte: form.minhaParte ?? deleteField() } : {}),
      ...(form.escopo && familiaId ? { userId: donoPorEscopo(form.escopo, familiaId, meuUid) } : {}),
      ...(form.escopo === 'pessoal' && meuUid ? { pagoPor: meuUid } : {}),
      valorParcela: novaValorParcela,
      ...(form.tipo === 'financiamento' ? { saldoDevedor: novoTotal } : {}),
      listaParcelas, atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => { await deleteDoc(doc(db, 'despesas', id)) }

  /** Meses seguintes da mesma recorrência que ainda não tiveram nenhum pagamento */
  const proximasDaRecorrencia = (despesa: Despesa) => {
    if (!despesa.recorrenciaId) return []
    return despesas.filter((d) =>
      d.recorrenciaId === despesa.recorrenciaId && d.id !== despesa.id && d.data > despesa.data && !d.pago &&
      d.listaParcelas.every((p) => !p.pago && (p.pagamentos?.length ?? 0) === 0))
  }

  /**
   * Registra um pagamento na parcela.
   * - Padrão: soma os pagamentos; a parcela só fica paga quando atinge o valor dela.
   * - ajustarValor: o valor da conta foi o que foi pago (ex.: luz prevista em 120, veio 80):
   *   a parcela passa a valer o total pago e fica paga.
   * - atualizarProximas: na recorrência, usa esse novo valor nos meses seguintes ainda não pagos.
   */
  const pagarParcela = async (
    despesaId: string,
    numeroParcela: number,
    pagamento: Omit<Pagamento, 'id' | 'userId'>,
    opcoes?: { ajustarValor?: boolean; atualizarProximas?: boolean },
  ) => {
    const despesa = despesas.find((d) => d.id === despesaId)
    if (!despesa) return
    const uid = despesa.userId
    const novoPagamento = stripUndefined({ ...pagamento, id: crypto.randomUUID(), userId: uid }) as Pagamento
    const { listaParcelas, novoValor, ajuste } = calcularPagamento(despesa, numeroParcela, novoPagamento, opcoes?.ajustarValor)

    if (opcoes?.atualizarProximas && novoValor !== null) {
      const v: number = novoValor
      const batch = writeBatch(db)
      batch.update(doc(db, 'despesas', despesaId), {
        listaParcelas, ...ajuste, pago: listaParcelas.every((p) => p.pago), atualizadoEm: serverTimestamp(),
      })
      proximasDaRecorrencia(despesa).forEach((d) => {
        batch.update(doc(db, 'despesas', d.id), {
          listaParcelas: d.listaParcelas.map((p) => ({ ...p, valor: v })),
          valorTotal: parseFloat((v * d.listaParcelas.length).toFixed(2)),
          valorParcela: v,
          atualizadoEm: serverTimestamp(),
        })
      })
      await batch.commit()
      return
    }

    await updateDoc(doc(db, 'despesas', despesaId), {
      listaParcelas, ...ajuste, pago: listaParcelas.every((p) => p.pago), atualizadoEm: serverTimestamp(),
    })
  }

  const adicionarAdiantamento = async (id: string, adiantamento: Omit<Pagamento, 'id' | 'userId'>, parcelasQuitadas?: number) => {
    const despesa = despesas.find((d) => d.id === id)
    if (!despesa) return
    const novoAdiantamento = stripUndefined({ ...adiantamento, id: crypto.randomUUID(), userId: despesa.userId }) as Pagamento
    const updates: Record<string, any> = {
      adiantamentos: [...(despesa.adiantamentos || []), novoAdiantamento],
      atualizadoEm: serverTimestamp(),
    }
    if (despesa.tipo === 'financiamento') {
      updates.saldoDevedor = Math.max(0, (despesa.saldoDevedor ?? despesa.valorTotal) - adiantamento.valor)
      if (parcelasQuitadas && parcelasQuitadas > 0) {
        const impagas = [...(despesa.listaParcelas ?? [])]
          .filter((p) => !p.pago).sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento)).slice(0, parcelasQuitadas)
        const numerosQuitados = new Set(impagas.map((p) => p.numero))
        const novaLista = (despesa.listaParcelas ?? []).map((p) => numerosQuitados.has(p.numero) ? { ...p, pago: true } : p)
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
      return { ...p, pagamentos, pago: pagamentos.reduce((s, pg) => s + pg.valor, 0) >= p.valor }
    })
    await updateDoc(doc(db, 'despesas', despesaId), {
      listaParcelas, pago: listaParcelas.every((p) => p.pago), atualizadoEm: serverTimestamp(),
    })
  }

  return { despesas, loading, proximasDaRecorrencia, criar, editar, remover, pagarParcela, removerPagamento, adicionarAdiantamento }
}
