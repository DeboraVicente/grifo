import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

// Evento do Chrome/Android que permite mostrar o prompt de instalação nativo
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const CHAVE_DISPENSADO = 'grifo:instalar-dispensado-at'
const DIAS_ESPERA = 7

function jaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Faixa discreta convidando a instalar o Grifo na tela de início. */
export default function InstalarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [mostrarIOS, setMostrarIOS] = useState(false)
  const [dispensado, setDispensado] = useState(() => {
    try {
      const at = localStorage.getItem(CHAVE_DISPENSADO)
      if (!at) return false
      return Date.now() - parseInt(at) < DIAS_ESPERA * 86400_000
    } catch { return false }
  })

  useEffect(() => {
    if (jaInstalado()) return
    const handler = (e: Event) => { e.preventDefault(); setEvento(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    if (ehIOS()) setMostrarIOS(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dispensar = () => {
    setDispensado(true)
    try { localStorage.setItem(CHAVE_DISPENSADO, String(Date.now())) } catch { /* ignora */ }
  }

  const instalar = async () => {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    setEvento(null)
  }

  if (dispensado || jaInstalado() || (!evento && !mostrarIOS)) return null

  return (
    <div className="instalar-faixa">
      <img src="/icons/icon-192.png" alt="" width={36} height={36} />
      <div className="instalar-texto">
        <strong>Instale o Grifo</strong>
        {evento ? (
          <span>Abre direto da tela de início, em tela cheia.</span>
        ) : (
          <span>Toque em <Share size={13} style={{ verticalAlign: '-2px' }} /> e depois em “Adicionar à Tela de Início”.</span>
        )}
      </div>
      {evento && (
        <button className="instalar-btn" onClick={instalar}><Download size={15} /> Instalar</button>
      )}
      <button className="instalar-fechar" onClick={dispensar} aria-label="Dispensar"><X size={16} /></button>

      <style>{`
        .instalar-faixa {
          display: flex; align-items: center; gap: 0.75rem;
          background: #FFFDF7; border: 1px solid #F3E7C9; border-radius: 16px;
          padding: 0.75rem 0.85rem; margin-bottom: 1rem;
        }
        .instalar-faixa img { border-radius: 9px; flex-shrink: 0; }
        .instalar-texto { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .instalar-texto strong { font-size: 0.9rem; color: #2D3436; }
        .instalar-texto span { font-size: 0.78rem; color: #636E72; line-height: 1.35; }
        .instalar-btn {
          display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;
          background: #C8A45A; color: #FFF; border: none; border-radius: 10px;
          padding: 0.5rem 0.8rem; font-weight: 700; font-size: 0.82rem; cursor: pointer;
        }
        .instalar-fechar { background: none; border: none; color: #A4B0BE; cursor: pointer; padding: 4px; flex-shrink: 0; }
      `}</style>
    </div>
  )
}
