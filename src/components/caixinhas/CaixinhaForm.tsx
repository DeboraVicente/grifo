import { useState } from 'react'
import type { Caixinha, CaixinhaForm as CaixinhaFormType, CaixinhaCategoria } from '../../types'

const CATEGORIAS: { value: CaixinhaCategoria; label: string }[] = [
  { value: 'emergencia', label: 'Emergência' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'educacao', label: 'Educação' },
  { value: 'saude', label: 'Saúde' },
  { value: 'reforma', label: 'Reforma' },
  { value: 'eletronicos', label: 'Eletrônicos' },
  { value: 'outros', label: 'Outros' },
]

interface Props {
  inicial?: Caixinha
  onSalvar: (form: CaixinhaFormType) => Promise<void>
  onCancelar: () => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const FORM_VAZIO: CaixinhaFormType = { nome: '', categoria: 'outros', valorMeta: undefined, metaMensal: undefined, dataObjetivo: undefined }

function mesesAte(dataStr: string): number {
  const alvo = new Date(dataStr + 'T12:00:00')
  const hoje = new Date()
  return Math.max(1, (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth()))
}

export default function CaixinhaForm({ inicial, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<CaixinhaFormType>(
    inicial
      ? { nome: inicial.nome, categoria: inicial.categoria, valorMeta: inicial.valorMeta, metaMensal: inicial.metaMensal, dataObjetivo: inicial.dataObjetivo }
      : FORM_VAZIO
  )
  const [temMeta, setTemMeta] = useState(!!inicial?.valorMeta)
  const [temMetaMensal, setTemMetaMensal] = useState(!!inicial?.metaMensal)
  const [loading, setLoading] = useState(false)

  const set = (key: keyof CaixinhaFormType, value: any) => setForm((f) => ({ ...f, [key]: value }))

  // Sugestão mensal baseada na data objetivo
  const sugestaoMensal = (() => {
    if (!temMeta || !form.valorMeta || !form.dataObjetivo) return null
    const falta = form.valorMeta - (inicial?.valorAtual ?? 0)
    if (falta <= 0) return null
    const meses = mesesAte(form.dataObjetivo)
    return { valor: falta / meses, meses }
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar({
        ...form,
        valorMeta: temMeta ? form.valorMeta : undefined,
        metaMensal: temMetaMensal ? form.metaMensal : undefined,
        dataObjetivo: temMeta ? form.dataObjetivo : undefined,
      })
    }
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

      {!inicial && (
        <div className="field">
          <label>Valor inicial (opcional)</label>
          <input type="number" min="0" step="0.01" placeholder="R$ 0,00"
            value={form.valorInicial ?? ''}
            onChange={(e) => set('valorInicial', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
        </div>
      )}

      <div className="field">
        <label className="checkbox-label">
          <input type="checkbox" checked={temMeta}
            onChange={(e) => { setTemMeta(e.target.checked); if (!e.target.checked) set('valorMeta', undefined) }} />
          <span>Definir valor meta total</span>
        </label>
        {temMeta && (
          <>
            <input type="number" min="0" step="0.01" placeholder="R$ 0,00"
              value={form.valorMeta || ''} style={{ marginTop: '0.5rem' }}
              onChange={(e) => set('valorMeta', parseFloat(e.target.value) || undefined)} />
            <label style={{ marginTop: '0.75rem', color: '#95A5A6', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Data objetivo (opcional)
            </label>
            <input type="date" value={form.dataObjetivo ?? ''}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => set('dataObjetivo', e.target.value || undefined)} />
            {sugestaoMensal && (
              <div className="sugestao-mensal">
                <span className="sugestao-ico">💡</span>
                <span>
                  Para atingir a meta em <strong>{sugestaoMensal.meses} {sugestaoMensal.meses === 1 ? 'mês' : 'meses'}</strong>,
                  guarde <strong>{fmt(sugestaoMensal.valor)}/mês</strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="field">
        <label className="checkbox-label">
          <input type="checkbox" checked={temMetaMensal}
            onChange={(e) => { setTemMetaMensal(e.target.checked); if (!e.target.checked) set('metaMensal', undefined) }} />
          <span>Definir aporte mensal</span>
        </label>
        {temMetaMensal && (
          <input type="number" min="0" step="0.01" placeholder="R$ 0,00"
            value={form.metaMensal || ''} style={{ marginTop: '0.5rem' }}
            onChange={(e) => set('metaMensal', parseFloat(e.target.value) || undefined)} />
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
        .sugestao-mensal {
          display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 0.5rem;
          background: #FFFDF7; border: 1px solid rgba(200,164,90,0.25);
          border-radius: 10px; padding: 0.65rem 0.9rem;
          font-size: 0.82rem; color: #636E72; line-height: 1.5;
        }
        .sugestao-ico { font-size: 0.95rem; flex-shrink: 0; margin-top: 1px; }
        .sugestao-mensal strong { color: #C8A45A; font-weight: 700; }
        `}</style>
      </form>
    )
  }
