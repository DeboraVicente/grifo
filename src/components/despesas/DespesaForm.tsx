import { useState } from 'react'
import type { Despesa, DespesaForm as DespesaFormType, Categoria, MetodoPagamento } from '../../types'

const CATEGORIAS: { value: Categoria; label: string; emoji: string }[] = [
  { value: 'casa', label: 'Casa', emoji: '🏠' },
  { value: 'pessoal', label: 'Pessoal', emoji: '👤' },
  { value: 'saude', label: 'Saúde', emoji: '❤️' },
  { value: 'locomocao', label: 'Locomoção', emoji: '🚗' },
  { value: 'alimentacao', label: 'Alimentação', emoji: '🍽️' },
  { value: 'educacao', label: 'Educação', emoji: '📚' },
  { value: 'lazer', label: 'Lazer', emoji: '🎮' },
]

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: 'credito', label: 'Cartão de Crédito' },
  { value: 'debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

interface Props {
  inicial?: Despesa
  onSalvar: (form: DespesaFormType) => Promise<void>
  onCancelar: () => void
}

const hoje = new Date().toISOString().split('T')[0]

const FORM_VAZIO: DespesaFormType = {
  nome: '',
  categoria: 'casa',
  metodoPagamento: 'credito',
  parcelas: 1,
  valorTotal: 0,
  data: hoje,
  observacoes: '',
  rateio: { ativo: false },
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DespesaForm({ inicial, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<DespesaFormType>(
    inicial
      ? {
          nome: inicial.nome,
          categoria: inicial.categoria,
          metodoPagamento: inicial.metodoPagamento,
          parcelas: inicial.parcelas,
          valorTotal: inicial.valorTotal ?? (inicial as any).valor ?? 0,
          data: inicial.data,
          observacoes: inicial.observacoes ?? '',
          rateio: inicial.rateio,
        }
      : FORM_VAZIO
  )
  const [loading, setLoading] = useState(false)

  const set = (key: keyof DespesaFormType, value: any) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar(form)
    } finally {
      setLoading(false)
    }
  }

  const isCredito = form.metodoPagamento === 'credito'
  const valorParcela = form.parcelas > 1 && form.valorTotal > 0
    ? form.valorTotal / form.parcelas
    : null

  return (
    <form onSubmit={handleSubmit} className="despesa-form">
      <div className="form-grid">

        {/* Nome */}
        <div className="field full">
          <label>Nome da despesa</label>
          <input
            type="text"
            placeholder="Ex: Conta de luz"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            required
          />
        </div>

        {/* Data */}
        <div className="field">
          <label>Data {isCredito && form.parcelas > 1 ? 'da 1ª parcela' : ''}</label>
          <input
            type="date"
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
            required
          />
        </div>

        {/* Valor total */}
        <div className="field">
          <label>Valor total (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={form.valorTotal || ''}
            onChange={(e) => set('valorTotal', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        {/* Método */}
        <div className="field">
          <label>Método de pagamento</label>
          <select
            value={form.metodoPagamento}
            onChange={(e) => {
              set('metodoPagamento', e.target.value)
              if (e.target.value !== 'credito') set('parcelas', 1)
            }}
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Parcelas — só crédito */}
        {isCredito && (
          <div className="field">
            <label>Parcelas</label>
            <select
              value={form.parcelas}
              onChange={(e) => set('parcelas', parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}x {n === 1 ? '(à vista)' : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Preview parcelas */}
        {valorParcela && (
          <div className="field full">
            <div className="parcela-preview">
              <span>📅</span>
              <span>
                {form.parcelas}x de <strong>{fmt(valorParcela)}</strong> — total {fmt(form.valorTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Categoria */}
        <div className="field full">
          <label>Categoria</label>
          <select
            value={form.categoria}
            onChange={(e) => {
              set('categoria', e.target.value)
              if (e.target.value !== 'credito') set('parcelas', 1)
            }}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Rateio */}
        <div className="field full">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.rateio.ativo}
              onChange={(e) => set('rateio', { ...form.rateio, ativo: e.target.checked })}
            />
            <span>Incluir no rateio familiar</span>
          </label>
          {form.rateio.ativo && (
            <div className="rateio-opcoes">
              <label className="radio-label">
                <input type="radio" name="tipoRateio" value="pessoa"
                  checked={form.rateio.tipo === 'pessoa'}
                  onChange={() => set('rateio', { ...form.rateio, tipo: 'pessoa' })}
                />
                <span>Por pessoa (igualitário)</span>
              </label>
              <label className="radio-label">
                <input type="radio" name="tipoRateio" value="renda"
                  checked={form.rateio.tipo === 'renda'}
                  onChange={() => set('rateio', { ...form.rateio, tipo: 'renda' })}
                />
                <span>Por renda (proporcional)</span>
              </label>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="field full">
          <label>Observações</label>
          <textarea
            placeholder="Informações adicionais..."
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : inicial ? 'Salvar alterações' : 'Criar despesa'}
        </button>
      </div>

      <style>{`
        .despesa-form { 
          display: flex; 
          flex-direction: column; 
          gap: 1.5rem; 
          background: #FFFFFF;
        }

        .form-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 1.25rem; 
        }

        .field { display: flex; flex-direction: column; gap: 0.5rem; }
        .field.full { grid-column: 1 / -1; }

        .field label { 
          color: #95A5A6; 
          font-size: 0.7rem; 
          font-weight: 700;
          letter-spacing: 0.05em; 
          text-transform: uppercase; 
        }

        /* Inputs mais leves e modernos */
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

        /* Preview de parcelas com estilo de "Alert" suave */
        .parcela-preview {
          display: flex; 
          align-items: center; 
          gap: 0.75rem;
          background: #FFFDF7; 
          border: 1px solid rgba(200,164,90,0.2);
          border-radius: 12px; 
          padding: 1rem;
          color: #C8A45A; 
          font-size: 0.85rem;
          font-weight: 500;
        }
        .parcela-preview strong { color: #2D3436; font-weight: 700; }

        /* Checkbox e Radios customizados */
        .checkbox-label {
          display: flex; 
          align-items: center; 
          gap: 0.6rem; 
          cursor: pointer;
          color: #636E72 !important; 
          font-size: 0.9rem !important;
          text-transform: none !important; 
          font-weight: 500 !important;
        }
        .checkbox-label input { 
          width: 18px; height: 18px; 
          accent-color: #C8A45A; 
        }

        .rateio-opcoes {
          display: flex; 
          gap: 1.5rem; 
          margin-top: 0.5rem;
          padding: 1rem; 
          background: #F8F9FA; 
          border-radius: 12px;
        }
        .radio-label { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          color: #636E72; 
          font-size: 0.85rem; 
          cursor: pointer; 
          font-weight: 500;
        }
        .radio-label input { accent-color: #C8A45A; }

        /* Ações do formulário */
        .form-actions {
          display: flex; 
          justify-content: flex-end; 
          gap: 1rem;
          padding-top: 1.5rem; 
          border-top: 1px solid #F1F2F6;
        }

        .btn-primary {
          background: #C8A45A; 
          color: #FFFFFF; 
          border: none; 
          border-radius: 12px;
          padding: 0.9rem 1.8rem; 
          font-size: 0.9rem; 
          font-weight: 700;
          cursor: pointer; 
          box-shadow: 0 4px 12px rgba(200,164,90,0.2);
          transition: all 0.2s; 
          font-family: inherit;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200,164,90,0.3); }
        .btn-primary:disabled { opacity: 0.5; transform: none; }

        .btn-ghost {
          background: transparent; 
          color: #95A5A6; 
          border: 1px solid #F1F2F6;
          border-radius: 12px; 
          padding: 0.9rem 1.5rem; 
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer; 
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: #F8F9FA; color: #636E72; border-color: #E0E0E0; }
      `}</style>
    </form>
  )
}