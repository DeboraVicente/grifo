import { useState } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import type { User } from 'firebase/auth'
import { excluirConta } from '../../lib/excluirConta'

const MENSAGENS: Record<string, string> = {
  'senha-incorreta': 'Senha incorreta.',
  'tem-membros': 'Você é dona(o) de uma família com outros membros. Remova os membros na seção Família antes de excluir a conta.',
  erro: 'Não foi possível excluir a conta. Tente novamente.',
}

export default function ExcluirContaSection({ user }: { user: User }) {
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const podeExcluir = senha.length > 0 && confirmacao.trim().toUpperCase() === 'EXCLUIR' && !excluindo

  const cancelar = () => { setAberto(false); setSenha(''); setConfirmacao(''); setErro(null) }

  const handleExcluir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeExcluir) return
    setExcluindo(true); setErro(null)
    const resultado = await excluirConta(user, senha)
    // Em caso de sucesso o app volta sozinho para a tela de login
    if (resultado !== 'ok') { setErro(MENSAGENS[resultado]); setExcluindo(false) }
  }

  return (
    <div className="section-card excluir-conta">
      <h3 className="section-titulo">Excluir conta</h3>
      <p className="section-desc">
        Apaga sua conta e todos os seus dados: despesas, receitas, caixinhas, previstos, contas e cartões.
        Itens familiares de uma família da qual você é membro continuam com a família. Não dá para desfazer.
      </p>

      {!aberto ? (
        <button className="btn-excluir-conta" onClick={() => setAberto(true)}>Excluir minha conta</button>
      ) : (
        <form className="excluir-form" onSubmit={handleExcluir}>
          <div className="excluir-aviso"><AlertTriangle size={16} /> Esta ação é permanente.</div>

          <label className="excluir-label">Confirme sua senha</label>
          <div className="excluir-senha">
            <input className="field-input" type={mostrarSenha ? 'text' : 'password'} value={senha}
              autoComplete="current-password" onChange={(e) => setSenha(e.target.value)} required />
            <button type="button" className="excluir-ver" onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <label className="excluir-label">Digite EXCLUIR para confirmar</label>
          <input className="field-input" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)}
            autoCapitalize="characters" autoComplete="off" />

          {erro && <p className="feedback erro">{erro}</p>}

          <div className="excluir-acoes">
            <button type="button" className="btn-cancelar-excluir" onClick={cancelar} disabled={excluindo}>Cancelar</button>
            <button type="submit" className="btn-confirmar-excluir" disabled={!podeExcluir}>
              {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
            </button>
          </div>
        </form>
      )}

      <style>{`
        .excluir-conta { border: 1px solid #FDCECE; }
        .btn-excluir-conta {
          align-self: flex-start; border: 1px solid #FDCECE; color: #D63031; background: none;
          border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .btn-excluir-conta:hover { background: #FFF5F5; }
        .excluir-form { display: flex; flex-direction: column; gap: 0.5rem; }
        .excluir-aviso {
          display: flex; align-items: center; gap: 0.4rem; color: #D63031;
          font-size: 0.82rem; font-weight: 700;
        }
        .excluir-label { font-size: 0.75rem; font-weight: 700; color: #636E72; margin-top: 0.35rem; }
        .excluir-senha { position: relative; display: flex; }
        .excluir-senha .field-input { flex: 1; min-width: 0; padding-right: 2.75rem; }
        .excluir-ver {
          position: absolute; right: 0.25rem; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border: none; background: none; color: #95A5A6;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .excluir-acoes { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
        .btn-cancelar-excluir, .btn-confirmar-excluir {
          flex: 1; border-radius: 10px; padding: 0.75rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }
        .btn-cancelar-excluir { background: #F1F2F6; color: #636E72; border: none; }
        .btn-confirmar-excluir { background: #D63031; color: #fff; border: none; }
        .btn-confirmar-excluir:disabled, .btn-cancelar-excluir:disabled { opacity: 0.45; cursor: default; }
      `}</style>
    </div>
  )
}
