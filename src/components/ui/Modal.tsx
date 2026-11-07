import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  titulo: string
  onFechar: () => void
  children: ReactNode
}

/**
 * No celular abre como "bottom sheet" (sobe de baixo, com alça),
 * no desktop vira um modal centralizado.
 */
export default function Modal({ titulo, onFechar, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', handler)
    // Trava a rolagem da página por trás enquanto o sheet está aberto
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = overflowAnterior
    }
  }, [onFechar])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-alca" aria-hidden="true" />
        <div className="modal-header">
          <h2 className="modal-titulo">{titulo}</h2>
          <button className="modal-close" onClick={onFechar} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(45, 52, 54, 0.35);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: flex-end; justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        .modal-box {
          background: #FFFFFF;
          border-radius: 22px 22px 0 0;
          width: 100%; max-width: 520px;
          max-height: calc(94vh - var(--safe-top));
          overflow-y: auto;
          overscroll-behavior: contain;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.12);
          padding-bottom: var(--safe-bottom);
          animation: slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-alca {
          width: 38px; height: 5px; border-radius: 3px;
          background: #DFE4EA; margin: 8px auto 0;
        }
        .modal-header {
          position: sticky; top: 0; background: #FFF; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1.25rem 0.75rem;
          border-bottom: 1px solid #F1F2F6;
        }
        .modal-titulo { font-size: 1.05rem; font-weight: 700; color: #2D3436; letter-spacing: -0.01em; }
        .modal-close {
          background: #F1F2F6; border: none; color: #636E72;
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .modal-body { padding: 1.25rem; background: #FFFFFF; }

        @media (min-width: 600px) {
          .modal-overlay { align-items: center; padding: 1.5rem; }
          .modal-box { border-radius: 22px; padding-bottom: 0; animation: popIn 0.22s ease; }
          .modal-alca { display: none; }
          .modal-header { padding-top: 1.25rem; }
        }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  )
}
