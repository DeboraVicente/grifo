import { Briefcase, Laptop, TrendingUp, Coins } from 'lucide-react'
import type { CategoriaReceita } from '../../types'

const ICONES = { salario: Briefcase, freelance: Laptop, investimento: TrendingUp, outros: Coins }

/** Ícone da categoria de receita (equivalente ao CategoryIcon das despesas). */
export default function IconeReceita({ categoria, size = 18 }: { categoria: CategoriaReceita; size?: number }) {
  const Icone = ICONES[categoria] ?? Coins
  return <Icone size={size} color="#27AE60" />
}
