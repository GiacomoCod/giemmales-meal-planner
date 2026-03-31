import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ShoppingCart, Trash2, Calendar as CalendarIcon, Bell, BookOpen, Sparkles, Home, ChevronDown, User as UserIcon, Check, X, Wallet, Settings } from 'lucide-react';

import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs, limit, orderBy, documentId, getDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { db, auth } from './firebase';
import './App.css';

import { SUGGESTIONS, DEFAULT_ROOM_TASKS, DUMMY_RECIPES } from './constants';
import type { MealEntry, MealPlan, Recipe, CleaningLog, RoomTask, TaskUnit, TaskSettings, ShoppingItem, NotificationItem, Tag, CalendarEvent, Expense } from './types';
import { PlannerSection } from './components/PlannerSection';
import { ShoppingListSection } from './components/ShoppingListSection';
import { RecipesSection } from './components/RecipesSection';
import { CleaningSection } from './components/CleaningSection';
import { SettingsSection } from './components/SettingsSection';
import { HomeSection } from './components/HomeSection';
import { FinanceSection } from './components/FinanceSection';
import { Login } from './components/Login';
import { useMediaQuery } from './hooks/useMediaQuery';
import { BottomNavigation } from './components/BottomNavigation';

function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const isGiemmale = user?.email === 'giemmale@homeplanner.local';

  // UseMemo to ensure activeProfile identity is stable between renders
  const activeProfile = useMemo(() => {
    if (!user) return { id: 'guest', name: 'Guest', title: 'HOME PLANNER' };
    const isGiemmale = user.email === 'giemmale@homeplanner.local';
    return {
      id: isGiemmale ? 'giemmale' : user.uid,
      name: isGiemmale ? 'Casa dei Giemmale' : (user.displayName || user.email?.split('@')[0] || 'La Mia Casa'),
      title: isGiemmale ? "Giemmale's HOME PLANNER" : `${user.displayName || user.email?.split('@')[0] || 'User'}'s HOME PLANNER`,
      isGiemmale
    };
  }, [user?.uid, user?.email, user?.displayName]);

  const [sessionReads, setSessionReads] = useState(0);

  // Keep monitoring reads in background for future audit/control
  useEffect(() => {
    if (sessionReads > 0 && isGiemmale) {
      console.debug(`[Analytics] Current Session Reads: ${sessionReads}`);
    }
  }, [sessionReads, isGiemmale]);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const colPath = useCallback((name: string) => 
    activeProfile.id === 'giemmale' ? name : `profiles/${activeProfile.id}/${name}`,
    [activeProfile.id]
  );

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [weekNotes, setWeekNotes] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'planner' | 'shopping' | 'recipes' | 'cleaning' | 'finance' | 'settings'>('home');
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    planner: true,
    shopping: true,
    recipes: true,
    cleaning: true,
    finance: true
  });
  const [recipes, setRecipes] = useState<Recipe[]>(DUMMY_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [tempRecipe, setTempRecipe] = useState<Recipe | null>(null); // For editing
  const [cleaningNotes, setCleaningNotes] = useState<string>('');
  const [isSavingCleaningNotes, setIsSavingCleaningNotes] = useState(false);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  const [roomTasks, setRoomTasks] = useState<RoomTask[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [taskSettings, setTaskSettings] = useState<TaskSettings>({});
  const [showTaskSettings, setShowTaskSettings] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [editingFrequency, setEditingFrequency] = useState<{value: number, unit: TaskUnit}>({value: 1, unit: 'settimane'});
  const [suggestions, setSuggestions] = useState<{ text: string; icon: string; category?: 'supermarket' | 'home' | 'medicine' }[]>(SUGGESTIONS as any);
  const [showNotifDeleteConfirm, setShowNotifDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [isDeletingAllInProgress, setIsDeletingAllInProgress] = useState(false);
  const undoTimeoutRef = useRef<any>(null);
  const hasSeededRef = useRef<Set<string>>(new Set());
  
  // Refs for closing dropdowns when clicking outside
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  // Swipe Navigation Logic (Mobile Only)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || showNotifications) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchStartPos.current || showNotifications) return;
    
    // Don't swipe if we are in an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.settings-form')) {
      touchStartPos.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartPos.current.x;
    const deltaY = touch.clientY - touchStartPos.current.y;
    touchStartPos.current = null;

    // Must be horizontal and significant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 75) {
      const allTabs: Array<'home' | 'planner' | 'shopping' | 'recipes' | 'cleaning' | 'finance' | 'settings'> = 
        ['home', 'planner', 'shopping', 'recipes', 'cleaning', 'finance', 'settings'];
      const activeTabs = allTabs.filter(t => t === 'home' || t === 'settings' || visibleSections[t]);
      
      const currentIndex = activeTabs.indexOf(activeTab);
      if (currentIndex === -1) return;

      if (deltaX > 0) {
        // Swipe Right -> Go to Previous
        const prevIndex = (currentIndex - 1 + activeTabs.length) % activeTabs.length;
        setActiveTab(activeTabs[prevIndex]);
      } else {
        // Swipe Left -> Go to Next
        const nextIndex = (currentIndex + 1) % activeTabs.length;
        setActiveTab(activeTabs[nextIndex]);
      }
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (!isMobile && notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowDeleteAllConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile]);

  const handleDeleteAllNotifications = async () => {
    try {
      const q = query(collection(db, colPath('notifications')));
      const snapshot = await getDocs(q);
      const batch: any[] = [];
      snapshot.forEach(doc => {
        batch.push(deleteDoc(doc.ref));
      });
      await Promise.all(batch);
    } catch (e) {
      console.error("Error deleting all notifications:", e);
    }
  };

  const handleDeleteAllWithUndo = () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    
    setIsDeletingAllInProgress(true);
    setShowUndoToast(true);
    
    undoTimeoutRef.current = setTimeout(async () => {
      await handleDeleteAllNotifications();
      setIsDeletingAllInProgress(false);
      setShowUndoToast(false);
      undoTimeoutRef.current = null;
    }, 5000);
  };

  const handleUndoDeleteAll = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setIsDeletingAllInProgress(false);
    setShowUndoToast(false);
  };

  useEffect(() => {
    setMealPlan({});
    setShoppingList([]);
    setNotifications([]);
    setRecipes([]);
    setWeekNotes('');
    setCleaningNotes('');
    setCleaningLogs([]);
    setRoomTasks([]);
    setTaskSettings({});
    setTags([]);
    setEvents([]);
    setExpenses([]);

    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, `profiles/${activeProfile.id}/metadata`, 'settings'));
        if (snap.exists() && snap.data().visibleSections) {
          setVisibleSections(snap.data().visibleSections);
        }
      } catch (err) { }
    };
    fetchSettings();
  }, [activeProfile.id]);

  const handleToggleSection = async (sectionId: string) => {
    const newVal = !visibleSections[sectionId];
    const newSections = { ...visibleSections, [sectionId]: newVal };
    setVisibleSections(newSections);
    
    try {
      await setDoc(doc(db, `profiles/${activeProfile.id}/metadata`, 'settings'), {
        visibleSections: newSections
      }, { merge: true });
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  const filteredSuggestions = suggestions.filter(item =>
    item.text.toLowerCase().includes(newItemText.toLowerCase()) && newItemText.length > 0
  );

  // Authentication Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("[FIREBASE] Auth state changed:", u ? u.email : "No user");
      setUser(u);
      setIsAuthLoading(false);
    }, (error) => {
      console.error("[FIREBASE] Auth error:", error);
      setIsAuthLoading(false);
    });

    // Failsafe timeout: if auth hasn't responded in 8 seconds, force stop loading
    const timeout = setTimeout(() => {
      if (isAuthLoading) {
        console.warn("[FIREBASE] Auth initialization timeout. Proceeding to login/home.");
        setIsAuthLoading(false);
      }
    }, 8000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [isAuthLoading]);

  // One-time triggers for profile change (Migration & Cleanup)
  useEffect(() => {
    if (!user) return;

    const migrationAndCleanup = async () => {
      // LocalStorage automatic silent migration to Firebase
      const savedShopping = localStorage.getItem('shoppingListData');
      if (savedShopping) {
        try {
          const list = JSON.parse(savedShopping) as ShoppingItem[];
          for (const item of list) {
            await setDoc(doc(db, colPath('shoppingList'), item.id), item);
          }
          localStorage.removeItem('shoppingListData');
        } catch (e) { }
      }
      const savedMeals = localStorage.getItem('mealPlannerData');
      if (savedMeals) {
        try {
          const plans = JSON.parse(savedMeals) as MealPlan;
          for (const dateKey of Object.keys(plans)) {
            await setDoc(doc(db, colPath('mealPlans'), dateKey), plans[dateKey]);
          }
          localStorage.removeItem('mealPlannerData');
        } catch (e) { }
      }

      // One-time cleanup of stale test items
      const q = query(collection(db, colPath('shoppingList')), where("text", "==", "Test from backend Server"));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    };

    migrationAndCleanup();
  }, [activeProfile.id, colPath]); // Removed 'user' to ensure stability

  // Real-time Firestore Listeners (Global/Static Collections)
  useEffect(() => {
    if (activeProfile.id === 'guest') return;
    console.log("[FIREBASE] Sottoscrizione listeners globali per:", activeProfile.id);

    const unsubscribeShopping = onSnapshot(query(collection(db, colPath('shoppingList')), limit(100)), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      setShoppingList(snapshot.docs.map(d => d.data() as ShoppingItem));
    });

    const unsubscribeNotifications = onSnapshot(query(collection(db, colPath('notifications')), limit(20)), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as NotificationItem))
        .sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(list);
    });

    const unsubscribeProfilePhoto = onSnapshot(doc(db, colPath('metadata'), 'profile'), (docSnap) => {
      setSessionReads(prev => prev + (docSnap.exists() ? 1 : 0));
      setProfileAvatar(docSnap.exists() && docSnap.data().avatarBase64 ? docSnap.data().avatarBase64 : null);
    });

    const unsubscribeRecipes = onSnapshot(query(collection(db, colPath('recipes')), limit(100)), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      setRecipes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Recipe)));
    });

    const unsubscribeTags = onSnapshot(collection(db, colPath('tags')), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      setTags(snapshot.docs.map(d => d.data() as Tag));
    });

    const unsubscribeEvents = onSnapshot(query(collection(db, colPath('events')), limit(100)), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent)));
    });

    const unsubscribeExpenses = onSnapshot(query(collection(db, colPath('expenses')), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });

    return () => {
      console.log("[FIREBASE] Pulizia listeners globali per:", activeProfile.id);
      unsubscribeShopping();
      unsubscribeNotifications();
      unsubscribeRecipes();
      unsubscribeProfilePhoto();
      unsubscribeTags();
      unsubscribeEvents();
      unsubscribeExpenses();
    };
  }, [activeProfile.id, colPath]); // REMOVED 'user' - ID and colPath are enough and more stable

  // Sync meal plans for the viewed window (Current Month +/- 1)
  useEffect(() => {
    if (!user) return;
    const start = format(subMonths(startOfMonth(currentMonth), 1), 'yyyy-MM-dd');
    const end = format(addMonths(endOfMonth(currentMonth), 1), 'yyyy-MM-dd');

    const unsubscribeMeals = onSnapshot(
      query(collection(db, colPath('mealPlans')), orderBy(documentId()), where(documentId(), '>=', start), where(documentId(), '<=', end)),
      (snapshot) => {
        setSessionReads(prev => prev + snapshot.docs.length);
        const newPlan: MealPlan = {};
        snapshot.forEach(d => { newPlan[d.id] = d.data() as { [mealId: string]: MealEntry[] }; });
        setMealPlan(newPlan);
      }
    );
    return () => unsubscribeMeals();
  }, [activeProfile.id, colPath, currentMonth]); // Removed 'user'

  // Sync notes for the selected week
  useEffect(() => {
    const weekKey = format(selectedWeekStart, 'yyyy-MM-dd');
    const unsubscribeNotes = onSnapshot(
      doc(db, colPath('weekNotes'), weekKey),
      (docSnap) => {
        setSessionReads(prev => prev + (docSnap.exists() ? 1 : 0));
        if (docSnap.exists()) {
          setWeekNotes(docSnap.data().content || '');
        } else {
          setWeekNotes('');
        }
      },
      (error) => {
        console.error("[FIREBASE NOTES ERROR]:", error);
      }
    );

    return () => unsubscribeNotes();
  }, [selectedWeekStart, activeProfile.id]);

  // Sync cleaning notes
  useEffect(() => {
    const weekKey = format(selectedWeekStart, 'yyyy-MM-dd');
    const unsubscribeCleaning = onSnapshot(
      doc(db, colPath('cleaningNotes'), weekKey),
      (docSnap) => {
        setSessionReads(prev => prev + (docSnap.exists() ? 1 : 0));
        if (docSnap.exists()) {
          setCleaningNotes(docSnap.data().content || '');
        } else {
          setCleaningNotes('');
        }
      },
      (error) => {
        console.error("[FIREBASE CLEANING NOTES ERROR]:", error);
      }
    );

    return () => unsubscribeCleaning();
  }, [selectedWeekStart, activeProfile.id]);

  // Sync task settings
  useEffect(() => {
    const unsubscribeSettings = onSnapshot(collection(db, colPath('taskSettings')), (snapshot) => {
      setSessionReads(prev => prev + snapshot.docs.length);
      const settings: TaskSettings = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (typeof data.weeks === 'number') {
          settings[d.id] = { value: data.weeks, unit: 'settimane' };
        } else {
          settings[d.id] = { value: data.value, unit: data.unit as TaskUnit };
        }
      });
      setTaskSettings(settings);
    });
    return () => unsubscribeSettings();
  }, [activeProfile.id]);

  // Sync cleaning logs
  useEffect(() => {
    const unsubscribeLogs = onSnapshot(
      query(collection(db, colPath('cleaningLogs')), orderBy('timestamp', 'desc'), limit(300)),
      (snapshot) => {
        setSessionReads(prev => prev + snapshot.docs.length);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CleaningLog));
        setCleaningLogs(list);
      },
      (error) => {
        console.error("[FIREBASE CLEANING LOGS ERROR]:", error);
      }
    );
    return () => unsubscribeLogs();
  }, [activeProfile.id]);

  // Sync room tasks — pure listener, no side-effects
  useEffect(() => {
    const unsubscribeRoomTasks = onSnapshot(
      query(collection(db, colPath('roomTasks')), limit(200)),
      (snapshot) => {
        setSessionReads(prev => prev + snapshot.docs.length);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RoomTask));
        setRoomTasks(list);
      },
      (error) => {
        console.error('[FIREBASE ROOM TASKS ERROR]:', error);
      }
    );
    return () => unsubscribeRoomTasks();
  }, [activeProfile.id, colPath]); // Added colPath for stability

  // One-shot seeding — uses getDocs so it never reacts to its own writes
  useEffect(() => {
    const seedDefaults = async () => {
      if (activeProfile.id === 'guest' || hasSeededRef.current.has(activeProfile.id)) return;
      hasSeededRef.current.add(activeProfile.id);
      
      console.log("[FIREBASE] Controllo seeding per:", activeProfile.id);
      
      // Smart Seed: check if any tasks exist for this profile
      const tasksSnap = await getDocs(query(collection(db, colPath('roomTasks')), limit(1)));
      if (tasksSnap.empty) {
        for (const [roomId, defaults] of Object.entries(DEFAULT_ROOM_TASKS)) {
          for (const taskName of defaults) {
            const id = generateId();
            await setDoc(doc(db, colPath('roomTasks'), id), { id, roomId, taskName, createdAt: Date.now() });
          }
        }
      }

      // Smart Seed: check if any tags exist
      const tagsSnap = await getDocs(query(collection(db, colPath('tags')), limit(1)));
      if (tagsSnap.empty) {
        if (activeProfile.isGiemmale) {
          const defaultTags: Tag[] = [
            { id: 'ale', label: 'Ale', color: '#ffecf1' },
            { id: 'giem', label: 'Giem', color: '#e3f2fd' },
            { id: 'giemmale', label: 'Giemmale', color: '#f3e5f5' }
          ];
          for (const tag of defaultTags) {
            await setDoc(doc(db, colPath('tags'), tag.id), tag);
          }
        } else {
          const name = activeProfile.name.split(' ')[0];
          const defaultTag: Tag = { id: name.toLowerCase(), label: name, color: '#e3f2fd' };
          await setDoc(doc(db, colPath('tags'), defaultTag.id), defaultTag);
        }
      }

    };

    seedDefaults();
  }, [activeProfile.id, colPath]); // Stripped down to most target dependencies

  const handleUpdateNotes = async (content: string) => {
    setWeekNotes(content);
    setIsSavingNotes(true);
    const weekKey = format(selectedWeekStart, 'yyyy-MM-dd');
    try {
      await setDoc(doc(db, colPath('weekNotes'), weekKey), { content }, { merge: true });
      setTimeout(() => setIsSavingNotes(false), 800);
    } catch (error: any) {
      console.error("[FIREBASE NOTES SAVE ERROR]:", error);
      setIsSavingNotes(false);
    }
  };

  const handleUpdateCleaningNotes = async (content: string) => {
    setCleaningNotes(content);
    setIsSavingCleaningNotes(true);
    const weekKey = format(selectedWeekStart, 'yyyy-MM-dd');
    try {
      await setDoc(doc(db, colPath('cleaningNotes'), weekKey), { content }, { merge: true });
      setTimeout(() => setIsSavingCleaningNotes(false), 800);
    } catch (error: any) {
      console.error("[FIREBASE CLEANING NOTES SAVE ERROR]:", error);
      setIsSavingCleaningNotes(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  const handleAddItem = async (e: React.FormEvent, category: 'supermarket' | 'home' | 'medicine' = 'supermarket') => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: ShoppingItem = { 
      id: generateId(), 
      text: newItemText.trim(), 
      checked: false,
      category 
    };
    setNewItemText('');
    setShowSuggestions(false);

    try {
      await setDoc(doc(db, colPath('shoppingList'), newItem.id), newItem);
    } catch (err: any) {
      console.error("[FIREBASE SET ERROR]:", err);
    }
  };

  const handleAddSuggestion = async (text: string, icon: string, category: 'supermarket' | 'home' | 'medicine') => {
    const newItem: ShoppingItem = { 
      id: generateId(), 
      text: `${icon} ${text}`, 
      checked: false,
      category 
    };
    setNewItemText('');
    setShowSuggestions(false);

    try { await setDoc(doc(db, colPath('shoppingList'), newItem.id), newItem); } catch (e: any) { console.error(e); }
  };

  const toggleItem = async (id: string) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    try { await updateDoc(doc(db, colPath('shoppingList'), id), { checked: !item.checked }); } catch (e: any) { console.error(e); }
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;

    try {
      await deleteDoc(doc(db, colPath('shoppingList'), id));
      
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: `"${item.text}" rimosso dalla spesa`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddMealEntry = async (dateKey: string, mealId: string, text: string, assignee: string) => {
    const newEntry: MealEntry = { id: generateId(), text, assignee };
    const dayData = mealPlan[dateKey] || {};

    try {
      await setDoc(doc(db, colPath('mealPlans'), dateKey), {
        ...dayData,
        [mealId]: [...(dayData[mealId] || []), newEntry]
      }, { merge: true });

      // Create Notification
      const dayName = format(parseISO(dateKey), 'EEEE d', { locale: it });
      const noteText = `Pasto "${text}" aggiunto a ${dayName} (${assignee})`;
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: noteText,
        timestamp: Date.now(),
        read: false
      });

    } catch (e: any) {
      console.error("[FIREBASE MEALS SET ERROR]:", e);
    }
  };

  const handleRemoveMealEntry = async (dateKey: string, mealId: string, entryId: string) => {
    const dayData = mealPlan[dateKey] || {};
    const mealData = (dayData[mealId] || []) as MealEntry[];
    const entryToRemove = mealData.find(e => e.id === entryId);

    if (!entryToRemove) return;

    try {
      await setDoc(doc(db, colPath('mealPlans'), dateKey), {
        ...dayData,
        [mealId]: mealData.filter(e => e.id !== entryId)
      }, { merge: true });

      // Create Notification
      const dayName = format(parseISO(dateKey), 'EEEE d', { locale: it });
      const noteText = `Pasto "${entryToRemove.text}" rimosso da ${dayName}`;
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: noteText,
        timestamp: Date.now(),
        read: false
      });
    } catch (e: any) {
      console.error("[FIREBASE REMOVE ERROR]:", e);
    }
  };

  const handleUpdateAssignee = async (dateKey: string, mealId: string, entryId: string, assignee: string) => {
    const dayData = mealPlan[dateKey] || {};
    const mealData = (dayData[mealId] || []) as MealEntry[];

    await setDoc(doc(db, colPath('mealPlans'), dateKey), {
      ...dayData,
      [mealId]: mealData.map(e => e.id === entryId ? { ...e, assignee } : e)
    }, { merge: true });
  };

  const handleUpdateMealEntryText = async (dateKey: string, mealId: string, entryId: string, newText: string) => {
    const dayData = mealPlan[dateKey] || {};
    const mealData = (dayData[mealId] || []) as MealEntry[];
    const entryToUpdate = mealData.find(e => e.id === entryId);

    if (!entryToUpdate || entryToUpdate.text === newText) return;

    const oldText = entryToUpdate.text;

    try {
      await setDoc(doc(db, colPath('mealPlans'), dateKey), {
        ...dayData,
        [mealId]: mealData.map(e => e.id === entryId ? { ...e, text: newText } : e)
      }, { merge: true });

      // Create Notification
      const dayName = format(parseISO(dateKey), 'EEEE d', { locale: it });
      const noteText = `Pasto "${oldText}" modificato in "${newText}" su ${dayName}`;
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: noteText,
        timestamp: Date.now(),
        read: false
      });
    } catch (e: any) {
      console.error("[FIREBASE UPDATE TEXT ERROR]:", e);
    }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [];
  let dayIterator = calendarStart;
  while (dayIterator <= calendarEnd) {
    calendarDays.push(dayIterator);
    dayIterator = addDays(dayIterator, 1);
  }

  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const activeWeekDays = Array.from({ length: 7 }).map((_, i: number) => addDays(selectedWeekStart, i));

  const handleUpdateTaskFrequency = async (taskType: string, value: number, unit: TaskUnit) => {
    try {
      await setDoc(doc(db, colPath('taskSettings'), taskType), { value, unit });
      setShowTaskSettings(null);
    } catch (e) {
      console.error("Error updating task frequency:", e);
    }
  };


  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setTempRecipe({ ...recipe });
    setIsEditingRecipe(false);
  };

  const handleSaveRecipe = async () => {
    if (tempRecipe) {
      const isNew = !recipes.some(r => r.id === tempRecipe.id);
      
      try {
        // Persist in Firestore - onSnapshot will handle the optimistic UI update automatically
        const docRef = doc(db, colPath('recipes'), tempRecipe.id);
        const dataStr = JSON.stringify(tempRecipe);
        
        // Firestore has a 1MB limit for documents. Base64 adds overhead (~33%).
        // 1,048,576 byte totali. Usiamo 1,020,000 come margine quasi nullo (come richiesto dall'utente)
        if (dataStr.length > 1020 * 1024) {
          alert("L'immagine è ai limiti estremi del database. Se il salvataggio fallisce, prova a ridurla leggermente.");
        }

        await setDoc(docRef, tempRecipe);
        
        setIsEditingRecipe(false);
        setSelectedRecipe(null); // Close the modal

        // Add Notification
        const notifId = generateId();
        await setDoc(doc(db, colPath('notifications'), notifId), {
          text: isNew ? `Nuova ricetta "${tempRecipe.title}" creata` : `Ricetta "${tempRecipe.title}" modificata`,
          timestamp: Date.now(),
          read: false
        });
      } catch (e: any) {
        console.error("Error saving recipe:", e);
        if (e?.code === 'out-of-range' || e?.message?.includes('too large')) {
          alert("Errore: Il contenuto della ricetta è troppo grande per essere salvato.");
        } else {
          alert("Si è verificato un errore durante il salvataggio della ricetta.");
        }
      }
    }
  };

  const handleAddNewRecipe = () => {
    const newRecipe: Recipe = {
      id: generateId(),
      title: '',
      description: '',
      image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=800', // Default placeholder
      ingredients: [],
      steps: []
    };
    setSelectedRecipe(newRecipe);
    setTempRecipe(newRecipe);
    setIsEditingRecipe(true);
  };

  const handleDeleteRecipe = async (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    
    const deletedTitle = recipe.title;
    
    try {
      await deleteDoc(doc(db, colPath('recipes'), id));
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
      }
      
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: `Ricetta "${deletedTitle}" eliminata`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error deleting recipe:", e);
    }
  };
  const handleCompleteTask = async (roomId: string, taskName: string, dateStr?: string) => {
    const dateKey = dateStr || format(new Date(), 'yyyy-MM-dd');
    const isCustomDate = !!dateStr && dateStr !== format(new Date(), 'yyyy-MM-dd');
    const logId = generateId();
    try {
      await setDoc(doc(db, colPath('cleaningLogs'), logId), {
        roomId,
        taskType: taskName,
        date: dateKey,
        timestamp: Date.now()
      });
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: isCustomDate
          ? `"${taskName}" registrato per il ${format(parseISO(dateKey), 'd MMMM', { locale: it })} ✅`
          : `"${taskName}" completato oggi ✅`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error completing task:", e);
    }
  };

  const handleAddTask = async (roomId: string, taskName: string) => {
    if (!taskName.trim()) return;
    const id = generateId();
    try {
      await setDoc(doc(db, colPath('roomTasks'), id), { id, roomId, taskName: taskName.trim(), createdAt: Date.now() });
      setNewTaskName('');
      setShowAddTask(false);
    } catch (e) {
      console.error("Error adding task:", e);
    }
  };

  const handleDeleteRoomTask = async (taskId: string) => {
    const task = roomTasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await deleteDoc(doc(db, colPath('roomTasks'), taskId));
      
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: `Mansione "${task.taskName}" eliminata`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error deleting room task:", e);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, colPath('notifications'), id));
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && tempRecipe) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // Se il file è grande (> 200KB), lo comprimiamo
        if (file.size > 200 * 1024) {
          compressImage(base64, (compressed) => {
            setTempRecipe(prev => prev ? { ...prev, image: compressed } : null);
          });
        } else {
          setTempRecipe(prev => prev ? { ...prev, image: base64 } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /** Helper per comprimere le immagini in modo dinamico per massimizzare la qualità entro il limite di 1MB */
  const compressImage = (base64: string, callback: (result: string) => void) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      let currentQuality = 0.8;
      let currentMaxWidth = 1200;
      let iterations = 0;
      const MAX_ITERATIONS = 10;
      const TARGET_SIZE = 1000 * 1024; // ~1MB di margine per stare sicuri (Firestore limite 1MB)

      const attemptCompression = (width: number, height: number, quality: number): string => {
        const canvas = document.createElement('canvas');
        let newWidth = width;
        let newHeight = height;

        if (newWidth > newHeight) {
          if (newWidth > currentMaxWidth) {
            newHeight *= currentMaxWidth / newWidth;
            newWidth = currentMaxWidth;
          }
        } else {
          if (newHeight > currentMaxWidth) {
            newWidth *= currentMaxWidth / newHeight;
            newHeight = currentMaxWidth;
          }
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return base64;
        
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        return canvas.toDataURL('image/jpeg', quality);
      };

      let finalResult = base64;
      
      // Loop di ottimizzazione per trovare il "punto di rottura" perfetto
      while (iterations < MAX_ITERATIONS) {
        const result = attemptCompression(img.width, img.height, currentQuality);
        const size = result.length;
        
        if (size <= TARGET_SIZE) {
          finalResult = result;
          break;
        }

        // Se è ancora troppo grande, scendiamo di qualità o risoluzione
        if (currentQuality > 0.4) {
          currentQuality -= 0.1;
        } else {
          currentMaxWidth -= 200;
          currentQuality = 0.6; // Reset qualità se scendiamo di risoluzione
        }
        
        iterations++;
        finalResult = result;
      }
      
      callback(finalResult);
    };
    img.onerror = () => callback(base64);
  };

  const handleAddTag = async (tag: Tag) => {
    try {
      await setDoc(doc(db, colPath('tags'), tag.id), tag);
      
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: `Nuova targhetta "${tag.label}" aggiunta 🏷️`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error adding tag:", e);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;
    const label = tag.label;

    try {
      await deleteDoc(doc(db, colPath('tags'), tagId));
      
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: `Targhetta "${label}" rimossa 🗑️`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error deleting tag:", e);
    }
  };

  const handleAddEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const id = generateId();
      await setDoc(doc(db, colPath('events'), id), { ...event, id });
      
      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text: `Nuovo evento: "${event.text}" 📅`,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error("Error adding event:", e);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, colPath('events'), eventId));
    } catch (e) {
      console.error("Error deleting event:", e);
    }
  };

  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newExpense: Expense = { ...expense, id, timestamp: Date.now() };
    try {
      await setDoc(doc(db, colPath('expenses'), id), newExpense);
      
      const payerName = tags.find(t => t.id === expense.paidBy)?.label ?? expense.paidBy;
      let text = `💸 Spesa di ${expense.amount.toFixed(2)} € registrata da ${payerName}`;
      
      if (expense.splitWith && expense.splitWith.length > 0) {
        const others = expense.splitWith
          .filter(sid => sid !== expense.paidBy)
          .map(sid => tags.find(t => t.id === sid)?.label ?? sid);
        if (others.length > 0) {
          text += ` (divisa con ${others.join(', ')})`;
        }
      }

      const notifId = generateId();
      await setDoc(doc(db, colPath('notifications'), notifId), {
        text,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.error('Error adding expense:', e);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, colPath('expenses'), id));
    } catch (e) {
      console.error('Error deleting expense:', e);
    }
  };

  if (isAuthLoading) return <div style={{display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center'}}>Caricamento...</div>;
  if (!user) return <Login />;

  return (
    <div 
      className={`app-wrapper ${isMobile ? 'is-mobile' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* MOBILE MINI HEADER */}
      {isMobile && (
        <header className="mobile-header">
          <div className="mobile-header-left">
            <div 
              className="nav-icon-wrapper" 
              style={{ cursor: 'default' }}
            >
              {profileAvatar ? (
                <img src={profileAvatar} alt="Profile" className="nav-icon-hover" style={{ opacity: 1, transform: 'scale(1)', position: 'static' }} />
              ) : (
                <Home className="nav-icon-main" size={24} />
              )}
            </div>
            <h2 className="mobile-header-title">{activeTab.toUpperCase()}</h2>
          </div>
          <div className="mobile-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <button
                className="notif-btn" 
                onClick={() => setActiveTab(activeTab === 'settings' ? 'home' : 'settings')}
                style={{ color: activeTab === 'settings' ? '#4f46e5' : '#4a5568' }}
              >
                <Settings size={22} strokeWidth={2.5} />
              </button>
             <div className="notif-wrapper" ref={notifDropdownRef}>
                <button
                  className={`notif-btn ${notifications.some(n => !n.read) ? 'has-unread' : ''}`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={24} strokeWidth={2.5} />
                  {notifications.some(n => !n.read) && <span className="notif-badge" />}
                </button>
             </div>
          </div>
        </header>
      )}

      {/* MOBILE NOTIFICATION OVERLAY */}
      {isMobile && showNotifications && (
        <div className="mobile-notif-overlay">
          <div className="mobile-notif-header">
            <div className="mobile-notif-header-title">
              <Bell size={20} />
              <h3>Notifiche</h3>
            </div>
            <div className="mobile-notif-header-actions">
              <button 
                className="mobile-notif-mark-read" 
                onClick={async () => {
                  for (const n of notifications) {
                    if (!n.read) await setDoc(doc(db, colPath('notifications'), n.id), { ...n, read: true });
                  }
                }}
              >
                Segna lette
              </button>
              <button className="mobile-notif-close" onClick={() => setShowNotifications(false)}>
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="mobile-notif-list">
            {notifications.length === 0 || isDeletingAllInProgress ? (
              <div className="mobile-notif-empty">
                <Bell size={48} className="icon-muted" />
                <p>{isDeletingAllInProgress ? 'Cancellazione in corso...' : 'Nessuna nuova notifica'}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`mobile-notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={async () => {
                    if (!n.read) {
                      await setDoc(doc(db, colPath('notifications'), n.id), { ...n, read: true });
                    }
                  }}
                >
                  <div className="mobile-notif-content">
                    <p className="mobile-notif-text">{n.text}</p>
                    <span className="mobile-notif-time">{format(n.timestamp, 'HH:mm - d MMM', { locale: it })}</span>
                  </div>
                  
                  {showNotifDeleteConfirm === n.id ? (
                    <div className="mobile-notif-confirm-group">
                      <button 
                        className="mobile-notif-confirm-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(n.id, e);
                          setShowNotifDeleteConfirm(null);
                        }}
                      >
                        <Check size={20} strokeWidth={3} />
                      </button>
                      <button 
                        className="mobile-notif-cancel-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNotifDeleteConfirm(null);
                        }}
                      >
                        <X size={20} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="mobile-notif-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotifDeleteConfirm(n.id);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && !isDeletingAllInProgress && (
            <div className="mobile-notif-footer">
              <button 
                className="mobile-notif-clear-all"
                onClick={handleDeleteAllWithUndo}
              >
                <Trash2 size={18} />
                <span>Elimina tutte</span>
              </button>
            </div>
          )}

          {showUndoToast && (
            <div className="undo-toast-mobile">
              <div className="undo-toast-content">
                <span>Notifiche eliminate</span>
                <button className="undo-btn" onClick={handleUndoDeleteAll}>
                  ANNULLA
                </button>
              </div>
              <div className="undo-progress-bar" />
            </div>
          )}
        </div>
      )}

      {!isMobile && (
        <nav className="top-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="profile-selector" ref={profileDropdownRef}>
              <h1 className="nav-title">
                <div 
                  className="nav-clickable-title"
                  onClick={() => setActiveTab('home')}
                >
                  <div className="nav-icon-wrapper">
                    <Home size={28} strokeWidth={2.5} className="nav-icon-main" />
                    <img 
                      src={profileAvatar || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=200&h=200'} 
                      alt="Av" 
                      className="nav-icon-hover" 
                    />
                  </div>
                  <div className="nav-title-text-wrapper">
                    <span className="nav-title-main">HOME PLANNER</span>
                    <span className="nav-title-hover">{activeProfile.name.toUpperCase()}</span>
                  </div>
                </div>
                <div 
                  className={`profile-arrow-wrapper ${showProfileDropdown ? 'open' : ''}`}
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <ChevronDown size={24} className="profile-arrow" />
                </div>
              </h1>
              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">Impostazioni Account</div>
                  <button 
                    className={`profile-option ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(activeTab === 'settings' ? 'home' : 'settings');
                      setShowProfileDropdown(false);
                    }}
                  >
                    <UserIcon size={18} style={{ marginRight: '8px', color: '#4a5568' }} />
                    <span className="profile-name">Gestione Account</span>
                  </button>
                  <button 
                    className="profile-option"
                    onClick={() => {
                      signOut(auth);
                      setShowProfileDropdown(false);
                    }}
                  >
                    <span className="profile-name" style={{ color: '#e53e3e', fontWeight: 600 }}>Effettua il Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="nav-tabs">
            {[
              { id: 'planner', label: 'Calendario Menù', icon: CalendarIcon },
              { id: 'shopping', label: 'Lista Spesa', icon: ShoppingCart },
              { id: 'recipes', label: 'Ricette', icon: BookOpen },
              { id: 'cleaning', label: 'Pulizie', icon: Sparkles },
              { id: 'finance', label: 'Finanze', icon: Wallet },
            ].filter(t => visibleSections[t.id]).map(tab => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <tab.icon size={20} strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="nav-spacer">
              <div className="notif-wrapper" ref={notifDropdownRef}>
                <button
                  className={`notif-btn ${notifications.some(n => !n.read) ? 'has-unread' : ''}`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={22} strokeWidth={2.5} />
                  {notifications.some(n => !n.read) && <span className="notif-badge" />}
                </button>

                {showNotifications && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <div className="notif-header-title-row">
                        <h4>Notifiche</h4>
                        <button className="notif-mark-read" onClick={async () => {
                          for (const n of notifications) {
                            if (!n.read) await setDoc(doc(db, colPath('notifications'), n.id), { ...n, read: true });
                          }
                        }}>Segna lette</button>
                      </div>
                      
                      <div className="notif-actions-header">
                        {showDeleteAllConfirm ? (
                          <div className="delete-confirm-inline header-confirm">
                            <span className="confirm-text">Eliminare tutte?</span>
                            <button 
                              className="confirm-btn-mini" 
                              onClick={() => {
                                handleDeleteAllNotifications();
                                setShowDeleteAllConfirm(false);
                              }}
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                            <button 
                              className="cancel-btn-mini" 
                              onClick={() => setShowDeleteAllConfirm(false)}
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="notif-delete-all" 
                            onClick={() => setShowDeleteAllConfirm(true)}
                            disabled={notifications.length === 0}
                          >
                            <Trash2 size={12} style={{marginRight: '4px'}} />
                            Elimina tutte
                          </button>
                        )}
                      </div>
                    </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <p className="notif-empty">Nessuna nuova notifica</p>
                    ) : (
                      notifications.map((n: NotificationItem) => (
                        <div 
                          key={n.id} 
                          className={`notif-item ${!n.read ? 'unread' : ''}`}
                          onClick={async () => {
                            if (!n.read) {
                              await setDoc(doc(db, colPath('notifications'), n.id), { ...n, read: true });
                            }
                          }}
                        >
                          <div className="notif-content">
                            <p className="notif-text">{n.text}</p>
                            <span className="notif-time">{format(n.timestamp, 'HH:mm')}</span>
                          </div>
                          
                          {showNotifDeleteConfirm === n.id ? (
                            <div className="delete-confirm-inline notif-delete-confirm active-confirm">
                              <button 
                                className="confirm-btn-mini" 
                                onClick={(e) => {
                                  handleDeleteNotification(n.id, e);
                                  setShowNotifDeleteConfirm(null);
                                }}
                                title="Conferma eliminazione"
                              >
                                <Check size={12} strokeWidth={3} />
                              </button>
                              <button 
                                className="cancel-btn-mini" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNotifDeleteConfirm(null);
                                }}
                                title="Annulla"
                              >
                                <X size={12} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="notif-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNotifDeleteConfirm(n.id);
                              }}
                              title="Elimina notifica"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      )}

      <div className={`layout ${isMobile ? 'is-mobile' : ''}`}>
        <div key={activeTab} className={`layout-content ${isMobile ? 'mobile-page-transition' : ''}`}>
          {activeTab === 'home' && (
            <HomeSection
              isMobile={isMobile}
              userName={activeProfile.name}
              mealPlan={mealPlan}
              shoppingList={shoppingList}
              recipes={recipes}
              roomTasks={roomTasks}
              cleaningLogs={cleaningLogs}
              taskSettings={taskSettings}
              events={events}
              tags={tags}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              onNavigate={(tab) => setActiveTab(tab as 'home' | 'planner' | 'shopping' | 'recipes' | 'cleaning' | 'finance' | 'settings')}
              expenses={expenses}
              onQuickAction={(action) => {
                if (action === 'add-shopping') setActiveTab('shopping');
                if (action === 'add-recipe') {
                  setActiveTab('recipes');
                  handleAddNewRecipe();
                }
                if (action === 'add-task') {
                  setActiveTab('cleaning');
                }
                if (action.startsWith('go-to-room:')) {
                  const roomId = action.split(':')[1];
                  setSelectedRoom(roomId);
                  setActiveTab('cleaning');
                }
              }}
            />
          )}

          {activeTab === 'planner' && (
          <PlannerSection
            isMobile={isMobile}
            currentMonth={currentMonth}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            calendarDays={calendarDays}
            selectedWeekStart={selectedWeekStart}
            selectedWeekEnd={selectedWeekEnd}
            monthStart={monthStart}
            setSelectedWeekStart={setSelectedWeekStart}
            setCurrentMonth={setCurrentMonth}
            weekNotes={weekNotes}
            isSavingNotes={isSavingNotes}
            handleUpdateNotes={handleUpdateNotes}
            activeWeekDays={activeWeekDays}
            mealPlan={mealPlan}
            handleAddMealEntry={handleAddMealEntry}
            handleRemoveMealEntry={handleRemoveMealEntry}
            handleUpdateAssignee={handleUpdateAssignee}
            handleUpdateMealEntryText={handleUpdateMealEntryText}
            tags={tags}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingListSection
            isMobile={isMobile}
            shoppingList={shoppingList}
            newItemText={newItemText}
            setNewItemText={setNewItemText}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            filteredSuggestions={filteredSuggestions}
            handleAddItem={handleAddItem}
            handleAddSuggestion={handleAddSuggestion}
            toggleItem={toggleItem}
            deleteItem={deleteItem}
            suggestions={suggestions}
            onAddCustomSuggestion={(text, cat, icon) => {
              const newSug = { text, category: cat, icon: icon || '📦' };
              setSuggestions(prev => [...prev, newSug]);
            }}
            onDeleteCustomSuggestion={(text) => {
              setSuggestions(prev => prev.filter(s => s.text !== text));
            }}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipesSection
            isMobile={isMobile}
            recipes={recipes}
            handleRecipeClick={handleRecipeClick}
            handleAddNewRecipe={handleAddNewRecipe}
            handleDeleteRecipe={handleDeleteRecipe}
            selectedRecipe={selectedRecipe}
            setSelectedRecipe={setSelectedRecipe}
            isEditingRecipe={isEditingRecipe}
            setIsEditingRecipe={setIsEditingRecipe}
            tempRecipe={tempRecipe}
            setTempRecipe={setTempRecipe}
            handleImageUpload={handleImageUpload}
            handleSaveRecipe={handleSaveRecipe}
            tags={tags}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
          />
        )}
        {activeTab === 'cleaning' && (
          <CleaningSection
            currentMonth={currentMonth}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            calendarDays={calendarDays}
            selectedWeekStart={selectedWeekStart}
            selectedWeekEnd={selectedWeekEnd}
            monthStart={monthStart}
            setSelectedWeekStart={setSelectedWeekStart}
            setCurrentMonth={setCurrentMonth}
            cleaningNotes={cleaningNotes}
            isSavingCleaningNotes={isSavingCleaningNotes}
            handleUpdateCleaningNotes={handleUpdateCleaningNotes}
            selectedRoom={selectedRoom}
            setSelectedRoom={setSelectedRoom}
            showAddTask={showAddTask}
            setShowAddTask={setShowAddTask}
            newTaskName={newTaskName}
            setNewTaskName={setNewTaskName}
            handleAddTask={handleAddTask}
            roomTasks={roomTasks}
            cleaningLogs={cleaningLogs}
            handleDeleteRoomTask={handleDeleteRoomTask}
            datePickerTaskId={datePickerTaskId}
            setDatePickerTaskId={setDatePickerTaskId}
            customDate={customDate}
            setCustomDate={setCustomDate}
            handleCompleteTask={handleCompleteTask}
            taskSettings={taskSettings}
            showTaskSettings={showTaskSettings}
            setShowTaskSettings={setShowTaskSettings}
            editingFrequency={editingFrequency}
            setEditingFrequency={setEditingFrequency}
            handleUpdateTaskFrequency={handleUpdateTaskFrequency}
            isMobile={isMobile}
          />
        )}
        {activeTab === 'finance' && (
          <div className="main-content finance-section-container">
            <FinanceSection
              expenses={expenses}
              tags={tags}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddTag={handleAddTag}
              onDeleteTag={handleDeleteTag}
              isMobile={isMobile}
            />
          </div>
        )}
        {activeTab === 'settings' && (
          <SettingsSection 
            user={user} 
            isGiemmale={isGiemmale} 
            activeProfileId={activeProfile.id} 
            visibleSections={visibleSections}
            onToggleSection={handleToggleSection}
            isMobile={isMobile}
          />
        )}
      </div>
      </div>

      {isMobile && (
        <BottomNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          notificationsCount={notifications.filter(n => !n.read).length}
          visibleSections={visibleSections}
        />
      )}
    </div>
  );
}

export default App;
