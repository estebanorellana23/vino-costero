import { motion } from 'framer-motion';

/* Mini gráfica de línea (sparkline) para KPIs y filas de tabla. */
export function Spark({ data, color = '#0071e3', width = 120, height = 34 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (!data || data.length < 2) return null;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rango = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / rango) * (height - pad * 2);
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L ${x(data.length - 1).toFixed(1)} ${height - pad} L ${x(0).toFixed(1)} ${height - pad} Z`;
  const gid = 'g' + color.replace('#', '');
  return (
    <svg width={width} height={height} style={{ display: 'block' }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Gráfico principal: barras (producción) + línea superpuesta (ingresos). */
export function BarLine({ labels, bars, line }: { labels: string[]; bars: number[]; line: number[] }) {
  const W = 720, H = 260, padX = 8, padTop = 14, padBottom = 28;
  const n = bars.length;
  const maxBar = Math.max(...bars, 1);
  const maxLine = Math.max(...line, 1);
  const innerW = W - padX * 2;
  const bw = (innerW / n) * 0.58;
  const cx = (i: number) => padX + (i + 0.5) * (innerW / n);
  const by = (v: number) => padTop + (1 - v / maxBar) * (H - padTop - padBottom);
  const ly = (v: number) => padTop + (1 - v / maxLine) * (H - padTop - padBottom);
  const base = H - padBottom;
  const lineD = line.map((v, i) => `${i === 0 ? 'M' : 'L'} ${cx(i).toFixed(1)} ${ly(v).toFixed(1)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* líneas guía horizontales */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padX} x2={W - padX} y1={padTop + f * (H - padTop - padBottom)} y2={padTop + f * (H - padTop - padBottom)}
          stroke="var(--border)" strokeWidth="1" />
      ))}
      {/* barras */}
      {bars.map((v, i) => (
        <motion.rect
          key={i}
          x={cx(i) - bw / 2}
          width={bw}
          rx={4}
          fill="#0071e3"
          initial={{ height: 0, y: base }}
          whileInView={{ height: base - by(v), y: by(v) }}
          viewport={{ once: true }}
          transition={{ type: 'spring', bounce: 0, duration: 0.7, delay: i * 0.03 }}
        />
      ))}
      {/* línea */}
      <motion.path d={lineD} fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} />
      {line.map((v, i) => <circle key={i} cx={cx(i)} cy={ly(v)} r="2.5" fill="#1d1d1f" />)}
      {/* etiquetas de mes */}
      {labels.map((m, i) => (
        <text key={i} x={cx(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-2)">{m}</text>
      ))}
    </svg>
  );
}
