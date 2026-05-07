import { useState } from 'react'
import { Handshake, Trash2, Check, CheckCircle2, Clock, Circle, XCircle } from 'lucide-react'
import type { Despesa } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'
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
  onAceitarRateio?: (renda?: number) => void
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
  const [rendaAceite, setRendaAceite] = useState(0)
  const PARCELAS_POR_PAGINA = 5
  const primeiraImpaga = despesa.listaParcelas?.findIndex((p) => !p.pago) ?? 0
  const [paginaParcelas, setPaginaParcelas] = useState(Math.max(0, Math.floor(primeiraImpaga / PARCELAS_POR_PAGINA)))

  const parcelasPagas = despesa.listaParcelas?.filter((p) => p.pago).length ?? 0
  const totalParcelas = despesa.parcelas
  const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0

  // Próxima parcela não paga — avança conforme parcelas são quitadas
  const proximaParcela = despesa.listaParcelas?.filter((p) => !p.pago)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0]
  const dataVencimento = proximaParcela?.dataVencimento ?? despesa.data
  const totalAdiantado = despesa.adiantamentos?.reduce((s, a) => s + a.valor, 0) ?? 0
  const valorTotal = despesa.valorTotal ?? (despesa as any).valor ?? 0
  const valorParcela = despesa.valorParcela ?? valorTotal
  const isFinanciamento = despesa.tipo === 'financiamento'
  const saldoAtual = isFinanciamento ? (despesa.saldoDevedor ?? valorTotal) : valorTotal

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
          {isRateadosPendente
            ? <Handshake size={22} color="#3498DB" />
            : <CategoryIcon categoria={despesa.categoria} size={22} color="#636e72" />}
        </div>

        <div className="card-info">
          <div className="card-nome">{despesa.nome}</div>
          <div className="card-meta">
            {despesa.dataCompra ? (
              <>
                <span className="meta-label-compra">compra</span>
                <span>{fmtData(despesa.dataCompra)}</span>
                <span className="dot">·</span>
                <span className="meta-label-vence">vence</span>
                <span>{fmtData(dataVencimento)}</span>
              </>
            ) : (
              <span>{fmtData(dataVencimento)}</span>
            )}
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
                <span className="tag-rateio-aceito"><Handshake size={11} /> rateio</span></>
            )}
            {isFinanciamento && (
              <><span className="dot">·</span>
                <span className="tag-financiamento">financiamento</span></>
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
              <span className={despesa.pago ? 'riscado' : ''}>{fmt(saldoAtual)}</span>
              {totalParcelas > 1 && !despesa.pago && (
                <span className="valor-parcela">{fmt(valorParcela)}/mês</span>
              )}
            </>
          )}
          {despesa.pago && <span className="badge-pago"><CheckCircle2 size={11} /> pago</span>}
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
              {(despesa.rateio as any)?.tipo === 'renda' && (
                <div className="renda-aceite-field">
                  <label className="renda-aceite-label">Sua renda mensal (R$)</label>
                  <input
                    type="number" min="0" step="100" placeholder="0,00"
                    className="renda-aceite-input"
                    value={rendaAceite || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setRendaAceite(parseFloat(e.target.value) || 0)}
                  />
                  <span className="renda-aceite-hint">Informe sua renda para calcular a divisão proporcional</span>
                </div>
              )}
              <div className="aprovacao-btns">
                <button className="acao-btn btn-recusar-full" onClick={(e) => { e.stopPropagation(); onRecusarRateio?.(); }}>
                  Recusar Convite
                </button>
                <button
                  className="acao-btn btn-aceitar-full"
                  disabled={(despesa.rateio as any)?.tipo === 'renda' && rendaAceite === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAceitarRateio?.((despesa.rateio as any)?.tipo === 'renda' ? rendaAceite : undefined)
                  }}
                >
                  Aceitar e Adicionar
                </button>
              </div>
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
                  {rateioQuitado ? <><CheckCircle2 size={13} /> Quitado</> : fmt(valorRestanteRateio)}
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
              {isFinanciamento && (
                <div className="saldo-devedor-box">
                  <div className="sd-row">
                    <span className="sd-label">Saldo devedor atual</span>
                    <span className="sd-valor">{fmt(saldoAtual)}</span>
                  </div>
                  {saldoAtual !== valorTotal && (
                    <div className="sd-row">
                      <span className="sd-label">Saldo inicial</span>
                      <span className="sd-valor-orig">{fmt(valorTotal)}</span>
                    </div>
                  )}
                  {totalAdiantado > 0 && (
                    <div className="sd-row">
                      <span className="sd-label">Total amortizado</span>
                      <span className="sd-valor-amortz">{fmt(totalAdiantado)}</span>
                    </div>
                  )}
                </div>
              )}

              {!isFinanciamento && totalAdiantado > 0 && (
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
                          {p.status === 'pendente'
                            ? <Clock size={12} />
                            : p.status === 'aceito'
                              ? (quitado ? <CheckCircle2 size={12} /> : <Circle size={12} />)
                              : <XCircle size={12} />}
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

              {despesa.listaParcelas?.length > 0 && (() => {
                const totalPaginas = Math.ceil(despesa.listaParcelas.length / PARCELAS_POR_PAGINA)
                const inicio = paginaParcelas * PARCELAS_POR_PAGINA
                const parcelasPagina = despesa.listaParcelas.slice(inicio, inicio + PARCELAS_POR_PAGINA)
                return (
                  <div className="parcelas-lista">
                    {parcelasPagina.map((p) => (
                      <div key={p.numero} className={`parcela-row ${p.pago ? 'parcela-paga' : ''}`}>
                        <div className="parcela-info">
                          <span className={`parcela-status ${p.pago ? 'ok' : ''}`}>
                            {p.pago ? <Check size={11} /> : p.numero}
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
                    {totalPaginas > 1 && (
                      <div className="parcelas-paginacao">
                        <button className="pp-btn" disabled={paginaParcelas === 0} onClick={(e) => { e.stopPropagation(); setPaginaParcelas(p => p - 1) }}>‹</button>
                        <span className="pp-info">{paginaParcelas + 1}/{totalPaginas} · parcela {inicio + 1}–{Math.min(inicio + PARCELAS_POR_PAGINA, despesa.listaParcelas.length)} de {despesa.listaParcelas.length}</span>
                        <button className="pp-btn" disabled={paginaParcelas + 1 >= totalPaginas} onClick={(e) => { e.stopPropagation(); setPaginaParcelas(p => p + 1) }}>›</button>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="card-acoes">
                {!despesa.pago && (
                  <button className="acao-btn acao-adiantar" onClick={onAdiantar}>
                    {isFinanciamento ? 'Amortizar' : 'Adiantar'}
                  </button>
                )}
                <button className="acao-btn" onClick={onEditar}>Editar</button>
                <button className="acao-btn acao-remover" onClick={onRemover}><Trash2 size={14} /></button>
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
        width: 44px; height: 44px; background: #F8F9FA;
        border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .modo-aprovacao .card-icon { background: #EBF5FB; }

      .card-info { flex: 1; min-width: 0; }
      .card-nome { font-size: 1rem; font-weight: 600; color: #2D3436; margin-bottom: 2px; }
      .card-meta { display: flex; align-items: center; gap: 0.4rem; color: #95A5A6; font-size: 0.75rem; flex-wrap: wrap; }
      .meta-label-compra { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #BDC3C7; }
      .meta-label-vence { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #C8A45A; }
      .tag-aprovacao-pendente { color: #3498DB; font-weight: 700; }
      .tag-rateio-aceito { display: inline-flex; align-items: center; gap: 3px; }
      .tag-financiamento { color: #C8A45A; font-weight: 700; font-size: 0.7rem; background: rgba(200,164,90,0.1); border-radius: 4px; padding: 1px 5px; }
      .badge-pago { display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 700; color: #2ECC71; margin-top: 2px; }
      .rateio-aceito-valor { display: inline-flex; align-items: center; gap: 4px; }

      .card-valor { display: flex; flex-direction: column; align-items: flex-end; }
      .valor-minha-parte { color: #2D3436; font-size: 1.1rem; font-weight: 800; }
      .valor-total-rateio { font-size: 0.7rem; color: #95A5A6; }

      .card-detalhes { padding: 1.25rem; background: #FCFCFD; border-top: 1px solid #F1F2F6; display: flex; flex-direction: column; gap: 1rem; }
      
      .card-acoes-aprovacao { display: flex; flex-direction: column; gap: 0.75rem; }
      .aprovacao-btns { display: flex; gap: 0.8rem; }
      .btn-aceitar-full { background: #2ECC71 !important; color: white !important; border: none !important; }
      .btn-aceitar-full:disabled { opacity: 0.4 !important; cursor: not-allowed !important; }
      .btn-recusar-full { background: #FDFEFE !important; color: #E74C3C !important; border: 1px solid #FADBD8 !important; }
      .renda-aceite-field { background: #FFFDF7; border: 1px solid rgba(200,164,90,0.2); border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
      .renda-aceite-label { color: #95A5A6; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
      .renda-aceite-input { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.9rem; outline: none; font-family: inherit; }
      .renda-aceite-input:focus { border-color: #C8A45A; }
      .renda-aceite-hint { color: #C8A45A; font-size: 0.7rem; font-style: italic; }
      .btn-pagar-parcela { background: #F8F9FA; color: #C8A45A; border: none; border-radius: 12px; padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 600; }

      .saldo-devedor-box { background: #FFFDF7; border: 1px solid rgba(200,164,90,0.2); border-radius: 12px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .sd-row { display: flex; justify-content: space-between; align-items: center; }
      .sd-label { font-size: 0.75rem; color: #95A5A6; }
      .sd-valor { font-size: 1rem; font-weight: 800; color: #C8A45A; }
      .sd-valor-orig { font-size: 0.82rem; color: #BDC3C7; text-decoration: line-through; }
      .sd-valor-amortz { font-size: 0.82rem; font-weight: 700; color: #2ECC71; }
      .rateio-status { background: #F8F9FA; padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.6rem; }
      .rateio-status-titulo { font-size: 0.7rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; }
      .rateio-participante { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; }
      
      .parcelas-lista { display: flex; flex-direction: column; gap: 0.6rem; }
      .parcelas-paginacao { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding-top: 0.25rem; }
      .pp-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 6px; width: 28px; height: 28px; font-size: 1rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
      .pp-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
      .pp-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .pp-info { font-size: 0.7rem; color: #95A5A6; font-weight: 600; }
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