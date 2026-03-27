import { useState, useRef, useEffect } from 'react';
import { updateProfile, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Lock, User as UserIcon, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import './SettingsSection.css';

interface SettingsSectionProps {
  user: User;
  isGiemmale: boolean;
  activeProfileId: string;
}

export function SettingsSection({ user, isGiemmale, activeProfileId }: SettingsSectionProps) {
  const [houseName, setHouseName] = useState(isGiemmale ? 'Casa dei Giemmale' : (user.displayName || user.email?.split('@')[0] || ''));
  const [photoUrl, setPhotoUrl] = useState(user.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      const colName = activeProfileId === 'giemmale' ? 'metadata' : `profiles/${activeProfileId}/metadata`;
      try {
        const snap = await getDoc(doc(db, colName, 'profile'));
        if (snap.exists() && snap.data().avatarBase64) {
          setPhotoUrl(snap.data().avatarBase64);
        }
      } catch (err) {
        console.error("Error fetching avatar", err);
      }
    };
    fetchAvatar();
  }, [activeProfileId]);

  const displayPicture = photoUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=200&h=200';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("L'immagine è troppo grande. Scegli un file più piccolo di 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotoUrl(compressedDataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // Limit Firebase Auth displayName update since photoUrl base64 is too huge
      await updateProfile(user, { displayName: houseName });
      
      // Store the large Base64 Avatar strictly inside Firestore! (Limit 1MB per document)
      const colName = activeProfileId === 'giemmale' ? 'metadata' : `profiles/${activeProfileId}/metadata`;
      await setDoc(doc(db, colName, 'profile'), { avatarBase64: photoUrl }, { merge: true });

      setSuccessMsg('Profilo aggiornato con successo!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Errore durante l'aggiornamento del profilo.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('La password deve avere almeno 6 caratteri.');
      return;
    }
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await firebaseUpdatePassword(user, newPassword);
      setSuccessMsg('Password aggiornata con successo!');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setErrorMsg("Devi uscire e fare di nuovo l'accesso per cambiare password.");
      } else {
        setErrorMsg("Errore durante l'aggiornamento della password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-header">
          <h2>Gestione Account</h2>
          <p>Personalizza la tua casa virtuale</p>
        </div>

        {successMsg && (
          <div className="settings-alert success">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="settings-alert error">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="settings-grid">
          <form className="settings-form" onSubmit={handleUpdateProfile}>
            <h3>
              <UserIcon size={20} className="settings-icon" />
              Profilo della Casa
            </h3>
            
            <div className="avatar-section">
              <div 
                className="settings-avatar-wrapper"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={displayPicture} alt="Avatar" className="settings-avatar" />
                <div className="avatar-overlay">
                  <Camera size={24} />
                  <span>Scegli foto</span>
                </div>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
            </div>

            <div className="input-group">
              <label>Nome della Casa</label>
              <input 
                type="text" 
                placeholder="Nome..." 
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                disabled={isGiemmale}
              />
              {isGiemmale && <small className="hint-text">Il nome di questa casa principale non è modificabile.</small>}
            </div>

            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva Profilo'}
              <Save size={18} />
            </button>
          </form>

          <form className="settings-form" onSubmit={handleUpdatePassword}>
            <h3>
              <Lock size={20} className="settings-icon" />
              Sicurezza
            </h3>
            
            <div className="input-group">
              <label>Nuova Password</label>
              <input 
                type="password" 
                placeholder="Nuova password..." 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <small className="hint-text">Se hai effettuato l'accesso da molto tempo, Firebase ti chiederà di ricollegarti prima di permetterti di aggiornarla.</small>
            </div>

            <button type="submit" className="save-btn" disabled={loading || !newPassword}>
              {loading ? 'Salvataggio...' : 'Aggiorna Password'}
              <Lock size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
