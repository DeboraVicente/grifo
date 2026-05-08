import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useReceitas } from '../hooks/useReceitas'
import ReceitaForm from '../components/relatorios/ReceitaForm'
import Modal from '../components/ui/Modal'
import type { Receita } from '../types'
import type { ReceitaForm as ReceitaFormType } from '../hooks/useReceitas'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const CATEGORIA_LABEL: Record<string, string> = {
  salario: 'Salário', freelance: 'Freelance', investimento: 'Investimento', outros: 'Outros',
}

export default function ReceitasPage() {
  const { user } = useAuthContext()
  const { receitas, criar, editar, remover } = useReceitas(user?.uid)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Receita | null>(null)

  const handleSalvar = async (form: ReceitaFormType) => {
    if (editando) await editar(editando.id, form)
    else await criar(form)
    setModal(false)
    setEditando(null)
  }
  const handleEditar = (r: Receita) => { setEditando(r); setModal(true) }
  const handleRemover = async (id: string) => {
    if (!confirm('Remover esta receita?')) return
    await remover(id)
  }

  const totalRecorrente = receitas.filter(r => r.recorrente).reduce((s, r) => s + r.valor, 0)
  const totalMes = receitas.filter(r => !r.recorrente).reduce((s, r) => s + r.valor, 0)

  return (
    <div className="receitas-page">
      <div className="rec-header">
        <div>
          <h1 className="rec-titulo">Receitas</h1>
          <p className="rec-subtitulo">Gerencie suas entradas de dinheiro</p>
        </div>
        <button className="btn-nova-receita" onClick={() => { setEditando(null); setModal(true) }}>
          + Receita
        </button>
      </div>

      {receitas.length > 0 && (
        <div className="rec-resumo">
          <div className="rec-resumo-item">
            <span className="rec-resumo-label">Recorrente mensal</span>
            <span className="rec-resumo-valor">{fmt(totalRecorrente)}</span>
          </div>
          {totalMes > 0 && (
            <div className="rec-resumo-item">
              <span className="rec-resumo-label">Avulso registrado</span>
              <span className="rec-resumo-valor rec-avulso">{fmt(totalMes)}</span>
            </div>
          )}
        </div>
      )}

      {receitas.length === 0 ? (
        <div className="rec-vazio">
          <p>Nenhuma receita registrada.</p>
          <button className="btn-add-vazio" onClick={() => setModal(true)}>
            Adicionar primeira receita
          </button>
        </div>
      ) : (
        <div className="rec-lista">
          {receitas.map((r) => (
            <div key={r.id} className="rec-item">
              <div className="rec-item-info">
                <span className="rec-item-nome">{r.nome}</span>
                <span className="rec-item-meta">
                  {CATEGORIA_LABEL[r.categoria] ?? r.categoria}
                  {r.recorrente ? ' · Recorrente' : ` · ${new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                </span>
              </div>
              <div className="rec-item-right">
                <span className="rec-item-valor">{fmt(r.valor)}</span>
                <div className="rec-item-acoes">
                  <button onClick={() => handleEditar(r)}><Pencil size={13} /></button>
                  <button className="rec-del" onClick={() => handleRemover(r.id)}><X size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          titulo={editando ? 'Editar receita' : 'Nova receita'}
          onFechar={() => { setModal(false); setEditando(null) }}
        >
          <ReceitaForm
            inicial={editando ?? undefined}
            onSalvar={handleSalvar}
            onCancelar={() => { setModal(false); setEditando(null) }}
          />
        </Modal>
      )}

      <style>{`
        .receitas-page { display: flex; flex-direction: column; gap: 1.25rem; }

        .rec-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .rec-titulo { font-size: 1.4rem; font-weight: 900; color: #2D3436; }
        .rec-subtitulo { font-size: 0.8rem; color: #95A5A6; margin-top: 2px; }
        .btn-nova-receita {
          background: #C8A45A; color: #fff; border: none; border-radius: 10px;
          padding: 0.6rem 1rem; font-size: 0.82rem; font-weight: 700;
          cursor: pointer; white-space: nowrap; font-family: inherit;
        }

        .rec-resumo {
          display: flex; gap: 1rem;
          background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 14px; padding: 1rem 1.25rem;
        }
        .rec-resumo-item { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
        .rec-resumo-label { color: #95A5A6; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .rec-resumo-valor { color: #2ECC71; font-size: 1.2rem; font-weight: 800; }
        .rec-avulso { color: #C8A45A; }

        .rec-vazio { text-align: center; padding: 4rem 1rem; color: #BDC3C7; }
        .btn-add-vazio {
          background: #fff; border: 1px dashed #D1D8E0; color: #95A5A6;
          border-radius: 10px; padding: 0.75rem 1.5rem; font-size: 0.85rem;
          cursor: pointer; margin-top: 1rem; font-family: inherit;
        }

        .rec-lista { display: flex; flex-direction: column; gap: 0.5rem; }
        .rec-item {
          display: flex; align-items: center; gap: 0.75rem;
          background: #fff; border: 1px solid #F1F2F6;
          border-radius: 12px; padding: 0.85rem 1rem;
        }
        .rec-item-info { flex: 1; min-width: 0; }
        .rec-item-nome { display: block; font-size: 0.9rem; font-weight: 700; color: #2D3436; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rec-item-meta { font-size: 0.72rem; color: #95A5A6; }
        .rec-item-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .rec-item-valor { font-size: 0.95rem; font-weight: 800; color: #2ECC71; }
        .rec-item-acoes { display: flex; gap: 0.35rem; }
        .rec-item-acoes button {
          background: #F1F2F6; border: none; border-radius: 6px;
          padding: 0.3rem 0.5rem; cursor: pointer; color: #636e72;
          display: flex; align-items: center; font-family: inherit;
        }
        .rec-del { color: #E74C3C !important; }

        @media (max-width: 480px) {
          .rec-header { flex-direction: column; gap: 0.75rem; }
          .btn-nova-receita { width: 100%; text-align: center; }
          .rec-resumo { flex-direction: column; gap: 0.75rem; }
        }
      `}</style>
    </div>
  )
}
