import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Monogram = ({ size = 38 }) => (
  <div style={{ width: size, height: size }} className="grid place-items-center rounded-lg bg-ink text-brass font-serif font-bold text-xl ring-1 ring-brass/40">V</div>
);

// Shared page frame: brand bar + content container
export default function Shell({ title, nav, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monogram />
            <div className="leading-tight">
              <p className="font-serif text-lg font-semibold">VproTech Digital</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-brass">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-slate-500">{user.name}</span>
            {nav}
            <button onClick={logout} title="Sign out" className="p-2 rounded-lg hover:bg-brass-soft/60 transition"><LogOut size={18} /></button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
