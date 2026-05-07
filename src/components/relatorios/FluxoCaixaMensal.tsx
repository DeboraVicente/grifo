import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Despesa, Receita } from '../../types'
import { calcFluxoCaixaMensal, fmt } from '../../hooks/useRelatorios'

interface Props {
  despesas: Despesa[]
  rateiosRecebidos: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
}

const fmtDia = (data: string) =>
  new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

export default function FluxoCaixaMensal({ despesas, rateiosRecebidos, receitas, userId, mes, ano }: Props) {
  const dados = calcFluxoCaixaMensal(despesas, rateiosRecebidos, receitas, userId, mes, ano)
  const saldoPositivo = dados.saldo >= 0

  const chartData = dados.timeline.map((d) => ({
    nome: fmtDia(d.data),
    Receitas: d.receitas,
    Despesas: d.despesas,
  }))

  return (
    <div className="relatorio-section">
      <div className="fluxo-cards">
        <div className="fluxo-card receita">
          <span className="fc-label">Total Receitas</span>
          <span className="fc-valor">{fmt(dados.totalReceitas)}</span>
        </div>
        <div className="fluxo-card despesa">
          <span className="fc-label">Total Despesas</span>
          <span className="fc-valor">{fmt(dados.totalDespesas)}</span>
        </div>
        <div className={`fluxo-card saldo ${saldoPositivo ? 'positivo' : 'negativo'}`}>
          <span className="fc-label">Saldo do Mês</span>
          <span className="fc-valor">{fmt(dados.saldo)}</span>
          <span className="fc-sub">{saldoPositivo ? 'Superávit' : 'Déficit'}</span>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="chart-wrap">
          <h3 className="chart-titulo">Movimentações por dia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F2F6" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="Receitas" fill="#2ECC71" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#E74C3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="estado-vazio-rel">Nenhuma movimentação neste mês</div>
      )}

      {dados.timeline.length > 0 && (
        <div className="timeline-list">
          <h3 className="chart-titulo">Extrato do mês</h3>
          {dados.timeline.map((item) => (
            <div key={item.data} className="timeline-item">
              <span className="ti-data">{fmtDia(item.data)}</span>
              <div className="ti-valores">
                {item.receitas > 0 && <span className="ti-receita">+ {fmt(item.receitas)}</span>}
                {item.despesas > 0 && <span className="ti-despesa">- {fmt(item.despesas)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .fluxo-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
        .fluxo-card { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .fluxo-card.saldo { grid-column: 1 / -1; }
        .fluxo-card.receita { border-left: 3px solid #2ECC71; }
        .fluxo-card.despesa { border-left: 3px solid #E74C3C; }
        .fluxo-card.positivo { border-left: 3px solid #2ECC71; background: #F0FDF4; }
        .fluxo-card.negativo { border-left: 3px solid #E74C3C; background: #FEF2F2; }
        .fc-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .fc-valor { font-size: 1.3rem; font-weight: 800; color: #2D3436; }
        .fc-sub { font-size: 0.7rem; color: #95A5A6; }
        .chart-wrap { margin-bottom: 1.5rem; }
        .chart-titulo { font-size: 0.8rem; font-weight: 700; color: #636e72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem; }
        .timeline-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .timeline-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: #F8F9FA; border-radius: 8px; }
        .ti-data { font-size: 0.8rem; color: #636e72; font-weight: 600; }
        .ti-valores { display: flex; gap: 0.75rem; }
        .ti-receita { font-size: 0.85rem; font-weight: 700; color: #2ECC71; }
        .ti-despesa { font-size: 0.85rem; font-weight: 700; color: #E74C3C; }
      `}</style>
    </div>
  )
}
