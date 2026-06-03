import { useState } from 'react'
import { CalendarDays, RefreshCw, SplitSquareHorizontal } from 'lucide-react'
import type { Despesa, DespesaForm as DespesaFormType, Categoria, MetodoPagamento, CartaoCredito, Conta } from '../../types'

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: 'casa', label: 'Casa' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'saude', label: 'Saúde' },
  { value: 'locomocao', label: 'Locomoção' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'educacao', label: 'Educação' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'outros', label: 'Outros' },
]

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

interface Props {
  inicial?: Despesa
  cartoes: CartaoCredito[]
  contas: Conta[]
  onSalvar: (form: DespesaFormType) => Promise<void>
  onCancelar: () => void
}

const hoje = new Date().toISOString().split('T')[0]

const FORM_VAZIO: DespesaFormType = {
  nome: '', categoria: 'outros', metodoPagamento: 'debito', tipoGasto: 'variavel',
  tipo: 'padrao', parcelas: 1, valorTotal: 0, dataCompra: hoje, data: hoje, observacoes: '',
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DespesaForm({ inicial, cartoes, contas, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<DespesaFormType>(
    inicial ? {
      nome: inicial.nome,
      categoria: inicial.categoria,
      metodoPagamento: inicial.metodoPagamento,
      tipoGasto: inicial.tipoGasto ?? 'variavel',
      cartaoId: inicial.cartaoId,
      contaId: inicial.contaId,
      tipo: inicial.tipo ?? 'padrao',
      parcelas: inicial.parcelas,
      valorTotal: inicial.valorTotal ?? (inicial as any).valor ?? 0,
      valorParcelaCustom: inicial.tipo === 'financiamento' ? inicial.valorParcela : undefined,
      minhaParte: inicial.minhaParte,
      dataCompra: inicial.dataCompra ?? hoje,
      data: inicial.data,
      observacoes: inicial.observacoes ?? '',
    } : FORM_VAZIO
  )
  const [loading, setLoading] = useState(false)
  const [recorrenteAtivo, setRecorrenteAtivo] = useState(inicial?.recorrente ?? false)
  const [recorrenciaMeses, setRecorrenciaMeses] = useState(12)
  const [minhaParteAtivo, setMinhaParteAtivo] = useState(!!inicial?.minhaParte)

  const set = (key: keyof DespesaFormType, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const isFinanciamento = form.tipo === 'financiamento'
  const valorParcela = isFinanciamento
    ? (form.valorParcelaCustom ?? null)
    : (form.parcelas > 1 && form.valorTotal > 0 ? form.valorTotal / form.parcelas : null)

  const minhaPartePorParcela = form.minhaParte && form.parcelas > 1
    ? form.minhaParte / form.parcelas
    : form.minhaParte ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar({
        ...form,
        minhaParte: minhaParteAtivo ? form.minhaParte : undefined,
        recorrente: recorrenteAtivo || undefined,
        recorrenciaMeses: recorrenteAtivo ? recorrenciaMeses : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="despesa-form">
      {/* Linha superior: Despesa/Financiamento + Fixo/Variável */}
      <div className="topo-toggles">
        <div className="tipo-tabs">
          <button type="button"
            className={`tipo-tab-btn ${!isFinanciamento ? 'active' : ''}`}
            onClick={() => { set('tipo', 'padrao'); set('valorParcelaCustom', undefined) }}>
            Despesa
          </button>
          <button type="button"
            className={`tipo-tab-btn ${isFinanciamento ? 'active' : ''}`}
            onClick={() => set('tipo', 'financiamento')}>
            Financiamento
          </button>
        </div>
        <div className="tipo-tabs">
          <button type="button"
            className={`tipo-tab-btn ${form.tipoGasto === 'fixo' ? 'active' : ''}`}
            onClick={() => set('tipoGasto', 'fixo')}>
            Fixo
          </button>
          <button type="button"
            className={`tipo-tab-btn ${form.tipoGasto === 'variavel' ? 'active' : ''}`}
            onClick={() => set('tipoGasto', 'variavel')}>
            Variável
          </button>
        </div>
      </div>

      <div className="form-grid">
        <div className="field full">
          <label>Nome da despesa</label>
          <input type="text"
            placeholder={isFinanciamento ? 'Ex: Financiamento imóvel' : 'Ex: Conta de luz'}
            value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
        </div>

        <div className="field">
          <label>Data da compra</label>
          <input type="date" value={form.dataCompra} onChange={(e) => set('dataCompra', e.target.value)} required />
        </div>

        <div className="field">
          <label>{isFinanciamento ? 'Próximo vencimento' : 'Data do vencimento'}</label>
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} required />
        </div>

        <div className="field">
          <label>{isFinanciamento ? 'Saldo devedor atual (R$)' : 'Valor total (R$)'}</label>
          <input type="number" min="0" step="0.01" placeholder="0,00"
            value={form.valorTotal || ''}
            onChange={(e) => set('valorTotal', parseFloat(e.target.value) || 0)} required />
        </div>

        {isFinanciamento ? (
          <div className="field">
            <label>Parcela mensal (R$)</label>
            <input type="number" min="0" step="0.01" placeholder="0,00"
              value={form.valorParcelaCustom || ''}
              onChange={(e) => set('valorParcelaCustom', parseFloat(e.target.value) || undefined)}
              required />
          </div>
        ) : (
          <div className="field">
            <label>Método de pagamento</label>
            <select value={form.metodoPagamento} onChange={(e) => {
              set('metodoPagamento', e.target.value)
              if (e.target.value !== 'credito') { set('parcelas', 1); set('cartaoId', undefined) }
              if (e.target.value === 'credito') { set('contaId', undefined) }
            }}>
              {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}

        {/* Cartão — apenas para crédito */}
        {!isFinanciamento && form.metodoPagamento === 'credito' && (
          <div className="field">
            <label>Cartão</label>
            {cartoes.length > 0 ? (
              <select value={form.cartaoId ?? ''} onChange={(e) => {
                const cartaoId = e.target.value || undefined
                set('cartaoId', cartaoId)
                const cartao = cartoes.find(c => c.id === cartaoId)
                set('contaId', cartao?.contaId ?? undefined)
              }}>
                <option value="">Selecionar cartão</option>
                {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.contaId && contas.find(ct => ct.id === c.contaId) ? ` · ${contas.find(ct => ct.id === c.contaId)!.nome}` : ''}</option>)}
              </select>
            ) : (
              <div className="cartao-vazio">Cadastre seus cartões em <strong>Conta</strong></div>
            )}
          </div>
        )}

        {/* Conta — para débito, pix, boleto, dinheiro */}
        {form.metodoPagamento !== 'credito' && contas.length > 0 && (
          <div className="field">
            <label>Conta{form.metodoPagamento === 'boleto' || form.metodoPagamento === 'dinheiro' ? ' (opcional)' : ''}</label>
            <select value={form.contaId ?? ''} onChange={(e) => set('contaId', e.target.value || undefined)}>
              <option value="">Selecionar conta</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}

        {isFinanciamento && (
          <div className="field">
            <label>Método de pagamento</label>
            <select value={form.metodoPagamento} onChange={(e) => set('metodoPagamento', e.target.value)}>
              {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}

        {(isFinanciamento || form.metodoPagamento === 'credito') && (
          <div className="field">
            <label>{isFinanciamento ? 'Meses restantes' : 'Parcelas'}</label>
            <input
              type="number" min="1" max="420"
              value={form.parcelas}
              onChange={(e) => set('parcelas', Math.max(1, Math.min(420, parseInt(e.target.value) || 1)))}
            />
          </div>
        )}

        {valorParcela && (
          <div className="field full">
            <div className="parcela-preview">
              <CalendarDays size={16} />
              {isFinanciamento ? (
                <span>{form.parcelas}x de <strong>{fmt(valorParcela)}/mês</strong> — saldo devedor <strong>{fmt(form.valorTotal)}</strong></span>
              ) : (
                <span>{form.parcelas}x de <strong>{fmt(valorParcela)}</strong> — total {fmt(form.valorTotal)}</span>
              )}
            </div>
          </div>
        )}

        {!isFinanciamento && form.parcelas === 1 && !inicial?.recorrente && (
          <div className="field full">
            <button
              type="button"
              className={`toggle-header ${recorrenteAtivo ? 'ativo' : ''}`}
              onClick={() => setRecorrenteAtivo((v) => !v)}
            >
              <div className="toggle-header-left">
                <span className="toggle-icon"><RefreshCw size={20} /></span>
                <div>
                  <span className="toggle-titulo">Despesa recorrente</span>
                  <span className="toggle-sub">
                    {recorrenteAtivo
                      ? `${recorrenciaMeses} meses`
                      : 'Repete todo mês automaticamente'}
                  </span>
                </div>
              </div>
              <div className={`toggle-pill ${recorrenteAtivo ? 'on' : 'off'}`}>
                <div className="toggle-dot" />
              </div>
            </button>

            {recorrenteAtivo && (
              <div className="sub-box">
                <span className="sub-label">Duração</span>
                <div className="recorrente-opcoes">
                  {[6, 12, 24].map((m) => (
                    <button key={m} type="button"
                      className={`recorrente-opt ${recorrenciaMeses === m ? 'ativo' : ''}`}
                      onClick={() => setRecorrenciaMeses(m)}>
                      {m} meses
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Minha parte */}
        <div className="field full">
          <button
            type="button"
            className={`toggle-header ${minhaParteAtivo ? 'ativo' : ''}`}
            onClick={() => {
              setMinhaParteAtivo((v) => !v)
              if (minhaParteAtivo) set('minhaParte', undefined)
            }}
          >
            <div className="toggle-header-left">
              <span className="toggle-icon"><SplitSquareHorizontal size={20} /></span>
              <div>
                <span className="toggle-titulo">Parte desta compra não é minha</span>
                <span className="toggle-sub">
                  {minhaParteAtivo && form.minhaParte
                    ? `Sua parte: ${fmt(form.minhaParte)}${form.parcelas > 1 ? ` total · ${fmt(minhaPartePorParcela!)}/mês` : ''}`
                    : 'Indicar o valor que é de sua responsabilidade'}
                </span>
              </div>
            </div>
            <div className={`toggle-pill ${minhaParteAtivo ? 'on' : 'off'}`}>
              <div className="toggle-dot" />
            </div>
          </button>

          {minhaParteAtivo && (
            <div className="sub-box">
              <label className="sub-label">Minha parte total (R$)</label>
              <input
                type="number" min="0" step="0.01" placeholder="0,00"
                value={form.minhaParte || ''}
                onChange={(e) => set('minhaParte', parseFloat(e.target.value) || undefined)}
              />
              {form.minhaParte && form.valorTotal > 0 && (
                <span className="minha-parte-hint">
                  Você arca com {fmt(form.minhaParte)} de {fmt(form.valorTotal)} totais
                  {form.parcelas > 1 ? ` · ${fmt(minhaPartePorParcela!)}/mês` : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="field full">
          <label>Categoria</label>
          <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
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
        .despesa-form { display: flex; flex-direction: column; gap: 1.5rem; background: #FFFFFF; }

        .topo-toggles { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .topo-toggles .tipo-tabs { flex: 1; min-width: 140px; }

        .tipo-tabs { display: flex; gap: 0.5rem; background: #F1F2F6; padding: 0.3rem; border-radius: 12px; }
        .tipo-tab-btn {
          flex: 1; padding: 0.6rem; border: none; border-radius: 9px;
          font-size: 0.82rem; font-weight: 700; cursor: pointer;
          background: transparent; color: #7F8C8D; transition: all 0.2s; font-family: inherit;
        }
        .tipo-tab-btn.active { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        @media (max-width: 480px) {
          .form-grid { grid-template-columns: 1fr; }
          .form-actions { flex-direction: column-reverse; }
          .btn-primary, .btn-ghost { width: 100%; text-align: center; }
        }

        .field { display: flex; flex-direction: column; gap: 0.5rem; }
        .field.full { grid-column: 1 / -1; }
        .field label { color: #95A5A6; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .field input, .field select, .field textarea {
          background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px;
          color: #2D3436; padding: 0.8rem 1rem; font-size: 0.95rem;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: #C8A45A; background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(200,164,90,0.05);
        }

        .parcela-preview {
          display: flex; align-items: center; gap: 0.75rem;
          background: #FFFDF7; border: 1px solid rgba(200,164,90,0.2);
          border-radius: 12px; padding: 1rem;
          color: #C8A45A; font-size: 0.85rem; font-weight: 500;
        }
        .parcela-preview strong { color: #2D3436; font-weight: 700; }

        .toggle-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem; background: #F8F9FA;
          border: 1.5px solid #E0E0E0; border-radius: 12px;
          cursor: pointer; transition: all 0.2s; font-family: inherit; width: 100%;
        }
        .toggle-header.ativo { border-color: #C8A45A; background: rgba(200,164,90,0.04); }
        .toggle-header:hover { border-color: #C8A45A; }
        .toggle-header-left { display: flex; align-items: center; gap: 0.75rem; }
        .toggle-icon { display: inline-flex; align-items: center; color: #636E72; }
        .toggle-titulo { display: block; color: #2d3436; font-size: 0.88rem; font-weight: 600; text-align: left; }
        .toggle-sub { display: block; color: #95A5A6; font-size: 0.75rem; text-align: left; margin-top: 0.1rem; }

        .toggle-pill {
          width: 40px; height: 22px; border-radius: 11px; position: relative;
          transition: background 0.2s; flex-shrink: 0;
        }
        .toggle-pill.off { background: #DFE6ED; }
        .toggle-pill.on { background: #C8A45A; }
        .toggle-dot {
          position: absolute; top: 3px; width: 16px; height: 16px;
          border-radius: 50%; background: #fff; transition: left 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .toggle-pill.off .toggle-dot { left: 3px; }
        .toggle-pill.on .toggle-dot { left: 21px; }

        .sub-box {
          margin-top: 0.75rem; padding: 1rem; background: #F8F9FA;
          border-radius: 12px; display: flex; flex-direction: column; gap: 0.6rem;
          border: 1px solid #F1F2F6;
        }
        .sub-label { color: #95A5A6; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }

        .recorrente-opcoes { display: flex; gap: 0.5rem; }
        .recorrente-opt {
          flex: 1; background: #fff; border: 1px solid #E0E0E0; border-radius: 8px;
          padding: 0.5rem; font-size: 0.8rem; font-weight: 600; color: #636E72;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .recorrente-opt.ativo { background: rgba(142,68,173,0.08); border-color: rgba(142,68,173,0.3); color: #8E44AD; }
        .recorrente-opt:hover:not(.ativo) { background: #F1F2F6; }

        .minha-parte-hint {
          color: #C8A45A; font-size: 0.75rem; font-style: italic; line-height: 1.4;
        }

        .cartao-vazio {
          background: #FFFDF7; border: 1px dashed rgba(200,164,90,0.35);
          border-radius: 12px; padding: 0.75rem 1rem;
          color: #95A5A6; font-size: 0.82rem;
        }
        .cartao-vazio strong { color: #C8A45A; }

        .form-actions {
          display: flex; justify-content: flex-end; gap: 1rem;
          padding-top: 1.5rem; border-top: 1px solid #F1F2F6;
        }
        .btn-primary {
          background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
          padding: 0.9rem 1.8rem; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; box-shadow: 0 4px 12px rgba(200,164,90,0.2);
          transition: all 0.2s; font-family: inherit;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200,164,90,0.3); }
        .btn-primary:disabled { opacity: 0.5; transform: none; }
        .btn-ghost {
          background: transparent; color: #95A5A6; border: 1px solid #F1F2F6;
          border-radius: 12px; padding: 0.9rem 1.5rem; font-size: 0.9rem;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-ghost:hover { background: #F8F9FA; color: #636E72; border-color: #E0E0E0; }
      `}</style>
    </form>
  )
}
