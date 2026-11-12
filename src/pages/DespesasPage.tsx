import { useState, useMemo, useEffect } from 'react'
import { LayoutGrid, TableProperties, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useCartoes } from '../hooks/useCartoes'
import { useContas } from '../hooks/useContas'
import { useAuthContext } from '../lib/AuthContext'
import DespesaCard from '../components/despesas/DespesaCard'
import DespesaForm from '../components/despesas/DespesaForm'
import SelectEscopo from '../components/familia/SelectEscopo'
import { filtrarPorVisao, type VisaoEscopo } from '../lib/escopo'
import TabelaDespesas, { type TabTipo } from '../components/despesas/TabelaDespesas'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import DetalhesDespesa from '../components/despesas/DetalhesDespesa'
import type { Despesa, DespesaForm as DespesaFormType, InfoFamilia } from '../types'

type ModalTipo = 'criar' | 'editar' | 'pagar' | 'adiantar' | null
type FiltroTipo = 'pendentes' | 'parcialmente-pagas' | 'pagas' | 'todas'
type Visualizacao = 'cards' | 'tabela'
type FiltroTipoGasto = 'todos' | 'fixo' | 'variavel'

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesAnterior(ano: number, mes: number) {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}
function mesProximo(ano: number, mes: number) {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
}

interface DespesasPageProps {
  pedidoNovaDespesa?: number
  familiaId?: string
  meuUid?: string
  temFamilia?: boolean
  familia?: InfoFamilia
}

export default function DespesasPage({ pedidoNovaDespesa = 0, familiaId, meuUid, temFamilia = false, familia }: DespesasPageProps) {
  const { user } = useAuthContext()
  const uid = familiaId ?? user?.uid
  const myUid = meuUid ?? user?.uid
  const { despesas: todasDespesas, loading, criar, editar, remover, pagarParcela, removerPagamento, adicionarAdiantamento, proximasDaRecorrencia } = useDespesas(uid, myUid)
  // Cartões e contas são privados: cada pessoa só vê e escolhe os seus
  const { cartoes } = useCartoes(myUid, uid)
  // Abas Tudo · Família · Pessoal (só aparecem quando há família ou itens pessoais)
  const [visao, setVisao] = useState<VisaoEscopo>('tudo')
  const mostrarVisao = temFamilia || todasDespesas.some((d) => d.escopo === 'pessoal')
  const despesas = useMemo(
    () => filtrarPorVisao(todasDespesas, mostrarVisao ? visao : 'tudo'),
    [todasDespesas, visao, mostrarVisao],
  )
  const familiaParaEtiqueta = temFamilia ? familia : undefined
  const { contas } = useContas(myUid, uid)

  const hoje = new Date()
  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Despesa | null>(null)
  // Diálogo de detalhes: guarda o id para sempre mostrar os dados atualizados
  const [detalhe, setDetalhe] = useState<{ id: string; parcela?: number } | null>(null)
  const despesaDetalhe = detalhe ? todasDespesas.find((d) => d.id === detalhe.id) ?? null : null

  // Abre o formulário quando vem do botão "+" ou do atalho do ícone do app
  useEffect(() => {
    if (pedidoNovaDespesa > 0) { setSelecionada(null); setModal('criar') }
  }, [pedidoNovaDespesa])
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1)
  const [filtro, setFiltro] = useState<FiltroTipo>('pendentes')
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')
  const [filtroContaCard, setFiltroContaCard] = useState<string>('todos')
  const [filtroTipoGasto, setFiltroTipoGasto] = useState<FiltroTipoGasto>('todos')
  const [pagina, setPagina] = useState(0)
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('tabela')

  // Estado do mês e tab (tabela)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [tab, setTab] = useState<TabTipo>('tudo')

  const ITENS_POR_PAGINA = 8

  // Mês máximo navegável
  const maxVencimento = useMemo(() => {
    let maxAno = hoje.getFullYear()
    let maxMes = hoje.getMonth() + 1
    for (const d of despesas) {
      for (const p of d.listaParcelas ?? []) {
        const [a, m] = p.dataVencimento.split('-').map(Number)
        if (a > maxAno || (a === maxAno && m > maxMes)) { maxAno = a; maxMes = m }
      }
    }
    return { ano: maxAno, mes: maxMes }
  }, [despesas])

  const ehUltimoMes = ano === maxVencimento.ano && mes === maxVencimento.mes

  const irAnterior = () => { const p = mesAnterior(ano, mes); setAno(p.ano); setMes(p.mes) }
  const irProximo = () => { const p = mesProximo(ano, mes); setAno(p.ano); setMes(p.mes) }

  const fecharModal = () => { setModal(null); setSelecionada(null) }

  const handleCriar = async (form: DespesaFormType) => { await criar(form); fecharModal() }
  const handleEditar = async (form: DespesaFormType, opcoes?: { aplicarProximas?: boolean }) => {
    if (!selecionada) return
    await editar(selecionada.id, form, opcoes)
    fecharModal()
  }
  const handleRemover = async (d: Despesa) => {
    if (!confirm(`Remover "${d.nome}"?`)) return
    await remover(d.id)
    if (detalhe?.id === d.id) setDetalhe(null)
  }
  const handlePagarParcela = async (dados: { valor: number; data: string; observacao: string; ajustarValor?: boolean; atualizarProximas?: boolean }) => {
    if (!selecionada) return
    const { ajustarValor, atualizarProximas, ...pagamento } = dados
    await pagarParcela(selecionada.id, parcelaSelecionada, pagamento, { ajustarValor, atualizarProximas })
    fecharModal()
  }
  const handleAdiantar = async (dados: { valor: number; data: string; observacao: string; parcelasQuitadas?: number }) => {
    if (!selecionada) return
    await adicionarAdiantamento(selecionada.id, dados, dados.parcelasQuitadas)
    fecharModal()
  }
  const abrirPagarParcela = (d: Despesa, numeroParcela: number) => {
    setSelecionada(d); setParcelaSelecionada(numeroParcela); setModal('pagar')
  }

  const parcelaObj = selecionada?.listaParcelas?.find((p) => p.numero === parcelaSelecionada)
  const totalPagoParcela = parcelaObj?.pagamentos?.reduce((s, p) => s + p.valor, 0) ?? 0
  const valorRestanteParcela = (parcelaObj?.valor ?? 0) - totalPagoParcela

  // Agrupa recorrentes para visão cards
  const despesasAgrupadas = useMemo(() => {
    const vistas = new Map<string, Despesa>()
    const resultado: Despesa[] = []
    for (const d of despesas) {
      if (!d.recorrenciaId) { resultado.push(d); continue }
      const atual = vistas.get(d.recorrenciaId)
      if (!atual) { vistas.set(d.recorrenciaId, d); continue }
      const prefereD = !d.pago && (atual.pago || d.data < atual.data)
      if (prefereD) vistas.set(d.recorrenciaId, d)
    }
    vistas.forEach((d) => resultado.push(d))
    return resultado.sort((a, b) => b.data.localeCompare(a.data))
  }, [despesas])

  // Opções dinâmicas de método/conta para filtros dos cards
  const metodosDisponiveis = useMemo(() => {
    const set = new Set(despesasAgrupadas.map(d => d.metodoPagamento).filter(Boolean))
    return Array.from(set) as string[]
  }, [despesasAgrupadas])

  const contasCartoesDisponiveis = useMemo(() => {
    const opcoes = new Map<string, string>()
    for (const d of despesasAgrupadas) {
      if (d.cartaoId) {
        const c = cartoes.find(c => c.id === d.cartaoId)
        if (c) opcoes.set(`cartao:${c.id}`, c.nome)
      } else if (d.contaId) {
        const c = contas.find(c => c.id === d.contaId)
        if (c) opcoes.set(`conta:${c.id}`, c.nome)
      }
    }
    return Array.from(opcoes.entries()).map(([value, label]) => ({ value, label }))
  }, [despesasAgrupadas, cartoes, contas])

  const despesasExibidas = despesasAgrupadas.filter((d) => {
    if (filtro === 'pendentes' && d.pago) return false
    if (filtro === 'parcialmente-pagas' && (d.pago || !(d.listaParcelas?.some(p => p.pago) ?? false))) return false
    if (filtro === 'pagas' && !d.pago) return false
    if (filtroMetodo !== 'todos' && d.metodoPagamento !== filtroMetodo) return false
    if (filtroTipoGasto !== 'todos' && d.tipoGasto !== filtroTipoGasto) return false
    if (filtroContaCard !== 'todos') {
      const [tipo, id] = filtroContaCard.split(':')
      if (tipo === 'cartao' && d.cartaoId !== id) return false
      if (tipo === 'conta' && d.contaId !== id) return false
    }
    return true
  })

  return (
    <div className="despesas-page">

      {/* ── Linha 1: Título + nav mês (tabela) + toggle ── */}
      <div className="ph-row1">
        <h1 className="page-titulo">Despesas</h1>

        {visualizacao === 'tabela' && (
          <div className="mes-nav">
            <button className="nav-btn" onClick={irAnterior}><ChevronLeft size={16} /></button>
            <span className="nav-label">{MESES_PT[mes - 1]} {ano}</span>
            <button className="nav-btn" onClick={irProximo} disabled={ehUltimoMes}><ChevronRight size={16} /></button>
          </div>
        )}

        <div className="toggle-view">
          <button className={`toggle-btn ${visualizacao === 'cards' ? 'ativo' : ''}`} onClick={() => setVisualizacao('cards')} title="Cards">
            <LayoutGrid size={16} />
          </button>
          <button className={`toggle-btn ${visualizacao === 'tabela' ? 'ativo' : ''}`} onClick={() => setVisualizacao('tabela')} title="Tabela">
            <TableProperties size={16} />
          </button>
        </div>
      </div>

      {/* ── Linha 2: Tabs/Filtros + Nova ── */}
      <div className="ph-row2">
        {visualizacao === 'tabela' ? (
          <div className="tabs-nav">
            {([
              { id: 'tudo', label: 'Tudo' },
              { id: 'recorrentes', label: 'Recorrentes' },
              { id: 'parcelados', label: 'Parcelados' },
              { id: 'compartilhados', label: 'Compart.' },
            ] as const).map(({ id, label }) => (
              <button key={id} className={`tab-btn ${tab === id ? 'ativo' : ''}`}
                onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="filtros-cards-wrap">
            <div className="filtros">
              {([
                { id: 'pendentes', label: 'Pendentes' },
                { id: 'parcialmente-pagas', label: 'Parc. pagas' },
                { id: 'pagas', label: 'Pagas' },
                { id: 'todas', label: 'Todas' },
              ] as const).map(({ id, label }) => (
                <button key={id} className={`filtro-btn ${filtro === id ? 'active' : ''}`}
                  onClick={() => { setFiltro(id); setPagina(0) }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="filtros-extra">
              <select
                className={`filtro-select ${filtroTipoGasto !== 'todos' ? 'ativo' : ''}`}
                value={filtroTipoGasto}
                onChange={e => { setFiltroTipoGasto(e.target.value as FiltroTipoGasto); setPagina(0) }}
              >
                <option value="todos">Tipo</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
              </select>
              {mostrarVisao && <SelectEscopo valor={visao} onChange={(v) => { setVisao(v); setPagina(0) }} />}
              {metodosDisponiveis.length > 1 && (
                <select
                  className={`filtro-select ${filtroMetodo !== 'todos' ? 'ativo' : ''}`}
                  value={filtroMetodo}
                  onChange={e => { setFiltroMetodo(e.target.value); setPagina(0) }}
                >
                  <option value="todos">Método</option>
                  {metodosDisponiveis.map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              )}
              {contasCartoesDisponiveis.length > 1 && (
                <select
                  className={`filtro-select ${filtroContaCard !== 'todos' ? 'ativo' : ''}`}
                  value={filtroContaCard}
                  onChange={e => { setFiltroContaCard(e.target.value); setPagina(0) }}
                >
                  <option value="todos">Conta/Cartão</option>
                  {contasCartoesDisponiveis.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : visualizacao === 'tabela' ? (
        <TabelaDespesas
          despesas={despesas}
          cartoes={cartoes}
          contas={contas}
          familia={familiaParaEtiqueta}
          escopo={visao}
          onEscopo={mostrarVisao ? setVisao : undefined}
          ano={ano}
          mes={mes}
          tab={tab}
          onPagarParcela={abrirPagarParcela}
          onAbrir={(d, parcela) => setDetalhe({ id: d.id, parcela })}
        />
      ) : despesasExibidas.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhuma despesa {filtro === 'todas' ? 'registrada' : filtro === 'parcialmente-pagas' ? 'parcialmente paga' : filtro}</p>
          {filtro === 'todas' && (
            <button className="btn-criar-vazio" onClick={() => setModal('criar')}>Criar primeira despesa</button>
          )}
        </div>
      ) : (
        <>
          <div className="despesas-list">
            {despesasExibidas.slice(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA).map((d) => {
              const cartao = cartoes.find(c => c.id === d.cartaoId)
              const conta = contas.find(c => c.id === d.contaId)
              // Crédito → nome do cartão; demais → nome da conta
              const cartaoLabel = cartao?.nome ?? conta?.nome
              return (
                <DespesaCard
                  key={d.id}
                  despesa={d}
                  cartaoLabel={cartaoLabel}
                  familia={familiaParaEtiqueta}
                  onAbrir={() => setDetalhe({ id: d.id })}
                  onEditar={() => { setSelecionada(d); setModal('editar') }}
                  onRemover={() => handleRemover(d)}
                />
              )
            })}
          </div>

          {despesasExibidas.length > ITENS_POR_PAGINA && (
            <div className="paginacao">
              <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>‹</button>
              <span className="pag-info">
                {pagina + 1} / {Math.ceil(despesasExibidas.length / ITENS_POR_PAGINA)}
                <span className="pag-total"> · {despesasExibidas.length} despesas</span>
              </span>
              <button className="pag-btn" disabled={(pagina + 1) * ITENS_POR_PAGINA >= despesasExibidas.length} onClick={() => setPagina(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* ── Modais ── */}
      {despesaDetalhe && (
        <Modal titulo={despesaDetalhe.nome} onFechar={() => setDetalhe(null)}>
          <DetalhesDespesa
            despesa={despesaDetalhe}
            contaLabel={cartoes.find(c => c.id === despesaDetalhe.cartaoId)?.nome ?? contas.find(c => c.id === despesaDetalhe.contaId)?.nome}
            familia={familiaParaEtiqueta}
            parcelaFoco={detalhe?.parcela}
            onPagar={(num) => abrirPagarParcela(despesaDetalhe, num)}
            onRemoverPagamento={(num, pgId) => removerPagamento(despesaDetalhe.id, num, pgId)}
            onEditar={() => { setSelecionada(despesaDetalhe); setModal('editar') }}
            onRemover={() => handleRemover(despesaDetalhe)}
            onAdiantar={() => { setSelecionada(despesaDetalhe); setModal('adiantar') }}
          />
        </Modal>
      )}

      {modal === 'criar' && (
        <Modal titulo="Nova despesa" onFechar={fecharModal}>
          <DespesaForm cartoes={cartoes} contas={contas} emFamilia={temFamilia} familia={familia} meuUid={myUid} onSalvar={handleCriar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'editar' && selecionada && (
        <Modal titulo="Editar despesa" onFechar={fecharModal}>
          <DespesaForm cartoes={cartoes} contas={contas} emFamilia={temFamilia} familia={familia} meuUid={myUid} inicial={selecionada}
            proximasEmAberto={selecionada.recorrente ? proximasDaRecorrencia(selecionada).length : 0}
            onSalvar={handleEditar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'pagar' && selecionada && parcelaObj && (
        <Modal titulo={`Parcela ${parcelaSelecionada}/${selecionada.parcelas}`} onFechar={fecharModal}>
          <PagamentoForm tipo="pagamento" valorRestante={valorRestanteParcela}
            recorrente={!!selecionada.recorrenciaId}
            proximasEmAberto={proximasDaRecorrencia(selecionada).length}
            jaPago={totalPagoParcela}
            onSalvar={handlePagarParcela} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'adiantar' && selecionada && (
        <Modal titulo={selecionada.tipo === 'financiamento' ? 'Registrar amortização' : 'Registrar adiantamento'} onFechar={fecharModal}>
          <PagamentoForm
            tipo="adiantamento"
            valorRestante={selecionada.tipo === 'financiamento' ? (selecionada.saldoDevedor ?? selecionada.valorTotal) : selecionada.valorTotal}
            isAmortizacao={selecionada.tipo === 'financiamento'}
            onSalvar={handleAdiantar}
            onCancelar={fecharModal}
          />
        </Modal>
      )}

      <style>{`
        .despesas-page { display: flex; flex-direction: column; gap: 1rem; }

        /* Linha 2 */

        .filtros-cards-wrap { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
        .filtros {
          display: flex; gap: 0;
          background: #F1F2F6; padding: 0.3rem; border-radius: 12px;
          overflow-x: auto; scrollbar-width: none;
        }
        .filtros::-webkit-scrollbar { display: none; }
        .filtro-btn {
          background: transparent; border: none; color: #7f8c8d;
          border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.75rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit;
        }
        .filtro-btn.active { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .filtros-extra { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .filtro-select {
          background: #F8F9FA; border: 1px solid #E8EAED; border-radius: 8px;
          padding: 0.35rem 0.6rem; font-size: 0.75rem; font-weight: 600; color: #7F8C8D;
          cursor: pointer; font-family: inherit; outline: none;
          transition: all 0.2s; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2395A5A6' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.5rem center;
          padding-right: 1.5rem;
        }
        .filtro-select:hover { border-color: #C8A45A; }
        .filtro-select.ativo { border-color: #C8A45A; color: #C8A45A; background-color: #FFF8EC; }

        .despesas-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .paginacao { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.5rem 0; }
        .pag-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .pag-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-info { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .pag-total { font-weight: 400; color: #95A5A6; }

        @media (max-width: 600px) {
          .filtros-extra { gap: 0.3rem; }
          .filtro-select { font-size: 0.72rem; padding: 0.3rem 1.4rem 0.3rem 0.5rem; }
        }
      `}</style>
    </div>
  )
}
