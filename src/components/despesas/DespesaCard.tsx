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
  onEditar: () => void
  onRemover: () => void
  onPagarParcela: (numeroParcela: number) => void
  onAdiantar: () => void
}

const fmt = (v: number | undefined) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (data: string) =>
  new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

export default function DespesaCard({ despesa, onEditar, onRemover, onPagarParcela, onAdiantar }: Props) {
  const [expandido, setExpandido] = useState(false)

  const parcelasPagas = despesa.listaParcelas?.filter((p) => p.pago).length ?? 0
  const totalParcelas = despesa.parcelas
  const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0
  const totalAdiantado = despesa.adiantamentos?.reduce((s, a) => s + a.valor, 0) ?? 0

  return (
    <div className={`despesa-card ${despesa.pago ? 'paga' : ''}`}>
      {/* Linha principal */}
      <div className="card-main" onClick={() => setExpandido((v) => !v)}>
        <div className="card-icon">{CATEGORIA_EMOJI[despesa.categoria] ?? '📦'}</div>

        <div className="card-info">
          <div className="card-nome">{despesa.nome}</div>
          <div className="card-meta">
            <span>{fmtData(despesa.data)}</span>
            <span className="dot">·</span>
            <span>{METODO_LABEL[despesa.metodoPagamento]}</span>
            {despesa.parcelas > 1 && (
              <>
                <span className="dot">·</span>
                <span className="tag-parcela">{parcelasPagas}/{totalParcelas} pagas</span>
              </>
            )}
            {despesa.rateio?.ativo && (
              <>
                <span className="dot">·</span>
                <span className="tag-rateio">rateio</span>
              </>
            )}
          </div>
        </div>

        <div className="card-valor">
          <span className={despesa.pago ? 'riscado' : ''}>{fmt(despesa.valorTotal ?? (despesa as any).valor ?? 0)}</span>
          {despesa.parcelas > 1 && !despesa.pago && (
            <span className="valor-parcela">{fmt(despesa.valorParcela ?? 0)}/mês</span>
          )}
          {despesa.pago && <span className="badge-pago">✓ pago</span>}
        </div>
      </div>

      {/* Barra de progresso */}
      {!despesa.pago && totalParcelas > 0 && (
        <div className="progresso-bar">
          <div className="progresso-fill" style={{ width: `${progresso}%` }} />
        </div>
      )}

      {/* Expandido */}
      {expandido && (
        <div className="card-detalhes">
          {despesa.observacoes && <p className="detalhe-obs">{despesa.observacoes}</p>}

          {totalAdiantado > 0 && (
            <div className="detalhe-row">
              <span>Adiantado:</span>
              <span className="valor-gold">{fmt(totalAdiantado)}</span>
            </div>
          )}

          {/* Lista de parcelas */}
          {despesa.listaParcelas?.length > 0 && (
            <div className="parcelas-lista">
              {despesa.listaParcelas.map((p) => {
                const totalPagoParcela = p.pagamentos?.reduce((s, pg) => s + pg.valor, 0) ?? 0
                return (
                  <div key={p.numero} className={`parcela-row ${p.pago ? 'parcela-paga' : ''}`}>
                    <div className="parcela-info">
                      <span className={`parcela-status ${p.pago ? 'ok' : ''}`}>
                        {p.pago ? '✓' : p.numero}
                      </span>
                      <span className="parcela-data">{fmtData(p.dataVencimento)}</span>
                      <span className="parcela-valor">{fmt(p.valor)}</span>
                      {!p.pago && totalPagoParcela > 0 && (
                        <span className="parcela-pago-parcial">({fmt(totalPagoParcela)} pago)</span>
                      )}
                    </div>
                    {!p.pago && (
                      <button
                        className="btn-pagar-parcela"
                        onClick={() => onPagarParcela(p.numero)}
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Ações */}
          <div className="card-acoes">
            {!despesa.pago && (
              <button className="acao-btn acao-adiantar" onClick={onAdiantar}>⬆ Adiantamento</button>
            )}
            <button className="acao-btn" onClick={onEditar}>✏️ Editar</button>
            <button className="acao-btn acao-remover" onClick={onRemover}>🗑</button>
          </div>
        </div>
      )}

    <style>{`
      .despesa-card {
        background: #FFFFFF; 
        border: 1px solid #F1F2F6; 
        border-radius: 16px;
        overflow: hidden; 
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      
      .despesa-card:hover { 
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        border-color: #E8E8E8;
      }

      .despesa-card.paga { 
        opacity: 0.7; 
        background: #FAFAFA;
      }

      .card-main {
        display: flex; 
        align-items: center; 
        gap: 1rem;
        padding: 1.25rem; 
        cursor: pointer;
      }

      .card-icon { 
        font-size: 1.2rem; 
        width: 44px; 
        height: 44px; 
        background: #F8F9FA;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0; 
      }

      .card-info { flex: 1; min-width: 0; }
      
      .card-nome {
        font-size: 1rem; 
        font-weight: 600;
        color: #2D3436;
        margin-bottom: 2px;
      }

      .card-meta {
        display: flex; 
        align-items: center; 
        gap: 0.4rem;
        color: #95A5A6; 
        font-size: 0.75rem;
        font-weight: 500;
      }

      .tag-parcela {
        color: #C8A45A;
        font-weight: 700;
        font-size: 0.7rem;
        text-transform: uppercase;
      }

      .card-valor {
        display: flex; 
        flex-direction: column; 
        align-items: flex-end;
        flex-shrink: 0;
      }

      .card-valor span { 
        color: #2D3436; 
        font-size: 1.05rem; 
        font-weight: 700;
        font-variant-numeric: tabular-nums; 
      }

      .valor-parcela { 
        color: #95A5A6 !important; 
        font-size: 0.75rem !important; 
        font-weight: 500 !important;
      }

      .riscado { 
        color: #B2BEC3 !important; 
        text-decoration: line-through; 
        font-weight: 400 !important;
      }

      /* Barra de progresso discreta */
      .progresso-bar { height: 3px; background: #F1F2F6; }
      .progresso-fill { 
        height: 100%; 
        background: #C8A45A; 
        border-radius: 0 2px 2px 0;
        box-shadow: 0 0 8px rgba(200,164,90,0.3);
      }

      .card-detalhes {
        padding: 1.25rem; 
        background: #FCFCFD;
        border-top: 1px solid #F1F2F6;
        display: flex; 
        flex-direction: column; 
        gap: 1rem;
      }

      .parcela-row {
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        padding: 0.7rem 0.8rem; 
        background: #FFFFFF; 
        border-radius: 12px;
        border: 1px solid #F1F2F6;
      }

      .parcela-status {
        width: 22px; 
        height: 22px; 
        border-radius: 6px;
        background: #F8F9FA; 
        color: #B2BEC3;
        font-size: 0.7rem; 
        font-weight: 700;
      }

      .parcela-status.ok { 
        background: #E8F5E9; 
        color: #2ECC71; 
        border: none;
      }

      .parcela-valor { color: #2D3436; font-weight: 600; }

      .btn-pagar-parcela {
        background: #C8A45A; 
        color: white; 
        border: none;
        border-radius: 8px; 
        padding: 0.4rem 0.8rem;
        font-size: 0.75rem; 
        font-weight: 600;
        cursor: pointer;
      }

      .card-acoes { 
        display: flex; 
        gap: 0.6rem; 
        margin-top: 0.5rem;
      }

      .acao-btn {
        flex: 1;
        background: #FFFFFF; 
        border: 1px solid #E0E0E0; 
        color: #636E72;
        border-radius: 10px; 
        padding: 0.6rem; 
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .acao-btn:hover { background: #F8F9FA; border-color: #B2BEC3; }
      
      .acao-remover { 
        flex: 0; 
        padding: 0.6rem 0.8rem;
        color: #E74C3C;
      }
      
      .acao-remover:hover { 
        background: #FFF5F5; 
        border-color: #FAB1A0; 
      }
    `}</style>
    </div>
  )
}
