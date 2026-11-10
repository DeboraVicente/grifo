import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sessaoEncerrada } from '../lib/erros'

export interface MembroFamilia {
  uid: string
  nome: string
  email: string
}

export interface Familia {
  id: string
  ownerUid: string
  membros: string[]
  nomes: Record<string, string>
  emails: Record<string, string>
  conviteToken?: string
  conviteExpira?: number // timestamp ms
}

export type ResultadoConvite = 'aceito' | 'ja-membro' | 'invalido' | 'tem-membros'

function gerarToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/** Volta o usuário para a própria família (familiaId = seu uid). */
async function voltarParaPropriaFamilia(uid: string) {
  await setDoc(doc(db, 'perfis', uid), { familiaId: uid }, { merge: true })
}

export function useFamilia(familiaId: string | undefined, uid: string | undefined, displayName?: string | null, email?: string | null) {
  const [familia, setFamilia] = useState<Familia | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familiaId || !uid) { setFamilia(null); setLoading(false); return }
    setLoading(true)

    const ref = doc(db, 'familias', familiaId)
    const ehMinha = familiaId === uid

    // A própria família é criada na primeira vez; a de outra pessoa nunca é criada aqui
    if (ehMinha) {
      getDoc(ref).then(async (snap) => {
        if (!snap.exists()) {
          await setDoc(ref, {
            id: uid,
            ownerUid: uid,
            membros: [uid],
            nomes: { [uid]: displayName ?? '' },
            emails: { [uid]: email ?? '' },
          })
        }
      }).catch((err) => console.error('Erro ao criar família:', err))
    }

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setFamilia(null)
        setLoading(false)
        // A família para a qual o perfil aponta não existe mais
        if (!ehMinha) voltarParaPropriaFamilia(uid).catch(console.error)
        return
      }
      const data = snap.data() as Familia
      if (!data.membros?.includes(uid)) {
        // Fui removido da família pelo dono
        setFamilia(null)
        setLoading(false)
        if (!ehMinha) voltarParaPropriaFamilia(uid).catch(console.error)
        return
      }
      setFamilia(data)
      setLoading(false)

      // Mantém nome/email atualizados na família
      const nome = displayName || ''
      if (nome && (data.nomes?.[uid] !== nome || data.emails?.[uid] !== (email ?? ''))) {
        updateDoc(ref, { [`nomes.${uid}`]: nome, [`emails.${uid}`]: email ?? '' }).catch(console.error)
      }
    }, (err) => {
      // Sessão encerrada (saída/exclusão de conta): nada a fazer
      if (sessaoEncerrada(err)) return
      // Sem permissão de leitura = não sou mais membro
      console.error('Família:', err)
      setFamilia(null)
      setLoading(false)
      if (!ehMinha && err.code === 'permission-denied') voltarParaPropriaFamilia(uid).catch(console.error)
    })

    return unsub
  }, [familiaId, uid, displayName, email])

  const gerarConvite = async (): Promise<string | null> => {
    if (!familiaId) return null
    const token = gerarToken()
    const expira = Date.now() + 48 * 60 * 60 * 1000 // 48h
    await updateDoc(doc(db, 'familias', familiaId), { conviteToken: token, conviteExpira: expira })
    return `${window.location.origin}/?convite=${token}&familia=${familiaId}`
  }

  const removerDe = async (alvoFamiliaId: string, dados: Familia, membroUid: string) => {
    const nomes = { ...dados.nomes }
    const emails = { ...dados.emails }
    delete nomes[membroUid]
    delete emails[membroUid]
    await updateDoc(doc(db, 'familias', alvoFamiliaId), {
      membros: dados.membros.filter((m) => m !== membroUid),
      nomes,
      emails,
    })
  }

  const aceitarConvite = async (token: string, familiaAlvo: string): Promise<ResultadoConvite> => {
    if (!uid) return 'invalido'
    if (familiaAlvo === familiaId && familia?.membros.includes(uid)) return 'ja-membro'
    // Dono de uma família com outros membros não pode sair dela para entrar em outra
    if (familiaId === uid && familia && familia.membros.length > 1) return 'tem-membros'

    try {
      // As regras do Firestore validam o token e a validade do convite
      await updateDoc(doc(db, 'familias', familiaAlvo), {
        membros: arrayUnion(uid),
        [`nomes.${uid}`]: displayName || email || '',
        [`emails.${uid}`]: email ?? '',
        conviteUsado: token,
      })
    } catch (err) {
      console.error('Convite recusado:', err)
      return 'invalido'
    }

    // Se estava em outra família (não a própria), sai dela
    if (familiaId && familiaId !== uid && familiaId !== familiaAlvo && familia) {
      await removerDe(familiaId, familia, uid).catch(console.error)
    }

    await setDoc(doc(db, 'perfis', uid), {
      uid,
      nome: displayName ?? '',
      email: email ?? '',
      familiaId: familiaAlvo,
    }, { merge: true })

    return 'aceito'
  }

  /** Membro sai da família por conta própria. */
  const sairDaFamilia = async () => {
    if (!familiaId || !familia || !uid) return
    if (familia.ownerUid === uid) return // dono não sai
    await removerDe(familiaId, familia, uid)
    await voltarParaPropriaFamilia(uid)
  }

  /** Dono remove um membro. O perfil do membro é corrigido no próximo acesso dele. */
  const removerMembro = async (membroUid: string) => {
    if (!familiaId || !familia || !uid) return
    if (familia.ownerUid !== uid || membroUid === uid) return
    await removerDe(familiaId, familia, membroUid)
  }

  const membrosDetalhados: MembroFamilia[] = (familia?.membros ?? []).map((m) => ({
    uid: m,
    nome: familia?.nomes?.[m] ?? '',
    email: familia?.emails?.[m] ?? '',
  }))

  return { familia, loading, membrosDetalhados, gerarConvite, aceitarConvite, sairDaFamilia, removerMembro }
}
