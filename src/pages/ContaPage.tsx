import { useState } from 'react'
import { Check, X, CheckCircle2, Trash2, CreditCard, Pencil } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useAmizades } from '../hooks/useAmizades'
import { useCartoes } from '../hooks/useCartoes'
import type { Amizade, BandeiraCartao, CartaoCredito } from '../types'

const BANCOS = ['Nubank', 'Itaú', 'Santander', 'Caixa', 'C6 Bank', 'Outro']
const BANDEIRAS: { value: BandeiraCartao; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'outros', label: 'Outros' },
]

export default function ContaPage() {
  const { user, signOut } = useAuthContext()
  const { amigos, pendentesRecebidas, amizades, enviarSolicitacao, responderSolicitacao } =
    useAmizades(user?.uid, user?.email ?? '', user?.displayName ?? '')
  const { cartoes, criar: criarCartao, editar: editarCartao, remover: removerCartao } = useCartoes(user?.uid)

  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [tab, setTab] = useState<'amigos' | 'pendentes'>('amigos')

  const CARTAO_VAZIO = { nome: '', banco: '', bandeira: '' as BandeiraCartao | '', limite: '', diaVencimento: '', melhorDiaCompra: '' }
  const [novoCartao, setNovoCartao] = useState(CARTAO_VAZIO)
  const [editandoCartao, setEditandoCartao] = useState<CartaoCredito | null>(null)
  const [salvandoCartao, setSalvandoCartao] = useState(false)
  const [feedbackCartao, setFeedbackCartao] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const handleRemoverCartao = async (id: string) => {
    setFeedbackCartao(null)
    const resultado = await removerCartao(id)
    if (resultado === 'vinculado') {
      setFeedbackCartao({ tipo: 'erro', msg: 'Este cartão está vinculado a despesas e não pode ser excluído.' })
    } else if (resultado === 'erro') {
      setFeedbackCartao({ tipo: 'erro', msg: 'Erro ao excluir. Tente novamente.' })
    }
  }

  const [exibirFormCartao, setExibirFormCartao] = useState(false)

  const handleAbrirEditar = (c: CartaoCredito) => {
    setEditandoCartao(c)
    setNovoCartao({
      nome: c.nome,
      banco: c.banco,
      bandeira: c.bandeira ?? '',
      limite: c.limite ? String(c.limite) : '',
      diaVencimento: c.diaVencimento ? String(c.diaVencimento) : '',
      melhorDiaCompra: c.melhorDiaCompra ? String(c.melhorDiaCompra) : '',
    })
    setExibirFormCartao(true)
  }

  const handleCancelarCartao = () => {
    setExibirFormCartao(false)
    setEditandoCartao(null)
    setNovoCartao(CARTAO_VAZIO)
  }

  const handleAddCartao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCartao.nome || !novoCartao.banco) return
    setSalvandoCartao(true)
    const form = {
      nome: novoCartao.nome,
      banco: novoCartao.banco,
      bandeira: novoCartao.bandeira || undefined,
      limite: novoCartao.limite ? parseFloat(novoCartao.limite) : undefined,
      diaVencimento: novoCartao.diaVencimento ? parseInt(novoCartao.diaVencimento) : undefined,
      melhorDiaCompra: novoCartao.melhorDiaCompra ? parseInt(novoCartao.melhorDiaCompra) : undefined,
    }
    if (editandoCartao) {
      await editarCartao(editandoCartao.id, form)
    } else {
      await criarCartao(form)
    }
    setNovoCartao(CARTAO_VAZIO)
    setSalvandoCartao(false)
    setExibirFormCartao(false)
    setEditandoCartao(null)
  }

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setFeedback(null)
    const resultado = await enviarSolicitacao(email)
    const msgs: Record<string, string> = {
      ok: 'Solicitação enviada!',
      nao_encontrado: 'Usuário não encontrado. Ele precisa ter conta no Grifo.',
      ja_existe: 'Já existe uma conexão com este usuário.',
      mesmo_usuario: 'Você não pode se adicionar.',
      erro: 'Ocorreu um erro. Tente novamente.',
    }
    setFeedback({ tipo: resultado === 'ok' ? 'ok' : 'erro', msg: msgs[resultado] })
    if (resultado === 'ok') setEmail('')
    setEnviando(false)
  }

  const handleResponder = async (amizade: Amizade, resposta: 'aceita' | 'recusada') => {
    await responderSolicitacao(amizade.id, resposta)
  }

  const pendentesEnviadas = amizades.filter(
    (a) => a.solicitanteId === user?.uid && a.status === 'pendente'
  )

  return (
    <div className="conta-page">
      {/* Perfil */}
      <div className="perfil-card">
        <div className="perfil-avatar">{user?.displayName?.charAt(0).toUpperCase() ?? '?'}</div>
        <div className="perfil-info">
          <span className="perfil-nome">{user?.displayName}</span>
          <span className="perfil-email">{user?.email}</span>
        </div>
        <button className="btn-sair" onClick={signOut}>Sair</button>
      </div>

      {/* Cartões de crédito */}
      <div className="section-card">
        <div className="section-header-row">
          <h3 className="section-titulo">Meus cartões</h3>
          {!exibirFormCartao && (
            <button className="btn-add-inline" onClick={() => { setEditandoCartao(null); setNovoCartao(CARTAO_VAZIO); setExibirFormCartao(true) }}>
              + Cartão
            </button>
          )}
        </div>
        
        <p className="section-desc">Gerencie seus cartões de crédito para categorizar despesas.</p>

        {cartoes.length > 0 && (
          <div className="cartoes-lista">
            {cartoes.map((c) => (
              <div key={c.id} className="cartao-row">
                <div className="cartao-icone"><CreditCard size={18} /></div>
                <div className="cartao-info">
                  <span className="cartao-nome">{c.nome}</span>
                  <span className="cartao-banco">
                    {c.banco}{c.bandeira ? ` · ${BANDEIRAS.find(b => b.value === c.bandeira)?.label ?? c.bandeira}` : ''}
                    {c.limite ? ` · R$ ${c.limite.toLocaleString('pt-BR')}` : ''}
                    {c.diaVencimento ? ` · vence dia ${c.diaVencimento}` : ''}
                  </span>
                </div>
                <button className="btn-editar-cartao" onClick={() => handleAbrirEditar(c)} title="Editar">
                  <Pencil size={13} />
                </button>
                <button className="btn-remover-cartao" onClick={() => handleRemoverCartao(c.id)} title="Remover">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {exibirFormCartao && (
          <form onSubmit={handleAddCartao} className="cartao-form-container animar-entrada">
            <span className="form-cartao-titulo">{editandoCartao ? `Editando: ${editandoCartao.nome}` : 'Novo cartão'}</span>
            <input
              type="text"
              placeholder="Nome do cartão (ex: Nubank Gold)"
              value={novoCartao.nome}
              onChange={(e) => setNovoCartao((s) => ({ ...s, nome: e.target.value }))}
              required
              className="convidar-input"
            />
            <div className="cartao-form-row">
              <select
                value={novoCartao.banco}
                onChange={(e) => setNovoCartao((s) => ({ ...s, banco: e.target.value }))}
                required
                className="cartao-select"
              >
                <option value="">Banco</option>
                {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                value={novoCartao.bandeira}
                onChange={(e) => setNovoCartao((s) => ({ ...s, bandeira: e.target.value as BandeiraCartao | '' }))}
                className="cartao-select"
              >
                <option value="">Bandeira</option>
                {BANDEIRAS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <input
              type="number"
              placeholder="Limite do cartão (R$)"
              min="0"
              step="100"
              value={novoCartao.limite}
              onChange={(e) => setNovoCartao((s) => ({ ...s, limite: e.target.value }))}
              className="convidar-input"
            />
            <div className="cartao-form-row">
              <input
                type="number"
                placeholder="Dia de vencimento (1–31)"
                min="1"
                max="31"
                value={novoCartao.diaVencimento}
                onChange={(e) => setNovoCartao((s) => ({ ...s, diaVencimento: e.target.value }))}
                className="convidar-input"
              />
              <input
                type="number"
                placeholder="Melhor dia de compra (1–31)"
                min="1"
                max="31"
                value={novoCartao.melhorDiaCompra}
                onChange={(e) => setNovoCartao((s) => ({ ...s, melhorDiaCompra: e.target.value }))}
                className="convidar-input"
              />
            </div>
            <div className="form-actions-inline">
              <button type="button" className="btn-cancelar-inline" onClick={handleCancelarCartao}>
                Cancelar
              </button>
              <button type="submit" className="btn-salvar-inline" disabled={salvandoCartao}>
                {salvandoCartao ? '...' : editandoCartao ? 'Salvar edição' : 'Salvar cartão'}
              </button>
            </div>
          </form>
        )}

        {feedbackCartao && (
          <p className={`feedback ${feedbackCartao.tipo}`}>{feedbackCartao.msg}</p>
        )}

      </div>

      {/* Convidar */}
      <div className="section-card">
        <h3 className="section-titulo">Adicionar amigo</h3>
        <p className="section-desc">Adicione pelo e-mail cadastrado no Grifo para ratear despesas juntos.</p>
        <form onSubmit={handleConvidar} className="convidar-form">
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="convidar-input"
          />
          <button type="submit" className="btn-convidar" disabled={enviando}>
            {enviando ? '...' : 'Convidar'}
          </button>
        </form>
        {feedback && (
          <p className={`feedback ${feedback.tipo}`}>{feedback.msg}</p>
        )}
      </div>

      {/* Abas pendentes / amigos */}
      {(pendentesRecebidas.length > 0 || pendentesEnviadas.length > 0 || amigos.length > 0) && (
        <div className="section-card">
          <div className="tabs">
            <button className={`tab-btn ${tab === 'amigos' ? 'active' : ''}`} onClick={() => setTab('amigos')}>
              Amigos {amigos.length > 0 && <span className="badge">{amigos.length}</span>}
            </button>
            <button className={`tab-btn ${tab === 'pendentes' ? 'active' : ''}`} onClick={() => setTab('pendentes')}>
              Pendentes
              {pendentesRecebidas.length > 0 && <span className="badge-alerta">{pendentesRecebidas.length}</span>}
            </button>
          </div>

          {tab === 'amigos' && (
            <div className="lista">
              {amigos.length === 0 ? (
                <p className="lista-vazia">Nenhum amigo ainda.</p>
              ) : amigos.map((a) => (
                <div key={a.id} className="amigo-row">
                  <div className="amigo-avatar">{a.nome.charAt(0).toUpperCase()}</div>
                  <div className="amigo-info">
                    <span className="amigo-nome">{a.nome}</span>
                    <span className="amigo-email">{a.email}</span>
                  </div>
                  <span className="amigo-badge"><CheckCircle2 size={14} /></span>
                </div>
              ))}
            </div>
          )}

          {tab === 'pendentes' && (
            <div className="lista">
              {pendentesRecebidas.length === 0 && pendentesEnviadas.length === 0 ? (
                <p className="lista-vazia">Nenhuma pendente.</p>
              ) : (
                <>
                  {pendentesRecebidas.map((a) => (
                    <div key={a.id} className="pendente-row">
                      <div className="amigo-avatar">{a.solicitanteNome.charAt(0).toUpperCase()}</div>
                      <div className="amigo-info">
                        <span className="amigo-nome">{a.solicitanteNome}</span>
                        <span className="amigo-email">quer se conectar</span>
                      </div>
                      <div className="pendente-acoes">
                        <button className="btn-aceitar" onClick={() => handleResponder(a, 'aceita')}><Check size={14} /></button>
                        <button className="btn-recusar" onClick={() => handleResponder(a, 'recusada')}><X size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {pendentesEnviadas.map((a) => (
                    <div key={a.id} className="pendente-row enviada">
                      <div className="amigo-avatar muted">{a.receptorEmail.charAt(0).toUpperCase()}</div>
                      <div className="amigo-info">
                        <span className="amigo-nome">{a.receptorNome ?? a.receptorEmail}</span>
                        <span className="amigo-email">aguardando resposta</span>
                      </div>
                      <span className="tag-aguardando">pendente</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .conta-page { display: flex; flex-direction: column; gap: 1rem; }

        .perfil-card {
          background: #fff; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1.25rem; display: flex; align-items: center; gap: 1rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .perfil-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(200,164,90,0.15); border: 2px solid rgba(200,164,90,0.3);
          color: #C8A45A; font-size: 1.2rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .perfil-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .perfil-nome { color: #2d3436; font-size: 0.95rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .perfil-email { color: #95A5A6; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .btn-sair {
          background: transparent; border: 1px solid #E0E0E0; color: #95A5A6;
          border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.8rem;
          cursor: pointer; transition: all 0.15s; font-family: inherit; flex-shrink: 0;
        }
        .btn-sair:hover { border-color: #e05c5c; color: #e05c5c; }

        .section-card {
          background: #fff; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .section-titulo { color: #2d3436; font-size: 0.9rem; font-weight: 700; }
        .section-desc { color: #95A5A6; font-size: 0.82rem; line-height: 1.5; margin-top: -0.25rem; }

        .convidar-form { display: flex; gap: 0.5rem; }
        .convidar-input {
          flex: 1; background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 10px;
          color: #2d3436; padding: 0.7rem 0.9rem; font-size: 0.88rem;
          outline: none; transition: border-color 0.2s; font-family: inherit;
        }
        .convidar-input:focus { border-color: #C8A45A; background: #fff; }
        .btn-convidar {
          background: #C8A45A; color: #fff; border: none; border-radius: 10px;
          padding: 0.7rem 1.1rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; transition: opacity 0.2s; font-family: inherit; white-space: nowrap;
        }
        .btn-convidar:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-convidar:not(:disabled):hover { opacity: 0.9; }

        .feedback { font-size: 0.82rem; padding: 0.5rem 0.75rem; border-radius: 8px; }
        .feedback.ok { background: rgba(92,184,92,0.1); color: #27ae60; }
        .feedback.erro { background: rgba(224,92,92,0.1); color: #e05c5c; }

        .tabs { display: flex; gap: 0.25rem; background: #F1F2F6; padding: 0.25rem; border-radius: 10px; }
        .tab-btn {
          flex: 1; background: transparent; border: none; color: #7f8c8d;
          border-radius: 7px; padding: 0.5rem; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        }
        .tab-btn.active { background: #fff; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .badge {
          background: rgba(200,164,90,0.15); color: #C8A45A;
          border-radius: 10px; padding: 0.1rem 0.45rem; font-size: 0.7rem;
        }
        .badge-alerta {
          background: #e05c5c; color: #fff;
          border-radius: 10px; padding: 0.1rem 0.45rem; font-size: 0.7rem;
        }

        .lista { display: flex; flex-direction: column; gap: 0.5rem; }
        .lista-vazia { color: #BDC3C7; font-size: 0.85rem; text-align: center; padding: 1rem 0; }

        .amigo-row, .pendente-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0.75rem; background: #F8F9FA; border-radius: 10px;
        }
        .pendente-row.enviada { opacity: 0.7; }
        .amigo-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(200,164,90,0.15); color: #C8A45A;
          font-size: 0.9rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .amigo-avatar.muted { background: #E0E0E0; color: #95A5A6; }
        .amigo-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
        .amigo-nome { color: #2d3436; font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .amigo-email { color: #95A5A6; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .amigo-badge { color: #27ae60; font-size: 0.85rem; }

        .pendente-acoes { display: flex; gap: 0.4rem; flex-shrink: 0; }
        .btn-aceitar, .btn-recusar {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          font-size: 0.85rem; cursor: pointer; transition: all 0.15s; font-family: inherit;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-aceitar { background: rgba(92,184,92,0.12); color: #27ae60; }
        .btn-aceitar:hover { background: rgba(92,184,92,0.25); }
        .btn-recusar { background: rgba(224,92,92,0.1); color: #e05c5c; }
        .btn-recusar:hover { background: rgba(224,92,92,0.2); }
        .tag-aguardando {
          font-size: 0.7rem; color: #95A5A6; background: #E0E0E0;
          border-radius: 6px; padding: 0.2rem 0.6rem; flex-shrink: 0;
        }

        .cartoes-lista { display: flex; flex-direction: column; gap: 0.5rem; }
        .cartao-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0.75rem; background: #F8F9FA; border-radius: 10px;
        }
        .cartao-icone { display: flex; align-items: center; color: #95A5A6; flex-shrink: 0; }
        .cartao-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
        .cartao-nome { color: #2d3436; font-size: 0.85rem; font-weight: 600; }
        .cartao-banco { color: #95A5A6; font-size: 0.75rem; }
        .btn-editar-cartao {
          background: transparent; border: none; color: #BDC3C7;
          cursor: pointer; padding: 0.3rem; border-radius: 6px;
          display: flex; align-items: center; transition: color 0.15s; flex-shrink: 0;
        }
        .btn-editar-cartao:hover { color: #C8A45A; }
        .btn-remover-cartao {
          background: transparent; border: none; color: #BDC3C7;
          cursor: pointer; padding: 0.3rem; border-radius: 6px;
          display: flex; align-items: center; transition: color 0.15s;
          flex-shrink: 0;
        }
        .btn-remover-cartao:hover { color: #e05c5c; }
        .form-cartao-titulo { font-size: 0.75rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.04em; }

        .cartao-form { display: flex; flex-direction: column; gap: 0.5rem; }
        .cartao-form-row { display: flex; gap: 0.5rem; }
        @media (max-width: 480px) {
          .cartao-form-row { flex-direction: column; }
          .convidar-form { flex-direction: column; }
          .btn-convidar { width: 100%; }
        }
        .cartao-select {
          background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 10px;
          color: #2d3436; padding: 0.7rem 0.9rem; font-size: 0.88rem;
          outline: none; transition: border-color 0.2s; font-family: inherit;
        }
          .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-add-inline {
    background: rgba(200, 164, 90, 0.1);
    color: #C8A45A;
    border: 1px solid rgba(200, 164, 90, 0.2);
    border-radius: 8px;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-inline:hover {
    background: #C8A45A;
    color: #fff;
  }

  .cartao-form-container {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem;
    background: #F1F2F6;
    border-radius: 12px;
    margin-top: 0.5rem;
  }

  .form-actions-inline {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }

  .btn-salvar-inline {
    flex: 1;
    background: #C8A45A;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.6rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-cancelar-inline {
    flex: 1;
    background: transparent;
    border: 1px solid #E0E0E0;
    color: #95A5A6;
    border-radius: 8px;
    padding: 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .animar-entrada {
    animation: fadeInDown 0.3s ease-out;
  }

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
        .cartao-select:focus { border-color: #C8A45A; background: #fff; }
      `}</style>

    </div>
  )
}
