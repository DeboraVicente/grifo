import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, addDoc,
  updateDoc, doc, serverTimestamp, Timestamp, getDocs, or,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Amizade, StatusAmizade } from '../types'

export function useAmizades(userId: string | undefined, userEmail: string | undefined, userName: string | undefined) {
  const [amizades, setAmizades] = useState<Amizade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    // Busca amizades onde o usuário é solicitante ou receptor
    const qSolicitante = query(collection(db, 'amizades'), where('solicitanteId', '==', userId))
    const qReceptor = query(collection(db, 'amizades'), where('receptorId', '==', userId))

    const dados = new Map<string, Amizade>()

    const processar = () => {
      const lista = Array.from(dados.values())
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      setAmizades(lista)
      setLoading(false)
    }

    const unsub1 = onSnapshot(qSolicitante, (snap) => {
      snap.docs.forEach((d) => {
        const raw = d.data()
        dados.set(d.id, {
          id: d.id, ...raw,
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
        } as Amizade)
      })
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') dados.delete(change.doc.id)
      })
      processar()
    })

    const unsub2 = onSnapshot(qReceptor, (snap) => {
      snap.docs.forEach((d) => {
        const raw = d.data()
        dados.set(d.id, {
          id: d.id, ...raw,
          criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
        } as Amizade)
      })
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') dados.delete(change.doc.id)
      })
      processar()
    })

    return () => { unsub1(); unsub2() }
  }, [userId])

  // Busca usuário por e-mail para enviar solicitação
  const buscarPorEmail = async (email: string): Promise<{ id: string; nome: string; email: string } | null> => {
    const q = query(collection(db, 'usuarios'), where('email', '==', email.toLowerCase().trim()))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, nome: d.data().nome, email: d.data().email }
  }

  const enviarSolicitacao = async (receptorEmail: string) => {
    if (!userId || !userEmail || !userName) return 'erro'

    const receptor = await buscarPorEmail(receptorEmail)
    if (!receptor) return 'nao_encontrado'
    if (receptor.id === userId) return 'mesmo_usuario'

    // Verifica se já existe amizade
    const jaExiste = amizades.some(
      (a) => (a.solicitanteId === receptor.id || a.receptorId === receptor.id) && a.status !== 'recusada'
    )
    if (jaExiste) return 'ja_existe'

    await addDoc(collection(db, 'amizades'), {
      solicitanteId: userId,
      solicitanteNome: userName,
      solicitanteEmail: userEmail,
      receptorId: receptor.id,
      receptorNome: receptor.nome,
      receptorEmail: receptor.email,
      status: 'pendente',
      criadoEm: serverTimestamp(),
    })
    return 'ok'
  }

  const responderSolicitacao = async (amizadeId: string, status: 'aceita' | 'recusada') => {
    await updateDoc(doc(db, 'amizades', amizadeId), { status })
  }

  // Retorna só amigos aceitos como lista simples
  const amigos = amizades
    .filter((a) => a.status === 'aceita')
    .map((a) => ({
      id: a.solicitanteId === userId ? a.receptorId : a.solicitanteId,
      nome: a.solicitanteId === userId ? (a.receptorNome ?? '') : a.solicitanteNome,
      email: a.solicitanteId === userId ? a.receptorEmail : a.solicitanteEmail,
    }))

  const pendentesRecebidas = amizades.filter(
    (a) => a.receptorId === userId && a.status === 'pendente'
  )

  return { amizades, amigos, pendentesRecebidas, loading, enviarSolicitacao, responderSolicitacao, buscarPorEmail }
}
