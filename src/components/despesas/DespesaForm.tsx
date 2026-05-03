import { useState } from 'react'
import type { Despesa, DespesaForm as DespesaFormType, Categoria, MetodoPagamento } from '../../types'

const CATEGORIAS: { value: Categoria; label: string; emoji: string }[] = [
  { value: 'casa', label: 'Casa', emoji: '🏠' },
  { value: 'pessoal', label: 'Pessoal', emoji: '👤' },
  { value: 'saude', label: 'Saúde', emoji: '❤️' },
  { value: 'locomocao', label: 'Locomoção', emoji: '🚗' },
  { value: 'beleza', label: 'Beleza', emoji: '✨' },
  { value: 'alimentacao', label: 'Alimentação', emoji: '🍽️' },
  { value: 'educacao', label: 'Educação', emoji: '📚' },
  { value: 'lazer', label: 'Lazer', emoji: '🎮' },
  { value: 'outros', label: 'Outros', emoji: '📦' },
]

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: 'credito', label: 'Cartão de Crédito' },
  { value: 'debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

interface Amigo { id: string; nome: string; email: string }

interface Props {
  inicial?: Despesa
  amigos: Amigo[]
  onSalvar: (form: DespesaFormType) => Promise<void>
  onCancelar: () => void
}

const hoje = new Date().toISOString().split('T')[0]

const FORM_VAZIO: DespesaFormType = {
  nome: '', categoria: 'outros', metodoPagamento: 'credito',
  parcelas: 1, valorTotal: 0, data: hoje, observacoes: '',
  rateio: { ativo: false },
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DespesaForm({ inicial, amigos, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<DespesaFormType>(
    inicial ? {
      nome: inicial.nome, categoria: inicial.categoria,
      metodoPagamento: inicial.metodoPagamento, parcelas: inicial.parcelas,
      valorTotal: inicial.valorTotal ?? (inicial as any).valor ?? 0,
      data: inicial.data, observacoes: inicial.observacoes ?? '',
      rateio: inicial.rateio,
    } : FORM_VAZIO
  )
  const [loading, setLoading] = useState(false)

  // Estado local do rateio
  const [rateioAtivo, setRateioAtivo] = useState(inicial?.rateio?.ativo ?? false)
  const [tipoRateio, setTipoRateio] = useState<'pessoa' | 'renda'>(
    (inicial?.rateio?.ativo ? (inicial.rateio as any).tipo : 'pessoa') ?? 'pessoa'
  )
  const [participantes, setParticipantes] = useState<{ amigoId: string; renda: number }[]>([])
  const [amigoSelecionado, setAmigoSelecionado] = useState('')

  const set = (key: keyof DespesaFormType, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const isCredito = form.metodoPagamento === 'credito'
  const valorParcela = form.parcelas > 1 && form.valorTotal > 0 ? form.valorTotal / form.parcelas : null

  const adicionarParticipante = () => {
    if (!amigoSelecionado) return
    if (participantes.find((p) => p.amigoId === amigoSelecionado)) return
    setParticipantes((ps) => [...ps, { amigoId: amigoSelecionado, renda: 0 }])
    setAmigoSelecionado('')
  }

  const removerParticipante = (id: string) =>
    setParticipantes((ps) => ps.filter((p) => p.amigoId !== id))

  const setRenda = (amigoId: string, renda: number) =>
    setParticipantes((ps) => ps.map((p) => p.amigoId === amigoId ? { ...p, renda } : p))

  // Calcula preview do rateio
  const previewRateio = () => {
    const valor = valorParcela ?? form.valorTotal
    if (!valor || participantes.length === 0) return []
    const total = participantes.length + 1 // +1 = o próprio usuário

    if (tipoRateio === 'pessoa') {
      const parte = valor / total
      return [
        { nome: 'Você', valor: parte, pct: (100 / total) },
        ...participantes.map((p) => {
          const amigo = amigos.find((a) => a.id === p.amigoId)
          return { nome: amigo?.nome ?? '?', valor: parte, pct: (100 / total) }
        }),
      ]
    } else {
      const rendas = participantes.map((p) => p.renda)
      const rendaDefault = rendas.length > 0 ? Math.max(...rendas, 1) : 1
      const rendaTotal = rendaDefault + rendas.reduce((s, r) => s + r, 0)
      return [
        { nome: 'Você', valor: (rendaDefault / rendaTotal) * valor, pct: (rendaDefault / rendaTotal) * 100 },
        ...participantes.map((p) => {
          const amigo = amigos.find((a) => a.id === p.amigoId)
          const pct = rendaTotal > 0 ? (p.renda / rendaTotal) * 100 : 0
          return { nome: amigo?.nome ?? '?', valor: (p.renda / rendaTotal) * valor, pct }
        }),
      ]
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const rateio = rateioAtivo && participantes.length > 0
        ? {
            ativo: true as const,
            tipo: tipoRateio,
            participantes: participantes.map((p) => {
              const amigo = amigos.find((a) => a.id === p.amigoId)!
              const preview = previewRateio().find((pr) => pr.nome === amigo.nome)
              return {
                userId: p.amigoId,
                nome: amigo.nome,
                email: amigo.email,
                renda: p.renda,
                percentual: preview?.pct ?? 0,
                valorDevido: preview?.valor ?? 0,
                valorPago: 0,
                status: 'pendente',
              }
            }),
          }
        : { ativo: false as const }

      await onSalvar({ ...form, rateio })
    } finally {
      setLoading(false)
    }
  }

  const preview = previewRateio()
  const amigosDisponiveis = amigos.filter((a) => !participantes.find((p) => p.amigoId === a.id))

  return (
    <form onSubmit={handleSubmit} className="despesa-form">
      <div className="form-grid">
        <div className="field full">
          <label>Nome da despesa</label>
          <input type="text" placeholder="Ex: Conta de luz" value={form.nome}
            onChange={(e) => set('nome', e.target.value)} required />
        </div>

        <div className="field">
          <label>Data {isCredito && form.parcelas > 1 ? 'da 1ª parcela' : ''}</label>
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} required />
        </div>

        <div className="field">
          <label>Valor total (R$)</label>
          <input type="number" min="0" step="0.01" placeholder="0,00"
            value={form.valorTotal || ''}
            onChange={(e) => set('valorTotal', parseFloat(e.target.value) || 0)} required />
        </div>

        <div className="field">
          <label>Método de pagamento</label>
          <select value={form.metodoPagamento} onChange={(e) => {
            set('metodoPagamento', e.target.value)
            if (e.target.value !== 'credito') set('parcelas', 1)
          }}>
            {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {isCredito && (
          <div className="field">
            <label>Parcelas</label>
            <select value={form.parcelas} onChange={(e) => set('parcelas', parseInt(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}x {n === 1 ? '(à vista)' : ''}</option>
              ))}
            </select>
          </div>
        )}

        {valorParcela && (
          <div className="field full">
            <div className="parcela-preview">
              <span>📅</span>
              <span>{form.parcelas}x de <strong>{fmt(valorParcela)}</strong> — total {fmt(form.valorTotal)}</span>
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

        {/* ── Rateio ── */}
        <div className="field full">
          <label className="checkbox-label">
            <input type="checkbox" checked={rateioAtivo}
              onChange={(e) => { setRateioAtivo(e.target.checked); if (!e.target.checked) setParticipantes([]) }} />
            <span>Ratear esta despesa</span>
          </label>

          {rateioAtivo && (
            <div className="rateio-box">
              {/* Tipo */}
              <div className="rateio-tipo">
                <label className="radio-label">
                  <input type="radio" name="tipoRateio" value="pessoa"
                    checked={tipoRateio === 'pessoa'} onChange={() => setTipoRateio('pessoa')} />
                  <span>Igualitário</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="tipoRateio" value="renda"
                    checked={tipoRateio === 'renda'} onChange={() => setTipoRateio('renda')} />
                  <span>Por renda</span>
                </label>
              </div>

              {/* Adicionar amigo */}
              {amigos.length === 0 ? (
                <p className="rateio-hint">Adicione amigos na aba Conta para ratear despesas.</p>
              ) : (
                <div className="rateio-add">
                  <select value={amigoSelecionado} onChange={(e) => setAmigoSelecionado(e.target.value)}
                    className="rateio-select">
                    <option value="">Selecionar amigo...</option>
                    {amigosDisponiveis.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-add-amigo" onClick={adicionarParticipante}
                    disabled={!amigoSelecionado}>+</button>
                </div>
              )}

              {/* Participantes */}
              {participantes.map((p) => {
                const amigo = amigos.find((a) => a.id === p.amigoId)
                return (
                  <div key={p.amigoId} className="participante-row">
                    <span className="participante-nome">{amigo?.nome}</span>
                    {tipoRateio === 'renda' && (
                      <input type="number" min="0" step="100" placeholder="Renda (R$)"
                        className="participante-renda"
                        value={p.renda || ''}
                        onChange={(e) => setRenda(p.amigoId, parseFloat(e.target.value) || 0)} />
                    )}
                    <button type="button" className="btn-remover-participante"
                      onClick={() => removerParticipante(p.amigoId)}>✕</button>
                  </div>
                )
              })}

              {/* Preview */}
              {preview.length > 0 && form.valorTotal > 0 && (
                <div className="rateio-preview">
                  <span className="preview-titulo">Preview do rateio {isCredito && form.parcelas > 1 ? '(por parcela)' : ''}</span>
                  {preview.map((p, i) => (
                    <div key={i} className="preview-row">
                      <span>{p.nome}</span>
                      <div className="preview-bar-wrap">
                        <div className="preview-bar" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="preview-valor">{fmt(p.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="field full">
          <label>Observações</label>
          <textarea placeholder="Informações adicionais..." value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)} rows={2} />
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