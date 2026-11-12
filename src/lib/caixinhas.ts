import type { Caixinha, InfoFamilia } from '../types'
import { chavePessoal } from './escopo'

/** "Você" para quem está usando; nome do membro para os demais. */
export function nomePessoa(uid: string | undefined, familia?: InfoFamilia, meuUid?: string): string | null {
  if (!uid) return null
  if (uid === meuUid) return 'Você'
  return familia?.membros.find((m) => m.uid === uid)?.nome ?? null
}

/**
 * Quem criou a caixinha.
 * Caixinhas novas guardam `criadoPor`; nas antigas só dá para saber quando é pessoal
 * (fica guardada na chave da pessoa).
 */
export function criadorDaCaixinha(c: Caixinha, familia?: InfoFamilia): string | undefined {
  if (c.criadoPor) return c.criadoPor
  const membro = familia?.membros.find((m) => c.userId === chavePessoal(m.uid) || (c.userId === m.uid && m.uid !== familia.ownerUid))
  return membro?.uid
}

/** Aportes do mês agrupados por pessoa (quem não foi registrado entra como "sem autor"). */
export function aportesPorPessoa(c: Caixinha, ano: number, mes: number): { uid?: string; valor: number }[] {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}`
  const mapa = new Map<string, number>()
  for (const m of c.historico ?? []) {
    if (m.tipo !== 'entrada' || !m.data.startsWith(prefixo)) continue
    const k = m.userId ?? ''
    mapa.set(k, (mapa.get(k) ?? 0) + m.valor)
  }
  return [...mapa.entries()]
    .map(([uid, valor]) => ({ uid: uid || undefined, valor }))
    .sort((a, b) => b.valor - a.valor)
}
