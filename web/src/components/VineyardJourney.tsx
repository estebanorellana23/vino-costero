import { useState } from 'react';

const etapas = [
  { nombre: 'Viñedo', titulo: 'Todo empieza en la parcela.', texto: 'Parcelas, siembras y condiciones del campo en un mismo lugar.', rol: 'Agrónomo · Campo' },
  { nombre: 'Cosecha', titulo: 'La uva, en su momento.', texto: 'Mediciones de azúcar y estado sanitario para acompañar la cosecha.', rol: 'Agrónomo · Siembras y maduración' },
  { nombre: 'Bodega', titulo: 'Cada cosecha tiene una historia.', texto: 'Lotes, fases de elaboración y catas para seguir la producción del vino.', rol: 'Enólogo · Producción' },
  { nombre: 'Despacho', titulo: 'Del viñedo a su destino.', texto: 'Compradores, pedidos y embarques para organizar la salida de cada lote.', rol: 'Logística · Comercial' },
];

/** Recorrido explicativo manual: no compite con el formulario ni avanza solo. */
export function VineyardJourney() {
  const [actual, setActual] = useState(0);
  const [teclado, setTeclado] = useState(false);
  const etapa = etapas[actual];
  return (
    <section className={'vineyard-journey' + (teclado ? ' journey-instant' : '')} aria-label="De la parcela al despacho">
      <div className="journey-brand"><span aria-hidden="true">VC</span> Vino Costero</div>
      <p className="journey-eyebrow">De la parcela al despacho</p>
      <h1>El trabajo de todos.<br />La historia de cada vino.</h1>
      <div className="journey-art" aria-hidden="true">
        <svg viewBox="0 0 640 310" fill="none">
          <circle cx="508" cy="65" r="35" fill="#DEB872" />
          <path d="M0 170Q140 60 315 156T640 125V310H0Z" fill="#ADB998" />
          <path d="M0 225Q160 110 350 203T640 164V310H0Z" fill="#728568" />
          <path d="M0 277Q190 176 390 254T640 224V310H0Z" fill="#425B48" />
          <g className={'journey-layer' + (actual < 2 ? ' is-visible' : '')}>
            {[0, 1, 2].map(row => <g key={row} transform={`translate(${row * 26},${row * 32})`}>
              <path d="M45 154L420 215" stroke="#C7BDA2" strokeWidth="3" />
              {[0, 1, 2, 3, 4, 5].map(vine => <g key={vine} transform={`translate(${60 + vine * 64},${153 + vine * 10})`}>
                <path d="M0 0V36" stroke="#5D4434" strokeWidth="4" />
                <path d="M-20 0Q-16-23 0-8Q20-28 26-4Q14 13 0 4Q-12 12-20 0" fill="#304E39" />
                <g fill="#71394F"><circle cx="-3" cy="8" r="5" /><circle cx="5" cy="10" r="5" /><circle cx="1" cy="17" r="5" /></g>
              </g>)}
            </g>)}
          </g>
          <g className={'journey-layer' + (actual === 1 ? ' is-visible' : '')}>
            <path d="M446 215H580L568 283H458Z" fill="#B88750" stroke="#E8C799" strokeWidth="4" />
            <path d="M454 236H576M460 257H572" stroke="#795538" strokeWidth="3" />
            {[0,1,2,3,4].map(n => <g key={n} fill="#653047" transform={`translate(${465 + n * 23},210)`}><circle r="13"/><circle cy="-13" r="10"/></g>)}
          </g>
          <g className={'journey-layer' + (actual === 2 ? ' is-visible' : '')}>
            <path d="M140 164L300 77L462 164V283H140Z" fill="#E9DCC2" />
            <path d="M122 166L300 65L480 166" stroke="#71394F" strokeWidth="14" strokeLinejoin="round" />
            <path d="M255 283V208A45 45 0 0 1 345 208V283" fill="#493C39" />
            {[190,407].map(x => <g key={x}><ellipse cx={x} cy="247" rx="30" ry="39" fill="#A87C4F" /><path d={`M${x-27} 230H${x+27}M${x-27} 263H${x+27}`} stroke="#5E5345" strokeWidth="6" /></g>)}
          </g>
          <g className={'journey-layer' + (actual === 3 ? ' is-visible' : '')}>
            <path d="M0 279H640" stroke="#CFBE9D" strokeWidth="16" />
            <rect x="180" y="153" width="210" height="104" rx="6" fill="#E9DCC2" />
            <path d="M390 189H456L492 230V257H390Z" fill="#71394F" />
            <path d="M407 201H449L470 229H407Z" fill="#B3C7BD" />
            <circle cx="225" cy="263" r="24" fill="#343D37" /><circle cx="445" cy="263" r="24" fill="#343D37" />
            <circle cx="225" cy="263" r="10" fill="#CFBE9D" /><circle cx="445" cy="263" r="10" fill="#CFBE9D" />
            <text x="220" y="215" fill="#71394F" fontSize="22" fontFamily="Georgia,serif">Vino Costero</text>
          </g>
        </svg>
      </div>
      <div className="journey-steps" role="group" aria-label="Explorar etapas del vino">
        {etapas.map((item, i) => <button key={item.nombre} type="button" aria-pressed={i === actual} aria-controls="journey-description" onClick={e => { setTeclado(e.detail === 0); setActual(i); }}><span className="journey-step-number" aria-hidden="true">{i + 1}</span>{item.nombre}</button>)}
      </div>
      <div id="journey-description" className="journey-description" aria-live="polite" aria-atomic="true">
        <h2>{etapa.titulo}</h2><p>{etapa.texto}</p><span>{etapa.rol}</span>
      </div>
    </section>
  );
}
