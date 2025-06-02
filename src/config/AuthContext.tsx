"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseconfig';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import InactivityWarningModal from '@/components/InactivityWarningModal';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: string | null;
  logout: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  userRole: null,
  logout: async () => {} 
});

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora em milissegundos
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // 5 minutos em milissegundos
const CHECK_INTERVAL = 5000; // Verificar a cada 5 segundos
const LOGIN_SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hora em milissegundos - tempo máximo desde o login

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_BEFORE_TIMEOUT);
  const router = useRouter();
  const pathname = usePathname();

  const updateLastActivity = () => {
    if (user) {
      const now = Date.now();
      localStorage.setItem('lastActivity', now.toString());
      setShowWarningModal(false);
    }
  };

  const setLoginTime = () => {
    const now = Date.now();
    localStorage.setItem('loginTime', now.toString());
  };

  const checkLoginSession = () => {
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime && user) {
      const timeSinceLogin = Date.now() - parseInt(loginTime);
      
      // Se passou 1 hora desde o login, força logout
      if (timeSinceLogin >= LOGIN_SESSION_TIMEOUT) {
        console.log('Logout por expiração de sessão (1 hora desde login)');
        logout('inactivity');
        return true; // Indica que a sessão expirou
      }
    }
    return false; // Sessão ainda válida
  };

  const checkInactivity = () => {
    // Primeiro verifica se a sessão de login expirou
    if (checkLoginSession()) {
      return; // Se a sessão expirou, não precisa verificar inatividade
    }

    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity && user) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      const timeUntilLogout = INACTIVITY_TIMEOUT - timeSinceLastActivity;
      
      // Se faltam 5 minutos ou menos para o logout por inatividade e o modal ainda não está sendo exibido
      if (timeUntilLogout <= WARNING_BEFORE_TIMEOUT && timeUntilLogout > 0 && !showWarningModal) {
        setShowWarningModal(true);
        setRemainingTime(timeUntilLogout);
      }
      
      // Atualiza o tempo restante se o modal estiver aberto
      if (showWarningModal && timeUntilLogout > 0) {
        setRemainingTime(timeUntilLogout);
      }

      // Se o tempo de inatividade foi atingido ou o tempo restante é menor ou igual a 0
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT || timeUntilLogout <= 0) {
        setShowWarningModal(false); // Fecha o modal antes do logout
        console.log('Logout por inatividade');
        logout('inactivity');
      }
    }
  };

  const handleContinueSession = () => {
    updateLastActivity();
    setShowWarningModal(false);
  };

  const handleCloseWarning = () => {
    logout('inactivity');
  };

  const logout = async (reason?: string) => {
    try {
      // Primeiro fechamos o modal
      setShowWarningModal(false);
      
      // Pequeno delay para garantir que o modal feche
      await new Promise(resolve => setTimeout(resolve, 300));

      // Limpamos o localStorage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('loginTime');

      // Depois fazemos o redirecionamento
      if (reason === 'inactivity') {
        router.push('/inactivity-logout');
      } else {
        router.push('/login');
      }

      // Por fim fazemos logout do Firebase
      await auth.signOut();
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Verificar se há uma sessão válida ao montar o componente ou ao receber foco
  useEffect(() => {
    const checkSession = () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const loginTime = localStorage.getItem('loginTime');
      
      if (user && isAuthenticated && loginTime) {
        const timeSinceLogin = Date.now() - parseInt(loginTime);
        
        // Se passou 1 hora desde o login, força logout
        if (timeSinceLogin >= LOGIN_SESSION_TIMEOUT) {
          logout('inactivity');
          return;
        }
      } else if (!isAuthenticated && user) {
        logout('inactivity');
      }
    };

    // Verificar quando a janela recebe foco
    window.addEventListener('focus', checkSession);
    
    // Verificar quando a página é carregada
    checkSession();

    return () => {
      window.removeEventListener('focus', checkSession);
    };
  }, [user]);

  useEffect(() => {
    // Configurar listeners de eventos para detectar atividade
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll', 'click'];
    
    const handleActivity = () => {
      console.log('Atividade detectada');
      updateLastActivity();
    };

    // Inicializa o timestamp de atividade quando o componente monta
    if (user) {
      updateLastActivity();
    }

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Verificar inatividade e sessão periodicamente
    const inactivityInterval = setInterval(checkInactivity, CHECK_INTERVAL);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const userRef = doc(db, 'authorized_users', user.email!);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists() && userDoc.data().isActive) {
            setUser(user);
            setUserRole(userDoc.data().role);
            
            // Se é um novo login (não há loginTime), define o tempo de login
            const loginTime = localStorage.getItem('loginTime');
            if (!loginTime) {
              setLoginTime();
            }
            
            localStorage.setItem('isAuthenticated', 'true');
            updateLastActivity(); // Inicializa o timestamp de atividade
            
            if (pathname === '/login' || pathname === '/inactivity-logout') {
              router.push('/home');
            }
          } else {
            await logout('inactivity');
          }
        } else {
          const isAuthenticated = localStorage.getItem('isAuthenticated');
          if (!isAuthenticated && pathname !== '/login' && pathname !== '/inactivity-logout') {
            await logout(); // manter sem parametro
          } else if (!isAuthenticated) {
            setUser(null);
            setUserRole(null);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          await logout('inactivity');
        }
      } finally {
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityInterval);
      unsubscribe();
    };
  }, [pathname, user]);

  return (
    <AuthContext.Provider value={{ user, loading, userRole, logout }}>
      {!loading && (
        <>
          {children}
          <InactivityWarningModal
            open={showWarningModal}
            onClose={handleCloseWarning}
            onContinue={handleContinueSession}
            remainingTime={remainingTime}
          />
        </>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 