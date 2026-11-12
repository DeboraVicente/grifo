import { useState } from 'react'
import { ArrowUp, ChevronLeft, ChevronRight, ArrowDown, TrendingUp, Sparkles, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import type { Caixinha, InfoFamilia, MovimentoCaixinha } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'
import { aportesPorPessoa, criadorDaCaixinha, nomePessoa } from '../../lib/caixinhas'

interface Props {
  caixinha: Caixinha
  familia?: InfoFamilia
  meuUid?: string
  onDepositar: () => void
  onRetirar: () => void
  onRendimento: () => void
  onEditar: () => void
  onRemover: () => void
  onRemoverMovimento: (m: MovimentoCaixinha) => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const TIPO_LABEL = { entrada: 'Depósito', saida: 'Retirada', rendimento: 'Rendimento' } as const
/** Movimentos por página (paginação só aparece quando passa disso) */
const POR_PAGINA = 5

/** Conteúdo do diálogo que abre ao tocar numa caixinha. */
export default function DetalhesCaixinha({
  caixinha: c, familia, meuUid, onDepositar, onRetirar, onRendimento, onEditar, onRemover, onRemoverMovimento,
}: Props) {
  const emFamilia = (familia?.membros.length ?? 0) > 1
  const hoje = new Date()
  const progresso = c.valorMeta ? Math.min((c.valorAtual / c.valorMeta) * 100, 100) : null
  const criador = nomePessoa(criadorDaCaixinha(c, familia), familia, meuUid)
  const aportesMes = aportesPorPessoa(c, hoje.getFullYear(), hoje.getMonth() + 1)
  const totalMes = aportesMes.reduce((s, a) => s + a.valor, 0)
  const historico = [...(c.historico ?? [])].sort((a, b) => b.data.localeCompare(a.data))
  const [pagina, setPagina] = useState(0)
  const totalPaginas = Math.max(1, Math.ceil(historico.length / POR_PAGINA))
  // Se um movimento foi excluído e a página ficou vazia, volta uma
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const movimentosPagina = historico.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA)

  const sugestaoMensal = (() => {
    if (!c.valorMeta || !c.dataObjetivo) return null
    const falta = c.valorMeta - c.valorAtual
    if (falta <= 0) return null
    const alvo = new Date(c.dataObjetivo + 'T12:00:00')
    const meses = Math.max(1, (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth()))
    return { valor: falta / meses, meses }
  })()

  const info: { label: string; valor: string }[] = [
    ...(emFamilia ? [{ label: 'Criada por', valor: criador ?? 'Não registrado' }] : []),
    ...(emFamilia ? [{ label: 'Escopo', valor: c.escopo === 'pessoal' ? 'Pessoal' : 'Família' }] : []),
    ...(c.valorMeta ? [{ label: 'Meta', valor: fmt(c.valorMeta) }] : []),
    ...(c.dataObjetivo ? [{ label: 'Prazo', valor: fmtData(c.dataObjetivo) }] : []),
    ...(c.metaMensal ? [{ label: 'Aporte mensal', valor: fmt(c.metaMensal) }] : []),
    ...(sugestaoMensal ? [{ label: 'Para bater a meta', valor: `${fmt(sugestaoMensal.valor)}/mês por ${sugestaoMensal.meses} ${sugestaoMensal.meses === 1 ? 'mês' : 'meses'}` }] : []),
    { label: 'Aportado este mês', valor: fmt(totalMes) },
  ]

  return (
    <div className="dc">
      <div className="dc-topo">
        <span className="dc-icone"><CategoryIcon categoria={c.categoria} size={22} color="#636e72" /></span>
        <div className="dc-saldo">
          <span className="dc-saldo-label">Saldo</span>
          <strong>{fmt(c.valorAtual)}</strong>
        </div>
        {c.valorMeta && c.valorAtual >= c.valorMeta && <span className="dc-badge"><CheckCircle2 size={12} /> Meta batida</span>}
      </div>

      {progresso !== null && (
        <div className="dc-prog">
          <div className="dc-barra"><div style={{ width: `${progresso}%` }} /></div>
          <span>{progresso.toFixed(0)}% de {fmt(c.valorMeta!)}</span>
        </div>
      )}

      <div className="dc-acoes">
        <button type="button" className="dc-acao dep" onClick={onDepositar}><ArrowUp size={16} /> Depositar</button>
        <button type="button" className="dc-acao" onClick={onRetirar} disabled={c.valorAtual <= 0}><ArrowDown size={16} /> Retirar</button>
        <button type="button" className="dc-acao" onClick={onRendimento}><TrendingUp size={16} /> Rendimento</button>
      </div>

      <dl className="dc-info">
        {info.map((i) => (
          <div key={i.label}><dt>{i.label}</dt><dd>{i.valor}</dd></div>
        ))}
      </dl>

      {emFamilia && aportesMes.length > 0 && (
        <section className="dc-secao">
          <h3>Quem aportou este mês</h3>
          <ul className="dc-pessoas">
            {aportesMes.map((a) => (
              <li key={a.uid ?? 'sem'}>
                <span>{nomePessoa(a.uid, familia, meuUid) ?? 'Não registrado'}</span>
                <strong>{fmt(a.valor)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="dc-secao">
        <h3>Movimentos{historico.length > 0 ? ` (${historico.length})` : ''}</h3>
        {historico.length === 0 ? (
          <p className="dc-vazio">Nenhum movimento ainda.</p>
        ) : (
          <ul className="dc-movs">
            {movimentosPagina.map((m) => {
              const autor = emFamilia ? nomePessoa(m.userId, familia, meuUid) : null
              return (
                <li key={m.id}>
                  <span className={`dc-mov-icone ${m.tipo}`}>
                    {m.tipo === 'entrada' ? <ArrowUp size={14} /> : m.tipo === 'rendimento' ? <Sparkles size={14} /> : <ArrowDown size={14} />}
                  </span>
                  <span className="dc-mov-info">
                    <span className="dc-mov-tit">{TIPO_LABEL[m.tipo]}{autor ? ` · ${autor}` : ''}</span>
                    <span className="dc-mov-sub">{fmtData(m.data)}{m.observacao ? ` · ${m.observacao}` : ''}</span>
                  </span>
                  <span className={`dc-mov-valor ${m.tipo}`}>{m.tipo === 'saida' ? '−' : '+'}{fmt(m.valor)}</span>
                  <button type="button" className="dc-mov-del" aria-label={`Excluir ${TIPO_LABEL[m.tipo].toLowerCase()} de ${fmt(m.valor)}`}
                    onClick={() => {
                      if (confirm(`Excluir ${TIPO_LABEL[m.tipo].toLowerCase()} de ${fmt(m.valor)}? O saldo da caixinha será corrigido.`)) onRemoverMovimento(m)
                    }}>
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {totalPaginas > 1 && (
          <div className="dc-pag">
            <button type="button" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual === 0} aria-label="Movimentos mais recentes">
              <ChevronLeft size={16} />
            </button>
            <span>
              {paginaAtual * POR_PAGINA + 1}–{Math.min((paginaAtual + 1) * POR_PAGINA, historico.length)} de {historico.length}
            </span>
            <button type="button" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual + 1 >= totalPaginas} aria-label="Movimentos mais antigos">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      <div className="dc-rodape">
        <button type="button" className="dc-btn" onClick={onEditar}><Pencil size={15} /> Editar caixinha</button>
        <button type="button" className="dc-btn perigo" onClick={onRemover} aria-label="Excluir caixinha"><Trash2 size={15} /></button>
      </div>

      <style>{`
        .dc { display: flex; flex-direction: column; gap: 1.1rem; }
        .dc-topo { display: flex; align-items: center; gap: 0.85rem; }
        .dc-icone { width: 46px; height: 46px; border-radius: 14px; background: #F4F5F8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dc-saldo { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .dc-saldo-label { font-size: 0.7rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .dc-saldo strong { font-size: 1.6rem; font-weight: 800; color: #2D3436; font-variant-numeric: tabular-nums; }
        .dc-badge { display: inline-flex; align-items: center; gap: 4px; background: #E8F5E9; color: #27AE60; border-radius: 20px; padding: 3px 9px; font-size: 0.72rem; font-weight: 700; white-space: nowrap; }
        .dc-prog { display: flex; flex-direction: column; gap: 4px; }
        .dc-prog span { font-size: 0.75rem; color: #95A5A6; }
        .dc-barra { height: 8px; background: #F1F2F6; border-radius: 4px; overflow: hidden; }
        .dc-barra > div { height: 100%; background: linear-gradient(90deg, #C8A45A, #D4AF37); border-radius: 4px; }
        .dc-acoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
        .dc-acao {
          display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px;
          border-radius: 12px; border: 1px solid #E6E9EE; background: #fff; color: #2D3436;
          font-family: inherit; font-size: 0.82rem; font-weight: 700; cursor: pointer;
        }
        .dc-acao.dep { background: #C8A45A; border-color: #C8A45A; color: #fff; }
        .dc-acao:disabled { opacity: 0.4; cursor: not-allowed; }
        .dc-info { margin: 0; display: flex; flex-direction: column; border: 1px solid #F1F2F6; border-radius: 14px; padding: 0 0.9rem; }
        .dc-info > div { display: flex; justify-content: space-between; gap: 1rem; padding: 0.65rem 0; border-bottom: 1px solid #F4F5F8; }
        .dc-info > div:last-child { border-bottom: none; }
        .dc-info dt { color: #95A5A6; font-size: 0.82rem; }
        .dc-info dd { margin: 0; color: #2D3436; font-size: 0.85rem; font-weight: 600; text-align: right; }
        .dc-secao { display: flex; flex-direction: column; gap: 0.5rem; }
        .dc-secao h3 { margin: 0; font-size: 0.72rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .dc-pessoas, .dc-movs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .dc-pessoas li { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #F4F5F8; font-size: 0.85rem; color: #2D3436; }
        .dc-pessoas li:last-child { border-bottom: none; }
        .dc-pessoas strong { color: #27AE60; font-variant-numeric: tabular-nums; }
        .dc-vazio { margin: 0; font-size: 0.82rem; color: #95A5A6; }
        .dc-movs li { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0; border-bottom: 1px solid #F4F5F8; }
        .dc-movs li:last-child { border-bottom: none; }
        .dc-mov-icone { width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dc-mov-icone.entrada { background: #E8F5E9; color: #27AE60; }
        .dc-mov-icone.saida { background: #FFF5F5; color: #E74C3C; }
        .dc-mov-icone.rendimento { background: rgba(200,164,90,0.12); color: #C8A45A; }
        .dc-mov-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .dc-mov-tit { font-size: 0.85rem; font-weight: 600; color: #2D3436; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dc-mov-sub { font-size: 0.74rem; color: #95A5A6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dc-mov-valor { font-weight: 700; font-size: 0.88rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .dc-mov-valor.entrada { color: #27AE60; }
        .dc-mov-valor.saida { color: #E74C3C; }
        .dc-mov-valor.rendimento { color: #C8A45A; }
        .dc-mov-del { background: none; border: none; color: #BDC3C7; cursor: pointer; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dc-mov-del:hover { color: #E74C3C; background: #FFF5F5; }
        .dc-pag { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding-top: 0.25rem; }
        .dc-pag span { font-size: 0.78rem; color: #95A5A6; font-variant-numeric: tabular-nums; }
        .dc-pag button {
          width: 40px; height: 40px; border-radius: 10px; border: 1px solid #E6E9EE; background: #fff; color: #636E72;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .dc-pag button:disabled { opacity: 0.35; cursor: not-allowed; }
        .dc-rodape { display: flex; gap: 0.5rem; padding-top: 0.25rem; }
        .dc-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px;
          border-radius: 12px; border: none; background: #F1F2F6; color: #2D3436;
          font-family: inherit; font-size: 0.88rem; font-weight: 700; cursor: pointer;
        }
        .dc-btn.perigo { flex: 0 0 52px; background: rgba(231,76,60,0.08); color: #C0392B; }
      `}</style>
    </div>
  )
}
