import { useState, useRef, useEffect } from 'react'
import { useAuthContext } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import DespesasPage from './pages/DespesasPage'
import CaixinhasPage from './pages/CaixinhasPage'
import ContaPage from './pages/ContaPage'

type Tab = 'despesas' | 'caixinhas' | 'conta' | 'relatorios' 

export default function App() {
  const { user, loading, signOut } = useAuthContext()
  const [tab, setTab] = useState<Tab>('despesas')
  
  // Estado para controlar a visibilidade do menu de perfil
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    const clickFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    document.addEventListener('mousedown', clickFora)
    return () => document.removeEventListener('mousedown', clickFora)
  }, [])

  if (loading) {
    return (
      <div className="splash">
        <span className="splash-logo">Grifo - Controle Financeiro</span>
        <style>{`
          .splash { min-height: 100vh; background: #F8F9FA; display: flex; align-items: center; justify-content: center; }
          .splash-logo { font-family: -apple-system, sans-serif; font-size: 2rem; color: #C8A45A; font-weight: 700; opacity: 0.5; animation: pulse 1.5s ease-in-out infinite; }
          @keyframes pulse { 0%,100% { opacity:0.3 } 50% { opacity:0.7 } }
        `}</style>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <div className="app-container">
      {/* Sidebar para Desktop / Header para Mobile */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <img src="/favicon.svg" alt="Grifo" width={32} height={32} />
            <span>Grifo</span>
          </div>

          <div className="header-actions">
            <div className="header-user-wrapper" ref={menuRef}>
              <button className="header-user" onClick={() => setMenuAberto(!menuAberto)}>
                {user.displayName?.charAt(0).toUpperCase() ?? '?'}
              </button>
              {menuAberto && (
                <div className="perfil-dropdown">
                  <div className="dropdown-info">
                    <strong>{user.displayName}</strong>
                    <span>{user.email}</span>
                  </div>
                  <hr />
                  <button onClick={() => { setTab('conta'); setMenuAberto(false); }}>Conta</button>
                  <button className="btn-logout" onClick={signOut}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="main-layout">
        {/* Menu Lateral visível apenas no Desktop */}
        <aside className="sidebar-desktop">
          <nav className="side-nav">
            {['despesas', 'caixinhas', 'relatorios'].map((t) => (
              <button 
                key={t} 
                className={tab === t ? 'active' : ''} 
                onClick={() => setTab(t as Tab)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="app-main">
          <div className="content-limit">
            {tab === 'despesas' && <DespesasPage />}
            {tab === 'caixinhas' && <CaixinhasPage />}
            {tab === 'conta' && <ContaPage />}
            {tab === 'relatorios' && <div className="em-breve">Em breve</div>}
          </div>
        </main>
      </div>

      {/* Nav Mobile: Invisível no Desktop */}
      <nav className="app-nav-mobile">
        {['despesas', 'caixinhas', 'relatorios'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t as Tab)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <style>{`
        /* Reset e Base */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F9FA; color: #2D3436; font-family: system-ui, sans-serif; }

        .app-container { min-height: 100vh; display: flex; flex-direction: column; }

        /* Header: No desktop é fixo no topo, no mobile é o topo do app */
        .app-header { 
          background: #FFF; 
          border-bottom: 1px solid #F1F2F6; 
          padding: 1rem 2rem;
          display: flex;
          justify-content: center;
        }
        .header-content { width: 100%; max-width: 1200px; display: flex; justify-content: space-between; align-items: center; }
        .header-brand { display: flex; align-items: center; gap: 0.8rem; color: #C8A45A; font-weight: 800; font-size: 1.3rem; }

        .main-layout { display: flex; width: 100%; max-width: 1200px; margin: 0 auto; flex: 1; }

        /* Sidebar Desktop: Oculta por padrão (mobile) */
        .sidebar-desktop { width: 240px; padding: 2rem 1rem; display: none; }
        .side-nav { display: flex; flex-direction: column; gap: 0.5rem; }
        .side-nav button { 
          text-align: left; padding: 0.8rem 1rem; border: none; background: none; 
          border-radius: 12px; font-weight: 600; color: #95A5A6; cursor: pointer; 
        }
        .side-nav button.active { background: #FFFDF7; color: #C8A45A; }
        /* Dropdown Perfil */
        .dropdown-info { padding: 0.5rem; display: flex; flex-direction: column; margin-bottom: 4px; }
        .dropdown-info strong { font-size: 0.9rem; color: #2D3436; }
        .dropdown-info span { font-size: 0.75rem; color: #95A5A6; }
        
        .perfil-dropdown hr { border: none; border-top: 1px solid #F1F2F6; margin: 4px 0; }

        /* Main Content */
        .app-main { flex: 1; padding: 2rem 1.25rem; padding-bottom: 100px; }
        .content-limit { max-width: 800px; margin: 0 auto; }

        /* Nav Mobile */
        .app-nav-mobile { 
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
          width: 90%; max-width: 400px; background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px); border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          display: flex; padding: 0.5rem; z-index: 200;
        }
        .app-nav-mobile button { flex: 1; padding: 0.7rem; border: none; background: none; color: #95A5A6; font-size: 0.75rem; font-weight: 700; }
        .app-nav-mobile button.active { color: #C8A45A; }

        /* Dropdown Perfil */
        .header-user-wrapper { position: relative; }
        .header-user { width: 40px; height: 40px; border-radius: 12px; border: none; background: #F1F2F6; font-weight: 700; cursor: pointer; }
        .perfil-dropdown { 
          position: absolute; top: 50px; right: 0; width: 200px; background: #FFF; 
          border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #F1F2F6; padding: 0.5rem;
        }
        .perfil-dropdown button { width: 100%; text-align: left; padding: 0.7rem; border: none; background: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .perfil-dropdown button:hover { background: #F8F9FA; }

        /* RESPONSIVIDADE (A "mágica" do PWA) */
        @media (min-width: 900px) {
          .sidebar-desktop { display: block; }
          .app-nav-mobile { display: none; } /* Esconde nav de app no desktop */
          .app-main { padding-bottom: 2rem; }
        }
      `}</style>
    </div>
  )
}