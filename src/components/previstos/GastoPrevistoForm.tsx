import { useState } from 'react'
import type { Categoria, GastoPrevisto, GastoPrevistoForm as FormType } from '../../types'
import { fmtBRL, hojeISO, mesesParaReservar, somarMeses } from '../../lib/previstos'

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: 'locomocao', label: 'Carro / Locomoção' },
  { value: 'casa', label: 'Casa' },
  { value: 'saude', label: 'Saúde' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'educacao', label: 'Educação' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'outros', label: 'Outros' },
]

const INTERVALOS = [
  { meses: 1, label: 'Mensal' },
  { meses: 3, label: '3 meses' },
  { meses: 6, label: '6 meses' },
  { meses: 12, label: 'Anual' },
]

const AVISOS = [7, 15, 30]

// Sugestões para começar rápido
const MODELOS: { nome: string; categoria: Categoria; meses: number }[] = [
  { nome: 'Troca de óleo', categoria: 'locomocao', meses: 6 },
  { nome: 'Revisão do carro', categoria: 'locomocao', meses: 12 },
  { nome: 'IPVA', categoria: 'locomocao', meses: 12 },
  { nome: 'Dentista', categoria: 'saude', meses: 6 },
]

interface Props {
  inicial?: GastoPrevisto
  onSalvar: (form: FormType) => Promise<void>
  onCancelar: () => void
}

export default function GastoPrevistoForm({ inicial, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<FormType>(inicial ? {
    nome: inicial.nome,
    categoria: inicial.categoria,
    valorEstimado: inicial.valorEstimado,
    intervaloMeses: inicial.intervaloMeses,
    proximaData: inicial.proximaData,
    avisarDiasAntes: inicial.avisarDiasAntes,
    observacoes: inicial.observacoes ?? '',
  } : {
    nome: '', categoria: 'locomocao', valorEstimado: 0, intervaloMeses: 6,
    proximaData: somarMeses(hojeISO(), 6), avisarDiasAntes: 15, valorJaReservado: 0, observacoes: '',
  })
  const [outroIntervalo, setOutroIntervalo] = useState(
    !!inicial && !INTERVALOS.some((i) => i.meses === inicial.intervaloMeses),
  )
  const [salvando, setSalvando] = useState(false)

  const set = <K extends keyof FormType>(k: K, v: FormType[K]) => setForm((f) => ({ ...f, [k]: v }))

  const escolherIntervalo = (meses: number) => {
    setOutroIntervalo(false)
    setForm((f) => ({
      ...f,
      intervaloMeses: meses,
      // Num cadastro novo, a próxima data acompanha o intervalo escolhido
      proximaData: inicial ? f.proximaData : somarMeses(hojeISO(), meses),
    }))
  }

  const aplicarModelo = (m: typeof MODELOS[number]) => {
    setOutroIntervalo(false)
    setForm((f) => ({ ...f, nome: m.nome, categoria: m.categoria, intervaloMeses: m.meses, proximaData: somarMeses(hojeISO(), m.meses) }))
  }

  const jaGuardado = inicial ? inicial.valorReservado : (form.valorJaReservado ?? 0)
  const falta = Math.max(0, form.valorEstimado - jaGuardado)
  const meses = form.proximaData ? mesesParaReservar(form.proximaData) : 1
  const porMes = falta / meses

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try { await onSalvar(form) } finally { setSalvando(false) }
  }

  return (
    <form onSubmit={enviar} className="gp-form">
      {!inicial && (
        <div className="gp-modelos">
          {MODELOS.map((m) => (
            <button type="button" key={m.nome} className={`gp-chip ${form.nome === m.nome ? 'on' : ''}`} onClick={() => aplicarModelo(m)}>
              {m.nome}
            </button>
          ))}
        </div>
      )}

      <div className="gp-field">
        <label>O que é</label>
        <input type="text" placeholder="Ex: Troca de óleo" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
      </div>

      <div className="gp-linha">
        <div className="gp-field">
          <label>Valor estimado</label>
          <input type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="R$ 0,00"
            value={form.valorEstimado || ''} onChange={(e) => set('valorEstimado', parseFloat(e.target.value) || 0)} required />
        </div>
        <div className="gp-field">
          <label>Categoria</label>
          <select value={form.categoria} onChange={(e) => set('categoria', e.target.value as Categoria)}>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="gp-field">
        <label>Repete</label>
        <div className="gp-chips">
          {INTERVALOS.map((i) => (
            <button type="button" key={i.meses} className={`gp-chip ${!outroIntervalo && form.intervaloMeses === i.meses ? 'on' : ''}`}
              onClick={() => escolherIntervalo(i.meses)}>{i.label}</button>
          ))}
          <button type="button" className={`gp-chip ${outroIntervalo ? 'on' : ''}`} onClick={() => setOutroIntervalo(true)}>Outro</button>
        </div>
        {outroIntervalo && (
          <div className="gp-inline">
            A cada
            <input type="number" min="1" max="120" value={form.intervaloMeses}
              onChange={(e) => set('intervaloMeses', Math.max(1, parseInt(e.target.value) || 1))} />
            meses
          </div>
        )}
      </div>

      <div className="gp-linha">
        <div className="gp-field">
          <label>Próxima vez</label>
          <input type="date" value={form.proximaData} min={inicial ? undefined : hojeISO()}
            onChange={(e) => set('proximaData', e.target.value)} required />
        </div>
        {!inicial && (
          <div className="gp-field">
            <label>Já tenho guardado</label>
            <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="R$ 0,00"
              value={form.valorJaReservado || ''} onChange={(e) => set('valorJaReservado', parseFloat(e.target.value) || 0)} />
          </div>
        )}
      </div>

      <div className="gp-field">
        <label>Me avisar antes</label>
        <div className="gp-chips">
          {AVISOS.map((d) => (
            <button type="button" key={d} className={`gp-chip ${form.avisarDiasAntes === d ? 'on' : ''}`}
              onClick={() => set('avisarDiasAntes', d)}>{d} dias</button>
          ))}
        </div>
      </div>

      {form.valorEstimado > 0 && (
        <div className="gp-dica">
          {falta <= 0
            ? <>Você já tem o valor todo guardado. 🎉</>
            : <>Reservando <strong>{fmtBRL(porMes)}/mês</strong> por {meses} {meses === 1 ? 'mês' : 'meses'}, o dinheiro estará pronto na data.</>}
        </div>
      )}

      <div className="gp-field">
        <label>Observações</label>
        <input type="text" placeholder="Ex: óleo 5W30, oficina do João" value={form.observacoes ?? ''}
          onChange={(e) => set('observacoes', e.target.value)} />
      </div>

      <div className="gp-acoes">
        <button type="button" className="gp-btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="gp-btn" disabled={salvando}>{salvando ? 'Salvando...' : inicial ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  )
}
