import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown, FolderOpen, CalendarDays, Users, TrendingUp, Lightbulb, LineChart, X,
} from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useRateioRecebido } from '../hooks/useRateio'
import { useReceitas } from '../hooks/useReceitas'
import { useAuthContext } from '../lib/AuthContext'
import Modal from '../components/ui/Modal'
import ReceitaForm from '../components/relatorios/ReceitaForm'
import FluxoCaixaMensal from '../components/relatorios/FluxoCaixaMensal'
import RelatorioCategoria from '../components/relatorios/RelatorioCategoria'
import ControleParcelamentos from '../components/relatorios/ControleParcelamentos'
import ControleRateio from '../components/relatorios/ControleRateio'
import ForecastGastos from '../components/relatorios/ForecastGastos'
import QuantoPossoGastar from '../components/relatorios/QuantoPossoGastar'
import EvolucaoFinanceira from '../components/relatorios/EvolucaoFinanceira'
import type { Receita } from '../types'
import type { ReceitaForm as ReceitaFormType } from '../hooks/useReceitas'

type RelatorioTipo =
  | 'fluxo'
  | 'categorias'
  | 'parcelamentos'
  | 'rateios'
  | 'forecast'
  | 'saldo-livre'
  | 'evolucao'

const ABAS: { id: RelatorioTipo; label: string; Icon: LucideIcon }[] = [
  { id: 'fluxo', label: 'Fluxo Mensal', Icon: ArrowUpDown },
  { id: 'categorias', label: 'Categorias', Icon: FolderOpen },
  { id: 'parcelamentos', label: 'Parcelamentos', Icon: CalendarDays },
  { id: 'rateios', label: 'Rateios', Icon: Users },
  { id: 'forecast', label: 'Previsão', Icon: TrendingUp },
  { id: 'saldo-livre', label: 'Saldo Livre', Icon: Lightbulb },
  { id: 'evolucao', label: 'Evolução', Icon: LineChart },
]

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function RelatoriosPage() {
  const { user } = useAuthContext()
  const { despesas } = useDespesas(user?.uid)
  const { despesasRateadas } = useRateioRecebido(user?.uid)
  const { receitas, criar, editar, remover } = useReceitas(user?.uid)

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [abaAtiva, setAbaAtiva] = useState<RelatorioTipo>('fluxo')
  const [modalReceita, setModalReceita] = useState(false)
  const [receitaEditando, setReceitaEditando] = useState<Receita | null>(null)
  const [mostrarReceitas, setMostrarReceitas] = useState(false)

  const navegarMes = (dir: -1 | 1) => {
    if (dir === 1 && mes === 11) { setMes(0); setAno(a => a + 1) }
    else if (dir === -1 && mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m + dir)
  }

  const handleSalvarReceita = async (form: ReceitaFormType) => {
    if (receitaEditando) await editar(receitaEditando.id, form)
    else await criar(form)
    setModalReceita(false)
    setReceitaEditando(null)
  }

  const handleEditarReceita = (r: Receita) => {
    setReceitaEditando(r)
    setModalReceita(true)
  }

  const handleRemoverReceita = async (id: string) => {
    if (!confirm('Remover esta receita?')) return
    await remover(id)
  }

  const relatorioProps = { despesas, rateiosRecebidos: despesasRateadas, receitas, userId: user?.uid ?? '', mes, ano }

  return (
    <div className="rel-page">
      {/* Header da página */}
      <div className="rel-header">
        <div>
          <h1 className="rel-titulo">Relatórios</h1>
          <p className="rel-subtitulo">Visão completa das suas finanças</p>
        </div>
        <div className="rel-header-actions">
          <button className="btn-receitas" onClick={() => setMostrarReceitas(!mostrarReceitas)}>
            {mostrarReceitas ? 'Ocultar receitas' : `Receitas (${receitas.length})`}
          </button>
          <button className="btn-nova-receita" onClick={() => { setReceitaEditando(null); setModalReceita(true) }}>
            + Receita
          </button>
        </div>
      </div>

      {/* Lista de receitas (expansível) */}
      {mostrarReceitas && (
        <div className="receitas-panel">
          {receitas.length === 0 ? (
            <p className="receitas-vazio">Nenhuma receita registrada. Adicione uma para ver os relatórios completos.</p>
          ) : (
            <div className="receitas-lista">
              {receitas.map((r) => (
                <div key={r.id} className="receita-item">
                  <div className="ri-info">
                    <span className="ri-nome">{r.nome}</span>
                    <span className="ri-meta">
                      {r.categoria} · {r.recorrente ? 'Recorrente' : r.data}
                    </span>
                  </div>
                  <span className="ri-valor">R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <div className="ri-actions">
                    <button onClick={() => handleEditarReceita(r)}>Editar</button>
                    <button className="ri-del" onClick={() => handleRemoverReceita(r.id)}><X size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seletor de mês (visível em relatórios que usam filtro de mês) */}
      {!['parcelamentos', 'rateios', 'forecast', 'evolucao'].includes(abaAtiva) && (
        <div className="mes-seletor">
          <button className="mes-nav" onClick={() => navegarMes(-1)}>‹</button>
          <span className="mes-label">{NOMES_MES[mes]} {ano}</span>
          <button className="mes-nav" onClick={() => navegarMes(1)}>›</button>
        </div>
      )}

      {/* Abas de relatórios */}
      <div className="rel-abas-scroll">
        <div className="rel-abas">
          {ABAS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`rel-aba ${abaAtiva === id ? 'active' : ''}`}
              onClick={() => setAbaAtiva(id)}
            >
              <Icon size={18} />
              <span className="aba-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Título do relatório ativo */}
      <div className="rel-conteudo">
        <h2 className="rel-nome-ativo">
          {ABAS.find((a) => a.id === abaAtiva)?.label}
        </h2>

        {abaAtiva === 'fluxo' && <FluxoCaixaMensal {...relatorioProps} />}
        {abaAtiva === 'categorias' && <RelatorioCategoria {...relatorioProps} />}
        {abaAtiva === 'parcelamentos' && <ControleParcelamentos {...relatorioProps} />}
        {abaAtiva === 'rateios' && <ControleRateio {...relatorioProps} />}
        {abaAtiva === 'forecast' && <ForecastGastos {...relatorioProps} />}
        {abaAtiva === 'saldo-livre' && <QuantoPossoGastar {...relatorioProps} />}
        {abaAtiva === 'evolucao' && <EvolucaoFinanceira {...relatorioProps} />}
      </div>

      {/* Modal de receita */}
      {modalReceita && (
        <Modal
          titulo={receitaEditando ? 'Editar receita' : 'Nova receita'}
          onFechar={() => { setModalReceita(false); setReceitaEditando(null) }}
        >
          <ReceitaForm
            inicial={receitaEditando ?? undefined}
            onSalvar={handleSalvarReceita}
            onCancelar={() => { setModalReceita(false); setReceitaEditando(null) }}
          />
        </Modal>
      )}

      <style>{`
        .rel-page { display: flex; flex-direction: column; gap: 1.25rem; }

        .rel-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .rel-titulo { font-size: 1.4rem; font-weight: 900; color: #2D3436; }
        .rel-subtitulo { font-size: 0.8rem; color: #95A5A6; margin-top: 2px; }
        .rel-header-actions { display: flex; gap: 0.5rem; align-items: center; }
        .btn-nova-receita { background: #C8A45A; color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
        .btn-receitas { background: #F1F2F6; color: #636e72; border: none; border-radius: 10px; padding: 0.6rem 0.85rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; }

        .receitas-panel { background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 14px; padding: 1rem; }
        .receitas-vazio { font-size: 0.82rem; color: #95A5A6; text-align: center; padding: 0.5rem; }
        .receitas-lista { display: flex; flex-direction: column; gap: 0.5rem; }
        .receita-item { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 1px solid #F1F2F6; border-radius: 10px; padding: 0.65rem 0.85rem; }
        .ri-info { flex: 1; }
        .ri-nome { display: block; font-size: 0.88rem; font-weight: 700; color: #2D3436; }
        .ri-meta { font-size: 0.72rem; color: #95A5A6; }
        .ri-valor { font-size: 0.9rem; font-weight: 800; color: #2ECC71; flex-shrink: 0; }
        .ri-actions { display: flex; gap: 0.35rem; }
        .ri-actions button { background: #F1F2F6; border: none; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.75rem; cursor: pointer; color: #636e72; font-weight: 600; }
        .ri-del { color: #E74C3C !important; }

        .mes-seletor { display: flex; align-items: center; gap: 1rem; background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 0.6rem 1rem; width: fit-content; }
        .mes-nav { background: none; border: none; font-size: 1.2rem; color: #C8A45A; cursor: pointer; font-weight: 700; padding: 0 0.25rem; }
        .mes-label { font-size: 0.9rem; font-weight: 700; color: #2D3436; min-width: 80px; text-align: center; }

        .rel-abas-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .rel-abas-scroll::-webkit-scrollbar { display: none; }
        .rel-abas { display: flex; gap: 0.5rem; background: #F1F2F6; padding: 0.3rem; border-radius: 14px; width: max-content; min-width: 100%; }
        .rel-aba { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; background: transparent; border: none; border-radius: 10px; padding: 0.5rem 0.85rem; cursor: pointer; min-width: 80px; color: #95A5A6; }
        .rel-aba.active { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); color: #C8A45A; }
        .aba-label { font-size: 0.65rem; font-weight: 600; white-space: nowrap; }

        .rel-conteudo { background: #fff; border: 1px solid #F1F2F6; border-radius: 16px; padding: 1.25rem; }
        .rel-nome-ativo { font-size: 1rem; font-weight: 800; color: #2D3436; margin-bottom: 1.25rem; }

        .relatorio-section { display: flex; flex-direction: column; gap: 0; }
        .estado-vazio-rel { text-align: center; padding: 3rem 1rem; color: #95A5A6; font-size: 0.88rem; line-height: 1.6; }
      `}</style>
    </div>
  )
}
