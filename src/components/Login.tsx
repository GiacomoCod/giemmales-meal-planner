import { useState } from 'react';
import { Home, Lock, ArrowRight, AlertTriangle, User as UserIcon } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import './Login.css';

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
        await createUserWithEmailAndPassword(auth, fakeEmail, password);
      }
    } catch (err: any) {
      console.error("[AUTH ERROR]:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Credenziali non valide. Riprova.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Questo nome utente è già in uso. Prova ad accedere.');
      } else if (err.code === 'auth/weak-password') {
        setError('Usa una password più sicura (minimo 6 caratteri).');
      } else if (err.code === 'auth/invalid-email') {
        setError('Nome utente non valido.');
      } else {
        setError("Errore durante l'autenticazione. Riprova.");
      }
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
        </div>
      </div>
    </div>
  );
}
