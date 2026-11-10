import { useState } from 'react'
import { Trash2, CreditCard, Pencil, Landmark } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useCartoes } from '../hooks/useCartoes'
import { useContas } from '../hooks/useContas'
import type { CartaoCredito, CartaoCreditoForm, Conta, ContaForm as ContaFormType } from '../types'
import FamiliaSection from '../components/familia/FamiliaSection'
import GerenciarConta, { BotaoGerenciarConta } from '../components/conta/GerenciarConta'
import ContaForm from '../components/conta/ContaForm'
import CartaoForm from '../components/conta/CartaoForm'
import { TIPOS_CONTA, BANDEIRAS } from '../components/conta/opcoes'
import Modal from '../components/ui/Modal'
import type { useFamilia } from '../hooks/useFamilia'

interface ContaPageProps {
  familiaApi?: ReturnType<typeof useFamilia>
  familiaId?: string
  meuUid?: string
}

export default function ContaPage({ familiaApi, familiaId, meuUid }: ContaPageProps) {
  const { user, signOut } = useAuthContext()
  const donoDados = familiaId ?? user?.uid
  const { cartoes, criar: criarCartao, editar: editarCartao, remover: removerCartao } = useCartoes(user?.uid, donoDados)
  const { contas, criar: criarConta, editar: editarConta, remover: removerConta } = useContas(user?.uid, donoDados)

  // Formulários de conta e cartão abrem em modal (criar: sem item; editar: com item)
  type ModalConta = { tipo: 'conta'; item?: Conta } | { tipo: 'cartao'; item?: CartaoCredito } | null
  const [modal, setModal] = useState<ModalConta>(null)
  const fecharModal = () => setModal(null)

  // — contas —
  const [feedbackConta, setFeedbackConta] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const handleSalvarConta = async (form: ContaFormType) => {
    if (modal?.tipo === 'conta' && modal.item) await editarConta(modal.item.id, form)
    else await criarConta(form)
    fecharModal()
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
  const [feedbackCartao, setFeedbackCartao] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const handleSalvarCartao = async (form: CartaoCreditoForm) => {
    if (modal?.tipo === 'cartao' && modal.item) await editarCartao(modal.item.id, form)
    else await criarCartao(form)
    fecharModal()
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

  const contaNomeById = (id?: string) => contas.find(c => c.id === id)?.nome

  // Tela "Gerenciar conta" (senha e exclusão) abre no lugar do conteúdo da página
  const [gerenciando, setGerenciando] = useState(false)

  return (
    <div className="conta-page">
      {gerenciando && user ? (
        <GerenciarConta user={user} onVoltar={() => setGerenciando(false)} />
      ) : (<>
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
            <h3 className="section-titulo">Contas Bancarias</h3>
            <p className="section-desc">Contas bancárias e carteiras para associar às despesas.</p>
          </div>
          <button className="btn-add-inline" onClick={() => setModal({ tipo: 'conta' })}>
            + Conta
          </button>
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
                <button className="btn-editar-item" onClick={() => setModal({ tipo: 'conta', item: c })} aria-label={`Editar ${c.nome}`}><Pencil size={13} /></button>
                <button className="btn-remover-item" onClick={() => handleRemoverConta(c.id)} aria-label={`Excluir ${c.nome}`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
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
          <button className="btn-add-inline" onClick={() => setModal({ tipo: 'cartao' })}>
            + Cartão
          </button>
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
                <button className="btn-editar-item" onClick={() => setModal({ tipo: 'cartao', item: c })} aria-label={`Editar ${c.nome}`}><Pencil size={13} /></button>
                <button className="btn-remover-item" onClick={() => handleRemoverCartao(c.id)} aria-label={`Excluir ${c.nome}`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {feedbackCartao && <p className={`feedback ${feedbackCartao.tipo}`}>{feedbackCartao.msg}</p>}
      </div>

      {/* Família */}
      {familiaApi && meuUid && familiaApi.familia && (
        <div className="section-card">
          <FamiliaSection
            ownerUid={familiaApi.familia.ownerUid}
            meuUid={meuUid}
            membros={familiaApi.membrosDetalhados}
            conviteExpira={familiaApi.familia.conviteExpira}
            onGerarConvite={familiaApi.gerarConvite}
            onSair={familiaApi.sairDaFamilia}
            onRemover={familiaApi.removerMembro}
          />
        </div>
      )}

      <BotaoGerenciarConta onAbrir={() => { setGerenciando(true); window.scrollTo({ top: 0 }) }} />

      {modal?.tipo === 'conta' && (
        <Modal titulo={modal.item ? 'Editar conta' : 'Nova conta'} onFechar={fecharModal}>
          <ContaForm inicial={modal.item}
            nomesExistentes={contas.filter((c) => c.id !== modal.item?.id).map((c) => c.nome)}
            onSalvar={handleSalvarConta} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal?.tipo === 'cartao' && (
        <Modal titulo={modal.item ? 'Editar cartão' : 'Novo cartão'} onFechar={fecharModal}>
          <CartaoForm inicial={modal.item} contas={contas} onSalvar={handleSalvarCartao} onCancelar={fecharModal} />
        </Modal>
      )}

      </>)}

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

        .feedback { font-size: 0.82rem; padding: 0.5rem 0.75rem; border-radius: 8px; }
        .feedback.ok { background: rgba(92,184,92,0.1); color: #27ae60; }
        .feedback.erro { background: rgba(224,92,92,0.1); color: #e05c5c; }

      `}</style>
    </div>
  )
}
