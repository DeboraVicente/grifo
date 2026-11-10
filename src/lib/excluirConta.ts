import {
  collection, query, where, getDocs, getDoc, doc, writeBatch, updateDoc, deleteDoc,
  type DocumentReference,
} from 'firebase/firestore'
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser, type User } from 'firebase/auth'
import { db } from './firebase'
import { chavePessoal } from './escopo'
import type { Familia } from '../hooks/useFamilia'

export type ResultadoExclusao = 'ok' | 'senha-incorreta' | 'tem-membros' | 'erro'

const COLECOES_DADOS = ['despesas', 'receitas', 'caixinhas', 'gastosPrevistos', 'contas', 'cartoes']

async function apagarEmLotes(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    refs.slice(i, i + 450).forEach((r) => batch.delete(r))
    await batch.commit()
  }
}

/**
 * Exclui a conta e todos os dados dela:
 *  - itens pessoais (p_<uid>) e itens guardados no próprio uid
 *    (para quem é dono: os dados da família, que só ele tem);
 *  - família própria, perfil e registros legados;
 *  - por fim, o usuário do Firebase Auth.
 * Dados familiares de uma família da qual a pessoa é só membro continuam com a família.
 */
export async function excluirConta(user: User, senha: string): Promise<ResultadoExclusao> {
  // 1. Confirma a identidade antes de apagar qualquer coisa
  try {
    const cred = EmailAuthProvider.credential(user.email ?? '', senha)
    await reauthenticateWithCredential(user, cred)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'senha-incorreta'
    if (code === 'auth/multi-factor-auth-required') return 'erro'
    console.error(e)
    return 'erro'
  }

  const uid = user.uid
  try {
    // 2. Família: dono com outros membros precisa removê-los antes
    const minhaFamilia = await getDoc(doc(db, 'familias', uid))
    if (minhaFamilia.exists() && ((minhaFamilia.data() as Familia).membros?.length ?? 0) > 1) {
      return 'tem-membros'
    }

    // Se é membro de outra família, sai dela
    const perfil = await getDoc(doc(db, 'perfis', uid))
    const familiaId = perfil.exists() ? (perfil.data().familiaId as string | undefined) : undefined
    if (familiaId && familiaId !== uid) {
      try {
        const snap = await getDoc(doc(db, 'familias', familiaId))
        if (snap.exists()) {
          const f = snap.data() as Familia
          const nomes = { ...f.nomes }; delete nomes[uid]
          const emails = { ...f.emails }; delete emails[uid]
          await updateDoc(snap.ref, { membros: f.membros.filter((m) => m !== uid), nomes, emails })
        }
      } catch (e) { console.error('Não foi possível sair da família:', e) }
    }

    // 3. Dados financeiros (pessoais e da família própria)
    const refs: DocumentReference[] = []
    for (const col of COLECOES_DADOS) {
      for (const dono of [uid, chavePessoal(uid)]) {
        const snap = await getDocs(query(collection(db, col), where('userId', '==', dono)))
        snap.docs.forEach((d) => refs.push(d.ref))
      }
    }
    // Registros legados de amizades
    for (const campo of ['solicitanteId', 'receptorId']) {
      const snap = await getDocs(query(collection(db, 'amizades'), where(campo, '==', uid)))
      snap.docs.forEach((d) => refs.push(d.ref))
    }
    await apagarEmLotes(refs)

    // 4. Família própria, perfil e cadastro legado
    if (minhaFamilia.exists()) await deleteDoc(minhaFamilia.ref)
    await deleteDoc(doc(db, 'perfis', uid))
    await deleteDoc(doc(db, 'usuarios', uid))

    // 5. Usuário de autenticação
    await deleteUser(user)
    return 'ok'
  } catch (e) {
    console.error('Erro ao excluir conta:', e)
    return 'erro'
  }
}
