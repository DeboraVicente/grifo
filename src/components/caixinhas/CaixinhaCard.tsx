import { useState } from 'react'
import type { Caixinha } from '../../types'

const CATEGORIA_EMOJI: Record<string, string> = {
  emergencia: '🆘', viagem: '✈️', educacao: '📚', saude: '❤️',
  reforma: '🔧', eletronicos: '📱', outros: '📦',
}

interface Props {
  caixinha: Caixinha
  onEditar: () => void
  onRemover: () => void
  onDepositar: () => void
  onRetirar: () => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CaixinhaCard({ caixinha, onEditar, onRemover, onDepositar, onRetirar }: Props) {
  const [expandido, setExpandido] = useState(false)

  const progresso = caixinha.valorMeta
    ? Math.min((caixinha.valorAtual / caixinha.valorMeta) * 100, 100)
    : null

  const ultimosMovimentos = [...(caixinha.historico ?? [])]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)

  return (
    <div className="caixinha-card">
      <div className="card-main" onClick={() => setExpandido((v) => !v)}>
        <div className="card-icon">{CATEGORIA_EMOJI[caixinha.categoria] ?? '📦'}</div>
        <div className="card-info">
          <div className="card-nome">{caixinha.nome}</div>
          {caixinha.valorMeta && (
            <div className="card-meta">
              Meta: {fmt(caixinha.valorMeta)}
              {progresso !== null && <span className="pct"> · {progresso.toFixed(0)}%</span>}
            </div>
          )}
        </div>
        <div className="card-saldo">
          <span>{fmt(caixinha.valorAtual)}</span>
          {caixinha.valorMeta && caixinha.valorAtual >= caixinha.valorMeta && (
            <span className="badge-meta">✓ meta</span>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {progresso !== null && (
        <div className="progresso-bar">
          <div className="progresso-fill" style={{ width: `${progresso}%` }} />
        </div>
      )}

      {expandido && (
        <div className="card-detalhes">
          {/* Ações rápidas */}
          <div className="acoes-rapidas">
            <button className="btn-depositar" onClick={onDepositar}>⬆ Depositar</button>
            <button className="btn-retirar" onClick={onRetirar} disabled={caixinha.valorAtual <= 0}>⬇ Retirar</button>
          </div>

          {/* Histórico */}
          {ultimosMovimentos.length > 0 && (
            <div className="historico">
              <span className="historico-titulo">Últimos movimentos</span>
              {ultimosMovimentos.map((m) => (
                <div key={m.id} className="movimento-row">
                  <span className={`mov-tipo ${m.tipo}`}>{m.tipo === 'entrada' ? '⬆' : '⬇'}</span>
                  <span className="mov-data">
                    {new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  {m.observacao && <span className="mov-obs">{m.observacao}</span>}
                  <span className={`mov-valor ${m.tipo}`}>{m.tipo === 'entrada' ? '+' : '-'}{fmt(m.valor)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card-acoes">
            <button className="acao-btn" onClick={onEditar}>✏️ Editar</button>
            <button className="acao-btn acao-remover" onClick={onRemover}>🗑</button>
          </div>
        </div>
      )}

    <style>{`
      .caixinha-card { 
        background: #FFFFFF; 
        border: 1px solid #F1F2F6; 
        border-radius: 16px; 
        overflow: hidden; 
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      
      .caixinha-card:hover { 
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        border-color: #E8E8E8;
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
        color: #95A5A6; 
        font-size: 0.75rem; 
        font-weight: 500;
      }

      .pct { 
        color: #C8A45A; 
        font-weight: 700; 
      }

      .card-saldo { 
        display: flex; 
        flex-direction: column; 
        align-items: flex-end; 
        gap: 4px; 
      }

      .card-saldo span { 
        color: #2D3436; 
        font-size: 1.1rem; 
        font-weight: 700; 
        font-variant-numeric: tabular-nums; 
      }

      .badge-meta { 
        font-size: 0.65rem !important; 
        font-weight: 700;
        color: #2ECC71 !important; 
        background: #E8F5E9; 
        border-radius: 6px; 
        padding: 2px 6px; 
        text-transform: uppercase;
      }

      /* Barra de progresso integrada */
      .progresso-bar { height: 4px; background: #F1F2F6; }
      .progresso-fill { 
        height: 100%; 
        background: linear-gradient(90deg, #C8A45A, #D4AF37); 
        border-radius: 0 2px 2px 0;
        transition: width 0.6s cubic-bezier(0.1, 0.5, 0.5, 1); 
      }

      .card-detalhes { 
        padding: 1.25rem; 
        background: #FCFCFD; 
        border-top: 1px solid #F1F2F6; 
        display: flex; 
        flex-direction: column; 
        gap: 1.25rem; 
      }

      .acoes-rapidas { display: flex; gap: 0.75rem; }
      
      .btn-depositar, .btn-retirar {
        flex: 1; 
        padding: 0.75rem; 
        border-radius: 12px; 
        font-size: 0.85rem;
        cursor: pointer; 
        transition: all 0.2s; 
        font-family: inherit; 
        font-weight: 700;
        border: none;
      }

      .btn-depositar { 
        background: #E8F5E9; 
        color: #2ECC71; 
      }
      .btn-depositar:hover { background: #2ECC71; color: white; }

      .btn-retirar { 
        background: #FFF5F5; 
        color: #E74C3C; 
      }
      .btn-retirar:hover:not(:disabled) { background: #E74C3C; color: white; }
      .btn-retirar:disabled { opacity: 0.4; cursor: not-allowed; }

      .historico { display: flex; flex-direction: column; gap: 0.5rem; }
      
      .historico-titulo { 
        color: #95A5A6; 
        font-size: 0.65rem; 
        font-weight: 700;
        letter-spacing: 0.05em; 
        text-transform: uppercase; 
      }

      .movimento-row { 
        display: flex; 
        align-items: center; 
        gap: 0.75rem; 
        font-size: 0.85rem; 
        padding: 0.6rem 0.75rem; 
        background: white;
        border-radius: 10px;
        border: 1px solid #F1F2F6;
      }

      .mov-data { color: #95A5A6; font-size: 0.75rem; }
      .mov-obs { 
        color: #636E72; 
        flex: 1; 
        font-size: 0.8rem;
        font-style: italic; 
      }

      .mov-valor { font-weight: 600; font-variant-numeric: tabular-nums; }
      .mov-valor.entrada { color: #2ECC71; }
      .mov-valor.saida { color: #E74C3C; }

      .card-acoes { display: flex; gap: 0.5rem; }
      
      .acao-btn { 
        flex: 1;
        background: white; 
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
      .acao-remover { flex: 0; padding: 0.6rem 0.8rem; color: #E74C3C; }
      .acao-remover:hover { background: #FFF5F5; border-color: #FAB1A0; }
    `}</style>
    </div>
  )
}
