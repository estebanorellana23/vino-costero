import { useEffect, useRef } from 'react';

export function PageNotice({ error, onRetry }: { error: string; onRetry: () => Promise<unknown> }) {
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) notice.current?.focus(); }, [error]);
  if (!error) return null;
  return <div className="error page-notice" role="alert" tabIndex={-1} ref={notice}>
    <p>{error}</p>
    <button type="button" className="chip" onClick={() => { void onRetry().catch(() => {}); }}>Actualizar datos</button>
    <small>Actualizar consulta los registros; no vuelve a enviar el formulario.</small>
  </div>;
}
