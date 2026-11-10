import { useState } from 'react'
import { Lock } from 'lucide-react'
import type { Receita, CategoriaReceita } from '../../types'
import type { ReceitaForm as ReceitaFormType } from '../../hooks/useReceitas'

interface Props {
  inicial?: Receita
  onSalvar: (form: ReceitaFormType) => void
  onCancelar: () => void
  /** Mostra o aviso de privacidade (quando há família) */
  emFamilia?: boolean
}

const CATEGORIAS: { value: CategoriaReceita; label: string }[] = [
  { value: 'salario', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'outros', label: 'Outros' },
]

export default function ReceitaForm({ inicial, onSalvar, onCancelar, emFamilia }: Props) {
  const hoje = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<ReceitaFormType>({
    nome: inicial?.nome ?? '',
    valor: inicial?.valor ?? 0,
    data: inicial?.data ?? hoje,
    categoria: inicial?.categoria ?? 'salario',
    recorrente: inicial?.recorrente ?? false,
  })
  const [salvando, setSalvando] = useState(false)

  const set = (campo: keyof ReceitaFormType, valor: unknown) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || form.valor <= 0) return
    setSalvando(true)
    await onSalvar(form)
    setSalvando(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      {emFamilia && <p className="rf-privado">
        <Lock size={12} /> Só você vê suas receitas. Na família, elas entram apenas no cálculo do rateio.
      </p>}
      <div className="rf-field">
        <label>Nome</label>
        <input
          type="text"
          placeholder="Ex: Salário Maio"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          required
        />
      </div>

      <div className="rf-row">
        <div className="rf-field">
          <label>Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.valor || ''}
            onChange={(e) => set('valor', parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div className="rf-field">
          <label>Data</label>
          <input
            type="date"
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="rf-field">
        <label>Categoria</label>
        <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <label className="rf-check">
        <input
          type="checkbox"
          checked={form.recorrente}
          onChange={(e) => set('recorrente', e.target.checked)}
        />
        <span>Receita recorrente (aparece em todos os meses)</span>
      </label>

      <div className="rf-actions">
        <button type="button" className="rf-btn-cancel" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="rf-btn-save" disabled={salvando}>
          {salvando ? 'Salvando...' : inicial ? 'Salvar' : 'Adicionar'}
        </button>
      </div>

      <style>{`
        .rf-privado { display: flex; align-items: center; gap: 0.4rem; margin: 0 0 1rem; font-size: 0.78rem; color: #95A5A6; }
        .rf-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
        .rf-field label { font-size: 0.75rem; font-weight: 600; color: #636e72; text-transform: uppercase; letter-spacing: 0.05em; }
        .rf-field input, .rf-field select {
          border: 1px solid #E0E0E0; border-radius: 10px; padding: 0.75rem 1rem;
          font-size: 0.9rem; color: #2D3436; background: #F8F9FA; width: 100%;
        }
        .rf-field input:focus, .rf-field select:focus { outline: none; border-color: #C8A45A; background: #fff; }
        .rf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .rf-check { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: #636e72; cursor: pointer; margin-bottom: 1.5rem; }
        .rf-check input { width: 16px; height: 16px; accent-color: #C8A45A; }
        .rf-actions { display: flex; gap: 0.75rem; }
        .rf-btn-cancel { flex: 1; padding: 0.75rem; border: 1px solid #E0E0E0; border-radius: 10px; background: #fff; color: #636e72; font-weight: 600; cursor: pointer; }
        .rf-btn-save { flex: 2; padding: 0.75rem; border: none; border-radius: 10px; background: #C8A45A; color: #fff; font-weight: 700; cursor: pointer; }
        .rf-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </form>
  )
}
