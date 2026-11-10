import { useState } from 'react'
import type { Conta, ContaForm as ContaFormType, TipoConta } from '../../types'
import EstilosFormConta from './EstilosFormConta'
import { TIPOS_CONTA } from './opcoes'

interface Props {
  inicial?: Conta
  /** Nomes já usados por outras contas, para evitar duplicadas */
  nomesExistentes: string[]
  onSalvar: (form: ContaFormType) => Promise<void>
  onCancelar: () => void
}

/** Cadastro/edição de conta bancária ou carteira. */
export default function ContaForm({ inicial, nomesExistentes, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [tipo, setTipo] = useState<TipoConta>(inicial?.tipo ?? 'digital')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const limpo = nome.trim()
    if (!limpo) return
    const duplicada = nomesExistentes.some((n) => n.trim().toLowerCase() === limpo.toLowerCase())
    if (duplicada) { setErro(`Já existe uma conta com o nome "${limpo}".`); return }
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar({ nome: limpo, tipo })
    } catch {
      setErro('Não foi possível salvar. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <form className="fc-form" onSubmit={handleSubmit}>
      <div className="fc-field">
        <label htmlFor="conta-nome">Nome da conta</label>
        <input id="conta-nome" type="text" placeholder="Ex: Nubank, Carteira" value={nome}
          onChange={(e) => { setNome(e.target.value); setErro(null) }} required autoFocus />
      </div>

      <div className="fc-field">
        <label htmlFor="conta-tipo">Tipo</label>
        <select id="conta-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoConta)}>
          {TIPOS_CONTA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {erro && <p className="fc-erro">{erro}</p>}

      <div className="fc-acoes">
        <button type="button" className="fc-btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="fc-btn-primario" disabled={salvando}>
          {salvando ? 'Salvando...' : inicial ? 'Salvar alterações' : 'Criar conta'}
        </button>
      </div>

      <EstilosFormConta />
    </form>
  )
}
