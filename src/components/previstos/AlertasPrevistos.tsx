import { ChevronRight, PiggyBank, Wrench } from 'lucide-react'
import type { GastoPrevisto } from '../../types'
import { descreverPrazo, fmtBRL, precisaAtencao, resumir } from '../../lib/previstos'

interface Props {
  previstos: GastoPrevisto[]
  onAbrir: () => void
}

/** Cartão no Início com o que precisa de atenção: reservar no mês ou data chegando. */
export default function AlertasPrevistos({ previstos, onAbrir }: Props) {
  const atencao = previstos.filter(precisaAtencao)
  if (atencao.length === 0) return null

  const totalMes = atencao.reduce((s, g) => s + resumir(g).pendenteNoMes, 0)

  return (
    <button className="gp-alerta" onClick={onAbrir}>
      <div className="gp-alerta-topo">
        <strong>Gastos previstos</strong>
        {totalMes >= 0.01 && <span>Reservar {fmtBRL(totalMes)} este mês</span>}
      </div>
      {atencao.slice(0, 3).map((g) => {
        const r = resumir(g)
        const chegando = r.status !== 'em-dia'
        return (
          <div key={g.id} className="gp-alerta-item">
            {chegando ? <Wrench size={15} className={`gp-ico-${r.status}`} /> : <PiggyBank size={15} className="gp-ico-reserva" />}
            <span className="gp-alerta-nome">{g.nome}</span>
            <span className={`gp-alerta-det ${chegando ? `gp-txt-${r.status}` : ''}`}>
              {chegando ? descreverPrazo(r.dias) : `reservar ${fmtBRL(r.pendenteNoMes)}`}
            </span>
          </div>
        )
      })}
      {atencao.length > 3 && <div className="gp-alerta-mais">e mais {atencao.length - 3}</div>}
      <ChevronRight size={18} className="gp-alerta-seta" />
    </button>
  )
}
