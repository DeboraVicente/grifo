import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, Timestamp, deleteField,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { registrarErroLeitura } from '../lib/erros'
import { chavePessoal } from '../lib/escopo'
import { migrarParaPrivado, despesaUsa } from '../lib/privados'
import type { CartaoCredito, CartaoCreditoForm } from '../types'

export type RemoverCartaoResultado = 'ok' | 'vinculado' | 'erro'

/**
 * Cartões de crédito do usuário. São sempre privados (chave p_<uid>).
 * `familiaId` só é usado para checar se alguma despesa da família usa o cartão antes de excluir.
 */
export function useCartoes(meuUid: string | undefined, familiaId?: string) {
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const userId = meuUid ? chavePessoal(meuUid) : undefined

  useEffect(() => {
    if (!userId || !meuUid) return
    migrarParaPrivado('cartoes', meuUid)
    const q = query(
      collection(db, 'cartoes'),
      where('userId', '==', userId),
      orderBy('nome')
    )
    return onSnapshot(q, (snap) => {
      setCartoes(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        criadoEm: (d.data().criadoEm as Timestamp)?.toDate().toISOString() ?? '',
      })) as CartaoCredito[])
    }, (err) => registrarErroLeitura('Cartões', err))
  }, [userId, meuUid])

  const criar = async (form: CartaoCreditoForm) => {
    if (!userId) return
    const dados: Record<string, any> = { ...form, userId, criadoEm: serverTimestamp() }
    if (form.diaVencimento == null) delete dados.diaVencimento
    if (form.melhorDiaCompra == null) delete dados.melhorDiaCompra
    if (form.contaId == null) delete dados.contaId
    await addDoc(collection(db, 'cartoes'), dados)
  }

  const editar = async (id: string, form: CartaoCreditoForm) => {
    await updateDoc(doc(db, 'cartoes', id), {
      nome: form.nome,
      bandeira: form.bandeira ?? deleteField(),
      limite: form.limite ?? deleteField(),
      diaVencimento: form.diaVencimento ?? deleteField(),
      melhorDiaCompra: form.melhorDiaCompra ?? deleteField(),
      contaId: form.contaId ?? deleteField(),
    })
  }

  const remover = async (id: string): Promise<RemoverCartaoResultado> => {
    try {
      // Verifica se há despesas vinculadas a este cartão (da família, pessoais ou antigas)
      const donos = [...new Set([userId, meuUid, familiaId].filter(Boolean) as string[])]
      if (await despesaUsa('cartaoId', id, donos)) return 'vinculado'

      await deleteDoc(doc(db, 'cartoes', id))
      return 'ok'
    } catch {
      return 'erro'
    }
  }

  return { cartoes, criar, editar, remover }
}
