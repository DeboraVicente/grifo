import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { Caixinha, Despesa, GastoPrevisto, Receita } from '../../types'
import { calcGuardadoProjetado } from '../../lib/guardado'
import { calcForecastGastos, fmt } from '../../hooks/useRelatorios'

interface Props {
  despesas: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
  /** Para projetar o dinheiro guardado (caixinhas + reservas de previstos) */
  caixinhas?: Caixinha[]
  previstos?: GastoPrevisto[]
}

function fmtEixo(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

export default function ForecastGastos({ despesas, receitas, userId, caixinhas = [], previstos = [] }: Props) {
  const dados = calcForecastGastos(despesas, receitas, userId, 6)
  const guardado = calcGuardadoProjetado(caixinhas, previstos, 6)

  const chartData = dados.map((d, i) => ({
    nome: d.label,
    Receitas: d.receitas,
    Gastos: d.gastos,
    Saldo: d.saldo,
    Guardado: guardado[i] ?? 0,
  }))

  const temDados = dados.some(d => d.gastos > 0 || d.receitas > 0) || guardado.some((g) => g > 0)

  return (
    <div className="relatorio-section">
      <p className="forecast-aviso">
        Projeção dos próximos 6 meses: despesas já lançadas (parcelas e recorrências), gastos previstos
        e a sua cota das despesas da família, contra as suas receitas. O guardado projeta as caixinhas pela
        meta mensal e as reservas dos previstos até a data de cada um.
      </p>

      {!temDados ? (
        <div className="estado-vazio-rel">Nenhuma despesa ou receita futura encontrada.</div>
      ) : (
        <>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E74C3C" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#E74C3C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F2F6" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtEixo} width={70} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
                <ReferenceLine y={0} stroke="#E0E0E0" />
                <Area type="monotone" dataKey="Receitas" stroke="#2ECC71" fill="url(#gradReceitas)" strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="Gastos" stroke="#E74C3C" fill="url(#gradGastos)" strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="Guardado" stroke="#3498DB" fill="none" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-tabela">
            <div className="ft-header">
              <span>Mês</span>
              <span>Receitas</span>
              <span>Gastos</span>
              <span>Saldo projetado</span>
              <span>Guardado</span>
            </div>
            {dados.map((d, i) => (
              <div key={`${d.mes}-${d.ano}`} className="ft-row">
                <span className="ft-mes">{d.label}</span>
                <span className="ft-receita">{fmt(d.receitas)}</span>
                <span className="ft-gasto">{fmt(d.gastos)}</span>
                <span className={d.saldo >= 0 ? 'ft-saldo-pos' : 'ft-saldo-neg'}>
                  {d.saldo >= 0 ? '+' : ''}{fmt(d.saldo)}
                </span>
                <span className="ft-guardado">{fmt(guardado[i] ?? 0)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .ft-guardado { font-size: 0.8rem; color: #3498DB; font-weight: 600; font-variant-numeric: tabular-nums; }
        .forecast-aviso { font-size: 0.8rem; color: #95A5A6; margin-bottom: 1.25rem; line-height: 1.5; }
        .chart-wrap { margin-bottom: 1.25rem; }
        .forecast-tabela { display: flex; flex-direction: column; gap: 0.4rem; }
        .ft-header {
          display: grid; grid-template-columns: 1.1fr 1fr 1fr 1.1fr 1fr; gap: 0.5rem;
          padding: 0 0.75rem; font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6;
        }
        .ft-row {
          display: grid; grid-template-columns: 1.1fr 1fr 1fr 1.1fr 1fr; gap: 0.5rem;
          align-items: center; padding: 0.65rem 0.75rem;
          background: #F8F9FA; border-radius: 10px;
        }
        .ft-mes { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .ft-receita { font-size: 0.8rem; color: #2ECC71; font-weight: 600; font-variant-numeric: tabular-nums; }
        .ft-gasto { font-size: 0.8rem; color: #E74C3C; font-weight: 600; font-variant-numeric: tabular-nums; }
        .ft-saldo-pos { font-size: 0.8rem; color: #2ECC71; font-weight: 700; font-variant-numeric: tabular-nums; }
        .ft-saldo-neg { font-size: 0.8rem; color: #E74C3C; font-weight: 700; font-variant-numeric: tabular-nums; }

        @media (max-width: 500px) {
          .ft-header, .ft-row { grid-template-columns: 1fr 1fr 1fr; }
          .ft-header span:nth-child(2), .ft-row span:nth-child(2),
          .ft-header span:nth-child(3), .ft-row span:nth-child(3) { display: none; }
        }
      `}</style>
    </div>
  )
}
