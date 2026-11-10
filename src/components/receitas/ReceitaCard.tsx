import { Pencil, Trash2, Repeat } from 'lucide-react'
import type { Receita } from '../../types'
import { CATEGORIA_RECEITA_LABEL, fmtBRL, fmtDiaMes } from '../../lib/receitas'
import IconeReceita from './IconeReceita'

interface Props {
  receita: Receita
  dataNoMes: string
  onEditar: () => void
  onRemover: () => void
}

/** Receita em card (mesmo visual dos cards de despesa). */
export default function ReceitaCard({ receita: r, dataNoMes, onEditar, onRemover }: Props) {
  const dia = Number(r.data.split('-')[2]) || 1
  return (
    <div className="recc-card">
      <span className="recc-icone"><IconeReceita categoria={r.categoria} size={22} /></span>
      <div className="recc-info">
        <span className="recc-nome">{r.nome}</span>
        <span className="recc-meta">
          {CATEGORIA_RECEITA_LABEL[r.categoria] ?? r.categoria}
          {' · '}
          {r.recorrente ? <><Repeat size={11} /> todo dia {dia}</> : fmtDiaMes(dataNoMes)}
        </span>
      </div>
      <span className="recc-valor">{fmtBRL(r.valor)}</span>
      <div className="recc-acoes">
        <button onClick={onEditar} aria-label={`Editar ${r.nome}`}><Pencil size={14} /></button>
        <button className="del" onClick={onRemover} aria-label={`Excluir ${r.nome}`}><Trash2 size={14} /></button>
      </div>

      <style>{`
        .recc-card {
          display: flex; align-items: center; gap: 0.85rem;
          background: #fff; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1rem 1.1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .recc-icone { width: 44px; height: 44px; border-radius: 12px; background: rgba(39,174,96,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .recc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .recc-nome { font-size: 0.95rem; font-weight: 600; color: #2D3436; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .recc-meta { display: inline-flex; align-items: center; gap: 3px; font-size: 0.76rem; color: #95A5A6; }
        .recc-valor { font-size: 0.98rem; font-weight: 700; color: #27AE60; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .recc-acoes { display: flex; gap: 0.15rem; }
        .recc-acoes button { background: none; border: none; color: #BDC3C7; cursor: pointer; padding: 0.35rem; border-radius: 6px; display: flex; }
        .recc-acoes button:hover { color: #C8A45A; background: #F8F9FA; }
        .recc-acoes button.del:hover { color: #E74C3C; }
        @media (max-width: 480px) { .recc-card { flex-wrap: wrap; } .recc-acoes { margin-left: auto; } }
      `}</style>
    </div>
  )
}
