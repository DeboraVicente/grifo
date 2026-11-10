import { useState } from 'react'

interface DadosSalvar {
  valor: number
  data: string
  observacao: string
  parcelasQuitadas?: number
  /** Pagou menos que o restante e o valor da conta foi esse: ajusta a parcela e marca como paga */
  ajustarValor?: boolean
  /** Recorrência: usar o novo valor nos meses seguintes ainda não pagos */
  atualizarProximas?: boolean
}

interface Props {
  tipo: 'pagamento' | 'adiantamento'
  valorRestante: number
  max?: number
  isAmortizacao?: boolean
  /** Despesa recorrente (habilita ajustar os próximos meses) */
  recorrente?: boolean
  /** Quantos meses seguintes da recorrência ainda não foram pagos */
  proximasEmAberto?: number
  /** Quanto já tinha sido pago nesta parcela antes deste pagamento */
  jaPago?: number
  onSalvar: (dados: DadosSalvar) => Promise<void>
  onCancelar: () => void
}

const hoje = new Date().toISOString().split('T')[0]

export default function PagamentoForm({ tipo, valorRestante, max, isAmortizacao, recorrente = false, proximasEmAberto = 0, jaPago = 0, onSalvar, onCancelar }: Props) {
  const [valor, setValor] = useState(valorRestante > 0 ? valorRestante : 0)
  const [data, setData] = useState(hoje)
  const [observacao, setObservacao] = useState('')
  const [parcelasQuitadas, setParcelasQuitadas] = useState(0)
  const [loading, setLoading] = useState(false)
  // Pagou menos que o restante: foi parcial (fica faltando) ou a conta foi desse valor?
  // Em contas recorrentes (luz, água...) o padrão é "o valor da conta foi esse".
  const [modo, setModo] = useState<'parcial' | 'valorReal'>(recorrente ? 'valorReal' : 'parcial')
  const [atualizarProximas, setAtualizarProximas] = useState(false)
  const pagouMenos = tipo === 'pagamento' && !isAmortizacao && valor > 0 && valor < valorRestante - 0.004
  const falta = Math.max(0, valorRestante - valor)
  // Pagou mais que o restante: a conta veio mais alta (a parcela passa a valer o total pago)
  const pagouMais = tipo === 'pagamento' && !isAmortizacao && valorRestante > 0 && valor > valorRestante + 0.004
  const ajustaValor = (pagouMenos && modo === 'valorReal') || pagouMais
  // Valor final da parcela quando ajustada: tudo o que foi pago nela
  const valorFinal = jaPago + valor
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar({
        valor, data, observacao,
        parcelasQuitadas: isAmortizacao ? parcelasQuitadas : undefined,
        ajustarValor: pagouMenos && modo === 'valorReal' ? true : undefined,
        atualizarProximas: ajustaValor && recorrente && atualizarProximas ? true : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const label = isAmortizacao ? 'Registrar amortização' : tipo === 'pagamento' ? 'Registrar pagamento' : 'Registrar adiantamento'

  return (
    <form onSubmit={handleSubmit} className="pag-form">
      <div className="field">
        <label>{isAmortizacao ? 'Valor da amortização (R$)' : 'Valor (R$)'}</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={max ?? undefined}
          value={valor || ''}
          onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
          required
        />
        {tipo === 'pagamento' && !isAmortizacao && (
          <span className="field-hint">Restante: R$ {valorRestante.toFixed(2)}</span>
        )}
        {max !== undefined && !isAmortizacao && (
          <span className="field-hint">Máximo: R$ {max.toFixed(2)}</span>
        )}
      </div>

      {pagouMenos && (
        <div className="pag-escolha" role="radiogroup" aria-label="O que aconteceu com o restante">
          <span className="pag-escolha-titulo">Você pagou menos que o previsto. O que aconteceu?</span>
          <label className={`pag-opcao ${modo === 'valorReal' ? 'on' : ''}`}>
            <input type="radio" name="modo" checked={modo === 'valorReal'} onChange={() => setModo('valorReal')} />
            <span>
              <strong>O valor da conta foi {fmt(valorFinal)}</strong>
              <small>Ajusta esta parcela para {fmt(valorFinal)}{jaPago > 0 ? ` (${fmt(jaPago)} já pagos + ${fmt(valor)})` : ''} e marca como paga.</small>
            </span>
          </label>
          <label className={`pag-opcao ${modo === 'parcial' ? 'on' : ''}`}>
            <input type="radio" name="modo" checked={modo === 'parcial'} onChange={() => setModo('parcial')} />
            <span>
              <strong>Pagamento parcial</strong>
              <small>Fica pendente, faltando {fmt(falta)}.</small>
            </span>
          </label>
          {modo === 'valorReal' && recorrente && proximasEmAberto > 0 && (
            <label className="pag-check">
              <input type="checkbox" checked={atualizarProximas} onChange={(e) => setAtualizarProximas(e.target.checked)} />
              <span>Usar {fmt(valorFinal)} também nos próximos {proximasEmAberto} {proximasEmAberto === 1 ? 'mês' : 'meses'} desta recorrência</span>
            </label>
          )}
        </div>
      )}

      {pagouMais && (
        <div className="pag-escolha">
          <span className="pag-escolha-titulo">A conta veio mais alta</span>
          <small className="pag-aviso">
            Esta parcela passa a valer {fmt(valorFinal)}{jaPago > 0 ? ` (${fmt(jaPago)} já pagos + ${fmt(valor)})` : ''} e fica paga. Os relatórios mostram o valor pago.
          </small>
          {recorrente && proximasEmAberto > 0 && (
            <label className="pag-check">
              <input type="checkbox" checked={atualizarProximas} onChange={(e) => setAtualizarProximas(e.target.checked)} />
              <span>Usar {fmt(valorFinal)} também nos próximos {proximasEmAberto} {proximasEmAberto === 1 ? 'mês' : 'meses'} desta recorrência</span>
            </label>
          )}
        </div>
      )}

      {isAmortizacao && (
        <div className="field">
          <label>Parcelas quitadas</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={parcelasQuitadas || ''}
            onChange={(e) => setParcelasQuitadas(parseInt(e.target.value) || 0)}
          />
          <span className="field-hint">
            {parcelasQuitadas > 0
              ? `${parcelasQuitadas} parcela${parcelasQuitadas > 1 ? 's' : ''} do final do financiamento serão quitadas`
              : 'Quantas parcelas essa amortização elimina (0 = apenas reduz o saldo)'}
          </span>
        </div>
      )}

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
          onChange={(e) => setObservacao(e.target.value || '')}
        />
      </div>

      <div className="pag-actions">
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : label}
        </button>
      </div>

      <style>{`
        .pag-form { display: flex; flex-direction: column; gap: 1.25rem; }

        .field { display: flex; flex-direction: column; gap: 0.5rem; }

        .field label {
          color: #95A5A6; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
        }

        .field-hint { color: #C8A45A; font-size: 0.72rem; font-weight: 500; margin-top: 2px; line-height: 1.4; }

        .field input {
          background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px;
          color: #2D3436; padding: 0.8rem 1rem; font-size: 1rem; outline: none;
          transition: all 0.2s ease; font-family: inherit;
        }
        .field input:focus {
          border-color: #C8A45A; background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(200,164,90,0.05);
        }

        .pag-escolha { display: flex; flex-direction: column; gap: 0.5rem; background: #FFFDF7; border: 1px solid rgba(200,164,90,0.25); border-radius: 12px; padding: 0.85rem; }
        .pag-escolha-titulo { font-size: 0.8rem; font-weight: 700; color: #8A6A2B; }
        .pag-opcao {
          display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer;
          background: #fff; border: 1px solid #F1F2F6; border-radius: 10px; padding: 0.65rem 0.75rem;
        }
        .pag-opcao.on { border-color: #C8A45A; box-shadow: 0 0 0 3px rgba(200,164,90,0.08); }
        .pag-opcao input { margin-top: 3px; accent-color: #C8A45A; }
        .pag-opcao span { display: flex; flex-direction: column; gap: 0.1rem; }
        .pag-opcao strong { font-size: 0.85rem; color: #2D3436; }
        .pag-opcao small { font-size: 0.75rem; color: #95A5A6; }
        .pag-aviso { font-size: 0.78rem; color: #636E72; line-height: 1.45; }
        .pag-check { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: #636E72; cursor: pointer; padding: 0.2rem 0.1rem; }
        .pag-check input { margin-top: 2px; accent-color: #C8A45A; }

        .pag-actions {
          display: flex; justify-content: flex-end; gap: 1rem;
          padding-top: 1.5rem; border-top: 1px solid #F1F2F6; margin-top: 0.5rem;
        }

        .btn-primary {
          background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
          padding: 0.85rem 1.5rem; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; box-shadow: 0 4px 12px rgba(200,164,90,0.2);
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200,164,90,0.3); }
        .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

        .btn-ghost {
          background: transparent; color: #95A5A6; border: 1px solid #F1F2F6;
          border-radius: 12px; padding: 0.85rem 1.25rem; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .btn-ghost:hover { background: #F8F9FA; color: #636E72; border-color: #E0E0E0; }
      `}</style>
    </form>
  )
}
