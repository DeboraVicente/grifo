import type { Receita, CategoriaReceita } from '../types'
import { receitasDoMes } from '../hooks/useRelatorios'

export const CATEGORIA_RECEITA_LABEL: Record<CategoriaReceita, string> = {
  salario: 'Salário',
  freelance: 'Freelance',
  investimento: 'Investimento',
  outros: 'Outros',
}

export type FiltroReceita = 'todas' | 'recorrentes' | 'avulsas'

/** Uma receita como ela aparece num mês (recorrentes ganham a data daquele mês). */
export interface LinhaReceita {
  receita: Receita
  dataNoMes: string
}

/** Receitas que entram no mês, com a data em que caem nele. */
export function linhasDoMes(receitas: Receita[], mes: number, ano: number): LinhaReceita[] {
  return receitasDoMes(receitas, mes, ano).map((r) => {
    if (!r.recorrente) return { receita: r, dataNoMes: r.data }
    const dia = Number(r.data.split('-')[2]) || 1
    const ultimo = new Date(ano, mes + 1, 0).getDate()
    const d = String(Math.min(dia, ultimo)).padStart(2, '0')
    return { receita: r, dataNoMes: `${ano}-${String(mes + 1).padStart(2, '0')}-${d}` }
  }).sort((a, b) => a.dataNoMes.localeCompare(b.dataNoMes))
}

export function filtrarReceitas(linhas: LinhaReceita[], filtro: FiltroReceita): LinhaReceita[] {
  if (filtro === 'recorrentes') return linhas.filter((l) => l.receita.recorrente)
  if (filtro === 'avulsas') return linhas.filter((l) => !l.receita.recorrente)
  return linhas
}

export function resumoReceitas(linhas: LinhaReceita[]) {
  const recorrente = linhas.filter((l) => l.receita.recorrente).reduce((s, l) => s + l.receita.valor, 0)
  const avulso = linhas.filter((l) => !l.receita.recorrente).reduce((s, l) => s + l.receita.valor, 0)
  return { total: recorrente + avulso, recorrente, avulso }
}

export const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtDiaMes = (data: string) =>
  new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
