import { useState } from 'react'
import { useAuthContext } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import DespesasPage from './pages/DespesasPage'
import CaixinhasPage from './pages/CaixinhasPage'

type Tab = 'despesas' | 'caixinhas' | 'relatorios'

export default function App() {
  const { user, loading, signOut } = useAuthContext()
  const [tab, setTab] = useState<Tab>('despesas')

  if (loading) {
    return (
      <div className="splash">
        <span className="splash-logo">Grifo - Controle Financeiro</span>
        <style>{`
          .splash { min-height: 100vh; background: #e6f0f1; display: flex; align-items: center; justify-content: center; }
          .splash-logo { font-family: 'Georgia', serif; font-size: 2.5rem; color: #C8A45A; letter-spacing: 0.1em; opacity: 0.5; animation: pulse 1.5s ease-in-out infinite; }
          @keyframes pulse { 0%,100% { opacity:0.3 } 50% { opacity:0.7 } }
        `}</style>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <img src="/favicon.svg" alt="Grifo - Controle Financeiro" className="header-logo" width={32} height={32} />
          <span>Grifo - Controle Financeiro</span>
        </div>
        <button className="header-user" onClick={signOut} title="Sair">
          {user.displayName?.charAt(0).toUpperCase() ?? '?'}
        </button>
      </header>

      <main className="app-main">
        {tab === 'despesas' && <DespesasPage />}
        {tab === 'caixinhas' && <CaixinhasPage />}
        {tab === 'relatorios' && (
          <div className="em-breve"><p>Relatórios em breve</p></div>
        )}
      </main>

      <nav className="app-nav">
        {([
          { id: 'despesas', label: 'Despesas'},
          { id: 'caixinhas', label: 'Caixinhas'},
          { id: 'relatorios', label: 'Relatórios'},
        ] as { id: Tab; label: string}[]).map((item) => (
          <button key={item.id} className={`nav-btn ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F9FA; color: #2D3436; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .app { min-height: 100vh; display: flex; flex-direction: column; margin: 0 auto; background: #FFFFFF; box-shadow: 0 0 20px rgba(0,0,0,0.03);}
        .app-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #FFFFFF; position: sticky; top: 0; z-index: 100; }
        .header-brand { 
          display: flex; 
          align-items: center; 
          gap: 0.8rem; 
          font-size: 1.1rem; 
          font-weight: 600; 
          color: #C8A45A; 
        }        
        .header-user { 
          width: 36px; height: 36px; 
          background: #F1F2F6; 
          border: none; 
          border-radius: 12px; /* Square arredondado é mais moderno que círculo total */
          color: #2D3436; 
          font-weight: 600; 
          cursor: pointer;
        }
        .header-user:hover { background: rgba(200,164,90,0.25); }
        .app-main { flex: 1; padding: 1.25rem; padding-bottom: 100px; }
        .app-nav { 
          position: fixed; 
          bottom: 20px;
          left: 50%; 
          transform: translateX(-50%); 
          width: 90%; 
          max-width: 400px; 
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px); /* Efeito de vidro */
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 24px;
          display: flex; 
          padding: 0.6rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .nav-btn { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 4px;
          background: none; 
          border: none; 
          color: #A4B0BE; 
          cursor: pointer; 
          transition: all 0.2s;
        }        
        .nav-btn.active { color: #C8A45A; transform: translateY(-2px); }
        .nav-emoji { font-size: 1.3rem; }
        .nav-label { font-size: 0.7rem; font-weight: 600; }
        .em-breve { 
          text-align: center; 
          padding: 4rem 1rem; 
          color: #A4B0BE; 
        }
      `}</style>
    </div>
  )
}
