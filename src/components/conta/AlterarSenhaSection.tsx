import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, type User } from 'firebase/auth'

const MIN = 8

function mensagemErro(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password': return 'Senha atual incorreta.'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements': return `A nova senha é fraca. Use pelo menos ${MIN} caracteres.`
    case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    default: return 'Não foi possível alterar a senha. Tente novamente.'
  }
}

function CampoSenha({ label, valor, onChange, autoComplete, visivel, onAlternar }: {
  label: string; valor: string; onChange: (v: string) => void
  autoComplete: string; visivel: boolean; onAlternar: () => void
}) {
  return (
    <>
      <label className="senha-label">{label}</label>
      <div className="senha-campo">
        <input className="field-input" type={visivel ? 'text' : 'password'} value={valor}
          autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" className="senha-ver" onClick={onAlternar}
          aria-label={visivel ? 'Ocultar senhas' : 'Mostrar senhas'}>
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </>
  )
}

export default function AlterarSenhaSection({ user }: { user: User }) {
  const [aberto, setAberto] = useState(false)
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [visivel, setVisivel] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const fechar = () => {
    setAberto(false); setAtual(''); setNova(''); setConfirmacao(''); setVisivel(false)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (nova.length < MIN) { setFeedback({ tipo: 'erro', msg: `A nova senha precisa ter pelo menos ${MIN} caracteres.` }); return }
    if (nova !== confirmacao) { setFeedback({ tipo: 'erro', msg: 'A confirmação não confere com a nova senha.' }); return }
    if (nova === atual) { setFeedback({ tipo: 'erro', msg: 'A nova senha precisa ser diferente da atual.' }); return }

    setSalvando(true)
    try {
      // O Firebase exige login recente para trocar a senha
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', atual))
      await updatePassword(user, nova)
      fechar()
      setFeedback({ tipo: 'ok', msg: 'Senha alterada.' })
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: mensagemErro((err as { code?: string }).code) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="section-card">
      <div className="senha-head">
        <KeyRound size={18} />
        <h3 className="section-titulo">Senha</h3>
      </div>

      {!aberto ? (
        <button className="btn-alterar-senha" onClick={() => { setAberto(true); setFeedback(null) }}>Alterar senha</button>
      ) : (
        <form className="senha-form" onSubmit={handleSalvar}>
          <CampoSenha label="Senha atual" valor={atual} onChange={setAtual} autoComplete="current-password"
            visivel={visivel} onAlternar={() => setVisivel((v) => !v)} />
          <CampoSenha label={`Nova senha (mínimo ${MIN} caracteres)`} valor={nova} onChange={setNova} autoComplete="new-password"
            visivel={visivel} onAlternar={() => setVisivel((v) => !v)} />
          <CampoSenha label="Confirmar nova senha" valor={confirmacao} onChange={setConfirmacao} autoComplete="new-password"
            visivel={visivel} onAlternar={() => setVisivel((v) => !v)} />
          <div className="senha-acoes">
            <button type="button" className="btn-senha-cancelar" onClick={() => { fechar(); setFeedback(null) }} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn-senha-salvar" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar nova senha'}</button>
          </div>
        </form>
      )}

      {feedback && <p className={`feedback ${feedback.tipo}`}>{feedback.msg}</p>}

      <style>{`
        .senha-head { display: flex; align-items: center; gap: 0.5rem; color: #C8A45A; }
        .btn-alterar-senha {
          align-self: flex-start; border: 1.5px solid #C8A45A; color: #C8A45A; background: none;
          border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }
        .btn-alterar-senha:hover { background: rgba(200,164,90,0.08); }
        .senha-form { display: flex; flex-direction: column; gap: 0.4rem; }
        .senha-label { font-size: 0.75rem; font-weight: 700; color: #636E72; margin-top: 0.35rem; }
        .senha-campo { position: relative; display: flex; }
        .senha-campo .field-input { flex: 1; min-width: 0; padding-right: 2.75rem; }
        .senha-ver {
          position: absolute; right: 0.25rem; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border: none; background: none; color: #95A5A6;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .senha-acoes { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
        .btn-senha-cancelar, .btn-senha-salvar {
          flex: 1; border-radius: 10px; padding: 0.75rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; font-family: inherit; border: none;
        }
        .btn-senha-cancelar { background: #F1F2F6; color: #636E72; }
        .btn-senha-salvar { background: #C8A45A; color: #fff; }
        .btn-senha-salvar:disabled, .btn-senha-cancelar:disabled { opacity: 0.5; cursor: default; }
      `}</style>
    </div>
  )
}
