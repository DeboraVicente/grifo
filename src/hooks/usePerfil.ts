import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { registrarErroLeitura } from '../lib/erros'

export interface Perfil {
  uid: string
  nome: string
  email: string
  familiaId: string // = uid do dono da família
}

export function usePerfil(uid: string | undefined) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }

    const ref = doc(db, 'perfis', uid)

    // Garante que o perfil existe (cria na primeira vez)
    getDoc(ref).then(async (snap) => {
      if (!snap.exists()) {
        const novo: Perfil = { uid, nome: '', email: '', familiaId: uid }
        await setDoc(ref, novo)
      }
    })

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Perfil
        // Garante fallback: se familiaId não existe, usa o próprio uid
        setPerfil({ ...data, familiaId: data.familiaId ?? uid })
      } else {
        setPerfil({ uid, nome: '', email: '', familiaId: uid })
      }
      setLoading(false)
    }, (err) => {
      registrarErroLeitura('Perfil', err)
      setLoading(false)
    })

    return unsub
  }, [uid])

  return { perfil, loading }
}
