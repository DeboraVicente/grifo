import { useState } from 'react'
import { Users, Link, Copy, Check, LogOut, Crown, Share2, X } from 'lucide-react'
import type { MembroFamilia } from '../../hooks/useFamilia'

interface Props {
  ownerUid: string
  meuUid: string
  membros: MembroFamilia[]
  conviteExpira?: number
  onGerarConvite: () => Promise<string | null>
  onSair: () => Promise<void>
  onRemover: (uid: string) => Promise<void>
}

export default function FamiliaSection({ ownerUid, meuUid, membros, conviteExpira, onGerarConvite, onSair, onRemover }: Props) {
  const [linkConvite, setLinkConvite] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const podeCompartilhar = typeof navigator !== 'undefined' && !!navigator.share

  const souDono = meuUid === ownerUid
  const conviteValido = conviteExpira && Date.now() < conviteExpira

  const handleGerarConvite = async () => {
    setGerando(true)
    try {
      const url = await onGerarConvite()
      setLinkConvite(url)
    } finally {
      setGerando(false)
    }
  }

  const handleCopiar = async () => {
    if (!linkConvite) return
    await navigator.clipboard.writeText(linkConvite)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const handleCompartilhar = async () => {
    if (!linkConvite) return
    try {
      await navigator.share({ title: 'Grifo', text: 'Entre na nossa família no Grifo:', url: linkConvite })
    } catch { /* usuário cancelou */ }
  }

  const handleRemover = async (m: MembroFamilia) => {
    if (!confirm(`Remover ${m.nome || m.email} da família? A pessoa deixa de ver os dados compartilhados.`)) return
    setRemovendo(m.uid)
    try { await onRemover(m.uid) } finally { setRemovendo(null) }
  }

  const handleSair = async () => {
    if (!confirm('Tem certeza que deseja sair da família? Você voltará a ver apenas seus próprios dados.')) return
    setSaindo(true)
    try { await onSair() } finally { setSaindo(false) }
  }

  return (
    <section className="familia-section">
      <div className="section-titulo">
        <Users size={18} />
        <h2>Família</h2>
      </div>

      <div className="membros-lista">
        {membros.map((m) => (
          <div key={m.uid} className="membro-item">
            <div className="membro-avatar">{(m.nome || m.email || '?').charAt(0).toUpperCase()}</div>
            <div className="membro-info">
              <span className="membro-nome">{m.nome || m.email || 'Membro'}</span>
              <span className="membro-email">{m.email}</span>
            </div>
            {m.uid === ownerUid && (
              <span className="badge-dono"><Crown size={11} /> dono</span>
            )}
            {m.uid === meuUid && m.uid !== ownerUid && <span className="badge-voce">você</span>}
            {souDono && m.uid !== ownerUid && (
              <button className="btn-remover-membro" onClick={() => handleRemover(m)}
                disabled={removendo === m.uid} aria-label={`Remover ${m.nome || m.email}`}>
                <X size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {souDono && (
        <div className="convite-box">
          {linkConvite ? (
            <>
              <div className="link-preview">{linkConvite}</div>
              <div className="convite-acoes">
                <button className={`btn-copiar ${copiado ? 'copiado' : ''}`} onClick={handleCopiar}>
                  {copiado ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar link</>}
                </button>
                {podeCompartilhar && (
                  <button className="btn-copiar" onClick={handleCompartilhar}>
                    <Share2 size={15} /> Compartilhar
                  </button>
                )}
              </div>
              <p className="convite-obs">Link válido por 48 horas. Compartilhe com quem vai entrar na família.</p>
            </>
          ) : (
            <button className="btn-convidar" onClick={handleGerarConvite} disabled={gerando}>
              <Link size={15} />
              {gerando ? 'Gerando...' : conviteValido ? 'Gerar novo link de convite' : 'Convidar para a família'}
            </button>
          )}
        </div>
      )}

      {!souDono && (
        <button className="btn-sair-familia" onClick={handleSair} disabled={saindo}>
          <LogOut size={15} />
          {saindo ? 'Saindo...' : 'Sair da família'}
        </button>
      )}

      <style>{`
        .familia-section { display: flex; flex-direction: column; gap: 1rem; }

        .section-titulo { display: flex; align-items: center; gap: 0.5rem; }
        .section-titulo h2 { font-size: 1rem; font-weight: 700; color: #2D3436; margin: 0; }
        .section-titulo svg { color: #C8A45A; }

        .membros-lista { display: flex; flex-direction: column; gap: 0.5rem; }
        .membro-item {
          display: flex; align-items: center; gap: 0.75rem;
          background: #F8F9FA; border-radius: 12px; padding: 0.75rem 1rem;
        }
        .membro-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: #ECEFF1; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.95rem; color: #636E72; flex-shrink: 0;
        }
        .membro-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
        .membro-nome { font-size: 0.88rem; font-weight: 600; color: #2D3436; }
        .membro-email { font-size: 0.75rem; color: #95A5A6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .badge-dono {
          display: flex; align-items: center; gap: 3px;
          background: rgba(200,164,90,0.12); color: #C8A45A;
          border-radius: 6px; padding: 0.2rem 0.5rem;
          font-size: 0.7rem; font-weight: 700; flex-shrink: 0;
        }

        .convite-box { display: flex; flex-direction: column; gap: 0.6rem; }

        .btn-convidar {
          display: flex; align-items: center; gap: 0.5rem; justify-content: center;
          background: #C8A45A; color: #FFF; border: none; border-radius: 12px;
          padding: 0.85rem 1.25rem; font-size: 0.88rem; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: background 0.15s;
        }
        .btn-convidar:hover:not(:disabled) { background: #B8944A; }
        .btn-convidar:disabled { opacity: 0.5; }

        .link-preview {
          background: #F1F2F6; border-radius: 10px; padding: 0.75rem;
          font-size: 0.72rem; color: #636E72; word-break: break-all; line-height: 1.5;
        }

        .btn-copiar {
          display: flex; align-items: center; gap: 0.5rem; justify-content: center;
          border: 1.5px solid #C8A45A; color: #C8A45A; background: none;
          border-radius: 10px; padding: 0.7rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .btn-copiar.copiado { background: rgba(200,164,90,0.1); }

        .convite-acoes { display: flex; gap: 0.5rem; }
        .convite-acoes .btn-copiar { flex: 1; }
        .badge-voce {
          background: #F1F2F6; color: #636E72; border-radius: 6px; padding: 0.2rem 0.5rem;
          font-size: 0.7rem; font-weight: 700; flex-shrink: 0;
        }
        .btn-remover-membro {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          border: none; background: none; color: #95A5A6; cursor: pointer;
        }
        .btn-remover-membro:hover:not(:disabled) { background: #FDECEC; color: #D63031; }
        .btn-remover-membro:disabled { opacity: 0.4; }

        .convite-obs { font-size: 0.72rem; color: #95A5A6; margin: 0; text-align: center; }

        .btn-sair-familia {
          display: flex; align-items: center; gap: 0.5rem; justify-content: center;
          border: 1px solid #FDCECE; color: #D63031; background: none;
          border-radius: 12px; padding: 0.75rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .btn-sair-familia:disabled { opacity: 0.5; }
      `}</style>
    </section>
  )
}
