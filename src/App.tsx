import { useState, useRef, useEffect, useMemo } from 'react'
import { Receipt, PiggyBank, BarChart2, TrendingUp, CalendarClock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthContext } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import DespesasPage from './pages/DespesasPage'
import CaixinhasPage from './pages/CaixinhasPage'
import GastosPrevistosPage from './pages/GastosPrevistosPage'
import ContaPage from './pages/ContaPage'
import RelatoriosPage from './pages/RelatoriosPage'
import ReceitasPage from './pages/ReceitasPage'
import InstalarApp from './components/ui/InstalarApp'
import AlertasPrevistos from './components/previstos/AlertasPrevistos'
import EstilosPrevistos from './components/previstos/estilos'
import { useGastosPrevistos } from './hooks/useGastosPrevistos'
import { precisaAtencao } from './lib/previstos'
import { usePerfil } from './hooks/usePerfil'
import { useFamilia, type ResultadoConvite } from './hooks/useFamilia'
import type { InfoFamilia } from './types'

type Tab = 'despesas' | 'previstos' | 'caixinhas' | 'conta' | 'relatorios' | 'receitas'

const NAV_ITEMS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'relatorios', label: 'Início', Icon: BarChart2 },
  { id: 'despesas', label: 'Despesas', Icon: Receipt },
  { id: 'receitas', label: 'Receitas', Icon: TrendingUp },
  { id: 'previstos', label: 'Previstos', Icon: CalendarClock },
  { id: 'caixinhas', label: 'Caixinhas', Icon: PiggyBank },
]

const TITULOS: Record<Tab, string> = {
  relatorios: 'Início', despesas: 'Despesas', receitas: 'Receitas', previstos: 'Previstos', caixinhas: 'Caixinhas', conta: 'Conta',
}

// Atalho "Novo gasto" do ícone do app abre em /?acao=nova-despesa
function lerAcaoInicial(): boolean {
  const params = new URLSearchParams(window.location.search)
  const pediu = params.get('acao') === 'nova-despesa'
  if (pediu) window.history.replaceState(null, '', window.location.pathname)
  return pediu
}

function lerConvite(): { token: string; familiaId: string } | null {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('convite')
  const familiaId = params.get('familia')
  if (token && familiaId) return { token, familiaId }
  return null
}

export default function App() {
  const { user, loading, signOut } = useAuthContext()
  const [acaoInicial] = useState(lerAcaoInicial)
  const [convitePendente] = useState(lerConvite)
  const [tab, setTab] = useState<Tab>(acaoInicial ? 'despesas' : 'relatorios')
  // Atalho do ícone do app ("Novo gasto") abre Despesas já com o formulário aberto
  const [pedidoNovaDespesa] = useState(acaoInicial ? 1 : 0)
  const [conviteStatus, setConviteStatus] = useState<'pendente' | ResultadoConvite | null>(
    convitePendente ? 'pendente' : null
  )
  const processandoConvite = useRef(false)

  const { perfil, loading: perfilLoading } = usePerfil(user?.uid)
  const familiaId = perfil?.familiaId ?? user?.uid
  const familiaApi = useFamilia(familiaId, user?.uid, user?.displayName, user?.email)
  // Só faz sentido separar familiar/pessoal quando há mais de uma pessoa na família
  const temFamilia = (familiaApi.familia?.membros.length ?? 0) > 1
  const familiaDoc = familiaApi.familia
  const infoFamilia = useMemo<InfoFamilia | undefined>(() => {
    if (!familiaDoc) return undefined
    return {
      ownerUid: familiaDoc.ownerUid,
      membros: familiaDoc.membros.map((uid) => ({
        uid, nome: familiaDoc.nomes?.[uid] || familiaDoc.emails?.[uid] || 'Membro',
      })),
    }
  }, [familiaDoc])

  const previstosApi = useGastosPrevistos(familiaId)
  const alertasPrevistos = previstosApi.previstos.filter(precisaAtencao).length

  // Aceita o convite assim que o usuário estiver logado e perfil + família carregados
  const { aceitarConvite, loading: familiaLoading } = familiaApi
  useEffect(() => {
    if (!convitePendente || conviteStatus !== 'pendente' || !user || perfilLoading || familiaLoading) return
    if (processandoConvite.current) return
    processandoConvite.current = true
    aceitarConvite(convitePendente.token, convitePendente.familiaId)
      .catch(() => 'invalido' as const)
      .then((resultado) => {
        setConviteStatus(resultado)
        window.history.replaceState(null, '', window.location.pathname)
        if (resultado === 'aceito') setTab('relatorios')
      })
  }, [convitePendente, conviteStatus, user, perfilLoading, familiaLoading, aceitarConvite])

  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clickFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false)
    }
    document.addEventListener('mousedown', clickFora)
    return () => document.removeEventListener('mousedown', clickFora)
  }, [])

  // Ao trocar de aba, volta ao topo, como num app nativo
  const irPara = (t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  const abrirPrevistos = () => irPara('previstos')

  if (loading) {
    return (
      <div className="splash">
        <img src="/icons/icon-192.png" alt="Grifo" width={88} height={88} />
        <style>{`
          .splash { min-height: 100vh; background: #F8F9FA; display: flex; align-items: center; justify-content: center; }
          .splash img { border-radius: 22px; animation: pulse 1.4s ease-in-out infinite; }
          @keyframes pulse { 0%,100% { opacity: 0.45; transform: scale(0.97) } 50% { opacity: 1; transform: scale(1) } }
        `}</style>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="brand-desktop">Grifo</span>
            <span className="titulo-mobile">{TITULOS[tab]}</span>
          </div>

          <div className="header-user-wrapper" ref={menuRef}>
            <button className="header-user" onClick={() => setMenuAberto(!menuAberto)} aria-label="Perfil">
              {user.displayName?.charAt(0).toUpperCase() ?? '?'}
            </button>
            {menuAberto && (
              <div className="perfil-dropdown">
                <div className="dropdown-info">
                  <strong>{user.displayName}</strong>
                  <span>{user.email}</span>
                </div>
                <hr />
                <button onClick={() => { irPara('conta'); setMenuAberto(false) }}>Conta</button>
                <button className="btn-logout" onClick={signOut}>Sair</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar-desktop">
          <nav className="side-nav">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => irPara(id)}>
                <Icon size={17} />
                <span>{label}</span>
                {id === 'previstos' && alertasPrevistos > 0 && <span className="nav-badge-side">{alertasPrevistos}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="app-main">
          <div className="content-limit">
            <InstalarApp />
            {conviteStatus === 'pendente' && (
              <div className="banner-convite info">Entrando na família...</div>
            )}
            {conviteStatus === 'aceito' && (
              <div className="banner-convite ok">
                Você entrou na família! Agora vê os dados compartilhados.
                <button onClick={() => setConviteStatus(null)}>✕</button>
              </div>
            )}
            {conviteStatus === 'ja-membro' && (
              <div className="banner-convite ok">
                Você já faz parte desta família.
                <button onClick={() => setConviteStatus(null)}>✕</button>
              </div>
            )}
            {conviteStatus === 'invalido' && (
              <div className="banner-convite erro">
                Link de convite inválido ou expirado. Peça um novo link a quem convidou você.
                <button onClick={() => setConviteStatus(null)}>✕</button>
              </div>
            )}
            {conviteStatus === 'tem-membros' && (
              <div className="banner-convite erro">
                Você é dono de uma família com outros membros. Remova-os em Conta antes de entrar em outra família.
                <button onClick={() => setConviteStatus(null)}>✕</button>
              </div>
            )}
            {tab === 'relatorios' && (
              <>
                <EstilosPrevistos />
                <AlertasPrevistos previstos={previstosApi.previstos} onAbrir={abrirPrevistos} />
                <RelatoriosPage familiaId={familiaId} meuUid={user?.uid} temFamilia={temFamilia} familia={infoFamilia} previstos={previstosApi.previstos} />
              </>
            )}
            {tab === 'despesas' && <DespesasPage pedidoNovaDespesa={pedidoNovaDespesa} familiaId={familiaId} meuUid={user?.uid} temFamilia={temFamilia} familia={infoFamilia} />}
            {tab === 'receitas' && <ReceitasPage familiaId={familiaId} meuUid={user?.uid} temFamilia={temFamilia} familia={infoFamilia} />}
            {tab === 'previstos' && <GastosPrevistosPage previstosApi={previstosApi} familiaId={familiaId} meuUid={user?.uid} />}
            {tab === 'caixinhas' && <CaixinhasPage familiaId={familiaId} meuUid={user?.uid} temFamilia={temFamilia} />}
            {tab === 'conta' && <ContaPage familiaApi={familiaApi} familiaId={familiaId} meuUid={user?.uid ?? ''} />}
          </div>
        </main>
      </div>

      {/* Barra de abas no rodapé (só no celular) */}
      <nav className="tabbar">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => irPara(id)}>
            <span className="tab-ico">
              <Icon size={22} strokeWidth={tab === id ? 2.4 : 2} />
              {id === 'previstos' && alertasPrevistos > 0 && <span className="tab-dot" />}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        .banner-convite {
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
          border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.85rem; font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .banner-convite.ok { background: #D4EDDA; color: #155724; }
        .banner-convite.erro { background: #F8D7DA; color: #721C24; }
        .banner-convite.info { background: #F1F2F6; color: #636E72; }
        .banner-convite button { background: none; border: none; cursor: pointer; font-size: 1rem; color: inherit; padding: 0; }

        .app-container { min-height: 100vh; display: flex; flex-direction: column; }

        /* Cabeçalho fixo que respeita o notch / ilha do iPhone */
        .app-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(248, 249, 250, 0.88);
          backdrop-filter: saturate(180%) blur(14px);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          padding: calc(var(--safe-top) + 0.6rem) 1rem 0.6rem;
          display: flex; justify-content: center;
        }
        .header-content { width: 100%; max-width: 1400px; display: flex; justify-content: space-between; align-items: center; }
        .header-brand { display: flex; align-items: center; gap: 0.6rem; }
        .brand-desktop { display: none; color: #C8A45A; font-weight: 800; font-size: 1.3rem; }
        .titulo-mobile { font-weight: 800; font-size: 1.35rem; color: #2D3436; letter-spacing: -0.02em; }

        .main-layout { display: flex; width: 100%; max-width: 1400px; margin: 0 auto; flex: 1; }

        .app-main {
          flex: 1; min-width: 0;
          padding: 0.75rem 0.85rem;
          padding-bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 1.25rem);
        }
        .content-limit { width: 100%; }

        /* Tab bar estilo app nativo */
        .tabbar {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 200;
          display: flex; align-items: stretch;
          height: calc(var(--tabbar-h) + var(--safe-bottom));
          padding-bottom: var(--safe-bottom);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: saturate(180%) blur(14px);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          border-top: 1px solid #ECEFF1;
        }
        .tabbar button {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          border: none; background: none; color: #A4B0BE;
          font-size: 0.68rem; font-weight: 700; font-family: inherit; cursor: pointer;
        }
        .tabbar button.active { color: #C8A45A; }

        .tab-ico { position: relative; display: flex; }
        .tab-dot { position: absolute; top: -2px; right: -4px; width: 9px; height: 9px; border-radius: 50%; background: #E17055; border: 2px solid #FFF; }
        .nav-badge-side { margin-left: auto; background: #C8A45A; color: #FFF; border-radius: 999px; font-size: 0.7rem; padding: 1px 7px; }

        /* Menu do perfil */
        .header-user-wrapper { position: relative; }
        .header-user { width: 38px; height: 38px; border-radius: 50%; border: none; background: #ECEFF1; color: #2D3436; font-weight: 700; cursor: pointer; }
        .perfil-dropdown {
          position: absolute; top: 46px; right: 0; width: 210px; background: #FFF;
          border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #F1F2F6; padding: 0.5rem;
        }
        .dropdown-info { padding: 0.5rem; display: flex; flex-direction: column; margin-bottom: 4px; }
        .dropdown-info strong { font-size: 0.9rem; color: #2D3436; }
        .dropdown-info span { font-size: 0.75rem; color: #95A5A6; word-break: break-all; }
        .perfil-dropdown hr { border: none; border-top: 1px solid #F1F2F6; margin: 4px 0; }
        .perfil-dropdown button { width: 100%; text-align: left; padding: 0.7rem; border: none; background: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: #2D3436; }
        .perfil-dropdown button:hover { background: #F8F9FA; }
        .perfil-dropdown .btn-logout { color: #D63031; }

        /* Desktop: barra lateral no lugar da tab bar */
        .sidebar-desktop { display: none; }
        .side-nav { display: flex; flex-direction: column; gap: 0.25rem; }
        .side-nav button {
          display: flex; align-items: center; gap: 0.65rem;
          text-align: left; padding: 0.75rem 1rem; border: none; background: none;
          border-radius: 12px; font-weight: 600; color: #95A5A6; cursor: pointer; width: 100%;
          font-size: 0.88rem; font-family: inherit; transition: background 0.15s, color 0.15s;
        }
        .side-nav button:hover:not(.active) { background: #F1F2F6; color: #636E72; }
        .side-nav button.active { background: #FFFDF7; color: #C8A45A; }

        @media (min-width: 768px) {
          .app-header { background: #FFF; border-bottom: 1px solid #F1F2F6; padding: 1rem 2rem; }
          .brand-desktop { display: inline; }
          .titulo-mobile { display: none; }
          .sidebar-desktop { display: block; width: 210px; flex-shrink: 0; padding: 1.5rem 1rem; }
          .tabbar { display: none; }
          .app-main { padding: 1.5rem 2rem; }
        }
      `}</style>
    </div>
  )
}
