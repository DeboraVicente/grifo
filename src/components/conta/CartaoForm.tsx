import { useState } from 'react'
import type { BandeiraCartao, CartaoCredito, CartaoCreditoForm, Conta } from '../../types'
import EstilosFormConta from './EstilosFormConta'
import { BANDEIRAS } from './opcoes'

interface Props {
  inicial?: CartaoCredito
  contas: Conta[]
  onSalvar: (form: CartaoCreditoForm) => Promise<void>
  onCancelar: () => void
}

const numOuVazio = (n?: number) => (n ? String(n) : '')

/** Cadastro/edição de cartão de crédito. */
export default function CartaoForm({ inicial, contas, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [bandeira, setBandeira] = useState<BandeiraCartao | ''>(inicial?.bandeira ?? '')
  const [contaId, setContaId] = useState(inicial?.contaId ?? '')
  const [limite, setLimite] = useState(numOuVazio(inicial?.limite))
  const [diaVencimento, setDiaVencimento] = useState(numOuVazio(inicial?.diaVencimento))
  const [melhorDia, setMelhorDia] = useState(numOuVazio(inicial?.melhorDiaCompra))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar({
        nome: nome.trim(),
        bandeira: bandeira || undefined,
        limite: limite ? parseFloat(limite) : undefined,
        diaVencimento: diaVencimento ? parseInt(diaVencimento) : undefined,
        melhorDiaCompra: melhorDia ? parseInt(melhorDia) : undefined,
        contaId: contaId || undefined,
      })
    } catch {
      setErro('Não foi possível salvar. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <form className="fc-form" onSubmit={handleSubmit}>
      <div className="fc-field">
        <label htmlFor="cartao-nome">Nome do cartão</label>
        <input id="cartao-nome" type="text" placeholder="Ex: Nubank Gold" value={nome}
          onChange={(e) => setNome(e.target.value)} required autoFocus />
      </div>

      <div className="fc-grid">
        <div className="fc-field">
          <label htmlFor="cartao-bandeira">Bandeira <span className="fc-opcional">(opcional)</span></label>
          <select id="cartao-bandeira" value={bandeira} onChange={(e) => setBandeira(e.target.value as BandeiraCartao | '')}>
            <option value="">Não informar</option>
            {BANDEIRAS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div className="fc-field">
          <label htmlFor="cartao-conta">Conta vinculada <span className="fc-opcional">(opcional)</span></label>
          <select id="cartao-conta" value={contaId} onChange={(e) => setContaId(e.target.value)}>
            <option value="">Nenhuma</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="fc-field">
        <label htmlFor="cartao-limite">Limite (R$) <span className="fc-opcional">(opcional)</span></label>
        <input id="cartao-limite" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00"
          value={limite} onChange={(e) => setLimite(e.target.value)} />
      </div>

      <div className="fc-grid">
        <div className="fc-field">
          <label htmlFor="cartao-venc">Dia do vencimento</label>
          <input id="cartao-venc" type="number" inputMode="numeric" min="1" max="31" placeholder="1 a 31"
            value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} />
        </div>
        <div className="fc-field">
          <label htmlFor="cartao-melhor">Melhor dia de compra</label>
          <input id="cartao-melhor" type="number" inputMode="numeric" min="1" max="31" placeholder="1 a 31"
            value={melhorDia} onChange={(e) => setMelhorDia(e.target.value)} />
        </div>
      </div>
      <p className="fc-dica">
        Com o vencimento e o melhor dia de compra, o Grifo calcula em qual fatura cada compra cai.
      </p>

      {erro && <p className="fc-erro">{erro}</p>}

      <div className="fc-acoes">
        <button type="button" className="fc-btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="fc-btn-primario" disabled={salvando}>
          {salvando ? 'Salvando...' : inicial ? 'Salvar alterações' : 'Criar cartão'}
        </button>
      </div>

      <EstilosFormConta />
    </form>
  )
}
