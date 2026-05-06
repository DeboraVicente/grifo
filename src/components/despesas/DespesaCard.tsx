import { useState } from 'react'
import type { Despesa } from '../../types'

const CATEGORIA_EMOJI: Record<string, string> = {
  casa: '🏠', pessoal: '👤', saude: '❤️', locomocao: '🚗',
  beleza: '✨', alimentacao: '🍽️', educacao: '📚', lazer: '🎮', outros: '📦',
}
const METODO_LABEL: Record<string, string> = {
  credito: 'Crédito', debito: 'Débito', pix: 'Pix', dinheiro: 'Dinheiro',
}

interface Props {
  despesa: Despesa
  isRateadosPendente?: boolean
  isRateioAceito?: boolean
  meuUserId?: string
  onEditar: () => void
  onRemover: () => void
  onPagarParcela: (numeroParcela: number) => void
  onAdiantar: () => void
  onAceitarRateio?: () => void
  onRecusarRateio?: () => void
  onPagarParteRateio?: () => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (data: string) =>
  new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

export default function DespesaCard({
  despesa,
  isRateadosPendente,
  isRateioAceito,
  meuUserId,
  onEditar,
  onRemover,
  onPagarParcela,
  onAdiantar,
  onAceitarRateio,
  onRecusarRateio,
  onPagarParteRateio,
}: Props) {
  const [expandido, setExpandido] = useState(false)

  const parcelasPagas = despesa.listaParcelas?.filter((p) => p.pago).length ?? 0
  const totalParcelas = despesa.parcelas
  const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0
  const totalAdiantado = despesa.adiantamentos?.reduce((s, a) => s + a.valor, 0) ?? 0
  const valorTotal = despesa.valorTotal ?? (despesa as any).valor ?? 0
  const valorParcela = despesa.valorParcela ?? valorTotal

  // Rateio logic
  const temRateio = despesa.rateio?.ativo
  const participantesRateio = temRateio ? (despesa.rateio as any).participantes ?? [] : []

  // Meu participante: usado em aprovação E em rateio aceito
  const meuParticipante = (isRateadosPendente || isRateioAceito)
   ? participantesRateio.find((p: any) => p.userId === meuUserId)
   : null
  const valorParaMim = (isRateadosPendente || isRateioAceito)
   ? (meuParticipante?.valorDevidoParcela ?? meuParticipante?.valorDevido ?? 0)
   : null

  // Status de pagamento do participante (rateio aceito)
  const meusPagamentosRateio: any[] = meuParticipante?.pagamentos ?? []
  const totalPagoRateio = meusPagamentosRateio.reduce((s: number, p: any) => s + p.valor, 0)
  const valorRestanteRateio = Math.max(0, (meuParticipante?.valorDevido ?? 0) - totalPagoRateio)
  const rateioQuitado = (meuParticipante?.valorDevido ?? 0) > 0 && valorRestanteRateio === 0

  return (
    <div className={`despesa-card ${despesa.pago ? 'paga' : ''} ${isRateadosPendente ? 'modo-aprovacao' : ''}`}>
      <div className="card-main" onClick={() => setExpandido((v) => !v)}>
        <div className="card-icon">
          {isRateadosPendente ? '🤝' : (CATEGORIA_EMOJI[despesa.categoria] ?? '📦')}
        </div>

        <div className="card-info">
          <div className="card-nome">{despesa.nome}</div>
          <div className="card-meta">
            <span>{fmtData(despesa.data)}</span>
            <span className="dot">·</span>
            <span>{METODO_LABEL[despesa.metodoPagamento]}</span>
            {totalParcelas > 1 && !isRateadosPendente && (
              <><span className="dot">·</span>
                <span className="tag-parcela">{parcelasPagas}/{totalParcelas}</span></>
            )}
            {isRateadosPendente && (
              <><span className="dot">·</span>
                <span className="tag-aprovacao-pendente">Convite pendente</span></>
            )}
            {isRateioAceito && (
              <><span className="dot">·</span>
                <span className="tag-rateio-aceito">🤝 rateio</span></>
            )}
          </div>
        </div>

        <div className="card-valor">
          {(isRateadosPendente|| isRateioAceito) && valorParaMim !== null ? (
            <>
              <span className="valor-minha-parte">{fmt(valorParaMim)}</span>
              <span className="valor-total-rateio">
                {totalParcelas > 1 ? `${totalParcelas}x · ` : ''}total {fmt(valorTotal)}
              </span>
            </>
          ) : (
            <>
              <span className={despesa.pago ? 'riscado' : ''}>{fmt(valorTotal)}</span>
              {totalParcelas > 1 && !despesa.pago && (
                <span className="valor-parcela">{fmt(valorParcela)}/mês</span>
              )}
            </>
          )}
          {despesa.pago && <span className="badge-pago">✓ pago</span>}
        </div>
      </div>

      {!despesa.pago && totalParcelas > 1 && !isRateadosPendente && (
        <div className="progresso-bar">
          <div className="progresso-fill" style={{ width: `${progresso}%` }} />
        </div>
      )}

      {expandido && (
        <div className="card-detalhes">
          {despesa.observacoes && <p className="detalhe-obs">{despesa.observacoes}</p>}

          {isRateadosPendente ? (
            <div className="card-acoes-aprovacao">
              <button className="acao-btn btn-recusar-full" onClick={(e) => { e.stopPropagation(); onRecusarRateio?.(); }}>
                Recusar Convite
              </button>
              <button className="acao-btn btn-aceitar-full" onClick={(e) => { e.stopPropagation(); onAceitarRateio?.(); }}>
                Aceitar e Adicionar
              </button>
            </div>
          ) : isRateioAceito ? (
            <div className="rateio-aceito-info">
              <div className="rateio-aceito-row">
                <span className="rateio-aceito-label">Minha parte total</span>
                <span className="rateio-aceito-valor">{fmt(meuParticipante?.valorDevido ?? 0)}</span>
              </div>
              {totalParcelas > 1 && (
                <div className="rateio-aceito-row">
                  <span className="rateio-aceito-label">Por parcela</span>
                  <span className="rateio-aceito-valor">
                    {fmt(meuParticipante?.valorDevidoParcela ?? (meuParticipante?.valorDevido ?? 0) / totalParcelas)}/mês
                  </span>
                </div>
              )}
              <div className="rateio-aceito-row">
                <span className="rateio-aceito-label">Já paguei</span>
                <span className="rateio-aceito-valor" style={{ color: '#2ECC71' }}>{fmt(totalPagoRateio)}</span>
              </div>
              <div className="rateio-aceito-row">
                <span className="rateio-aceito-label">Ainda devo</span>
                <span className="rateio-aceito-valor" style={{ color: rateioQuitado ? '#2ECC71' : '#E74C3C' }}>
                  {rateioQuitado ? 'Quitado ✓' : fmt(valorRestanteRateio)}
                </span>
              </div>
              <div className="rateio-aceito-row">
                <span className="rateio-aceito-label">Total da despesa</span>
                <span className="rateio-aceito-valor-total">{fmt(valorTotal)}</span>
              </div>

              {meusPagamentosRateio.length > 0 && (
                <div className="rateio-hist">
                  <span className="rateio-hist-titulo">Meus pagamentos</span>
                  {meusPagamentosRateio.map((pg: any) => (
                    <div key={pg.id} className="rateio-hist-row">
                      <span className="rateio-hist-data">{fmtData(pg.data)}</span>
                      <span className="rateio-hist-valor">{fmt(pg.valor)}</span>
                    </div>
                  ))}
                </div>
              )}

              {!rateioQuitado && (
                <button
                  className="acao-btn btn-pagar-rateio"
                  onClick={(e) => { e.stopPropagation(); onPagarParteRateio?.() }}
                >
                  Pagar minha parte
                </button>
              )}

              {despesa.observacoes && <p className="detalhe-obs">{despesa.observacoes}</p>}
            </div>
          ) : (
            <>
              {totalAdiantado > 0 && (
                <div className="detalhe-row">
                  <span>Adiantado:</span>
                  <span className="valor-gold">{fmt(totalAdiantado)}</span>
                </div>
              )}

              {temRateio && participantesRateio.length > 0 && (
                <div className="rateio-status">
                  <span className="rateio-status-titulo">Status do Rateio</span>
                  {participantesRateio.map((p: any) => {
                    const pagoParticipante = (p.pagamentos ?? []).reduce((s: number, pg: any) => s + pg.valor, 0)
                    const quitado = p.status === 'aceito' && p.valorDevido > 0 && pagoParticipante >= p.valorDevido
                    return (
                      <div key={p.userId} className="rateio-participante">
                        <span className={`rateio-badge ${p.status}`}>
                          {p.status === 'pendente' ? '⏳' : p.status === 'aceito' ? (quitado ? '✓' : '●') : '✕'}
                        </span>
                        <span>{p.nome}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="valor-gold">{fmt(p.valorDevido)}</span>
                          {p.status === 'aceito' && (
                            <span style={{ fontSize: '0.7rem', color: quitado ? '#2ECC71' : '#E74C3C' }}>
                              {quitado ? 'Quitado' : `Pago: ${fmt(pagoParticipante)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {despesa.listaParcelas?.length > 0 && (
                <div className="parcelas-lista">
                  {despesa.listaParcelas.map((p) => (
                    <div key={p.numero} className={`parcela-row ${p.pago ? 'parcela-paga' : ''}`}>
                      <div className="parcela-info">
                        <span className={`parcela-status ${p.pago ? 'ok' : ''}`}>
                          {p.pago ? '✓' : p.numero}
                        </span>
                        <span className="parcela-valor">{fmt(p.valor)}</span>
                        
                        <span className="parcela-data">{fmtData(p.dataVencimento)}</span>
                        
                      </div>
                      {!p.pago && (
                        <button className="btn-pagar-parcela" onClick={() => onPagarParcela(p.numero)}>
                          Pagar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="card-acoes">
                {!despesa.pago && (
                  <button className="acao-btn acao-adiantar" onClick={onAdiantar}>Adiantar</button>
                )}
                <button className="acao-btn" onClick={onEditar}>Editar</button>
                <button className="acao-btn acao-remover" onClick={onRemover}>🗑</button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
      .despesa-card {
        background: #FFFFFF; border: 1px solid #F1F2F6; border-radius: 16px;
        overflow: hidden; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      .despesa-card.modo-aprovacao { border-left: 4px solid rgb(199, 231, 252); background: #F7FBFF; }
      
      .card-main { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; cursor: pointer; }
      .card-icon { 
        font-size: 1.2rem; width: 44px; height: 44px; background: #F8F9FA;
        border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; 
      }
      .modo-aprovacao .card-icon { background: #EBF5FB; }

      .card-info { flex: 1; min-width: 0; }
      .card-nome { font-size: 1rem; font-weight: 600; color: #2D3436; margin-bottom: 2px; }
      .card-meta { display: flex; align-items: center; gap: 0.4rem; color: #95A5A6; font-size: 0.75rem; }
      .tag-aprovacao-pendente { color: #3498DB; font-weight: 700; }

      .card-valor { display: flex; flex-direction: column; align-items: flex-end; }
      .valor-minha-parte { color: #2D3436; font-size: 1.1rem; font-weight: 800; }
      .valor-total-rateio { font-size: 0.7rem; color: #95A5A6; }

      .card-detalhes { padding: 1.25rem; background: #FCFCFD; border-top: 1px solid #F1F2F6; display: flex; flex-direction: column; gap: 1rem; }
      
      .card-acoes-aprovacao { display: flex; gap: 0.8rem; }
      .btn-aceitar-full { background: #2ECC71 !important; color: white !important; border: none !important; }
      .btn-recusar-full { background: #FDFEFE !important; color: #E74C3C !important; border: 1px solid #FADBD8 !important; }
      .btn-pagar-parcela { background: #F8F9FA; color: #C8A45A; border: none; border-radius: 12px; padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 600; }

      .rateio-status { background: #F8F9FA; padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.6rem; }
      .rateio-status-titulo { font-size: 0.7rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; }
      .rateio-participante { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; }
      
      .parcelas-lista { display: flex; flex-direction: column; gap: 0.6rem; }
      .parcela-row { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem; background: white; border-radius: 10px; border: 1px solid #F1F2F6; }
      .parcela-status { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 2px solid #ccc;font-size: 0.85rem; border-radius: 50%; margin-right: 15px; transition: all 0.2s ease;}
      .parcela-status.ok { background-color:#2ECC71; border-color: #2ECC71; color: white; box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2); }
      .parcela-paga .parcela-info { opacity: 0.7; }
      .parcela-valor { display: inline-flex; align-items: center; justify-content: center; margin-right: 15px;}
      parcela-data { display: inline-flex; align-items: right}

      .card-acoes { display: flex; gap: 0.6rem; }
      .acao-btn { flex: 1; background: #FFFFFF; border: 1px solid #E0E0E0; color: #636E72; border-radius: 10px; padding: 0.6rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
      .acao-adiantar { color: #C8A45A; border-color: #F9E79F; }
      .acao-remover { flex: 0; color: #E74C3C; }

      .rateio-aceito-row { display: flex; justify-content: space-between; align-items: center; }
      .rateio-aceito-label { color: #95A5A6; font-size: 0.8rem; }
      .rateio-aceito-valor { color: #2D3436; font-size: 0.9rem; font-weight: 700; font-variant-numeric: tabular-nums; }
      .rateio-aceito-valor-total { color: #95A5A6; font-size: 0.82rem; font-variant-numeric: tabular-nums; }
      .rateio-hist { background: #F8F9FA; border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
      .rateio-hist-titulo { font-size: 0.65rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; }
      .rateio-hist-row { display: flex; justify-content: space-between; font-size: 0.8rem; }
      .rateio-hist-data { color: #95A5A6; }
      .rateio-hist-valor { font-weight: 600; color: #2D3436; }
      .btn-pagar-rateio { background: #2ECC71 !important; color: white !important; border: none !important; width: 100%; }
      
    `}</style>
    </div>
  )
}