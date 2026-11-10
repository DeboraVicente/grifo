import { Check, Pencil, PiggyBank, Trash2 } from 'lucide-react'
import type { GastoPrevisto } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'
import ListaMobile, { ResumoMobile, useEhMobile } from '../ui/ListaMobile'
import { descreverIntervalo, descreverPrazo, fmtBRL, resumir } from '../../lib/previstos'

interface Props {
  previstos: GastoPrevisto[]
  onReservar: (g: GastoPrevisto) => void
  onConcluir: (g: GastoPrevisto) => void
  onEditar: (g: GastoPrevisto) => void
  onRemover: (g: GastoPrevisto) => void
}

const STATUS_LABEL = { atrasado: 'Atrasado', chegando: 'Chegando', 'em-dia': 'Em dia' } as const

const fmtData = (iso: string) =>
  new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })

/** Gastos previstos em tabela (mesmo visual das tabelas de despesas e receitas). */
export default function TabelaPrevistos({ previstos, onReservar, onConcluir, onEditar, onRemover }: Props) {
  const ehMobile = useEhMobile()
  const totais = previstos.reduce((acc, g) => {
    const r = resumir(g)
    acc.estimado += g.valorEstimado
    acc.reservado += g.valorReservado
    acc.pendenteMes += r.pendenteNoMes
    return acc
  }, { estimado: 0, reservado: 0, pendenteMes: 0 })

  if (ehMobile) {
    return (
      <div className="tp-mobile">
        {previstos.length > 0 && (
          <ResumoMobile itens={[
            { label: 'Estimado', valor: fmtBRL(totais.estimado) },
            { label: 'Reservado', valor: fmtBRL(totais.reservado) },
            { label: 'No mês', valor: fmtBRL(totais.pendenteMes), cor: '#C8A45A', destaque: true },
          ]} />
        )}
        <ListaMobile
          vazio="Nenhum previsto."
          grupos={[{
            itens: previstos.map((g) => {
              const r = resumir(g)
              return {
                id: g.id,
                icone: <CategoryIcon categoria={g.categoria} size={18} color="#636e72" />,
                titulo: g.nome,
                detalhes: [fmtData(g.proximaData), descreverPrazo(r.dias)],
                valor: fmtBRL(g.valorEstimado),
                status: <span className={`tp-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>,
                extra: (
                  <span className="tp-m-prog">
                    <span className="tp-barra"><span style={{ width: `${r.progresso}%` }} /></span>
                    <span className="tp-sub">{fmtBRL(g.valorReservado)} reservado · {Math.round(r.progresso)}%</span>
                  </span>
                ),
                acaoRapida: r.pendenteNoMes >= 0.01
                  ? { label: 'Reservar', icone: <PiggyBank size={14} />, onClick: () => onReservar(g) }
                  : undefined,
                ficha: [
                  { label: 'Frequência', valor: descreverIntervalo(g.intervaloMeses) },
                  { label: 'Próxima', valor: `${fmtData(g.proximaData)} · ${descreverPrazo(r.dias)}` },
                  { label: 'Valor estimado', valor: fmtBRL(g.valorEstimado) },
                  { label: 'Reservado', valor: `${fmtBRL(g.valorReservado)} (${Math.round(r.progresso)}%)` },
                  { label: 'Reservar no mês', valor: r.pendenteNoMes >= 0.01 ? fmtBRL(r.pendenteNoMes) : '—' },
                ],
                acoes: [
                  { label: 'Reservar', icone: <PiggyBank size={16} />, tom: 'primaria', onClick: () => onReservar(g) },
                  { label: 'Concluir', icone: <Check size={16} />, tom: 'neutra', onClick: () => onConcluir(g) },
                  { label: 'Editar', icone: <Pencil size={16} />, tom: 'neutra', onClick: () => onEditar(g) },
                  { label: 'Excluir', icone: <Trash2 size={16} />, tom: 'perigo', onClick: () => onRemover(g) },
                ],
              }
            }),
          }]}
        />
        <style>{`
          .tp-mobile { display: flex; flex-direction: column; gap: 0.85rem; }
          .tp-m-prog { display: flex; flex-direction: column; gap: 3px; }
          .tp-mobile .tp-barra { display: block; height: 5px; background: #ECEFF1; border-radius: 3px; overflow: hidden; }
          .tp-mobile .tp-barra > span { display: block; height: 100%; background: #C8A45A; border-radius: 3px; }
          .tp-mobile .tp-sub { font-size: 0.72rem; color: #95A5A6; }
          .tp-status { display: inline-block; font-size: 0.66rem; font-weight: 700; border-radius: 6px; padding: 0.15rem 0.45rem; white-space: nowrap; }
          .tp-status.em-dia { background: rgba(39,174,96,0.1); color: #1E8449; }
          .tp-status.chegando { background: rgba(230,126,34,0.12); color: #B9690F; }
          .tp-status.atrasado { background: rgba(231,76,60,0.1); color: #C0392B; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="tp-wrap">
      <div className="tp-scroll">
        <table className="tp-tabela">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Próxima</th>
              <th className="tp-num">Valor</th>
              <th className="tp-col-res">Reservado</th>
              <th className="tp-num tp-col-mes">Reservar no mês</th>
              <th className="tp-col-status">Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {previstos.map((g) => {
              const r = resumir(g)
              return (
                <tr key={g.id}>
                  <td>
                    <div className="tp-desc">
                      <span className="tp-icone"><CategoryIcon categoria={g.categoria} size={16} color="#636e72" /></span>
                      <span className="tp-desc-info">
                        <span className="tp-nome">{g.nome}</span>
                        <span className="tp-sub">{descreverIntervalo(g.intervaloMeses)}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="tp-data">{fmtData(g.proximaData)}</span>
                    <span className="tp-sub">{descreverPrazo(r.dias)}</span>
                  </td>
                  <td className="tp-num tp-valor">{fmtBRL(g.valorEstimado)}</td>
                  <td className="tp-col-res">
                    <div className="tp-barra"><div style={{ width: `${r.progresso}%` }} /></div>
                    <span className="tp-sub">{fmtBRL(g.valorReservado)} · {Math.round(r.progresso)}%</span>
                  </td>
                  <td className="tp-num tp-col-mes">{r.pendenteNoMes >= 0.01 ? fmtBRL(r.pendenteNoMes) : '—'}</td>
                  <td className="tp-col-status"><span className={`tp-status ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td>
                    <div className="tp-acoes">
                      <button onClick={() => onReservar(g)} aria-label={`Reservar para ${g.nome}`} title="Reservar"><PiggyBank size={14} /></button>
                      <button onClick={() => onConcluir(g)} aria-label={`Concluir ${g.nome}`} title="Concluir"><Check size={14} /></button>
                      <button onClick={() => onEditar(g)} aria-label={`Editar ${g.nome}`} title="Editar"><Pencil size={14} /></button>
                      <button className="del" onClick={() => onRemover(g)} aria-label={`Excluir ${g.nome}`} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="tp-footer">
        <span className="tp-contagem">{previstos.length} {previstos.length === 1 ? 'previsto' : 'previstos'}</span>
        <div className="tp-subtotais">
          <div className="tp-subtotal"><span>Estimado</span><strong>{fmtBRL(totais.estimado)}</strong></div>
          <div className="tp-subtotal"><span>Reservado</span><strong>{fmtBRL(totais.reservado)}</strong></div>
          <div className="tp-subtotal destaque"><span>Reservar no mês</span><strong>{fmtBRL(totais.pendenteMes)}</strong></div>
        </div>
      </div>

      <style>{`
        .tp-wrap { background: #fff; border: 1px solid #F1F2F6; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .tp-scroll { overflow-x: auto; }
        .tp-tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .tp-tabela thead tr { background: #F8F9FA; border-bottom: 1px solid #F1F2F6; }
        .tp-tabela th {
          padding: 0.85rem 1rem; color: #95A5A6; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase; text-align: left; white-space: nowrap;
        }
        .tp-tabela tbody tr { border-bottom: 1px solid #F8F9FA; }
        .tp-tabela tbody tr:hover { background: #FAFBFC; }
        .tp-tabela td { padding: 0.85rem 1rem; vertical-align: middle; color: #636E72; }
        .tp-tabela .tp-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .tp-desc { display: flex; align-items: center; gap: 0.75rem; }
        .tp-icone { width: 32px; height: 32px; background: #F8F9FA; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tp-desc-info { display: flex; flex-direction: column; min-width: 0; }
        .tp-nome { font-weight: 600; color: #2D3436; font-size: 0.88rem; }
        .tp-sub { display: block; font-size: 0.72rem; color: #95A5A6; white-space: nowrap; }
        .tp-data { display: block; color: #2D3436; font-weight: 600; white-space: nowrap; }
        .tp-valor { font-weight: 700; color: #2D3436; }
        .tp-col-res { min-width: 130px; }
        .tp-barra { height: 6px; background: #ECEFF1; border-radius: 3px; overflow: hidden; margin-bottom: 0.3rem; }
        .tp-barra > div { height: 100%; background: #C8A45A; border-radius: 3px; }
        .tp-status { display: inline-block; font-size: 0.7rem; font-weight: 700; border-radius: 6px; padding: 0.2rem 0.5rem; white-space: nowrap; }
        .tp-status.em-dia { background: rgba(39,174,96,0.1); color: #1E8449; }
        .tp-status.chegando { background: rgba(230,126,34,0.12); color: #B9690F; }
        .tp-status.atrasado { background: rgba(231,76,60,0.1); color: #C0392B; }
        .tp-acoes { display: flex; gap: 0.15rem; justify-content: flex-end; }
        .tp-acoes button { background: none; border: none; color: #BDC3C7; cursor: pointer; padding: 0.35rem; border-radius: 6px; display: flex; }
        .tp-acoes button:hover { color: #C8A45A; background: #F8F9FA; }
        .tp-acoes button.del:hover { color: #E74C3C; }
        .tp-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.9rem 1rem; border-top: 1px solid #F1F2F6; flex-wrap: wrap; }
        .tp-contagem { font-size: 0.78rem; color: #95A5A6; }
        .tp-subtotais { display: flex; gap: 1.5rem; }
        .tp-subtotal { display: flex; flex-direction: column; align-items: flex-end; }
        .tp-subtotal span { font-size: 0.65rem; color: #95A5A6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .tp-subtotal strong { font-size: 0.9rem; color: #2D3436; font-variant-numeric: tabular-nums; }
        .tp-subtotal.destaque { border-left: 1px solid #F1F2F6; padding-left: 1.5rem; }
        .tp-subtotal.destaque strong { color: #C8A45A; }
        @media (max-width: 640px) {
          .tp-col-res, .tp-col-mes, .tp-col-status { display: none; }
          .tp-subtotais { gap: 0.75rem; }
          .tp-subtotal.destaque { padding-left: 0.75rem; }
        }
      `}</style>
    </div>
  )
}
