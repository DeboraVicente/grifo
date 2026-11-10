import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDocs, limit,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { registrarErroLeitura } from '../lib/erros'
import { chavePessoal } from '../lib/escopo'
import { migrarParaPrivado, despesaUsa } from '../lib/privados'
import type { Conta, ContaForm } from '../types'

export type RemoverContaResultado = 'ok' | 'vinculada' | 'erro'

/**
 * Contas bancárias do usuário. São sempre privadas (chave p_<uid>).
 * `familiaId` só é usado para checar se alguma despesa da família usa a conta antes de excluir.
 */
export function useContas(meuUid: string | undefined, familiaId?: string) {
  const [contas, setContas] = useState<Conta[]>([])
  const userId = meuUid ? chavePessoal(meuUid) : undefined

  useEffect(() => {
    if (!userId || !meuUid) return
    migrarParaPrivado('contas', meuUid)
    const q = query(
      collection(db, 'contas'),
      where('userId', '==', userId),
      orderBy('nome')
    )
    return onSnapshot(q, (snap) => {
      setContas(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        criadoEm: (d.data().criadoEm as Timestamp)?.toDate().toISOString() ?? '',
      })) as Conta[])
    }, (err) => registrarErroLeitura('Contas', err))
  }, [userId, meuUid])

  const criar = async (form: ContaForm) => {
    if (!userId) return
    await addDoc(collection(db, 'contas'), { ...form, userId, criadoEm: serverTimestamp() })
  }

  const editar = async (id: string, form: ContaForm) => {
    await updateDoc(doc(db, 'contas', id), { nome: form.nome, tipo: form.tipo })
  }

  const remover = async (id: string): Promise<RemoverContaResultado> => {
    try {
      // Verifica se há despesas vinculadas (da família, pessoais ou antigas)
      const donos = [...new Set([userId, meuUid, familiaId].filter(Boolean) as string[])]
      if (await despesaUsa('contaId', id, donos)) return 'vinculada'

      // Verifica se há cartões vinculados
      const qc = query(collection(db, 'cartoes'), where('userId', '==', userId), where('contaId', '==', id), limit(1))
      const sc = await getDocs(qc)
      if (!sc.empty) return 'vinculada'

      await deleteDoc(doc(db, 'contas', id))
      return 'ok'
    } catch {
      return 'erro'
    }
  }

  return { contas, criar, editar, remover }
}
