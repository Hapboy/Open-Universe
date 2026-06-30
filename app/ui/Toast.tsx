import { useAppContext } from '../store/AppContext.tsx';

export function Toast() {
  const { toast } = useAppContext();
  if (!toast) return null;
  return <div className="toast" style={{ opacity: 1, transform: 'translateY(0)' }}>{toast}</div>;
}
