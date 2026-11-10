import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import type { User } from 'firebase/auth'
import AlterarSenhaSection from './AlterarSenhaSection'
import ExcluirContaSection from './ExcluirContaSection'

/** Linha na página Conta que abre o gerenciamento da conta. */
export function BotaoGerenciarConta({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button className="gc-atalho" onClick={onAbrir}>
      <span className="gc-atalho-icone"><ShieldCheck size={18} /></span>
      <span className="gc-atalho-texto">
        <span className="gc-atalho-titulo">Gerenciar conta</span>
        <span className="gc-atalho-sub">Alterar senha e excluir conta</span>
      </span>
      <ChevronRight size={18} className="gc-atalho-seta" />
      <style>{`
        .gc-atalho {
          display: flex; align-items: center; gap: 0.85rem; width: 100%; text-align: left;
          background: #fff; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1rem 1.25rem; cursor: pointer; font-family: inherit;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04); transition: border-color 0.15s;
        }
        .gc-atalho:hover { border-color: rgba(200,164,90,0.4); }
        .gc-atalho-icone {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: rgba(200,164,90,0.12); color: #C8A45A;
          display: flex; align-items: center; justify-content: center;
        }
        .gc-atalho-texto { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
        .gc-atalho-titulo { color: #2D3436; font-size: 0.9rem; font-weight: 700; }
        .gc-atalho-sub { color: #95A5A6; font-size: 0.78rem; }
        .gc-atalho-seta { color: #BDC3C7; flex-shrink: 0; }
      `}</style>
    </button>
  )
}

/** Tela de gerenciamento da conta: alterar senha e excluir conta. */
export default function GerenciarConta({ user, onVoltar }: { user: User; onVoltar: () => void }) {
  return (
    <>
      <div className="gc-topo">
        <button className="gc-voltar" onClick={onVoltar} aria-label="Voltar para Conta">
          <ChevronLeft size={20} />
        </button>
        <div className="gc-topo-texto">
          <h2 className="gc-titulo">Gerenciar conta</h2>
          <span className="gc-email">{user.email}</span>
        </div>
      </div>

      <AlterarSenhaSection user={user} />
      <ExcluirContaSection user={user} />

      <style>{`
        .gc-topo { display: flex; align-items: center; gap: 0.75rem; }
        .gc-voltar {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          border: 1px solid #F1F2F6; background: #fff; color: #2D3436;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .gc-voltar:hover { border-color: #C8A45A; color: #C8A45A; }
        .gc-topo-texto { display: flex; flex-direction: column; min-width: 0; }
        .gc-titulo { margin: 0; font-size: 1.05rem; font-weight: 800; color: #2D3436; }
        .gc-email { font-size: 0.78rem; color: #95A5A6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Campos das seções de senha e exclusão */
        .field-input {
          flex: 1; width: 100%; background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px;
          color: #2D3436; padding: 0.75rem 1rem; font-size: 0.92rem;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .field-input:focus { border-color: #C8A45A; background: #FFFFFF; box-shadow: 0 0 0 4px rgba(200,164,90,0.05); }
      `}</style>
    </>
  )
}
