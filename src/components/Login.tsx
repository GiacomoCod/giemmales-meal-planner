import { useState } from 'react';
import { Home, Lock, ArrowRight, AlertTriangle, User as UserIcon } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import './Login.css';

const selfSignupEnabled = import.meta.env.VITE_ENABLE_SELF_SIGNUP === 'true';

const getAuthErrorMessage = (code?: string) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Credenziali non valide. Riprova.';
    case 'auth/email-already-in-use':
      return 'Questo nome utente e gia in uso. Prova ad accedere.';
    case 'auth/weak-password':
      return 'Usa una password piu sicura (minimo 6 caratteri).';
    case 'auth/invalid-email':
      return 'Nome utente non valido.';
    case 'auth/operation-not-allowed':
      return "L'accesso con email e password non e abilitato su Firebase.";
    case 'auth/network-request-failed':
      return 'Problema di rete durante il login. Controlla la connessione e riprova.';
    case 'auth/too-many-requests':
      return 'Troppi tentativi di accesso. Attendi qualche minuto e riprova.';
    case 'auth/invalid-api-key':
      return 'Configurazione Firebase non valida in questa build.';
    case 'auth/app-deleted':
    case 'auth/invalid-app-credential':
    case 'auth/configuration-not-found':
      return 'Configurazione di autenticazione Firebase incompleta o non trovata.';
    case 'auth/user-disabled':
      return 'Questo account e stato disabilitato.';
    default:
      return code
        ? `Errore durante l'autenticazione (${code}). Riprova.`
        : "Errore durante l'autenticazione. Riprova.";
  }
};

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Inserisci sia nome utente che password.');
      return;
    }

    setLoading(true);
    setError(null);

    const fakeEmail = `${username.toLowerCase().trim()}@homeplanner.local`;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
      } else {
        if (!selfSignupEnabled) {
          setError('La registrazione pubblica è disattivata per questa istanza.');
          return;
        }
        await createUserWithEmailAndPassword(auth, fakeEmail, password);
      }
    } catch (err: any) {
      console.error("[AUTH ERROR]:", err);
      setError(getAuthErrorMessage(err?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="login-icon-box">
              <Home size={34} strokeWidth={2.5} className="login-icon" />
            </div>
            <h1>HOME PLANNER</h1>
          </div>
          <p className="login-subtitle">
            {isLogin 
              ? "Bentornato a casa. Accedi per continuare" 
              : "La tua nuova casa digitale. Crea l'account"}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Nome Utente</label>
            <div className="input-wrapper">
              <UserIcon className="input-icon" size={20} />
              <input 
                type="text" 
                placeholder="es. giemmale" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Attendere...' : (isLogin ? 'Accedi' : 'Registrati')}
            {!loading && <ArrowRight size={20} strokeWidth={2.5} />}
          </button>
        </form>

        <div className="login-footer">
          {selfSignupEnabled ? (
            <>
              <p>
                {isLogin ? "Non hai ancora un'abitazione?" : "Hai già un'abitazione?"}
              </p>
              <button
                className="toggle-mode-btn"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
              >
                {isLogin ? 'Crea un nuovo account' : 'Accedi qui'}
              </button>
            </>
          ) : (
            <p>Registrazione gestita manualmente per questa istanza.</p>
          )}
        </div>
      </div>
    </div>
  );
}
