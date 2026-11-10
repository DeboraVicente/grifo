import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Caixinha, Despesa, GastoPrevisto, Receita } from '../../types'
import { calcGuardado } from '../../lib/guardado'
import { calcEvolucaoFinanceira, fmt } from '../../hooks/useRelatorios'

interface Props {
  despesas: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
  /** Para o dinheiro guardado no fim de cada mês (caixinhas + reservas de previstos) */
  caixinhas?: Caixinha[]
  previstos?: GastoPrevisto[]
}

function fmtEixo(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(1).replace('.0', '')}k`
  return `R$${v.toFixed(0)}`
}

export default function EvolucaoFinanceira({ despesas, receitas, userId, caixinhas = [], previstos = [] }: Props) {
  const [periodo, setPeriodo] = useState<3 | 6 | 12>(6)
  const dados = calcEvolucaoFinanceira(despesas, receitas, userId, periodo)
  const hoje = new Date()
  // Mesmos meses da evolução (do mais antigo até o atual)
  const guardado = calcGuardado(caixinhas, previstos, hoje.getMonth(), hoje.getFullYear(), periodo).evolucao.map((p) => p.total)

  const chartData = dados.map((d, i) => ({
    nome: d.label,
    Receitas: d.receitas,
    Despesas: d.despesas,
    Saldo: d.saldo,
    Guardado: guardado[i] ?? 0,
  }))

  const ultimoMes = dados[dados.length - 1]
  const penultimoMes = dados[dados.length - 2]
  const variacaoSaldo =
    penultimoMes && penultimoMes.saldo !== 0
      ? Math.round(((ultimoMes.saldo - penultimoMes.saldo) / Math.abs(penultimoMes.saldo)) * 100)
      : null

  return (
    <div className="relatorio-section">
      <div className="evo-periodo">
        {([3, 6, 12] as const).map((p) => (
          <button
            key={p}
            className={`evo-periodo-btn ${periodo === p ? 'active' : ''}`}
            onClick={() => setPeriodo(p)}
          >
            {p} meses
          </button>
        ))}
      </div>

      {variacaoSaldo !== null && (
        <div className={`evo-variacao ${variacaoSaldo >= 0 ? 'positivo' : 'negativo'}`}>
          Saldo variou {variacaoSaldo >= 0 ? '+' : ''}{variacaoSaldo}% em relação ao mês anterior
        </div>
      )}

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F2F6" />
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtEixo} width={70} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="Receitas" stroke="#2ECC71" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Despesas" stroke="#E74C3C" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Saldo" stroke="#C8A45A" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Guardado" stroke="#3498DB" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="evo-tabela">
        <div className="evo-header">
          <span>Mês</span>
          <span>Receitas</span>
          <span>Despesas</span>
          <span>Saldo</span>
          <span>Guardado</span>
        </div>
        {dados.map((d, i) => (
          <div key={`${d.mes}-${d.ano}`} className="evo-row">
            <span className="evo-mes">{d.label}</span>
            <span className="evo-receita">{fmt(d.receitas)}</span>
            <span className="evo-despesa">{fmt(d.despesas)}</span>
            <span className={d.saldo >= 0 ? 'evo-saldo-pos' : 'evo-saldo-neg'}>{fmt(d.saldo)}</span>
            <span className="evo-guardado">{fmt(guardado[i] ?? 0)}</span>
          </div>
        ))}
      </div>

      <style>{`
        .evo-periodo { display: flex; gap: 0.5rem; background: #F1F2F6; padding: 0.3rem; border-radius: 12px; width: fit-content; margin-bottom: 1rem; }
        .evo-periodo-btn { background: transparent; border: none; border-radius: 8px; padding: 0.4rem 0.9rem; font-size: 0.78rem; font-weight: 600; color: #7f8c8d; cursor: pointer; }
        .evo-periodo-btn.active { background: #fff; color: #C8A45A; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .evo-variacao { font-size: 0.82rem; font-weight: 600; padding: 0.5rem 0.75rem; border-radius: 8px; margin-bottom: 1rem; width: fit-content; }
        .evo-variacao.positivo { background: #F0FDF4; color: #2ECC71; }
        .evo-variacao.negativo { background: #FEF2F2; color: #E74C3C; }
        .chart-wrap { margin-bottom: 1.25rem; }
        .evo-tabela { display: flex; flex-direction: column; gap: 0.4rem; }
        .evo-guardado { font-size: 0.8rem; color: #3498DB; font-weight: 600; }
        .evo-header { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 0.5rem; padding: 0 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .evo-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 0.5rem; align-items: center; padding: 0.6rem 0.75rem; background: #F8F9FA; border-radius: 10px; }
        .evo-mes { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .evo-receita { font-size: 0.8rem; color: #2ECC71; font-weight: 600; }
        .evo-despesa { font-size: 0.8rem; color: #E74C3C; font-weight: 600; }
        .evo-saldo-pos { font-size: 0.8rem; color: #2ECC71; font-weight: 700; }
        .evo-saldo-neg { font-size: 0.8rem; color: #E74C3C; font-weight: 700; }
        @media (max-width: 480px) {
          .evo-header, .evo-row { grid-template-columns: 1fr 1fr 1fr; }
          .evo-header span:nth-child(2), .evo-row span:nth-child(2),
          .evo-header span:nth-child(3), .evo-row span:nth-child(3) { display: none; }
        }
      `}</style>
    </div>
  )
}
