/** Estilos compartilhados dos gastos previstos (cards, formulários e alerta do Início). */
export default function EstilosPrevistos() {
  return (
    <style>{`
      .gp-lista { display: grid; gap: 0.85rem; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }

      .gp-card {
        background: #FFF; border: 1px solid #F1F2F6; border-radius: 18px; padding: 1rem;
        display: flex; flex-direction: column; gap: 0.7rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      }
      .gp-card.gp-chegando { border-color: #F6E3B4; }
      .gp-card.gp-atrasado { border-color: #F5C6C6; }
      .gp-card-topo { display: flex; align-items: center; gap: 0.75rem; }
      .gp-card-icone { width: 40px; height: 40px; border-radius: 12px; background: #F8F9FA; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .gp-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .gp-card-info strong { color: #2D3436; font-size: 0.98rem; }
      .gp-card-info span { color: #95A5A6; font-size: 0.8rem; }

      .gp-menu-wrap { position: relative; }
      .gp-icone-btn { background: none; border: none; color: #95A5A6; padding: 6px; border-radius: 8px; cursor: pointer; }
      .gp-menu { position: absolute; right: 0; top: 34px; z-index: 20; background: #FFF; border: 1px solid #F1F2F6; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); padding: 0.35rem; min-width: 190px; }
      .gp-menu button { display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.65rem 0.7rem; border: none; background: none; border-radius: 8px; font-weight: 600; font-size: 0.86rem; color: #2D3436; cursor: pointer; font-family: inherit; }
      .gp-menu button:hover { background: #F8F9FA; }
      .gp-menu .gp-perigo { color: #D63031; }

      .gp-prazo { display: flex; align-items: center; justify-content: space-between; }
      .gp-pill { font-size: 0.74rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 999px; }
      .gp-pill-em-dia { background: #F1F2F6; color: #636E72; }
      .gp-pill-chegando { background: #FFF4D6; color: #A87A12; }
      .gp-pill-atrasado { background: #FDE8E8; color: #C0392B; }
      .gp-data { color: #95A5A6; font-size: 0.8rem; }

      .gp-barra { height: 7px; background: #F1F2F6; border-radius: 4px; overflow: hidden; }
      .gp-barra div { height: 100%; background: #C8A45A; border-radius: 4px; transition: width 0.4s; }
      .gp-valores { display: flex; justify-content: space-between; font-size: 0.78rem; color: #636E72; }

      .gp-lembrete { display: flex; align-items: center; gap: 0.45rem; background: #FFFDF7; border: 1px solid #F3E7C9; color: #636E72; border-radius: 10px; padding: 0.55rem 0.7rem; font-size: 0.83rem; }
      .gp-lembrete strong { color: #A87A12; }
      .gp-lembrete svg { color: #C8A45A; flex-shrink: 0; }

      .gp-card-acoes { display: flex; gap: 0.5rem; }
      .gp-card-acoes button { flex: 1; justify-content: center; }

      .gp-btn, .gp-btn-sec, .gp-btn-ghost {
        display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 12px; padding: 0.7rem 1.1rem;
        font-weight: 700; font-size: 0.88rem; cursor: pointer; font-family: inherit;
      }
      .gp-btn { background: #C8A45A; color: #FFF; border: none; }
      .gp-btn:disabled { opacity: 0.5; }
      .gp-btn-sec { background: #F8F9FA; color: #2D3436; border: 1px solid #F1F2F6; }
      .gp-btn-ghost { background: none; color: #636E72; border: 1px solid #F1F2F6; }

      .gp-form { display: flex; flex-direction: column; gap: 1.05rem; }
      .gp-linha { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
      .gp-field { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
      .gp-field label { color: #95A5A6; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
      .gp-field input, .gp-field select, .gp-inline input {
        background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; color: #2D3436;
        padding: 0.75rem 0.9rem; outline: none; width: 100%; min-width: 0;
      }
      .gp-field input:focus, .gp-field select:focus { border-color: #C8A45A; background: #FFF; }
      .gp-hint { font-size: 0.78rem; color: #95A5A6; }
      .gp-chips, .gp-modelos { display: flex; flex-wrap: wrap; gap: 0.45rem; }
      .gp-chip { background: #F8F9FA; border: 1px solid #F1F2F6; color: #636E72; border-radius: 999px; padding: 0.45rem 0.85rem; font-size: 0.83rem; font-weight: 600; cursor: pointer; font-family: inherit; }
      .gp-chip.on { background: #FFFDF7; border-color: #C8A45A; color: #A87A12; }
      .gp-inline { display: flex; align-items: center; gap: 0.5rem; color: #636E72; font-size: 0.88rem; margin-top: 0.35rem; }
      .gp-inline input { width: 80px; text-align: center; }
      .gp-dica { background: #FFFDF7; border: 1px solid #F3E7C9; border-radius: 12px; padding: 0.7rem 0.9rem; font-size: 0.85rem; color: #636E72; line-height: 1.45; }
      .gp-dica strong { color: #A87A12; }
      .gp-acoes { display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 0.25rem; }

      .gp-segmento { display: flex; background: #F1F2F6; border-radius: 12px; padding: 3px; }
      .gp-segmento button { flex: 1; border: none; background: none; border-radius: 10px; padding: 0.55rem; font-weight: 700; color: #95A5A6; cursor: pointer; font-family: inherit; font-size: 0.88rem; }
      .gp-segmento button.on { background: #FFF; color: #2D3436; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }

      .gp-resumo-conclusao { background: #F8F9FA; border-radius: 12px; padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 0.4rem; }
      .gp-resumo-conclusao div { display: flex; justify-content: space-between; font-size: 0.86rem; color: #636E72; }
      .gp-resumo-conclusao strong { color: #2D3436; }
      .gp-neg { color: #C0392B !important; } .gp-pos { color: #27AE60 !important; }
      .gp-check { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.88rem; color: #2D3436; cursor: pointer; }
      .gp-check input { width: 18px; height: 18px; accent-color: #C8A45A; margin-top: 1px; flex-shrink: 0; }

      /* Alerta no Início */
      .gp-alerta {
        position: relative; width: 100%; text-align: left; cursor: pointer; font-family: inherit;
        background: #FFF; border: 1px solid #F3E7C9; border-radius: 18px; padding: 0.9rem 2.4rem 0.9rem 1rem;
        display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(200,164,90,0.08);
      }
      .gp-alerta:active { transform: scale(0.99); }
      .gp-alerta-topo { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
      .gp-alerta-topo strong { color: #2D3436; font-size: 0.95rem; }
      .gp-alerta-topo span { color: #A87A12; font-size: 0.8rem; font-weight: 700; }
      .gp-alerta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.86rem; color: #2D3436; }
      .gp-alerta-nome { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gp-alerta-det { color: #95A5A6; font-size: 0.8rem; white-space: nowrap; }
      .gp-txt-chegando, .gp-ico-chegando { color: #A87A12; }
      .gp-txt-atrasado, .gp-ico-atrasado { color: #C0392B; }
      .gp-ico-reserva { color: #C8A45A; }
      .gp-alerta-mais { font-size: 0.78rem; color: #95A5A6; }
      .gp-alerta-seta { position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); color: #B2BEC3; }

      .gp-topo { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
      .gp-total { display: flex; flex-direction: column; }
      .gp-total span { font-size: 0.72rem; color: #95A5A6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .gp-total strong { font-size: 1.4rem; color: #2D3436; }
      .gp-vazio { text-align: center; padding: 3rem 1rem; color: #95A5A6; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
      .gp-vazio p { max-width: 320px; line-height: 1.5; font-size: 0.9rem; }
    `}</style>
  )
}
