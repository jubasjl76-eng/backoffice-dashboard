import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession, login as apiLogin, logout as apiLogout, type Session } from './api';

interface AuthCtx {
  session: Session | null;
  user: Session['user'] | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());

  const login = useCallback(async (email: string, password: string) => {
    setSession(await apiLogin(email, password));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setSession(null);
  }, []);

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}
