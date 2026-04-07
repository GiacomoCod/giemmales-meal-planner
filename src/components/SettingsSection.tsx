import { useState, useRef, useEffect } from 'react';
import { updateProfile, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Save, 
  Lock, 
  User as UserIcon, 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  ArrowLeft,
  Palette,
  ShieldCheck,
  Calendar as CalendarIcon,
  ShoppingCart,
  BookOpen,
  Sparkles,
  Wallet
} from 'lucide-react';
import './SettingsSection.css';

interface SettingsSectionProps {
  user: User | null;
  isGiemmale: boolean;
  activeProfile: { id: string; name: string; title: string; isGiemmale?: boolean };
  visibleSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
  isMobile: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function SettingsSection({ 
  user, 
  isGiemmale, 
  activeProfile, 
  visibleSections, 
  onToggleSection, 
  isMobile,
  isDarkMode,
  onToggleDarkMode
}: SettingsSectionProps) {
  const [activeView, setActiveView] = useState<'menu' | 'profile' | 'security' | 'customization' | 'privacy'>(isMobile ? 'menu' : 'profile');
  
  const [houseName, setHouseName] = useState(isGiemmale ? 'Casa dei Giemmale' : (user?.displayName || user?.email?.split('@')[0] || ''));
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync active view when switching between mobile and desktop if needed
  useEffect(() => {
    if (!isMobile && activeView === 'menu') {
      setActiveView('profile');
    }
  }, [isMobile, activeView]);

  useEffect(() => {
    const fetchAvatar = async () => {
      const colName = activeProfile.id === 'giemmale' ? 'metadata' : `profiles/${activeProfile.id}/metadata`;
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
  }, [activeProfile.id]);

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
    if (!user) return;
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // Limit Firebase Auth displayName update since photoUrl base64 is too huge
      await updateProfile(user, { displayName: houseName });
      
      // Store the large Base64 Avatar strictly inside Firestore! (Limit 1MB per document)
      const colName = activeProfile.id === 'giemmale' ? 'metadata' : `profiles/${activeProfile.id}/metadata`;
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
    if (!user) return;
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

  const renderProfileForm = () => (
    <form className="settings-form" onSubmit={handleUpdateProfile}>
      <div className="form-inner">
        <h3>
          <UserIcon size={20} className="settings-icon" />
          Profilo della Casa
        </h3>
        
        <div className="profile-horizontal-wrapper">
          <div className="avatar-column">
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

          <div className="fields-column">
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
          </div>
        </div>
      </div>
    </form>
  );

  const renderSecurityForm = () => (
    <form className="settings-form" onSubmit={handleUpdatePassword}>
      <div className="form-inner">
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
      </div>
    </form>
  );

  const renderCustomizationView = () => (
    <div className="settings-view-form">
      <div className="form-inner">
        <h3>
          <Palette size={20} className="settings-icon" />
          Personalizzazione
        </h3>
        
        <div className="customization-group">
          <h3>Sezioni Visibili</h3>
          <div className="toggle-list">
            {[
              { id: 'planner', label: 'Calendario Menù', icon: CalendarIcon },
              { id: 'shopping', label: 'Lista Spesa', icon: ShoppingCart },
              { id: 'recipes', label: 'Ricette', icon: BookOpen },
              { id: 'cleaning', label: 'Pulizie del Menù', icon: Sparkles },
              { id: 'finance', label: 'Finanza & Spese', icon: Wallet },
            ].map((section) => (
              <div key={section.id} className={`toggle-item ${visibleSections[section.id] ? 'active' : ''}`} onClick={() => onToggleSection(section.id)}>
                <div className="toggle-item-left">
                  <div className={`section-icon-box ${section.id}`}><section.icon size={18} /></div>
                  <div className="toggle-info">
                    <span>{section.label}</span>
                  </div>
                </div>
                <div className="toggle-switch"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="customization-group dark-mode-settings">
          <h3>Tema</h3>
          <div className="toggle-list">
            <div className={`toggle-item ${isDarkMode ? 'active' : ''}`} onClick={onToggleDarkMode}>
              <div className="toggle-item-left">
                <div className="section-icon-box dark-mode"><ShieldCheck size={18} /></div>
                <div className="toggle-info">
                  <span>Modalità Scura (Dark Mode)</span>
                  <small>Interfaccia ottimizzata per il riposo visivo</small>
                </div>
              </div>
              <div className="toggle-switch"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyPolicy = () => (
    <div className="settings-form privacy-policy">
      <div className="form-inner">
        <h3>
          <ShieldCheck size={20} className="settings-icon privacy" />
          Informativa sulla Privacy
        </h3>
        <div className="privacy-content">
          <p><strong>Ultimo aggiornamento:</strong> 31 Marzo 2026</p>
          
          <section>
            <h4>1. Raccolta dei Dati</h4>
            <p>VibesPlanning raccoglie l'indirizzo email dell'utente esclusivamente per finalità di autenticazione e sincronizzazione dei dati (piani pasto, ricette e spese) tra i dispositivi dell'utente.</p>
          </section>

          <section>
            <h4>2. Utilizzo di Firebase</h4>
            <p>L'applicazione utilizza i servizi di <strong>Google Firebase</strong> per l'archiviazione sicura dei dati (Firestore) e l'autenticazione (Firebase Auth). I dati sono crittografati in transito e a riposo secondo gli standard di Google.</p>
          </section>

          <section>
            <h4>3. Condivisione dei Dati</h4>
            <p>Non vendiamo, scambiamo o trasferiamo in alcun modo le tue informazioni personali a terze parti.</p>
          </section>

          <section>
            <h4>4. I Tuoi Diritti</h4>
            <p>Puoi richiedere la cancellazione totale dei tuoi dati e del tuo account in qualsiasi momento contattando lo sviluppatore o tramite le funzioni di gestione profilo nell'app.</p>
          </section>

          <p className="privacy-footer">Utilizzando questa applicazione, acconsenti alla nostra informativa sulla privacy.</p>
        </div>
      </div>
    </div>
  );

  const renderMenuList = () => (
    <div className="settings-menu-list">
      <div 
        className={`settings-menu-item ${activeView === 'profile' ? 'active' : ''}`} 
        onClick={() => { setActiveView('profile'); setSuccessMsg(null); setErrorMsg(null); }}
      >
         <div className="menu-item-left">
            <div className="menu-icon-bg profile"><UserIcon size={22} /></div>
            <span>Profilo & Casa</span>
         </div>
         <ChevronRight size={20} className="menu-chevron" />
      </div>

      <div 
        className={`settings-menu-item ${activeView === 'security' ? 'active' : ''}`} 
        onClick={() => { setActiveView('security'); setSuccessMsg(null); setErrorMsg(null); }}
      >
         <div className="menu-item-left">
            <div className="menu-icon-bg security"><Lock size={22} /></div>
            <span>Sicurezza</span>
         </div>
         <ChevronRight size={20} className="menu-chevron" />
      </div>

      <div 
        className={`settings-menu-item ${activeView === 'customization' ? 'active' : ''}`} 
        onClick={() => { setActiveView('customization'); setSuccessMsg(null); setErrorMsg(null); }}
      >
         <div className="menu-item-left">
            <div className="menu-icon-bg customization"><Palette size={22} /></div>
            <span>Personalizzazione</span>
         </div>
         <ChevronRight size={20} className="menu-chevron" />
      </div>

      <div 
        className={`settings-menu-item ${activeView === 'privacy' ? 'active' : ''}`} 
        onClick={() => { setActiveView('privacy'); setSuccessMsg(null); setErrorMsg(null); }}
      >
         <div className="menu-item-left">
            <div className="menu-icon-bg privacy"><ShieldCheck size={22} /></div>
            <span>Privacy Policy</span>
         </div>
         <ChevronRight size={20} className="menu-chevron" />
      </div>
    </div>
  );

  return (
    <div className={`settings-section ${isMobile ? 'is-mobile' : ''}`}>
      <div className="settings-card">
        {/* Header - shown on Mobile Menu or Always on Desktop */}
        {(activeView === 'menu' || !isMobile) && (
          <div className="settings-header">
            <h2>Gestione Account</h2>
            <p>Personalizza la tua casa virtuale</p>
          </div>
        )}

        {/* Back Button - Mobile Only */}
        {isMobile && activeView !== 'menu' && (
          <div className="settings-mobile-back" onClick={() => { setActiveView('menu'); setSuccessMsg(null); setErrorMsg(null); }}>
             <div className="back-button-circle">
                <ArrowLeft size={20} />
             </div>
             <span>Torna alle impostazioni</span>
          </div>
        )}

        {/* Alerts - shown above forms */}
        {(successMsg || errorMsg) && (activeView !== 'menu') && (
          <div className={`settings-alert ${successMsg ? 'success' : 'error'}`}>
            {successMsg ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{successMsg || errorMsg}</span>
          </div>
        )}

        <div className={`settings-layout-wrapper ${!isMobile ? 'desktop' : ''}`}>
          {/* Sidebar / Menu Column */}
          {(!isMobile || activeView === 'menu') && (
            <div className="settings-navigation-column">
              {renderMenuList()}
            </div>
          )}

          {/* Content Column */}
          {activeView !== 'menu' && (
            <div className="settings-content-column">
              {activeView === 'profile' && renderProfileForm()}
              {activeView === 'security' && renderSecurityForm()}
              {activeView === 'customization' && renderCustomizationView()}
              {activeView === 'privacy' && renderPrivacyPolicy()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
