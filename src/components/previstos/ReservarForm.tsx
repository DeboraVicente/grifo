import { useState } from 'react'
import type { GastoPrevisto } from '../../types'
import { fmtBRL, hojeISO, resumir } from '../../lib/previstos'

interface Props {
  gasto: GastoPrevisto
  onSalvar: (valor: number, data: string, observacao: string) => Promise<void>
  onCancelar: () => void
}

export default function ReservarForm({ gasto, onSalvar, onCancelar }: Props) {
  const r = resumir(gasto)
  const sugestao = r.pendenteNoMes > 0 ? r.pendenteNoMes : r.reservaMensal
  const [modo, setModo] = useState<'guardar' | 'tirar'>('guardar')
  const [valor, setValor] = useState(Number(sugestao.toFixed(2)) || 0)
  const [data, setData] = useState(hojeISO())
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try { await onSalvar(modo === 'guardar' ? valor : -valor, data, obs) } finally { setSalvando(false) }
  }

  return (
    <form onSubmit={enviar} className="gp-form">
      <div className="gp-segmento">
        <button type="button" className={modo === 'guardar' ? 'on' : ''} onClick={() => setModo('guardar')}>Guardar</button>
        <button type="button" className={modo === 'tirar' ? 'on' : ''} onClick={() => setModo('tirar')}>Tirar</button>
      </div>

      <div className="gp-field">
        <label>Valor</label>
        <input type="number" inputMode="decimal" min="0.01" step="0.01" max={modo === 'tirar' ? gasto.valorReservado : undefined}
          value={valor || ''} onChange={(e) => setValor(parseFloat(e.target.value) || 0)} required autoFocus />
        <span className="gp-hint">
          {modo === 'guardar'
            ? <>Sugerido este mês: {fmtBRL(sugestao)} · faltam {fmtBRL(r.falta)}</>
            : <>Guardado hoje: {fmtBRL(gasto.valorReservado)}</>}
        </span>
      </div>

      <div className="gp-linha">
        <div className="gp-field">
          <label>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="gp-field">
          <label>Observação</label>
          <input type="text" placeholder="Opcional" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      <div className="gp-acoes">
        <button type="button" className="gp-btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="gp-btn" disabled={salvando || valor <= 0}>{salvando ? 'Salvando...' : modo === 'guardar' ? 'Guardar' : 'Tirar'}</button>
      </div>
    </form>
  )
}
