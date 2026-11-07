import { useState } from 'react'
import type { GastoPrevisto } from '../../types'
import { descreverIntervalo, fmtBRL, hojeISO, somarMeses } from '../../lib/previstos'

export interface DadosConclusao {
  valorReal: number
  data: string
  atualizarEstimativa: boolean
  lancarDespesa: boolean
}

interface Props {
  gasto: GastoPrevisto
  onSalvar: (dados: DadosConclusao) => Promise<void>
  onCancelar: () => void
}

export default function ConcluirForm({ gasto, onSalvar, onCancelar }: Props) {
  const [valorReal, setValorReal] = useState(gasto.valorEstimado)
  const [data, setData] = useState(hojeISO())
  const [atualizarEstimativa, setAtualizarEstimativa] = useState(true)
  const [lancarDespesa, setLancarDespesa] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const coberto = Math.min(gasto.valorReservado, valorReal)
  const doBolso = Math.max(0, valorReal - gasto.valorReservado)
  const sobra = Math.max(0, gasto.valorReservado - valorReal)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try { await onSalvar({ valorReal, data, atualizarEstimativa, lancarDespesa }) } finally { setSalvando(false) }
  }

  return (
    <form onSubmit={enviar} className="gp-form">
      <div className="gp-linha">
        <div className="gp-field">
          <label>Quanto custou</label>
          <input type="number" inputMode="decimal" min="0.01" step="0.01"
            value={valorReal || ''} onChange={(e) => setValorReal(parseFloat(e.target.value) || 0)} required autoFocus />
        </div>
        <div className="gp-field">
          <label>Quando</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
      </div>

      <div className="gp-resumo-conclusao">
        <div><span>Coberto pela reserva</span><strong>{fmtBRL(coberto)}</strong></div>
        {doBolso > 0 && <div><span>Saiu do bolso</span><strong className="gp-neg">{fmtBRL(doBolso)}</strong></div>}
        {sobra > 0 && <div><span>Sobra para a próxima</span><strong className="gp-pos">{fmtBRL(sobra)}</strong></div>}
        <div><span>Próxima vez</span><strong>{new Date(somarMeses(data, gasto.intervaloMeses) + 'T12:00').toLocaleDateString('pt-BR')}</strong></div>
      </div>

      <label className="gp-check">
        <input type="checkbox" checked={lancarDespesa} onChange={(e) => setLancarDespesa(e.target.checked)} />
        <span>Lançar como despesa paga</span>
      </label>
      {valorReal !== gasto.valorEstimado && (
        <label className="gp-check">
          <input type="checkbox" checked={atualizarEstimativa} onChange={(e) => setAtualizarEstimativa(e.target.checked)} />
          <span>Usar {fmtBRL(valorReal)} como estimativa da próxima ({descreverIntervalo(gasto.intervaloMeses)})</span>
        </label>
      )}

      <div className="gp-acoes">
        <button type="button" className="gp-btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="gp-btn" disabled={salvando}>{salvando ? 'Salvando...' : 'Concluir'}</button>
      </div>
    </form>
  )
}
