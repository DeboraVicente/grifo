import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'

export default function AuthPage() {
  const { signIn, signUp, error, setError } = useAuthContext()
  const [mode, setMode] = useState<'login' | 'cadastro'>('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') await signIn(form.email, form.senha)
      else await signUp(form.nome, form.email, form.senha)
    } catch { } finally { setLoading(false) }
  }

  const toggle = () => {
    setMode((m) => (m === 'login' ? 'cadastro' : 'login'))
    setError(null)
    setForm({ nome: '', email: '', senha: '' })
    setMostrarSenha(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/favicon.svg" alt="Grifo" className="header-logo" width={32} height={32} />
          <span className="auth-brand">Grifo</span>
        </div>
        <p className="auth-tagline">seu financeiro, sob controle</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'cadastro' && (
            <div className="field">
              <label>Nome</label>
              <input type="text" placeholder="Seu nome" value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
          )}
          <div className="field">
            <label>E-mail</label>
            <input type="email" placeholder="seu@email.com" value={form.email} autoComplete="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="field">
            <label>Senha</label>
            <div className="senha-wrap">
              <input type={mostrarSenha ? 'text' : 'password'} placeholder="••••••••" value={form.senha}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setForm({ ...form, senha: e.target.value })} required minLength={mode === 'cadastro' ? 8 : 6} />
              <button type="button" className="btn-ver-senha" onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha}>
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {mode === 'cadastro' && <span className="senha-dica">Mínimo de 8 caracteres.</span>}
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <button className="auth-toggle" onClick={toggle}>
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
        </button>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          /* Degradê suave para um visual premium e leve */
          background: radial-gradient(circle at top right, #FFFFFF, #F1F2F6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: #FFFFFF;
          /* Sombra profunda e suave em vez de bordas escuras */
          box-shadow: 0 20px 60px rgba(0,0,0,0.05);
          border-radius: 24px;
          padding: 3.5rem 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid rgba(0,0,0,0.02);
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .auth-brand {
          font-size: 2.2rem;
          font-weight: 800;
          color: #C8A45A;
          letter-spacing: -0.02em;
          text-transform: lowercase;
        }

        .auth-tagline {
          color: #95A5A6;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 2.5rem;
        }

        .auth-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field label {
          color: #2D3436;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 4px;
        }

        .field input {
          background: #F8F9FA;
          border: 1px solid #F1F2F6;
          border-radius: 12px;
          color: #2D3436;
          padding: 1rem 1.2rem;
          font-size: 1rem;
          transition: all 0.2s ease;
          outline: none;
        }

        .senha-wrap { position: relative; display: flex; }
        .senha-wrap input { flex: 1; min-width: 0; padding-right: 3rem; }
        .btn-ver-senha {
          position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%);
          width: 40px; height: 40px; border: none; background: none; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #95A5A6; cursor: pointer;
        }
        .btn-ver-senha:hover { color: #C8A45A; }
        .senha-dica { color: #95A5A6; font-size: 0.75rem; padding-left: 4px; }

        .field input:focus {
          border-color: #C8A45A;
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(200,164,90,0.1);
        }

        .auth-error {
          color: #E74C3C;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          background: #FFF5F5;
          padding: 0.75rem;
          border-radius: 10px;
          border: 1px solid rgba(231, 76, 60, 0.1);
        }

        .btn-primary {
          background: #C8A45A;
          color: #FFFFFF;
          border: none;
          border-radius: 14px;
          padding: 1.1rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(200,164,90,0.3);
          transition: all 0.3s ease;
          margin-top: 1rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(200,164,90,0.4);
        }

        .btn-primary:active { transform: translateY(0); }

        .btn-primary:disabled {
          background: #D1D8E0;
          box-shadow: none;
          cursor: not-allowed;
        }

        .auth-toggle {
          background: transparent;
          border: none;
          color: #95A5A6;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 2rem;
          transition: color 0.2s;
        }

        .auth-toggle:hover { color: #C8A45A; }
      `}</style>
    </div>
  )
}
