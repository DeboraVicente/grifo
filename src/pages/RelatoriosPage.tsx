import { useState, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown, FolderOpen, CalendarDays, TrendingUp, LineChart, CreditCard,
  ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useReceitas } from '../hooks/useReceitas'
import { useCartoes } from '../hooks/useCartoes'
import { useCaixinhas } from '../hooks/useCaixinhas'
import { useAuthContext } from '../lib/AuthContext'
import FluxoCaixaMensal from '../components/relatorios/FluxoCaixaMensal'
import RelatorioCategoria from '../components/relatorios/RelatorioCategoria'
import ControleParcelamentos from '../components/relatorios/ControleParcelamentos'
import ForecastGastos from '../components/relatorios/ForecastGastos'
import EvolucaoFinanceira from '../components/relatorios/EvolucaoFinanceira'
import RelatorioCartoes from '../components/relatorios/RelatorioCartoes'
import { filtrarPorVisao } from '../lib/escopo'
import DivisaoFamiliaCard from '../components/familia/DivisaoFamiliaCard'
import { calcDivisao, aplicarCota, proporcaoNoMes } from '../lib/divisao'
import type { Despesa, GastoPrevisto, InfoFamilia } from '../types'
import { previstosComoDespesas } from '../lib/previstosRelatorio'
import { calcFluxoCaixaMensal, fmt } from '../hooks/useRelatorios'
import type { DetalheFluxo } from '../components/relatorios/ComprometimentoRenda'

type RelatorioTipo =
  | 'fluxo'
  | 'familia'
  | 'categorias'
  | 'parcelamentos'
  | 'forecast'
  | 'evolucao'
  | 'cartoes'

const ABAS: { id: RelatorioTipo; label: string; Icon: LucideIcon }[] = [
  { id: 'fluxo', label: 'Fluxo Mensal', Icon: ArrowUpDown },
  { id: 'familia', label: 'Família', Icon: Users },
  { id: 'categorias', label: 'Categorias', Icon: FolderOpen },
  { id: 'parcelamentos', label: 'Parcelamentos', Icon: CalendarDays },
  { id: 'cartoes', label: 'Cartões', Icon: CreditCard },
  { id: 'forecast', label: 'Projeção', Icon: TrendingUp },
  { id: 'evolucao', label: 'Evolução', Icon: LineChart },
]

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface RelatoriosPageProps {
  familiaId?: string
  meuUid?: string
  temFamilia?: boolean
  familia?: InfoFamilia
  /** Gastos previstos: entram pelo valor cheio no mês em que vão acontecer */
  previstos?: GastoPrevisto[]
}

export default function RelatoriosPage({ familiaId, meuUid, temFamilia = false, familia, previstos = [] }: RelatoriosPageProps) {
  const { user } = useAuthContext()
  const uid = familiaId ?? user?.uid
  const myUid = meuUid ?? user?.uid
  const membros = familia?.membros.map((m) => m.uid) ?? []
  const { despesas: todasDespesas } = useDespesas(uid, myUid)
  // receitas = só as minhas; receitasFamilia = de todos os membros (apenas para o rateio)
  const { receitas: minhasReceitas, receitasFamilia } = useReceitas(uid, myUid, membros, familia?.ownerUid)
  const { cartoes } = useCartoes(myUid, uid)
  const { caixinhas: todasCaixinhas } = useCaixinhas(uid, myUid)
  const emFamilia = temFamilia && !!familia && familia.membros.length > 1

  /*
   * Relatórios:
   *  - Fluxo Mensal e demais abas: a MINHA visão = despesas pessoais + a minha cota das
   *    familiares (proporcional à renda) + a minha renda. "Quanto a casa compromete de mim."
   *  - Família: o fluxo da casa (despesas familiares pelo valor cheio + renda de todos)
   *    e a divisão/acerto entre os membros.
   */
  // Despesas familiares reais (usadas no acerto) e com os previstos projetados (usadas nos relatórios)
  const despesasFamiliaresReais = useMemo(() => filtrarPorVisao(todasDespesas, 'familiar'), [todasDespesas])
  const despesasPrevistas = useMemo(() => previstosComoDespesas(previstos), [previstos])
  const despesasFamiliares = useMemo(() => [...despesasFamiliaresReais, ...despesasPrevistas], [despesasFamiliaresReais, despesasPrevistas])
  const despesasPessoais = useMemo(() => filtrarPorVisao(todasDespesas, 'pessoal'), [todasDespesas])
  const minhaCota = useMemo(() => {
    if (!emFamilia || !familia || !myUid) return despesasFamiliares
    return aplicarCota(despesasFamiliares, (m, a) => proporcaoNoMes(myUid, receitasFamilia, familia, m, a))
  }, [emFamilia, familia, myUid, despesasFamiliares, receitasFamilia])
  const despesas = useMemo(() => [...despesasPessoais, ...minhaCota], [despesasPessoais, minhaCota])
  const receitas = minhasReceitas
  const caixinhas = todasCaixinhas
  const caixinhasFamilia = useMemo(() => filtrarPorVisao(todasCaixinhas, 'familiar'), [todasCaixinhas])

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [abaEscolhida, setAbaAtiva] = useState<RelatorioTipo>('fluxo')
  const abas = emFamilia ? ABAS : ABAS.filter((a) => a.id !== 'familia')
  const abaAtiva: RelatorioTipo = abas.some((a) => a.id === abaEscolhida) ? abaEscolhida : 'fluxo'

  const navegarMes = (dir: -1 | 1) => {
    if (dir === 1 && mes === 11) { setMes(0); setAno(a => a + 1) }
    else if (dir === -1 && mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m + dir)
  }

  const isTemporal = !['parcelamentos', 'forecast', 'evolucao', 'cartoes'].includes(abaAtiva)

  const relatorioProps = { despesas, receitas, caixinhas, userId: uid ?? '', mes, ano }
  // Aba Família: fluxo da casa com valor cheio e a renda de todos os membros
  const relatorioFamiliaProps = { despesas: despesasFamiliares, receitas: receitasFamilia, caixinhas: caixinhasFamilia, userId: uid ?? '', mes, ano }

  // Ligação entre o total da página de Despesas e o que compromete a renda (Fluxo Mensal)
  const { detalheMeu, detalheFamilia } = useMemo(() => {
    const totalMes = (lista: Despesa[]) => calcFluxoCaixaMensal(lista, [], '', mes, ano).totalDespesas
    const pessoais = totalMes(despesasPessoais)
    const familiaresCheio = totalMes(despesasFamiliaresReais)
    const previstosCheio = totalMes(despesasPrevistas)
    const cotaFamiliares = totalMes(minhaCota.filter((d) => !d.origemPrevisto))
    const cotaPrevistos = totalMes(minhaCota.filter((d) => d.origemPrevisto))
    const pct = emFamilia && familia && myUid ? Math.round(proporcaoNoMes(myUid, receitasFamilia, familia, mes, ano) * 100) : 100

    const meu: DetalheFluxo = {
      titulo: 'Quanto compromete sua renda',
      intro: `O total da página de Despesas é ${fmt(pessoais + familiaresCheio)}. Para o seu saldo do mês conta o que compromete a sua renda:`,
      rotuloTotal: 'Total comprometido da sua renda',
      rotuloRenda: 'da sua renda',
      totalPagina: pessoais + familiaresCheio,
      linhas: emFamilia ? [
        { label: 'Despesas pessoais', valor: pessoais },
        { label: 'Sua cota das despesas familiares', valor: cotaFamiliares, sub: `${pct}% de ${fmt(familiaresCheio)}` },
        { label: 'Previstos do mês', valor: cotaPrevistos, sub: previstosCheio > 0 ? `${pct}% de ${fmt(previstosCheio)}` : undefined },
      ] : [
        { label: 'Despesas do mês', valor: pessoais + familiaresCheio },
        { label: 'Previstos do mês', valor: previstosCheio },
      ],
    }
    const casa: DetalheFluxo = {
      titulo: 'Quanto compromete a renda da família',
      intro: `O total das despesas familiares na página de Despesas é ${fmt(familiaresCheio)}. Para o saldo da família conta o que compromete a renda de todos os membros:`,
      rotuloTotal: 'Total comprometido da família',
      rotuloRenda: 'da renda da família',
      totalPagina: familiaresCheio,
      linhas: [
        { label: 'Despesas familiares', valor: familiaresCheio },
        { label: 'Previstos do mês', valor: previstosCheio },
      ],
    }
    return { detalheMeu: meu, detalheFamilia: casa }
  }, [mes, ano, despesasPessoais, despesasFamiliaresReais, despesasPrevistas, minhaCota, emFamilia, familia, myUid, receitasFamilia])

  const mostrarDivisao = emFamilia
  const divisao = useMemo(() => (mostrarDivisao && familia
    ? calcDivisao(despesasFamiliaresReais, receitasFamilia, familia, mes, ano)
    : null), [mostrarDivisao, familia, despesasFamiliaresReais, receitasFamilia, mes, ano])

  return (
    <div className="rel-page">
      <div className="ph-row1">
        <h1 className="page-titulo">Relatórios</h1>
        <div className={`mes-nav ${!isTemporal ? 'desabilitado' : ''}`}>
          <button className="nav-btn" onClick={() => isTemporal && navegarMes(-1)} disabled={!isTemporal}><ChevronLeft size={16} /></button>
          <span className="nav-label">{NOMES_MES[mes]} {ano}</span>
          <button className="nav-btn" onClick={() => isTemporal && navegarMes(1)} disabled={!isTemporal}><ChevronRight size={16} /></button>
        </div>
      </div>
      
      <div className="rel-abas-scroll">
        <div className="rel-abas">
          {abas.map(({ id, label, Icon }) => (
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

      <div className="rel-conteudo">
       <header className="conteudo-header">
           <h2 className="rel-nome-ativo">{abas.find((a) => a.id === abaAtiva)?.label}</h2>
           {!isTemporal && <span className="tag-global">Dados Gerais</span>}
        </header>

        {abaAtiva === 'fluxo' && <FluxoCaixaMensal {...relatorioProps} detalhe={detalheMeu} />}
        {abaAtiva === 'categorias' && <RelatorioCategoria {...relatorioProps} />}
        {abaAtiva === 'parcelamentos' && <ControleParcelamentos {...relatorioProps} />}
        {abaAtiva === 'forecast' && <ForecastGastos {...relatorioProps} previstos={previstos} />}
        {abaAtiva === 'evolucao' && <EvolucaoFinanceira {...relatorioProps} previstos={previstos} />}
        {abaAtiva === 'familia' && (
          <div className="rel-familia">
            {divisao && <DivisaoFamiliaCard divisao={divisao} mes={mes} ano={ano} meuUid={myUid} />}
            <FluxoCaixaMensal {...relatorioFamiliaProps} detalhe={detalheFamilia} />
          </div>
        )}
        {abaAtiva === 'cartoes' && <RelatorioCartoes despesas={todasDespesas} cartoes={cartoes} />}
      </div>

      <style>{`
        .rel-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .rel-familia { display: flex; flex-direction: column; gap: 1.25rem; }

        .mes-nav.desabilitado { opacity: 0.45; pointer-events: none; }

        .rel-resumo {
          display: flex; align-items: center; gap: 0;
          background: #FFFFFF; border: 1px solid #F1F2F6;
          border-radius: 16px; padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .rel-resumo-item { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
        .rel-resumo-sep { width: 1px; background: #F1F2F6; align-self: stretch; margin: 0 1rem; }
        .rel-resumo-label { color: #95A5A6; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .rel-resumo-valor { font-size: 1.5rem; font-weight: 800; color: #2D3436; margin-top: 4px; display: block; }
        .rel-despesa { color: #E74C3C; }
        .rel-poupanca { color: #2ECC71; }


        .rel-abas-scroll { margin: 0 -1.25rem; padding: 0 1.25rem; overflow-x: auto; scrollbar-width: none; }        .rel-abas-scroll::-webkit-scrollbar { display: none; }
        .rel-abas { display: flex; gap: 0.6rem; padding: 0.2rem; width: max-content; }
        .rel-aba { 
          display: flex; 
          flex-direction: row; 
          align-items: center; 
          gap: 0.6rem; 
          background: #FFFFFF; 
          border: 1px solid #F1F2F6; 
          border-radius: 12px; 
          padding: 0.6rem 1rem; 
          cursor: pointer; 
          color: #95A5A6;
          transition: all 0.2s;
        }
        .rel-aba.active { 
          background: #C8A45A; 
          color: #FFFFFF; 
          border-color: #C8A45A;
          box-shadow: 0 4px 12px rgba(200,164,90,0.3);
        }
        .aba-label { font-size: 0.8rem; font-weight: 600; white-space: nowrap; }

        .rel-conteudo { 
          background: #FFFFFF; 
          border: 1px solid #F1F2F6; 
          border-radius: 20px; 
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .conteudo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .rel-nome-ativo { font-size: 1.1rem; font-weight: 800; color: #2D3436; margin: 0; }
        .tag-global { background: #F1F2F6; color: #95A5A6; font-size: 0.65rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }

        .relatorio-section { display: flex; flex-direction: column; gap: 0; }
        .estado-vazio-rel { text-align: center; padding: 3rem 1rem; color: #95A5A6; font-size: 0.88rem; line-height: 1.6; }

        @media (max-width: 600px) {
          .rel-header-container { flex-direction: column; align-items: flex-start; }
          .mes-seletor { width: 100%; justify-content: space-between; }
          .rel-aba { padding: 0.5rem 0.8rem; }
        }
      `}</style>
    </div>
  )
}
