import { useState, useEffect } from 'react'
import {
  collection, query, where,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { assinarDonos, donosVisiveis, donoPorEscopo } from '../lib/escopo'
import type { Caixinha, CaixinhaForm, MovimentoCaixinha } from '../types'

function normalizarCaixinha(d: any): Caixinha {
  const raw = d.data()
  return {
    id: d.id, ...raw,
    valorAtual: raw.valorAtual ?? 0,
    historico: raw.historico ?? [],
    escopo: raw.escopo ?? 'familiar',
    criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
    atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
  } as Caixinha
}

export function useCaixinhas(familiaId: string | undefined, meuUid?: string) {
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familiaId) { setLoading(false); return }
    return assinarDonos(
      donosVisiveis(familiaId, meuUid),
      (userId) => query(collection(db, 'caixinhas'), where('userId', '==', userId)),
      normalizarCaixinha,
      (itens) => {
        itens.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        setCaixinhas(itens)
        setLoading(false)
      },
    )
  }, [familiaId, meuUid])

  const criar = async (form: CaixinhaForm) => {
    if (!familiaId) return
    const uid = donoPorEscopo(form.escopo, familiaId, meuUid)
    const valorInicial = form.valorInicial ?? 0
    const historico = valorInicial > 0 ? [{
      id: crypto.randomUUID(), tipo: 'entrada', valor: valorInicial,
      data: new Date().toISOString().split('T')[0], observacao: 'Valor inicial',
    }] : []
    await addDoc(collection(db, 'caixinhas'), {
      nome: form.nome, categoria: form.categoria,
      valorMeta: form.valorMeta ?? null, metaMensal: form.metaMensal ?? null,
      dataObjetivo: form.dataObjetivo ?? null,
      escopo: form.escopo ?? 'familiar',
      valorAtual: valorInicial, historico, userId: uid,
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    })
  }

  // Dono dos dados conforme o escopo: pessoal = meu uid, familiar = família
  const editar = async (id: string, form: Partial<CaixinhaForm>) => {
    await updateDoc(doc(db, 'caixinhas', id), {
      ...form, valorMeta: form.valorMeta ?? null,
      ...(form.escopo && familiaId ? { userId: donoPorEscopo(form.escopo, familiaId, meuUid) } : {}),
      metaMensal: form.metaMensal ?? null, dataObjetivo: form.dataObjetivo ?? null,
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => { await deleteDoc(doc(db, 'caixinhas', id)) }

  const adicionarMovimento = async (id: string, tipo: 'entrada' | 'saida' | 'rendimento', dados: { valor: number; data: string; observacao: string }) => {
    const caixinha = caixinhas.find((c) => c.id === id)
    if (!caixinha) return
    const novoSaldo = tipo === 'saida' ? Math.max(0, caixinha.valorAtual - dados.valor) : caixinha.valorAtual + dados.valor
    const movimento: MovimentoCaixinha = { id: crypto.randomUUID(), tipo, valor: dados.valor, data: dados.data, observacao: dados.observacao || '' }
    await updateDoc(doc(db, 'caixinhas', id), {
      valorAtual: novoSaldo, historico: [...(caixinha.historico ?? []), movimento], atualizadoEm: serverTimestamp(),
    })
  }

  /** Desfaz um movimento lançado errado: tira do histórico e corrige o saldo. */
  const removerMovimento = async (id: string, movimentoId: string) => {
    const caixinha = caixinhas.find((c) => c.id === id)
    const mov = caixinha?.historico.find((m) => m.id === movimentoId)
    if (!caixinha || !mov) return
    const delta = mov.tipo === 'saida' ? mov.valor : -mov.valor
    await updateDoc(doc(db, 'caixinhas', id), {
      valorAtual: Math.max(0, caixinha.valorAtual + delta),
      historico: caixinha.historico.filter((m) => m.id !== movimentoId),
      atualizadoEm: serverTimestamp(),
    })
  }

  return { caixinhas, loading, criar, editar, remover, adicionarMovimento, removerMovimento }
}
