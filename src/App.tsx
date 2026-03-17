import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LabourModule from './components/LabourModule';
import ProjectsModule from './components/ProjectsModule';
import MaterialsModule from './components/MaterialsModule';
import ExpensesModule from './components/ExpensesModule';
import ReportsModule from './components/ReportsModule';
import ResourceAllocationModule from './components/ResourceAllocationModule';
import NotificationModule from './components/NotificationModule';
import GlobalSearch from './components/GlobalSearch';
import Auth from './components/Auth';
import Toast, { ToastType } from './components/Toast';
import { UserProfile, Project, Material } from './types';
import { Loader2, AlertCircle } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import { getDocs } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time projects subscription
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Notifications count logic
  useEffect(() => {
    if (!user || projects.length === 0) {
      setUnreadNotificationsCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let count = snapshot.size;

      // Add dynamic notifications count
      for (const project of projects) {
        // Overdue
        if (project.status !== 'completed' && project.deadline) {
          if (isPast(parseISO(project.deadline))) {
            count++;
          }
        }

        // Low stock (This is a bit heavy for a count, but let's try)
        // Optimization: In a real app, we'd use a different approach
        try {
          const materialsSnapshot = await getDocs(collection(db, 'projects', project.id, 'materials'));
          materialsSnapshot.docs.forEach(doc => {
            const material = doc.data() as Material;
            if (material.quantity <= material.minThreshold) {
              count++;
            }
          });
        } catch (e) {
          console.error("Error fetching materials for count:", e);
        }
      }

      setUnreadNotificationsCount(count);
    });

    return () => unsubscribe();
  }, [user, projects]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-medium">Loading Onesite...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        userRole={profile?.role}
        notificationsCount={unreadNotificationsCount}
      />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <GlobalSearch setActiveTab={setActiveTab} />
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{profile?.displayName || user.email}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          {activeTab === 'dashboard' && <Dashboard projects={projects} onShowToast={showToast} setActiveTab={setActiveTab} />}
          {activeTab === 'labour' && <LabourModule projects={projects} onShowToast={showToast} />}
          {activeTab === 'materials' && <MaterialsModule projects={projects} onShowToast={showToast} />}
          {activeTab === 'expenses' && <ExpensesModule projects={projects} onShowToast={showToast} />}
          {activeTab === 'allocation' && <ResourceAllocationModule projects={projects} />}
          {activeTab === 'reports' && <ReportsModule projects={projects} onShowToast={showToast} />}
          {activeTab === 'notifications' && <NotificationModule projects={projects} onShowToast={showToast} setActiveTab={setActiveTab} />}
          {activeTab === 'projects' && <ProjectsModule projects={projects} onShowToast={showToast} />}
        </div>
      </main>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default App;
