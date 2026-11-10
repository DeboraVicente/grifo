import type { VisaoEscopo } from '../../lib/escopo'

/** Filtro de escopo no mesmo formato dos filtros de Status/Tipo/Método das despesas. */
export default function SelectEscopo({ valor, onChange }: { valor: VisaoEscopo; onChange: (v: VisaoEscopo) => void }) {
  return (
    <select className={`filtro-select ${valor !== 'tudo' ? 'ativo' : ''}`} value={valor}
      onChange={(e) => onChange(e.target.value as VisaoEscopo)} aria-label="Escopo">
      <option value="tudo">Escopo: Todos</option>
      <option value="familiar">Família</option>
      <option value="pessoal">Pessoal</option>
    </select>
  )
}
