import { collection, query, where, getDocs, writeBatch, limit } from 'firebase/firestore'
import { db } from './firebase'
import { chavePessoal } from './escopo'

/**
 * Contas bancárias e cartões são sempre privados: ficam em "p_<uid>",
 * que só a própria pessoa lê (nem a dona da família).
 *
 * Antes eles ficavam no uid da pessoa, que para a dona é também o espaço da família.
 * Esta migração move o que ainda estiver lá para a chave privada. É idempotente:
 * depois da primeira vez a consulta volta vazia.
 */
const migrados = new Set<string>()

export async function migrarParaPrivado(colecao: 'contas' | 'cartoes', uid: string) {
  const chave = `${colecao}:${uid}`
  if (migrados.has(chave)) return
  migrados.add(chave)
  try {
    const snap = await getDocs(query(collection(db, colecao), where('userId', '==', uid), limit(450)))
    if (snap.empty) return
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.update(d.ref, { userId: chavePessoal(uid) }))
    await batch.commit()
  } catch (err) {
    migrados.delete(chave) // tenta de novo na próxima vez
    console.error(`Migração de ${colecao} para privado:`, err)
  }
}

/** Existe alguma despesa (família, pessoal ou legado) usando este campo/id? */
export async function despesaUsa(campo: 'contaId' | 'cartaoId', id: string, donos: string[]): Promise<boolean> {
  for (const dono of donos) {
    const snap = await getDocs(query(collection(db, 'despesas'), where('userId', '==', dono), where(campo, '==', id), limit(1)))
    if (!snap.empty) return true
  }
  return false
}
