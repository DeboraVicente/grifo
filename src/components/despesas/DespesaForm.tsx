import { useState } from 'react'
import { CalendarDays, Handshake, User, Users, Scale, Banknote, Check } from 'lucide-react'
import type { Despesa, DespesaForm as DespesaFormType, Categoria, MetodoPagamento, CartaoCredito } from '../../types'

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
  { value: 'credito', label: 'Cartão de Crédito' },
  { value: 'debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

interface Amigo { id: string; nome: string; email: string }

interface Props {
  inicial?: Despesa
  amigos: Amigo[]
  cartoes: CartaoCredito[]
  onSalvar: (form: DespesaFormType) => Promise<void>
  onCancelar: () => void
}

const hoje = new Date().toISOString().split('T')[0]

const FORM_VAZIO: DespesaFormType = {
  nome: '', categoria: 'outros', metodoPagamento: 'debito',
  tipo: 'padrao', parcelas: 1, valorTotal: 0, dataCompra: hoje, data: hoje, observacoes: '',
  rateio: { ativo: false },
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DespesaForm({ inicial, amigos, cartoes, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<DespesaFormType>(
    inicial ? {
      nome: inicial.nome, categoria: inicial.categoria,
      metodoPagamento: inicial.metodoPagamento,
      cartaoId: inicial.cartaoId,
      tipo: inicial.tipo ?? 'padrao',
      parcelas: inicial.parcelas,
      valorTotal: inicial.valorTotal ?? (inicial as any).valor ?? 0,
      valorParcelaCustom: inicial.tipo === 'financiamento' ? inicial.valorParcela : undefined,
      dataCompra: inicial.dataCompra ?? hoje,
      data: inicial.data, observacoes: inicial.observacoes ?? '',
      rateio: inicial.rateio,
    } : FORM_VAZIO
  )
  const [loading, setLoading] = useState(false)

  const [paraAmigoAtivo, setParaAmigoAtivo] = useState(!!inicial?.paraAmigoId)

  // Estado local do rateio
  const [rateioAtivo, setRateioAtivo] = useState(inicial?.rateio?.ativo ?? false)
  const [tipoRateio, setTipoRateio] = useState<'pessoa' | 'renda'>(
    (inicial?.rateio?.ativo ? (inicial.rateio as any).tipo : 'pessoa') ?? 'pessoa'
  )
  const [participantes, setParticipantes] = useState<{ amigoId: string }[]>([])
  const [rendaCriador, setRendaCriador] = useState(0)
  
  const set = (key: keyof DespesaFormType, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const isFinanciamento = form.tipo === 'financiamento'
  const valorParcela = isFinanciamento
    ? (form.valorParcelaCustom ?? null)
    : (form.parcelas > 1 && form.valorTotal > 0 ? form.valorTotal / form.parcelas : null)

  // Calcula preview do rateio — apenas para tipo 'pessoa'
  const previewRateio = () => {
    const valorBase = form.valorTotal
    if (!valorBase || participantes.length === 0) return []
    if (tipoRateio === 'renda') return []
    const total = participantes.length + 1
    const parte = valorBase / total
    const parteParc = parte / form.parcelas
    return [
      { nome: 'Você', valor: parteParc, valorTotal: parte, pct: (100 / total) },
      ...participantes.map((p) => {
        const amigo = amigos.find((a) => a.id === p.amigoId)
        return { nome: amigo?.nome ?? '?', valor: parteParc, valorTotal: parte, pct: (100 / total) }
      }),
    ]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let rateio: any

      if (rateioAtivo && participantes.length > 0) {
        if (tipoRateio === 'renda') {
          const participantesRateio = participantes.map((p) => {
            const amigo = amigos.find((a) => a.id === p.amigoId)!
            return {
              userId: p.amigoId,
              nome: amigo.nome,
              email: amigo.email,
              renda: 0,
              percentual: 0,
              valorDevido: 0,
              valorDevidoParcela: 0,
              valorPago: 0,
              pagamentos: [],
              status: 'pendente',
            }
          })
          rateio = { ativo: true, tipo: 'renda', rendaCriador, participantes: participantesRateio }
        } else {
          const prev = previewRateio()
          const participantesRateio = participantes.map((p, idx) => {
            const amigo = amigos.find((a) => a.id === p.amigoId)!
            const previewItem = prev[idx + 1]
            return {
              userId: p.amigoId,
              nome: amigo.nome,
              email: amigo.email,
              renda: 0,
              percentual: previewItem?.pct ?? 0,
              valorDevido: (previewItem as any)?.valorTotal ?? 0,
              valorDevidoParcela: previewItem?.valor ?? 0,
              valorPago: 0,
              pagamentos: [],
              status: 'pendente',
            }
          })
          rateio = { ativo: true, tipo: tipoRateio, participantes: participantesRateio }
        }
      } else {
        rateio = { ativo: false }
      }

      console.log('[Grifo] handleSubmit estado:', { rateioAtivo, participantesCount: participantes.length, participantes, amigos })
      console.log('[Grifo] handleSubmit rateio montado:', JSON.stringify(rateio, null, 2))
      await onSalvar({ ...form, rateio })
    } finally {
      setLoading(false)
    }
  }

  const preview = previewRateio()

  return (
    <form onSubmit={handleSubmit} className="despesa-form">
      {/* Toggle tipo: Despesa / Financiamento */}
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
          <label>{isFinanciamento ? 'Próximo vencimento' : `Data do vencimento`}</label>
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
            }}>
              {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}

        {!isFinanciamento && form.metodoPagamento === 'credito' && (
          <div className="field">
            <label>Cartão</label>
            {cartoes.length > 0 ? (
              <select value={form.cartaoId ?? ''} onChange={(e) => set('cartaoId', e.target.value || undefined)}>
                <option value="">Selecionar cartão</option>
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} · {c.banco}
                  </option>
                ))}
              </select>
            ) : (
              <div className="cartao-vazio">
                Cadastre seus cartões em <strong>Conta</strong>
              </div>
            )}
          </div>
        )}

        {!isFinanciamento && form.metodoPagamento === 'credito' && amigos.length > 0 && (
          <div className="field full">
            <button
              type="button"
              className={`rateio-toggle-header ${paraAmigoAtivo ? 'ativo' : ''}`}
              onClick={() => {
                setParaAmigoAtivo(!paraAmigoAtivo)
                if (paraAmigoAtivo) {
                  set('paraAmigoId', undefined)
                  set('paraAmigoNome', undefined)
                  set('paraAmigoEmail', undefined)
                }
              }}
            >
              <div className="rateio-header-left">
                <span className="rateio-icon"><User size={20} /></span>
                <div>
                  <span className="rateio-header-titulo">Despesa para um amigo</span>
                  <span className="rateio-header-sub">
                    {form.paraAmigoId
                      ? `Para ${amigos.find(a => a.id === form.paraAmigoId)?.nome ?? '?'} · aguarda aprovação`
                      : 'Cobrar este cartão em nome de alguém'}
                  </span>
                </div>
              </div>
              <div className={`rateio-toggle-pill ${paraAmigoAtivo ? 'on' : 'off'}`}>
                <div className="rateio-toggle-dot" />
              </div>
            </button>

            {paraAmigoAtivo && (
              <div className="rateio-box" style={{ marginTop: '0.75rem' }}>
                <div className="amigos-lista">
                  <span className="amigos-label">Selecione o amigo</span>
                  {amigos.map((amigo) => {
                    const selecionado = form.paraAmigoId === amigo.id
                    return (
                      <div key={amigo.id} className={`amigo-toggle ${selecionado ? 'selecionado' : ''}`}>
                        <button type="button" className="amigo-toggle-btn"
                          onClick={() => {
                            if (selecionado) {
                              set('paraAmigoId', undefined)
                              set('paraAmigoNome', undefined)
                              set('paraAmigoEmail', undefined)
                            } else {
                              set('paraAmigoId', amigo.id)
                              set('paraAmigoNome', amigo.nome)
                              set('paraAmigoEmail', amigo.email)
                            }
                          }}>
                          <span className="amigo-avatar-sm">{amigo.nome.charAt(0).toUpperCase()}</span>
                          <div className="amigo-info-sm">
                            <span className="amigo-nome-sm">{amigo.nome}</span>
                            <span className="amigo-email-sm">{amigo.email}</span>
                          </div>
                          <div className={`amigo-check-box ${selecionado ? 'on' : ''}`}>
                            {selecionado && <Check size={12} />}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
                {form.paraAmigoId && (
                  <div className="amigo-aviso">
                    A despesa ficará <strong>pendente de aprovação</strong> do amigo e compromete seu limite do cartão.
                  </div>
                )}
              </div>
            )}
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
              type="number"
              min="1"
              max="420"
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

        <div className="field full">
          <label>Categoria</label>
          <select
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* ── Rateio ── */}
        <div className="field full">
          <button
            type="button"
            className={`rateio-toggle-header ${rateioAtivo ? 'ativo' : ''}`}
            onClick={() => { setRateioAtivo(!rateioAtivo); if (rateioAtivo) setParticipantes([]) }}
          >
            <div className="rateio-header-left">
              <span className="rateio-icon"><Handshake size={20} /></span>
              <div>
                <span className="rateio-header-titulo">Ratear despesa</span>
                <span className="rateio-header-sub">
                  {participantes.length > 0
                    ? `${participantes.length + 1} pessoas · ${tipoRateio === 'pessoa' ? 'igualitário' : 'por renda'}`
                    : 'Dividir com amigos'}
                </span>
              </div>
            </div>
            <div className={`rateio-toggle-pill ${rateioAtivo ? 'on' : 'off'}`}>
              <div className="rateio-toggle-dot" />
            </div>
          </button>

          {rateioAtivo && (
            <div className="rateio-box">
              {amigos.length === 0 ? (
                <div className="rateio-empty">
                  <Users size={24} />
                  <p>Adicione amigos na aba <strong>Conta</strong> para ratear despesas.</p>
                </div>
              ) : (
                <>
                  {/* Tipo de rateio */}
                  <div className="rateio-tipo-tabs">
                    <button type="button"
                      className={`tipo-tab ${tipoRateio === 'pessoa' ? 'active' : ''}`}
                      onClick={() => setTipoRateio('pessoa')}>
                      <Scale size={14} /> Igualitário
                    </button>
                    <button type="button"
                      className={`tipo-tab ${tipoRateio === 'renda' ? 'active' : ''}`}
                      onClick={() => setTipoRateio('renda')}>
                      <Banknote size={14} /> Por renda
                    </button>
                  </div>

                  {/* Amigos como cards toggle */}
                  <div className="amigos-lista">
                    <span className="amigos-label">Selecione quem participa</span>
                    {amigos.map((amigo) => {
                      const selecionado = participantes.some((p) => p.amigoId === amigo.id)
                      return (
                        <div key={amigo.id} className={`amigo-toggle ${selecionado ? 'selecionado' : ''}`}>
                          <button type="button" className="amigo-toggle-btn"
                            onClick={() => {
                              if (selecionado) {
                                setParticipantes((ps) => ps.filter((p) => p.amigoId !== amigo.id))
                              } else {
                                setParticipantes((ps) => [...ps, { amigoId: amigo.id }])
                              }
                            }}>
                            <span className="amigo-avatar-sm">{amigo.nome.charAt(0).toUpperCase()}</span>
                            <div className="amigo-info-sm">
                              <span className="amigo-nome-sm">{amigo.nome}</span>
                              {selecionado && tipoRateio === 'pessoa' && preview.length > 0 && form.valorTotal > 0 && (() => {
                                const idx = participantes.findIndex(p => p.amigoId === amigo.id)
                                const prev = preview[idx + 1]
                                return prev ? (
                                  <span className="amigo-parte">
                                    {fmt(prev.valor)}{form.parcelas > 1 ? '/mês' : ''}
                                  </span>
                                ) : null
                              })()}
                            </div>
                            <div className={`amigo-check-box ${selecionado ? 'on' : ''}`}>
                              {selecionado && <Check size={12} />}
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Campo de renda do criador (apenas rateio por renda) */}
                  {tipoRateio === 'renda' && (
                    <div className="renda-criador-field">
                      <label className="renda-label">Minha renda mensal (R$)</label>
                      <input type="number" min="0" step="100" placeholder="0,00"
                        className="participante-renda"
                        value={rendaCriador || ''}
                        onChange={(e) => setRendaCriador(parseFloat(e.target.value) || 0)} />
                      {participantes.length > 0 && (
                        <span className="renda-aviso">
                          A divisão proporcional será calculada quando cada participante confirmar sua renda
                        </span>
                      )}
                    </div>
                  )}

                  {/* Preview resumido (apenas para tipo igualitário) */}
                  {preview.length > 0 && form.valorTotal > 0 && (
                    <div className="rateio-preview">
                      <div className="preview-header">
                        <span className="preview-titulo">Divisão</span>
                        <span className="preview-total">{fmt(form.valorTotal)} total</span>
                      </div>
                      {preview.map((p, i) => (
                        <div key={i} className="preview-row">
                          <span className="preview-nome">{p.nome}</span>
                          <div className="preview-bar-wrap">
                            <div className="preview-bar" style={{ width: `${p.pct}%` }} />
                          </div>
                          <div className="preview-valores">
                            <span className="preview-valor">{fmt(p.valor)}{form.parcelas > 1 ? '/mês' : ''}</span>
                            {form.parcelas > 1 && (
                              <span className="preview-valor-total">{fmt((p as any).valorTotal)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
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

        /* Toggle Despesa / Financiamento */
        .tipo-tabs {
          display: flex;
          gap: 0.5rem;
          background: #F1F2F6;
          padding: 0.3rem;
          border-radius: 12px;
        }
        .tipo-tab-btn {
          flex: 1;
          padding: 0.6rem;
          border: none;
          border-radius: 9px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          color: #7F8C8D;
          transition: all 0.2s;
          font-family: inherit;
        }
        .tipo-tab-btn.active {
          background: #FFFFFF;
          color: #C8A45A;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        @media (max-width: 480px) {
          .form-grid { grid-template-columns: 1fr; }
          .form-actions { flex-direction: column-reverse; }
          .btn-primary, .btn-ghost { width: 100%; text-align: center; }
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

        /* Rateio toggle header */
        .rateio-toggle-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem; background: #F8F9FA;
          border: 1.5px solid #E0E0E0; border-radius: 12px;
          cursor: pointer; transition: all 0.2s; font-family: inherit; width: 100%;
        }
        .rateio-toggle-header.ativo { border-color: #C8A45A; background: rgba(200,164,90,0.04); }
        .rateio-toggle-header:hover { border-color: #C8A45A; }
        .rateio-header-left { display: flex; align-items: center; gap: 0.75rem; }
        .rateio-icon { display: inline-flex; align-items: center; color: #636E72; }
        .rateio-header-titulo { display: block; color: #2d3436; font-size: 0.88rem; font-weight: 600; text-align: left; }
        .rateio-header-sub { display: block; color: #95A5A6; font-size: 0.75rem; text-align: left; margin-top: 0.1rem; }
        .rateio-toggle-pill {
          width: 40px; height: 22px; border-radius: 11px; position: relative;
          transition: background 0.2s; flex-shrink: 0;
        }
        .rateio-toggle-pill.off { background: #DFE6ED; }
        .rateio-toggle-pill.on { background: #C8A45A; }
        .rateio-toggle-dot {
          position: absolute; top: 3px; width: 16px; height: 16px;
          border-radius: 50%; background: #fff; transition: left 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .rateio-toggle-pill.off .rateio-toggle-dot { left: 3px; }
        .rateio-toggle-pill.on .rateio-toggle-dot { left: 21px; }
        .rateio-box {
    margin-top: 1rem;
    padding: 1.25rem;
    background: #F8F9FA;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    border: 1px solid #F1F2F6;
  }

  /* Tabs de tipo de rateio mais modernas */
  .rateio-tipo-tabs {
    display: flex;
    gap: 0.5rem;
    background: #EDF0F2;
    padding: 0.3rem;
    border-radius: 12px;
  }
  .tipo-tab {
    flex: 1;
    padding: 0.6rem;
    border: none;
    border-radius: 9px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    color: #7F8C8D;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    font-family: inherit;
  }
  .tipo-tab.active {
    background: #FFFFFF;
    color: #C8A45A;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  /* Grid de Amigos estilo "Contatos" */
  .amigos-lista { display: flex; flex-direction: column; gap: 0.75rem; }
  .amigos-label { 
    color: #95A5A6; 
    font-size: 0.65rem; 
    font-weight: 700; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
  }

  .amigo-toggle {
    background: #FFFFFF;
    border: 1px solid #F1F2F6;
    border-radius: 14px;
    padding: 0.75rem;
    transition: all 0.2s;
  }
  .amigo-toggle.selecionado {
    border-color: rgba(200,164,90,0.3);
    box-shadow: 0 4px 12px rgba(200,164,90,0.06);
  }

  .amigo-toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .amigo-avatar-sm {
    width: 36px; height: 36px;
    background: #F1F2F6;
    color: #95A5A6;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
  }
  .selecionado .amigo-avatar-sm {
    background: rgba(200,164,90,0.1);
    color: #C8A45A;
  }

  .amigo-info-sm { flex: 1; display: flex; flex-direction: column; }
  .amigo-nome-sm { color: #2D3436; font-size: 0.88rem; font-weight: 600; }
  .amigo-parte { color: #C8A45A; font-size: 0.75rem; font-weight: 700; }

  .amigo-check-box {
    width: 22px; height: 22px;
    border-radius: 6px;
    border: 2px solid #EDF0F2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.7rem;
    transition: all 0.2s;
  }
  .amigo-check-box.on {
    background: #C8A45A;
    border-color: #C8A45A;
  }

  /* Campo de renda do criador */
  .renda-criador-field {
    background: #FFFDF7;
    border: 1px solid rgba(200,164,90,0.2);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .renda-label { color: #95A5A6; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .participante-renda {
    background: #F8F9FA !important;
    border: 1px solid #F1F2F6 !important;
    border-radius: 10px !important;
    padding: 0.7rem 0.9rem !important;
    font-size: 0.9rem !important;
    outline: none;
    font-family: inherit;
  }
  .participante-renda:focus { border-color: #C8A45A !important; background: #fff !important; }
  .renda-aviso { color: #C8A45A; font-size: 0.72rem; font-style: italic; line-height: 1.4; }

  /* Preview de Divisão estilo Progress Bar */
  .rateio-preview {
    background: #FFFFFF;
    padding: 1.25rem;
    border-radius: 16px;
    border: 1px solid #F1F2F6;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .preview-header { display: flex; justify-content: space-between; align-items: flex-end; }
  .preview-titulo { color: #2D3436; font-size: 0.85rem; font-weight: 700; }
  .preview-total { color: #95A5A6; font-size: 0.7rem; font-weight: 600; }

  .preview-row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .preview-nome { color: #636E72; font-size: 0.75rem; font-weight: 600; }
  .preview-bar-wrap {
    height: 6px;
    background: #F1F2F6;
    border-radius: 3px;
    overflow: hidden;
  }
  .preview-bar {
    height: 100%;
    background: #C8A45A;
    border-radius: 3px;
  }
  .preview-valores {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .preview-valor { color: #2D3436; font-size: 0.8rem; font-weight: 700; }
  .preview-valor-total { color: #BDC3C7; font-size: 0.65rem; font-weight: 500; }

        /* Ações do formulário */
        .form-actions {
          display: flex; 
          justify-content: flex-end; 
          gap: 1rem;
          padding-top: 1.5rem; 
          border-top: 1px solid #F1F2F6;
        }
        .rateio-empty {
          display: flex; align-items: center; gap: 0.75rem;
          color: #95A5A6; font-size: 0.82rem; padding: 0.5rem;
        }
        .rateio-empty strong { color: #C8A45A; }

        .cartao-vazio {
          background: #FFFDF7; border: 1px dashed rgba(200,164,90,0.35);
          border-radius: 12px; padding: 0.75rem 1rem;
          color: #95A5A6; font-size: 0.82rem;
        }
        .cartao-vazio strong { color: #C8A45A; }

        .amigo-email-sm { color: #95A5A6; font-size: 0.72rem; }
        .amigo-aviso {
          background: #FFFDF7; border: 1px solid rgba(200,164,90,0.2);
          border-radius: 10px; padding: 0.75rem 1rem;
          color: #636E72; font-size: 0.78rem; line-height: 1.5;
        }
        .amigo-aviso strong { color: #C8A45A; }

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