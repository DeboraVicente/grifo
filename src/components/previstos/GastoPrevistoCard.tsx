import { useState } from 'react'
import { CalendarPlus, Check, MoreHorizontal, Pencil, PiggyBank, Trash2 } from 'lucide-react'
import type { GastoPrevisto } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'
import { baixarICS, descreverIntervalo, descreverPrazo, fmtBRL, resumir } from '../../lib/previstos'

interface Props {
  gasto: GastoPrevisto
  onReservar: () => void
  onConcluir: () => void
  onEditar: () => void
  onRemover: () => void
}

export default function GastoPrevistoCard({ gasto, onReservar, onConcluir, onEditar, onRemover }: Props) {
  const r = resumir(gasto)
  const [menu, setMenu] = useState(false)
  const data = new Date(gasto.proximaData + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className={`gp-card gp-${r.status}`}>
      <div className="gp-card-topo">
        <div className="gp-card-icone"><CategoryIcon categoria={gasto.categoria} size={20} color="#636E72" /></div>
        <div className="gp-card-info">
          <strong>{gasto.nome}</strong>
          <span>{fmtBRL(gasto.valorEstimado)} · {descreverIntervalo(gasto.intervaloMeses)}</span>
        </div>
        <div className="gp-menu-wrap">
          <button className="gp-icone-btn" onClick={() => setMenu((m) => !m)} aria-label="Mais opções"><MoreHorizontal size={18} /></button>
          {menu && (
            <div className="gp-menu" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => { setMenu(false); onEditar() }}><Pencil size={14} /> Editar</button>
              <button onClick={() => { setMenu(false); baixarICS(gasto) }}><CalendarPlus size={14} /> Adicionar à agenda</button>
              <button className="gp-perigo" onClick={() => { setMenu(false); onRemover() }}><Trash2 size={14} /> Excluir</button>
            </div>
          )}
        </div>
      </div>

      <div className="gp-prazo">
        <span className={`gp-pill gp-pill-${r.status}`}>{descreverPrazo(r.dias)}</span>
        <span className="gp-data">{data}</span>
      </div>

      <div className="gp-barra"><div style={{ width: `${r.progresso}%` }} /></div>
      <div className="gp-valores">
        <span>{fmtBRL(gasto.valorReservado)} guardado</span>
        <span>{r.falta > 0 ? `faltam ${fmtBRL(r.falta)}` : 'tudo guardado ✓'}</span>
      </div>

      {r.pendenteNoMes >= 0.01 && (
        <div className="gp-lembrete">
          <PiggyBank size={15} /> Reserve <strong>{fmtBRL(r.pendenteNoMes)}</strong> este mês
        </div>
      )}

      <div className="gp-card-acoes">
        <button className="gp-btn-sec" onClick={onReservar}><PiggyBank size={15} /> Reservar</button>
        <button className={r.status === 'em-dia' ? 'gp-btn-sec' : 'gp-btn'} onClick={onConcluir}><Check size={15} /> Já fiz</button>
      </div>
    </div>
  )
}
