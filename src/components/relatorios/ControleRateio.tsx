import type { Despesa, Receita } from '../../types'
import { calcResumoRateios, fmt } from '../../hooks/useRelatorios'

interface Props {
  despesas: Despesa[]
  rateiosRecebidos: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  recusado: 'Recusado',
}

const STATUS_COR: Record<string, string> = {
  pendente: '#F39C12',
  aceito: '#2ECC71',
  recusado: '#E74C3C',
}

export default function ControleRateio({ despesas, rateiosRecebidos, userId }: Props) {
  const dados = calcResumoRateios(despesas, rateiosRecebidos, userId)

  const temDados = dados.despesasCriadas.length > 0 || dados.despesasParticipando.length > 0

  if (!temDados) {
    return <div className="estado-vazio-rel">Nenhum rateio registrado</div>
  }

  return (
    <div className="relatorio-section">
      <div className="rat-resumo">
        <div className="rat-card receber">
          <span className="rat-label">A receber</span>
          <span className="rat-valor">{fmt(dados.aReceber)}</span>
          <span className="rat-sub">de despesas que você criou</span>
        </div>
        <div className="rat-card pagar">
          <span className="rat-label">A pagar</span>
          <span className="rat-valor">{fmt(dados.aPagar)}</span>
          <span className="rat-sub">sua parte em despesas de outros</span>
        </div>
      </div>

      {dados.despesasCriadas.length > 0 && (
        <div className="rat-section">
          <h3 className="rat-titulo">Despesas que você criou</h3>
          <div className="rat-list">
            {dados.despesasCriadas.map((d) => (
              <div key={d.id} className="rat-item">
                <div className="rat-item-top">
                  <span className="rat-nome">{d.nome}</span>
                  <span className="rat-pendente">{fmt(d.pendente)} pendente</span>
                </div>
                <div className="rat-participantes">
                  {d.participantes
                    .filter((p) => p.userId !== userId)
                    .map((p) => (
                      <div key={p.userId} className="rat-part-row">
                        <span className="rat-part-nome">{p.nome}</span>
                        <span className="rat-part-status" style={{ color: STATUS_COR[p.status] }}>
                          {STATUS_LABEL[p.status]}
                        </span>
                        <span className="rat-part-val">
                          {fmt(p.valorPago ?? 0)} / {fmt(p.valorDevido)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dados.despesasParticipando.length > 0 && (
        <div className="rat-section">
          <h3 className="rat-titulo">Despesas que você participa</h3>
          <div className="rat-list">
            {dados.despesasParticipando.map((d) => (
              <div key={d.id} className="rat-item">
                <div className="rat-item-top">
                  <span className="rat-nome">{d.nome}</span>
                  <span className="rat-part-status" style={{ color: STATUS_COR[d.status] }}>
                    {STATUS_LABEL[d.status]}
                  </span>
                </div>
                {d.status === 'aceito' && (
                  <div className="rat-minha-parte">
                    <span>Pago: {fmt(d.meuValorPago)}</span>
                    <span>Total: {fmt(d.meuValorDevido)}</span>
                    <span className={d.meuPendente > 0 ? 'rat-devendo' : 'rat-quitado'}>
                      {d.meuPendente > 0 ? `Falta ${fmt(d.meuPendente)}` : 'Quitado'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .rat-resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
        .rat-card { border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .rat-card.receber { background: #F0FDF4; border: 1px solid #BBF7D0; }
        .rat-card.pagar { background: #FEF2F2; border: 1px solid #FCA5A5; }
        .rat-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .rat-valor { font-size: 1.2rem; font-weight: 800; color: #2D3436; }
        .rat-sub { font-size: 0.7rem; color: #95A5A6; }

        .rat-section { margin-bottom: 1.25rem; }
        .rat-titulo { font-size: 0.75rem; font-weight: 700; color: #636e72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.6rem; }
        .rat-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .rat-item { background: #F8F9FA; border-radius: 12px; padding: 0.85rem 1rem; }
        .rat-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .rat-nome { font-weight: 700; font-size: 0.9rem; color: #2D3436; }
        .rat-pendente { font-size: 0.8rem; font-weight: 700; color: #C8A45A; }
        .rat-participantes { display: flex; flex-direction: column; gap: 0.35rem; }
        .rat-part-row { display: grid; grid-template-columns: 1fr auto auto; gap: 0.75rem; align-items: center; font-size: 0.8rem; }
        .rat-part-nome { color: #636e72; }
        .rat-part-status { font-weight: 600; font-size: 0.75rem; }
        .rat-part-val { color: #2D3436; font-weight: 600; }
        .rat-minha-parte { display: flex; gap: 1rem; font-size: 0.8rem; color: #636e72; flex-wrap: wrap; }
        .rat-devendo { color: #E74C3C; font-weight: 700; }
        .rat-quitado { color: #2ECC71; font-weight: 700; }
      `}</style>
    </div>
  )
}
