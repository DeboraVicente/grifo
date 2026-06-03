import { useState } from 'react'
import { Check, X, CheckCircle2, Trash2, CreditCard, Pencil, Landmark } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useAmizades } from '../hooks/useAmizades'
import { useCartoes } from '../hooks/useCartoes'
import { useContas } from '../hooks/useContas'
import type { BandeiraCartao, CartaoCredito, Conta, TipoConta } from '../types'

const BANDEIRAS: { value: BandeiraCartao; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'Amex' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outros', label: 'Outros' },
]

const TIPOS_CONTA: { value: TipoConta; label: string }[] = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'carteira', label: 'Carteira (dinheiro)' },
]


export default function ContaPage() {
  const { user, signOut } = useAuthContext()
  const { amigos, pendentesRecebidas, amizades, enviarSolicitacao, responderSolicitacao } =
    useAmizades(user?.uid, user?.email ?? '', user?.displayName ?? '')
  const { cartoes, criar: criarCartao, editar: editarCartao, remover: removerCartao } = useCartoes(user?.uid)
  const { contas, criar: criarConta, editar: editarConta, remover: removerConta } = useContas(user?.uid)

  // — amigos —
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [tabAmigos, setTabAmigos] = useState<'amigos' | 'pendentes'>('amigos')

  // — contas —
  const CONTA_VAZIA = { nome: '', tipo: 'digital' as TipoConta }
  const [novaConta, setNovaConta] = useState(CONTA_VAZIA)
  const [editandoConta, setEditandoConta] = useState<Conta | null>(null)
  const [exibirFormConta, setExibirFormConta] = useState(false)
  const [salvandoConta, setSalvandoConta] = useState(false)
  const [feedbackConta, setFeedbackConta] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const handleAbrirEditarConta = (c: Conta) => {
    setEditandoConta(c)
    setNovaConta({ nome: c.nome, tipo: c.tipo })
    setExibirFormConta(true)
  }
  const handleCancelarConta = () => { setExibirFormConta(false); setEditandoConta(null); setNovaConta(CONTA_VAZIA) }
  const handleSalvarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaConta.nome) return
    const nomeNormalizado = novaConta.nome.trim().toLowerCase()
    const duplicada = contas.some((c) =>
      c.nome.trim().toLowerCase() === nomeNormalizado && c.id !== editandoConta?.id
    )
    if (duplicada) {
      setFeedbackConta({ tipo: 'erro', msg: `Já existe uma conta com o nome "${novaConta.nome}".` })
      return
    }
    setFeedbackConta(null)
    setSalvandoConta(true)
    if (editandoConta) {
      await editarConta(editandoConta.id, { ...novaConta, nome: novaConta.nome.trim() })
    } else {
      await criarConta({ ...novaConta, nome: novaConta.nome.trim() })
    }
    setNovaConta(CONTA_VAZIA); setSalvandoConta(false); setExibirFormConta(false); setEditandoConta(null)
  }
  const handleRemoverConta = async (id: string) => {
    setFeedbackConta(null)
    const resultado = await removerConta(id)
    if (resultado === 'vinculada') {
      setFeedbackConta({ tipo: 'erro', msg: 'Esta conta está vinculada a despesas ou cartões.' })
    } else if (resultado === 'erro') {
      setFeedbackConta({ tipo: 'erro', msg: 'Erro ao excluir. Tente novamente.' })
    }
  }

  // — cartões —
  const CARTAO_VAZIO = { nome: '', bandeira: '' as BandeiraCartao | '', limite: '', diaVencimento: '', melhorDiaCompra: '', contaId: '' }
  const [novoCartao, setNovoCartao] = useState(CARTAO_VAZIO)
  const [editandoCartao, setEditandoCartao] = useState<CartaoCredito | null>(null)
  const [exibirFormCartao, setExibirFormCartao] = useState(false)
  const [salvandoCartao, setSalvandoCartao] = useState(false)
  const [feedbackCartao, setFeedbackCartao] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const handleAbrirEditarCartao = (c: CartaoCredito) => {
    setEditandoCartao(c)
    setNovoCartao({
      nome: c.nome, bandeira: c.bandeira ?? '',
      limite: c.limite ? String(c.limite) : '',
      diaVencimento: c.diaVencimento ? String(c.diaVencimento) : '',
      melhorDiaCompra: c.melhorDiaCompra ? String(c.melhorDiaCompra) : '',
      contaId: c.contaId ?? '',
    })
    setExibirFormCartao(true)
  }
  const handleCancelarCartao = () => { setExibirFormCartao(false); setEditandoCartao(null); setNovoCartao(CARTAO_VAZIO) }
  const handleSalvarCartao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCartao.nome) return
    setSalvandoCartao(true)
    const form = {
      nome: novoCartao.nome,
      bandeira: novoCartao.bandeira || undefined,
      limite: novoCartao.limite ? parseFloat(novoCartao.limite) : undefined,
      diaVencimento: novoCartao.diaVencimento ? parseInt(novoCartao.diaVencimento) : undefined,
      melhorDiaCompra: novoCartao.melhorDiaCompra ? parseInt(novoCartao.melhorDiaCompra) : undefined,
      contaId: novoCartao.contaId || undefined,
    }
    if (editandoCartao) { await editarCartao(editandoCartao.id, form) } else { await criarCartao(form) }
    setNovoCartao(CARTAO_VAZIO); setSalvandoCartao(false); setExibirFormCartao(false); setEditandoCartao(null)
  }
  const handleRemoverCartao = async (id: string) => {
    setFeedbackCartao(null)
    const resultado = await removerCartao(id)
    if (resultado === 'vinculado') {
      setFeedbackCartao({ tipo: 'erro', msg: 'Este cartão está vinculado a despesas e não pode ser excluído.' })
    } else if (resultado === 'erro') {
      setFeedbackCartao({ tipo: 'erro', msg: 'Erro ao excluir. Tente novamente.' })
    }
  }

  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setFeedback(null)
    const resultado = await enviarSolicitacao(email)
    const msgs: Record<string, string> = {
      ok: 'Solicitação enviada!',
      nao_encontrado: 'Usuário não encontrado.',
      ja_existe: 'Já existe uma conexão com este usuário.',
      mesmo_usuario: 'Você não pode se adicionar.',
      erro: 'Ocorreu um erro. Tente novamente.',
    }
    setFeedback({ tipo: resultado === 'ok' ? 'ok' : 'erro', msg: msgs[resultado] })
    if (resultado === 'ok') setEmail('')
    setEnviando(false)
  }

  const pendentesEnviadas = amizades.filter(a => a.solicitanteId === user?.uid && a.status === 'pendente')

  const contaNomeById = (id?: string) => contas.find(c => c.id === id)?.nome

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

      {/* Contas bancárias */}
      <div className="section-card">
        <div className="section-header-row">
          <div>
            <h3 className="section-titulo">Minhas contas</h3>
            <p className="section-desc">Contas bancárias e carteiras para associar às despesas.</p>
          </div>
          {!exibirFormConta && (
            <button className="btn-add-inline" onClick={() => { setEditandoConta(null); setNovaConta(CONTA_VAZIA); setExibirFormConta(true) }}>
              + Conta
            </button>
          )}
        </div>

        {contas.length > 0 && (
          <div className="itens-lista">
            {contas.map((c) => (
              <div key={c.id} className="item-row">
                <div className="item-icone"><Landmark size={16} color="#95A5A6" /></div>
                <div className="item-info">
                  <span className="item-nome">{c.nome}</span>
                  <span className="item-sub">{TIPOS_CONTA.find(t => t.value === c.tipo)?.label ?? c.tipo}</span>
                </div>
                <button className="btn-editar-item" onClick={() => handleAbrirEditarConta(c)}><Pencil size={13} /></button>
                <button className="btn-remover-item" onClick={() => handleRemoverConta(c.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {exibirFormConta && (
          <form onSubmit={handleSalvarConta} className="form-container animar-entrada">
            <span className="form-titulo">{editandoConta ? `Editando: ${editandoConta.nome}` : 'Nova conta'}</span>
            <div className="form-row">
              <input className="field-input" type="text" placeholder="Nome (ex: Nubank, Carteira)"
                value={novaConta.nome} onChange={(e) => setNovaConta(s => ({ ...s, nome: e.target.value }))} required />
              <select className="field-select" value={novaConta.tipo}
                onChange={(e) => setNovaConta(s => ({ ...s, tipo: e.target.value as TipoConta }))}>
                {TIPOS_CONTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-actions-inline">
              <button type="button" className="btn-cancelar-inline" onClick={handleCancelarConta}>Cancelar</button>
              <button type="submit" className="btn-salvar-inline" disabled={salvandoConta}>
                {salvandoConta ? '...' : editandoConta ? 'Salvar' : 'Criar conta'}
              </button>
            </div>
          </form>
        )}

        {feedbackConta && <p className={`feedback ${feedbackConta.tipo}`}>{feedbackConta.msg}</p>}
      </div>

      {/* Cartões */}
      <div className="section-card">
        <div className="section-header-row">
          <div>
            <h3 className="section-titulo">Meus cartões</h3>
            <p className="section-desc">Cartões de crédito, opcionalmente vinculados a uma conta.</p>
          </div>
          {!exibirFormCartao && (
            <button className="btn-add-inline" onClick={() => { setEditandoCartao(null); setNovoCartao(CARTAO_VAZIO); setExibirFormCartao(true) }}>
              + Cartão
            </button>
          )}
        </div>

        {cartoes.length > 0 && (
          <div className="itens-lista">
            {cartoes.map((c) => (
              <div key={c.id} className="item-row">
                <div className="item-icone"><CreditCard size={16} color="#95A5A6" /></div>
                <div className="item-info">
                  <span className="item-nome">{c.nome}</span>
                  <span className="item-sub">
                    {c.bandeira ? `${BANDEIRAS.find(b => b.value === c.bandeira)?.label ?? c.bandeira}` : 'Sem bandeira'}
                    {c.limite ? ` · R$ ${c.limite.toLocaleString('pt-BR')}` : ''}
                    {c.diaVencimento ? ` · vence dia ${c.diaVencimento}` : ''}
                    {c.contaId ? ` · ${contaNomeById(c.contaId)}` : ''}
                  </span>
                </div>
                <button className="btn-editar-item" onClick={() => handleAbrirEditarCartao(c)}><Pencil size={13} /></button>
                <button className="btn-remover-item" onClick={() => handleRemoverCartao(c.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {exibirFormCartao && (
          <form onSubmit={handleSalvarCartao} className="form-container animar-entrada">
            <span className="form-titulo">{editandoCartao ? `Editando: ${editandoCartao.nome}` : 'Novo cartão'}</span>
            <input className="field-input" type="text" placeholder="Nome do cartão (ex: Nubank Gold)"
              value={novoCartao.nome} onChange={(e) => setNovoCartao(s => ({ ...s, nome: e.target.value }))} required />
            <div className="form-row">
              <select className="field-select" value={novoCartao.bandeira}
                onChange={(e) => setNovoCartao(s => ({ ...s, bandeira: e.target.value as BandeiraCartao | '' }))}>
                <option value="">Bandeira</option>
                {BANDEIRAS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
              <select className="field-select" value={novoCartao.contaId}
                onChange={(e) => setNovoCartao(s => ({ ...s, contaId: e.target.value }))}>
                <option value="">Conta vinculada (opcional)</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <input className="field-input" type="number" placeholder="Limite (R$)" min="0" step="0.01"
              value={novoCartao.limite} onChange={(e) => setNovoCartao(s => ({ ...s, limite: e.target.value }))} />
            <div className="form-row">
              <input className="field-input" type="number" placeholder="Dia vencimento (1–31)" min="1" max="31"
                value={novoCartao.diaVencimento} onChange={(e) => setNovoCartao(s => ({ ...s, diaVencimento: e.target.value }))} />
              <input className="field-input" type="number" placeholder="Melhor dia compra (1–31)" min="1" max="31"
                value={novoCartao.melhorDiaCompra} onChange={(e) => setNovoCartao(s => ({ ...s, melhorDiaCompra: e.target.value }))} />
            </div>
            <div className="form-actions-inline">
              <button type="button" className="btn-cancelar-inline" onClick={handleCancelarCartao}>Cancelar</button>
              <button type="submit" className="btn-salvar-inline" disabled={salvandoCartao}>
                {salvandoCartao ? '...' : editandoCartao ? 'Salvar' : 'Criar cartão'}
              </button>
            </div>
          </form>
        )}

        {feedbackCartao && <p className={`feedback ${feedbackCartao.tipo}`}>{feedbackCartao.msg}</p>}
      </div>

      {/* Amigos */}
      <div className="section-card">
        <h3 className="section-titulo">Adicionar amigo</h3>
        <p className="section-desc">Adicione pelo e-mail cadastrado no Grifo.</p>
        <form onSubmit={handleConvidar} className="convidar-form">
          <input className="field-input" type="email" placeholder="email@exemplo.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn-convidar" disabled={enviando}>{enviando ? '...' : 'Convidar'}</button>
        </form>
        {feedback && <p className={`feedback ${feedback.tipo}`}>{feedback.msg}</p>}
      </div>

      {(pendentesRecebidas.length > 0 || pendentesEnviadas.length > 0 || amigos.length > 0) && (
        <div className="section-card">
          <div className="tabs">
            <button className={`tab-btn ${tabAmigos === 'amigos' ? 'active' : ''}`} onClick={() => setTabAmigos('amigos')}>
              Amigos {amigos.length > 0 && <span className="badge">{amigos.length}</span>}
            </button>
            <button className={`tab-btn ${tabAmigos === 'pendentes' ? 'active' : ''}`} onClick={() => setTabAmigos('pendentes')}>
              Pendentes {pendentesRecebidas.length > 0 && <span className="badge-alerta">{pendentesRecebidas.length}</span>}
            </button>
          </div>

          {tabAmigos === 'amigos' && (
            <div className="lista">
              {amigos.length === 0 ? <p className="lista-vazia">Nenhum amigo ainda.</p> : amigos.map((a) => (
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

          {tabAmigos === 'pendentes' && (
            <div className="lista">
              {pendentesRecebidas.length === 0 && pendentesEnviadas.length === 0
                ? <p className="lista-vazia">Nenhuma pendente.</p>
                : <>
                  {pendentesRecebidas.map((a) => (
                    <div key={a.id} className="pendente-row">
                      <div className="amigo-avatar">{a.solicitanteNome.charAt(0).toUpperCase()}</div>
                      <div className="amigo-info">
                        <span className="amigo-nome">{a.solicitanteNome}</span>
                        <span className="amigo-email">quer se conectar</span>
                      </div>
                      <div className="pendente-acoes">
                        <button className="btn-aceitar" onClick={() => responderSolicitacao(a.id, 'aceita')}><Check size={14} /></button>
                        <button className="btn-recusar" onClick={() => responderSolicitacao(a.id, 'recusada')}><X size={14} /></button>
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
              }
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
        .section-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .section-titulo { color: #2d3436; font-size: 0.9rem; font-weight: 700; }
        .section-desc { color: #95A5A6; font-size: 0.82rem; line-height: 1.5; margin-top: 0.1rem; }

        .btn-add-inline {
          background: rgba(200,164,90,0.1); color: #C8A45A;
          border: 1px solid rgba(200,164,90,0.2); border-radius: 8px;
          padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
          font-family: inherit;
        }
        .btn-add-inline:hover { background: #C8A45A; color: #fff; }

        .itens-lista { display: flex; flex-direction: column; gap: 0.4rem; }
        .item-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0.75rem; background: #F8F9FA; border-radius: 10px;
        }
        .item-icone { display: flex; align-items: center; flex-shrink: 0; }
        .item-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
        .item-nome { color: #2d3436; font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-sub { color: #95A5A6; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .btn-editar-item, .btn-remover-item {
          background: transparent; border: none; cursor: pointer; padding: 0.3rem;
          border-radius: 6px; display: flex; align-items: center; transition: color 0.15s; flex-shrink: 0;
          color: #BDC3C7;
        }
        .btn-editar-item:hover { color: #C8A45A; }
        .btn-remover-item:hover { color: #e05c5c; }

        .form-container {
          display: flex; flex-direction: column; gap: 0.6rem;
          padding: 1rem; background: #F1F2F6; border-radius: 12px; margin-top: 0.25rem;
        }
        .form-titulo { font-size: 0.72rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.04em; }
        .form-row { display: flex; gap: 0.5rem; }
        @media (max-width: 480px) { .form-row { flex-direction: column; } }

        .field-input, .field-select {
          flex: 1; background: #fff; border: 1px solid #E0E0E0; border-radius: 10px;
          color: #2d3436; padding: 0.65rem 0.9rem; font-size: 0.88rem;
          outline: none; transition: border-color 0.2s; font-family: inherit;
          width: 100%;
        }
        .field-input:focus, .field-select:focus { border-color: #C8A45A; }

        .form-actions-inline { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
        .btn-salvar-inline {
          flex: 1; background: #C8A45A; color: #fff; border: none;
          border-radius: 8px; padding: 0.6rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }
        .btn-salvar-inline:disabled { opacity: 0.6; }
        .btn-cancelar-inline {
          flex: 1; background: transparent; border: 1px solid #E0E0E0; color: #95A5A6;
          border-radius: 8px; padding: 0.6rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }

        .convidar-form { display: flex; gap: 0.5rem; }
        @media (max-width: 480px) { .convidar-form { flex-direction: column; } }
        .btn-convidar {
          background: #C8A45A; color: #fff; border: none; border-radius: 10px;
          padding: 0.7rem 1.1rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; font-family: inherit; white-space: nowrap;
        }
        .btn-convidar:disabled { opacity: 0.5; }

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
        .badge { background: rgba(200,164,90,0.15); color: #C8A45A; border-radius: 10px; padding: 0.1rem 0.45rem; font-size: 0.7rem; }
        .badge-alerta { background: #e05c5c; color: #fff; border-radius: 10px; padding: 0.1rem 0.45rem; font-size: 0.7rem; }

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
        .amigo-nome { color: #2d3436; font-size: 0.85rem; font-weight: 600; }
        .amigo-email { color: #95A5A6; font-size: 0.75rem; }
        .amigo-badge { color: #27ae60; }

        .pendente-acoes { display: flex; gap: 0.4rem; flex-shrink: 0; }
        .btn-aceitar, .btn-recusar {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
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

        .animar-entrada { animation: fadeInDown 0.25s ease-out; }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
