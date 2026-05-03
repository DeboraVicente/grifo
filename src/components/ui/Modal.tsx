import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  titulo: string
  onFechar: () => void
  children: ReactNode
}

export default function Modal({ titulo, onFechar, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onFechar])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-titulo">{titulo}</h2>
          <button className="modal-close" onClick={onFechar}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

          <style>{`
      .modal-overlay {
        position: fixed;
        inset: 0;
        /* Overlay mais clara e moderna */
        background: rgba(45, 52, 54, 0.4); 
        backdrop-filter: blur(8px);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        z-index: 1000;
        padding: 0;
        animation: fadeIn 0.2s ease;
      }

      @media (min-width: 600px) {
        .modal-overlay { align-items: center; padding: 1.5rem; }
      }

      .modal-box {
        background: #FFFFFF; /* Branco puro */
        /* Removida a borda sólida e adicionada uma sombra profunda */
        border: none; 
        border-radius: 24px 24px 0 0;
        width: 100%;
        max-width: 500px;
        max-height: 92vh;
        overflow-y: auto;
        box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @media (min-width: 600px) {
        .modal-box { border-radius: 24px; }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 1.5rem 1rem 1.5rem;
        /* Linha divisória bem sutil */
        border-bottom: 1px solid #F1F2F6; 
      }

      .modal-titulo {
        font-size: 1.1rem;
        font-weight: 700;
        color: #2D3436; /* Texto escuro, mas não preto */
        margin: 0;
        letter-spacing: -0.01em;
      }

      .modal-close {
        background: #F8F9FA;
        border: none;
        color: #A4B0BE;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .modal-close:hover { 
        background: #F1F2F6;
        color: #2D3436;
        transform: rotate(90deg);
      }

      .modal-body { 
        padding: 1.5rem; 
        /* Garante que o fundo do corpo seja branco para o form */
        background: #FFFFFF; 
      }

      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideUp { 
        from { transform: translateY(100%) } 
        to { transform: translateY(0) } 
      }
    `}</style>
    </div>
  )
}
