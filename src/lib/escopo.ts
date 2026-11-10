import { registrarErroLeitura } from './erros'
import { onSnapshot, type Query, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore'
import type { Despesa, Escopo, InfoFamilia } from '../types'

/**
 * Onde cada item fica guardado (campo userId):
 *  - familiar → familiaId (= uid do dono da família)
 *  - pessoal  → "p_<uid>" (chave só da pessoa; nem o dono da família lê)
 *  - legado   → uid de um membro que não é dono (itens pessoais antigos ou de antes de entrar na família)
 */
export const chavePessoal = (uid: string) => `p_${uid}`

export interface Dono { userId: string; escopo: Escopo }

/** Todos os "donos" de dados que o usuário enxerga. */
export function donosVisiveis(familiaId: string, meuUid?: string): Dono[] {
  const donos: Dono[] = [{ userId: familiaId, escopo: 'familiar' }]
  if (meuUid) {
    donos.push({ userId: chavePessoal(meuUid), escopo: 'pessoal' })
    if (meuUid !== familiaId) donos.push({ userId: meuUid, escopo: 'pessoal' })
  }
  return donos
}

/** userId onde gravar um item conforme o escopo escolhido. */
export function donoPorEscopo(escopo: Escopo | undefined, familiaId: string, meuUid?: string): string {
  return escopo === 'pessoal' && meuUid ? chavePessoal(meuUid) : familiaId
}

/**
 * Assina uma consulta por dono e junta os resultados.
 * O escopo de cada item vem de onde ele está guardado, não do campo salvo.
 * `aoAtualizar` só é chamado depois que todas as consultas responderam.
 */
export function assinarDonos<T>(
  donos: Dono[],
  criarQuery: (userId: string) => Query<DocumentData>,
  normalizar: (d: QueryDocumentSnapshot<DocumentData>) => T,
  aoAtualizar: (itens: (T & { escopo: Escopo })[]) => void,
): () => void {
  const dados = new Map<string, (T & { escopo: Escopo })[]>()
  const emitir = () => {
    if (dados.size < donos.length) return
    aoAtualizar(donos.flatMap((d) => dados.get(d.userId) ?? []))
  }
  const unsubs = donos.map(({ userId, escopo }) =>
    onSnapshot(criarQuery(userId), (snap) => {
      dados.set(userId, snap.docs.map((d) => ({ ...normalizar(d), escopo })))
      emitir()
    }, (err) => {
      registrarErroLeitura(`Erro ao carregar dados (${userId})`, err)
      dados.set(userId, [])
      emitir()
    }),
  )
  return () => unsubs.forEach((u) => u())
}

// ─── Visão Tudo · Família · Pessoal ─────────────────────────────────────────

export type VisaoEscopo = 'tudo' | Escopo

/** Filtra uma lista pela visão escolhida (itens sem escopo contam como familiares). */
export function filtrarPorVisao<T extends { escopo?: Escopo }>(itens: T[], visao: VisaoEscopo): T[] {
  if (visao === 'tudo') return itens
  return itens.filter((i) => (i.escopo ?? 'familiar') === visao)
}

/** Texto curto que diz de quem é a despesa: "Pessoal" ou "pago por <nome>". */
export function etiquetaDespesa(d: Despesa, familia?: InfoFamilia): { tipo: 'pessoal' | 'familiar'; texto: string } | null {
  if (d.escopo === 'pessoal') return { tipo: 'pessoal', texto: 'Pessoal' }
  if (!familia || familia.membros.length < 2) return null
  const uid = d.pagoPor && familia.membros.some((m) => m.uid === d.pagoPor) ? d.pagoPor : familia.ownerUid
  const nome = familia.membros.find((m) => m.uid === uid)?.nome || 'Membro'
  return { tipo: 'familiar', texto: `Família · pago por ${nome}` }
}
