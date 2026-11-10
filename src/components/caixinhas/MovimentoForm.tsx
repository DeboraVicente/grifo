import { useState } from 'react'
import type { Caixinha } from '../../types'

export type TipoMovimento = 'entrada' | 'saida' | 'rendimento'

interface Props {
  tipo: TipoMovimento
  caixinha: Caixinha
  onSalvar: (dados: { valor: number; data: string; observacao: string }) => Promise<void>
  onCancelar: () => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Quanto já entrou na caixinha no mês da data informada. */
function aportadoNoMes(c: Caixinha, dataISO: string): number {
  const prefixo = dataISO.slice(0, 7)
  return (c.historico ?? [])
    .filter((m) => m.tipo === 'entrada' && m.data.startsWith(prefixo))
    .reduce((s, m) => s + m.valor, 0)
}

/**
 * Depósito, retirada ou rendimento de uma caixinha.
 * O valor começa vazio: é o quanto você realmente movimentou.
 * As sugestões (aporte do mês, falta para a meta, saldo) são atalhos de um toque.
 */
export default function MovimentoForm({ tipo, caixinha, onSalvar, onCancelar }: Props) {
  const [valor, setValor] = useState(0)
  const [data, setData] = useState(hojeISO())
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const sugestoes: { label: string; valor: number }[] = []
  if (tipo === 'entrada') {
    if (caixinha.metaMensal) {
      const faltaMes = caixinha.metaMensal - aportadoNoMes(caixinha, data)
      if (faltaMes > 0.004) sugestoes.push({ label: 'Aporte do mês', valor: faltaMes })
    }
    if (caixinha.valorMeta) {
      const faltaMeta = caixinha.valorMeta - caixinha.valorAtual
      if (faltaMeta > 0.004) sugestoes.push({ label: 'Falta para a meta', valor: faltaMeta })
    }
  } else if (tipo === 'saida' && caixinha.valorAtual > 0) {
    sugestoes.push({ label: 'Retirar tudo', valor: caixinha.valorAtual })
  }

  const max = tipo === 'saida' ? caixinha.valorAtual : undefined
  const saldoDepois = tipo === 'saida' ? caixinha.valorAtual - valor : caixinha.valorAtual + valor

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (valor <= 0) return
    setSalvando(true)
    try { await onSalvar({ valor, data, observacao }) } finally { setSalvando(false) }
  }

  const rotuloBotao = tipo === 'entrada' ? 'Depositar' : tipo === 'saida' ? 'Retirar' : 'Registrar rendimento'

  return (
    <form onSubmit={enviar} className="mov-form">
      <div className="mov-field">
        <label htmlFor="mov-valor">{tipo === 'entrada' ? 'Quanto você depositou?' : tipo === 'saida' ? 'Quanto você retirou?' : 'Quanto rendeu?'}</label>
        <input id="mov-valor" type="number" inputMode="decimal" min="0.01" step="0.01" max={max}
          placeholder="0,00" value={valor || ''} onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
          required autoFocus />
        {sugestoes.length > 0 && (
          <div className="mov-sugestoes">
            {sugestoes.map((s) => (
              <button key={s.label} type="button" className={`mov-chip ${Math.abs(valor - s.valor) < 0.005 ? 'on' : ''}`}
                onClick={() => setValor(Number(s.valor.toFixed(2)))}>
                {s.label}: <strong>{fmt(s.valor)}</strong>
              </button>
            ))}
          </div>
        )}
        <span className="mov-hint">
          Saldo hoje {fmt(caixinha.valorAtual)}{valor > 0 && <> · depois {fmt(Math.max(0, saldoDepois))}</>}
        </span>
      </div>

      <div className="mov-linha">
        <div className="mov-field">
          <label htmlFor="mov-data">Data</label>
          <input id="mov-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="mov-field">
          <label htmlFor="mov-obs">Observação</label>
          <input id="mov-obs" type="text" placeholder="Opcional" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>

      <div className="mov-acoes">
        <button type="button" className="mov-btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="mov-btn" disabled={salvando || valor <= 0}>{salvando ? 'Salvando...' : rotuloBotao}</button>
      </div>

      <style>{`
        .mov-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .mov-field { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
        .mov-field label { color: #95A5A6; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        .mov-field input {
          background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; color: #2D3436;
          padding: 0.8rem 1rem; font-size: 1rem; outline: none; font-family: inherit; min-width: 0;
        }
        .mov-field input:focus { border-color: #C8A45A; background: #fff; box-shadow: 0 0 0 4px rgba(200,164,90,0.05); }
        .mov-sugestoes { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .mov-chip {
          background: rgba(200,164,90,0.08); border: 1px solid rgba(200,164,90,0.25); color: #8A6A2B;
          border-radius: 999px; padding: 0.4rem 0.75rem; font-size: 0.78rem; font-family: inherit; cursor: pointer;
        }
        .mov-chip strong { font-variant-numeric: tabular-nums; }
        .mov-chip.on { background: #C8A45A; border-color: #C8A45A; color: #fff; }
        .mov-hint { color: #95A5A6; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
        .mov-linha { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (max-width: 420px) { .mov-linha { grid-template-columns: 1fr; } }
        .mov-acoes { display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1.25rem; border-top: 1px solid #F1F2F6; }
        .mov-btn {
          background: #C8A45A; color: #fff; border: none; border-radius: 12px; padding: 0.85rem 1.5rem;
          font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .mov-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mov-btn-ghost {
          background: transparent; color: #95A5A6; border: 1px solid #F1F2F6; border-radius: 12px;
          padding: 0.85rem 1.25rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit;
        }
      `}</style>
    </form>
  )
}
