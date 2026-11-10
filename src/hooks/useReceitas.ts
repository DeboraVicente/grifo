import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, getDocs, writeBatch,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
  type Query, type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { chavePessoal } from '../lib/escopo'
import { registrarErroLeitura } from '../lib/erros'
import type { Receita, CategoriaReceita, Escopo } from '../types'

export type ReceitaForm = {
  nome: string
  valor: number
  data: string
  categoria: CategoriaReceita
  recorrente: boolean
  /** Mantidos por compatibilidade; receitas são sempre de quem lançou */
  escopo?: Escopo
  recebidoPor?: string
}

/*
 * Como as receitas funcionam:
 *  - Cada receita fica no espaço de quem recebeu (userId = p_<uid>, recebidoPor = uid);
 *    só essa pessoa edita, e a tela de Receitas mostra só as suas.
 *  - A receita leva familiaId; os membros da família podem LER as receitas da família
 *    para o rateio proporcional à renda (ver firestore.rules → lidaPelaFamilia).
 *  - Receitas antigas (no espaço da família ou no uid) são migradas para esse formato.
 */

function normalizarReceita(d: QueryDocumentSnapshot<DocumentData>): Receita {
  const raw = d.data()
  return {
    id: d.id, ...raw,
    criadoEm: (raw.criadoEm as Timestamp)?.toDate().toISOString() ?? '',
    atualizadoEm: (raw.atualizadoEm as Timestamp)?.toDate().toISOString() ?? '',
  } as Receita
}

/** Assina várias consultas e junta os resultados (sem repetir ids) quando todas responderem. */
function assinarJuntas(consultas: Query<DocumentData>[], aoAtualizar: (itens: Receita[]) => void, contexto: string) {
  const dados = new Map<number, Receita[]>()
  const emitir = () => {
    if (dados.size < consultas.length) return
    const porId = new Map<string, Receita>()
    consultas.forEach((_, i) => (dados.get(i) ?? []).forEach((r) => porId.set(r.id, r)))
    aoAtualizar([...porId.values()].sort((a, b) => b.data.localeCompare(a.data)))
  }
  const unsubs = consultas.map((q, i) => onSnapshot(q, (snap) => {
    dados.set(i, snap.docs.map(normalizarReceita)); emitir()
  }, (err) => {
    registrarErroLeitura(contexto, err); dados.set(i, []); emitir()
  }))
  return () => unsubs.forEach((u) => u())
}

/** Dono de uma receita antiga sem recebidoPor: a dona da família. */
const quemRecebeu = (r: Receita, ownerUid: string) => r.recebidoPor ?? ownerUid

const migradas = new Set<string>()

/** Move receitas antigas para o espaço privado de quem recebeu, com o familiaId atual. */
async function migrarReceitas(uid: string, familiaId: string, ownerUid: string) {
  const chave = `${uid}:${familiaId}`
  if (migradas.has(chave)) return
  migradas.add(chave)
  try {
    const pessoal = chavePessoal(uid)
    const origens = [...new Set([familiaId, uid, pessoal])]
    const batch = writeBatch(db)
    let n = 0
    for (const origem of origens) {
      const snap = await getDocs(query(collection(db, 'receitas'), where('userId', '==', origem)))
      snap.docs.forEach((d) => {
        const r = normalizarReceita(d)
        // No espaço da família só movo as minhas (as de outro membro, ele mesmo move)
        if (origem === familiaId && quemRecebeu(r, ownerUid) !== uid) return
        const jaOk = r.userId === pessoal && r.recebidoPor === uid && (r as Receita & { familiaId?: string }).familiaId === familiaId
        if (jaOk || n >= 450) return
        batch.update(d.ref, { userId: pessoal, recebidoPor: uid, familiaId, escopo: 'pessoal' })
        n++
      })
    }
    if (n > 0) await batch.commit()
  } catch (err) {
    migradas.delete(chave)
    console.error('Migração de receitas:', err)
  }
}

/**
 * @param familiaId família atual (= uid da dona)
 * @param meuUid    usuário logado
 * @param membros   uids dos membros da família (para ler as receitas usadas no rateio)
 * @param ownerUid  dona da família (dona das receitas antigas sem "recebido por")
 */
export function useReceitas(familiaId: string | undefined, meuUid?: string, membros: string[] = [], ownerUid?: string) {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [receitasFamilia, setReceitasFamilia] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const dona = ownerUid ?? familiaId ?? ''
  const membrosChave = [...membros].sort().join(',')

  // Minhas receitas (tela de Receitas e visões Tudo/Pessoal)
  useEffect(() => {
    if (!familiaId || !meuUid) { setLoading(false); return }
    migrarReceitas(meuUid, familiaId, dona)
    const origens = [...new Set([chavePessoal(meuUid), familiaId, meuUid])]
    return assinarJuntas(
      origens.map((u) => query(collection(db, 'receitas'), where('userId', '==', u))),
      (itens) => {
        // Antes da migração terminar, as antigas da família aparecem filtradas por quem recebeu
        setReceitas(itens.filter((r) => quemRecebeu(r, dona) === meuUid || r.userId === chavePessoal(meuUid)))
        setLoading(false)
      },
      'Receitas',
    )
  }, [familiaId, meuUid, dona])

  // Receitas de todos os membros (só para o rateio; nunca listadas na tela)
  useEffect(() => {
    if (!familiaId || !meuUid) return
    const uids = membrosChave ? membrosChave.split(',') : []
    if (uids.length < 2) { setReceitasFamilia([]); return }
    return assinarJuntas([
      query(collection(db, 'receitas'), where('familiaId', '==', familiaId), where('recebidoPor', 'in', uids.slice(0, 30))),
      // Receitas antigas ainda no espaço da família (o membro ainda não abriu o app)
      query(collection(db, 'receitas'), where('userId', '==', familiaId)),
    ], setReceitasFamilia, 'Receitas da família')
  }, [familiaId, meuUid, membrosChave])

  const criar = async (form: ReceitaForm) => {
    if (!familiaId || !meuUid) return
    await addDoc(collection(db, 'receitas'), {
      nome: form.nome, valor: form.valor, data: form.data,
      categoria: form.categoria, recorrente: form.recorrente,
      escopo: 'pessoal', userId: chavePessoal(meuUid), recebidoPor: meuUid, familiaId,
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    })
  }

  const editar = async (id: string, form: Partial<ReceitaForm>) => {
    if (!familiaId || !meuUid) return
    await updateDoc(doc(db, 'receitas', id), {
      ...(form.nome !== undefined ? { nome: form.nome } : {}),
      ...(form.valor !== undefined ? { valor: form.valor } : {}),
      ...(form.data !== undefined ? { data: form.data } : {}),
      ...(form.categoria !== undefined ? { categoria: form.categoria } : {}),
      ...(form.recorrente !== undefined ? { recorrente: form.recorrente } : {}),
      escopo: 'pessoal', userId: chavePessoal(meuUid), recebidoPor: meuUid, familiaId,
      atualizadoEm: serverTimestamp(),
    })
  }

  const remover = async (id: string) => { await deleteDoc(doc(db, 'receitas', id)) }

  return { receitas, receitasFamilia, loading, criar, editar, remover }
}
