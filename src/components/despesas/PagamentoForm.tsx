import { useState } from 'react'

interface Props {
  tipo: 'pagamento' | 'adiantamento'
  valorRestante: number
  onSalvar: (dados: { valor: number; data: string; observacao: string }) => Promise<void>
  onCancelar: () => void
}

const hoje = new Date().toISOString().split('T')[0]

export default function PagamentoForm({ tipo, valorRestante, onSalvar, onCancelar }: Props) {
  const [valor, setValor] = useState(valorRestante)
  const [data, setData] = useState(hoje)
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar({ valor, data, observacao })
    } finally {
      setLoading(false)
    }
  }

  const label = tipo === 'pagamento' ? 'Registrar pagamento' : 'Registrar adiantamento'

  return (
    <form onSubmit={handleSubmit} className="pag-form">
      <div className="field">
        <label>Valor (R$)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={valor || ''}
          onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
          required
        />
        {tipo === 'pagamento' && (
          <span className="field-hint">Restante: R$ {valorRestante.toFixed(2)}</span>
        )}
      </div>

      <div className="field">
        <label>Data</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Observação</label>
        <input
          type="text"
          placeholder="Opcional"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      <div className="pag-actions">
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : label}
        </button>
      </div>

      <style>{`
        .pag-form { 
          display: flex; 
          flex-direction: column; 
          gap: 1.25rem; 
        }

        .field { 
          display: flex; 
          flex-direction: column; 
          gap: 0.5rem; 
        }

        .field label { 
          color: #95A5A6; 
          font-size: 0.7rem; 
          font-weight: 700;
          letter-spacing: 0.05em; 
          text-transform: uppercase; 
        }

        .field-hint { 
          color: #C8A45A; 
          font-size: 0.75rem; 
          font-weight: 600;
          margin-top: 2px;
        }

        .field input {
          background: #F8F9FA; 
          border: 1px solid #F1F2F6; 
          border-radius: 12px;
          color: #2D3436; 
          padding: 0.8rem 1rem; 
          font-size: 1rem; 
          outline: none;
          transition: all 0.2s ease; 
          font-family: inherit;
        }

        .field input:focus { 
          border-color: #C8A45A; 
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(200,164,90,0.05);
        }

        .pag-actions {
          display: flex; 
          justify-content: flex-end; 
          gap: 1rem;
          padding-top: 1.5rem; 
          border-top: 1px solid #F1F2F6; 
          margin-top: 0.5rem;
        }

        .btn-primary {
          background: #C8A45A; 
          color: #FFFFFF; 
          border: none; 
          border-radius: 12px;
          padding: 0.85rem 1.5rem; 
          font-size: 0.9rem; 
          font-weight: 700;
          cursor: pointer; 
          box-shadow: 0 4px 12px rgba(200,164,90,0.2);
          transition: all 0.2s ease; 
          font-family: inherit;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(200,164,90,0.3);
        }

        .btn-primary:disabled { 
          opacity: 0.5; 
          transform: none;
          cursor: not-allowed; 
        }

        .btn-ghost {
          background: transparent; 
          color: #95A5A6; 
          border: 1px solid #F1F2F6;
          border-radius: 12px; 
          padding: 0.85rem 1.25rem; 
          font-size: 0.9rem; 
          font-weight: 600;
          cursor: pointer; 
          transition: all 0.2s; 
          font-family: inherit;
        }

        .btn-ghost:hover { 
          background: #F8F9FA; 
          color: #636E72;
          border-color: #E0E0E0;
        }
      `}</style>
    </form>
  )
}
