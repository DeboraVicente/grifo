import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Despesa, Receita, Categoria } from '../../types'
import { calcRelatorioPorCategoria, fmt } from '../../hooks/useRelatorios'
import CategoryIcon from '../ui/CategoryIcon'

interface Props {
  despesas: Despesa[]
  rateiosRecebidos: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
}

const CORES = ['#C8A45A', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#95A5A6']

export default function RelatorioCategoria({ despesas, rateiosRecebidos, userId, mes, ano }: Props) {
  const dados = calcRelatorioPorCategoria(despesas, rateiosRecebidos, userId, mes, ano)

  const chartData = dados.map((d) => ({
    name: d.categoria.charAt(0).toUpperCase() + d.categoria.slice(1),
    value: d.total,
  }))

  if (dados.length === 0) {
    return <div className="estado-vazio-rel">Nenhuma despesa registrada no período</div>
  }

  return (
    <div className="relatorio-section">
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
              labelLine={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CORES[i % CORES.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="cat-tabela">
        <div className="cat-header">
          <span>Categoria</span>
          <span>Valor</span>
          <span>%</span>
        </div>
        {dados.map((d, i) => (
          <div key={d.categoria} className="cat-row">
            <div className="cat-nome">
              <CategoryIcon categoria={d.categoria as Categoria} size={15} color={CORES[i % CORES.length]} />
              <span>{d.categoria.charAt(0).toUpperCase() + d.categoria.slice(1)}</span>
            </div>
            <span className="cat-valor">{fmt(d.total)}</span>
            <span className="cat-pct">{d.percentual}%</span>
          </div>
        ))}
      </div>

      <style>{`
        .chart-wrap { margin-bottom: 1.25rem; }
        .cat-tabela { display: flex; flex-direction: column; gap: 0.5rem; }
        .cat-header { display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; padding: 0 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .cat-row { display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; align-items: center; padding: 0.65rem 0.75rem; background: #F8F9FA; border-radius: 10px; }
        .cat-nome { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
        .cat-valor { font-size: 0.85rem; font-weight: 700; color: #2D3436; }
        .cat-pct { font-size: 0.8rem; font-weight: 600; color: #95A5A6; min-width: 36px; text-align: right; }
      `}</style>
    </div>
  )
}
