import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Despesa, Receita } from '../../types'
import { calcForecastGastos, fmt } from '../../hooks/useRelatorios'

interface Props {
  despesas: Despesa[]
  rateiosRecebidos: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
}

export default function ForecastGastos({ despesas, rateiosRecebidos, receitas, userId }: Props) {
  const dados = calcForecastGastos(despesas, rateiosRecebidos, receitas, userId, 6)

  const chartData = dados.map((d) => ({
    nome: d.label,
    Receitas: d.receitas,
    Gastos: d.gastos,
    Saldo: d.saldo,
  }))

  return (
    <div className="relatorio-section">
      <p className="forecast-aviso">
        Projeção para os próximos 6 meses com base em parcelamentos e receitas recorrentes.
      </p>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E74C3C" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E74C3C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F2F6" />
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Legend />
            <Area type="monotone" dataKey="Receitas" stroke="#2ECC71" fill="url(#gradReceitas)" strokeWidth={2} />
            <Area type="monotone" dataKey="Gastos" stroke="#E74C3C" fill="url(#gradGastos)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="forecast-tabela">
        <div className="ft-header">
          <span>Mês</span>
          <span>Receitas</span>
          <span>Gastos</span>
          <span>Saldo</span>
        </div>
        {dados.map((d) => (
          <div key={`${d.mes}-${d.ano}`} className="ft-row">
            <span className="ft-mes">{d.label}</span>
            <span className="ft-receita">{fmt(d.receitas)}</span>
            <span className="ft-gasto">{fmt(d.gastos)}</span>
            <span className={d.saldo >= 0 ? 'ft-saldo-pos' : 'ft-saldo-neg'}>{fmt(d.saldo)}</span>
          </div>
        ))}
      </div>

      <style>{`
        .forecast-aviso { font-size: 0.8rem; color: #95A5A6; margin-bottom: 1rem; }
        .chart-wrap { margin-bottom: 1.25rem; }
        .forecast-tabela { display: flex; flex-direction: column; gap: 0.4rem; }
        .ft-header { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem; padding: 0 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .ft-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem; align-items: center; padding: 0.6rem 0.75rem; background: #F8F9FA; border-radius: 10px; }
        .ft-mes { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .ft-receita { font-size: 0.8rem; color: #2ECC71; font-weight: 600; }
        .ft-gasto { font-size: 0.8rem; color: #E74C3C; font-weight: 600; }
        .ft-saldo-pos { font-size: 0.8rem; color: #2ECC71; font-weight: 700; }
        .ft-saldo-neg { font-size: 0.8rem; color: #E74C3C; font-weight: 700; }
      `}</style>
    </div>
  )
}
