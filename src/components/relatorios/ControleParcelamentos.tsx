import type { Despesa, Receita } from '../../types'
import { calcControleParcelamentos, fmt } from '../../hooks/useRelatorios'
import CategoryIcon from '../ui/CategoryIcon'

interface Props {
  despesas: Despesa[]
  rateiosRecebidos: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
}

const fmtData = (data: string) =>
  new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })

export default function ControleParcelamentos({ despesas }: Props) {
  const dados = calcControleParcelamentos(despesas)

  if (dados.length === 0) {
    return <div className="estado-vazio-rel">Nenhum parcelamento ativo</div>
  }

  return (
    <div className="relatorio-section">
      <div className="parc-resumo">
        <div className="parc-resumo-item">
          <span className="pr-label">Parcelamentos ativos</span>
          <span className="pr-valor">{dados.length}</span>
        </div>
        <div className="parc-resumo-item">
          <span className="pr-label">Total restante</span>
          <span className="pr-valor">{fmt(dados.reduce((s, d) => s + d.totalRestante, 0))}</span>
        </div>
      </div>

      <div className="parc-list">
        {dados.map((d) => {
          const pct = Math.round((d.parcelasPagas / d.parcelasTotal) * 100)
          return (
            <div key={d.id} className="parc-card">
              <div className="parc-card-top">
                <span className="parc-emoji"><CategoryIcon categoria={d.categoria} size={22} color="#636e72" /></span>
                <div className="parc-info">
                  <span className="parc-nome">{d.nome}</span>
                  <span className="parc-sub">
                    {d.parcelasPagas}/{d.parcelasTotal} parcelas · {fmt(d.valorParcela)}/mês
                  </span>
                </div>
                <span className="parc-restante">{fmt(d.totalRestante)}</span>
              </div>

              <div className="parc-progress-bar">
                <div className="parc-progress-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="parc-datas">
                {d.proxVencimento && (
                  <span className="parc-data-item">
                    Próx: <strong>{fmtData(d.proxVencimento)}</strong>
                  </span>
                )}
                {d.ultimaParcela && (
                  <span className="parc-data-item">
                    Fim: <strong>{fmtData(d.ultimaParcela)}</strong>
                  </span>
                )}
                <span className="parc-pct">{pct}% pago</span>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .parc-resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
        .parc-resumo-item { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 0.9rem 1rem; }
        .pr-label { display: block; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; margin-bottom: 0.25rem; }
        .pr-valor { font-size: 1.2rem; font-weight: 800; color: #2D3436; }

        .parc-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .parc-card { background: #fff; border: 1px solid #F1F2F6; border-radius: 14px; padding: 1rem; }
        .parc-card-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
        .parc-emoji { font-size: 1.4rem; }
        .parc-info { flex: 1; }
        .parc-nome { display: block; font-weight: 700; font-size: 0.9rem; color: #2D3436; }
        .parc-sub { display: block; font-size: 0.75rem; color: #95A5A6; margin-top: 2px; }
        .parc-restante { font-size: 1rem; font-weight: 800; color: #C8A45A; flex-shrink: 0; }

        .parc-progress-bar { height: 6px; background: #F1F2F6; border-radius: 6px; overflow: hidden; margin-bottom: 0.6rem; }
        .parc-progress-fill { height: 100%; background: #C8A45A; border-radius: 6px; transition: width 0.3s; }

        .parc-datas { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
        .parc-data-item { font-size: 0.75rem; color: #636e72; }
        .parc-data-item strong { color: #2D3436; }
        .parc-pct { margin-left: auto; font-size: 0.75rem; font-weight: 700; color: #C8A45A; }
      `}</style>
    </div>
  )
}
