import { useState } from 'react'
import type { Caixinha, CaixinhaForm as CaixinhaFormType, CaixinhaCategoria } from '../../types'

const CATEGORIAS: { value: CaixinhaCategoria; label: string; emoji: string }[] = [
  { value: 'emergencia', label: 'Emergência', emoji: '🆘' },
  { value: 'viagem', label: 'Viagem', emoji: '✈️' },
  { value: 'educacao', label: 'Educação', emoji: '📚' },
  { value: 'saude', label: 'Saúde', emoji: '❤️' },
  { value: 'reforma', label: 'Reforma', emoji: '🔧' },
  { value: 'eletronicos', label: 'Eletrônicos', emoji: '📱' },
  { value: 'outros', label: 'Outros', emoji: '📦' },
]

interface Props {
  inicial?: Caixinha
  onSalvar: (form: CaixinhaFormType) => Promise<void>
  onCancelar: () => void
}

const FORM_VAZIO: CaixinhaFormType = { nome: '', categoria: 'outros', valorMeta: undefined }

export default function CaixinhaForm({ inicial, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<CaixinhaFormType>(
    inicial ? { nome: inicial.nome, categoria: inicial.categoria, valorMeta: inicial.valorMeta } : FORM_VAZIO
  )
  const [temMeta, setTemMeta] = useState(!!inicial?.valorMeta)
  const [loading, setLoading] = useState(false)

  const set = (key: keyof CaixinhaFormType, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await onSalvar({ ...form, valorMeta: temMeta ? form.valorMeta : undefined }) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="caixinha-form">
      <div className="field">
        <label>Nome da caixinha</label>
        <input type="text" placeholder="Ex: Viagem para o nordeste" value={form.nome}
          onChange={(e) => set('nome', e.target.value)} required />
      </div>

        <div className="field full">
          <label>Categoria</label>
          <select
              value={form.categoria}
              onChange={(e) => {
                set('categoria', e.target.value)
              }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
        </div>

      <div className="field">
        <label className="checkbox-label">
          <input type="checkbox" checked={temMeta}
            onChange={(e) => { setTemMeta(e.target.checked); if (!e.target.checked) set('valorMeta', undefined) }} />
          <span>Definir valor meta</span>
        </label>
        {temMeta && (
          <input type="number" min="0" step="0.01" placeholder="R$ 0,00"
            value={form.valorMeta || ''} style={{ marginTop: '0.5rem' }}
            onChange={(e) => set('valorMeta', parseFloat(e.target.value) || undefined)} />
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : inicial ? 'Salvar' : 'Criar caixinha'}
        </button>
      </div>

        <style>{`
          .caixinha-form { display: flex; flex-direction: column; gap: 1.25rem; }
          .field { display: flex; flex-direction: column; gap: 0.4rem; }
          .field label { color: #888; font-size: 0.78rem; letter-spacing: 0.05em; text-transform: uppercase; }
          .field input {
            background: #111; border: 1px solid #2a2a2a; border-radius: 8px;
            color: #e8e8e8; padding: 0.7rem 0.9rem; font-size: 0.9rem;
            outline: none; transition: border-color 0.2s; font-family: inherit;
          }
          .field input:focus { border-color: #C8A45A; }
          .categoria-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; }
          .categoria-btn {
            display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
            padding: 0.5rem 0.3rem; background: #111; border: 1px solid #2a2a2a;
            border-radius: 8px; color: #666; font-size: 0.72rem; cursor: pointer;
            transition: all 0.15s; font-family: inherit;
          }
          .categoria-btn span:first-child { font-size: 1.1rem; }
          .categoria-btn:hover { border-color: #444; color: #aaa; }
          .categoria-btn.active { border-color: #C8A45A; color: #C8A45A; background: rgba(200,164,90,0.08); }
          .checkbox-label {
            display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
            color: #aaa !important; font-size: 0.88rem !important;
            text-transform: none !important; letter-spacing: 0 !important;
          }
          .checkbox-label input { width: 16px; height: 16px; accent-color: #C8A45A; }
          .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #1e1e1e; }
          .btn-primary { background: #C8A45A; color: #0f0f0f; border: none; border-radius: 8px; padding: 0.75rem 1.5rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; font-family: inherit; }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
          .btn-ghost { background: transparent; color: #666; border: 1px solid #2a2a2a; border-radius: 8px; padding: 0.75rem 1.25rem; font-size: 0.9rem; cursor: pointer; transition: border-color 0.2s, color 0.2s; font-family: inherit; }
          .btn-ghost:hover { border-color: #444; color: #aaa; }
          .field input, .field select, .field textarea {
          background: #F8F9FA; 
          border: 1px solid #F1F2F6; 
          border-radius: 12px;
          color: #2D3436; 
          padding: 0.8rem 1rem; 
          font-size: 0.95rem;
          outline: none; 
          transition: all 0.2s; 
          font-family: inherit;
        }

        .field input:focus, .field select:focus, .field textarea:focus { 
          border-color: #C8A45A; 
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(200,164,90,0.05);
        }
        `}</style>
      </form>
    )
  }
