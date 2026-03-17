import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy
} from 'firebase/firestore';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  ExternalLink,
  Package,
  Calendar,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Material, AppNotification } from '../types';
import { cn } from '../lib/utils';
import { format, isPast, parseISO } from 'date-fns';

interface NotificationModuleProps {
  projects: Project[];
  onShowToast: (message: string, type: any) => void;
  setActiveTab: (tab: string) => void;
}

const NotificationModule: React.FC<NotificationModuleProps> = ({ projects, onShowToast, setActiveTab }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!auth.currentUser) return;

    // 1. Fetch persistent notifications from Firestore
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const persistentNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];

      // 2. Generate dynamic notifications (Low Stock & Overdue)
      const dynamicNotifications: AppNotification[] = [];

      for (const project of projects) {
        // Check Overdue
        if (project.status !== 'completed' && project.deadline) {
          const deadlineDate = parseISO(project.deadline);
          if (isPast(deadlineDate)) {
            dynamicNotifications.push({
              id: `overdue-${project.id}`,
              type: 'overdue',
              title: 'Project Overdue',
              message: `The deadline for "${project.name}" was ${format(deadlineDate, 'MMM dd, yyyy')}.`,
              date: project.deadline,
              read: false,
              projectId: project.id,
              projectName: project.name
            });
          }
        }

        // Check Low Stock (This might be slow if there are many projects, but for now it's okay)
        // In a real app, we'd probably have a cloud function or a more efficient way
        const materialsSnapshot = await getDocs(collection(db, 'projects', project.id, 'materials'));
        materialsSnapshot.docs.forEach(doc => {
          const material = doc.data() as Material;
          if (material.quantity <= material.minThreshold) {
            dynamicNotifications.push({
              id: `low-stock-${doc.id}`,
              type: 'low-stock',
              title: 'Low Material Stock',
              message: `${material.name} is low in "${project.name}". Current: ${material.quantity} ${material.unit}, Min: ${material.minThreshold} ${material.unit}.`,
              date: new Date().toISOString(),
              read: false,
              projectId: project.id,
              projectName: project.name,
              entityId: doc.id
            });
          }
        });
      }

      // Combine and sort
      const allNotifications = [...persistentNotifications, ...dynamicNotifications].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setNotifications(allNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Notification Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projects]);

  const markAsRead = async (notification: AppNotification) => {
    if (notification.id.startsWith('overdue-') || notification.id.startsWith('low-stock-')) {
      // Dynamic notifications can't be marked as read in DB easily without a separate tracking system
      // For now, we'll just show a toast
      onShowToast("Dynamic alerts cannot be dismissed until the underlying issue is resolved.", "info");
      return;
    }

    try {
      await updateDoc(doc(db, 'notifications', notification.id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (id.startsWith('overdue-') || id.startsWith('low-stock-')) {
      onShowToast("Dynamic alerts cannot be deleted.", "error");
      return;
    }

    try {
      await deleteDoc(doc(db, 'notifications', id));
      onShowToast("Notification deleted", "success");
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'low-stock': return <Package className="text-amber-500" size={20} />;
      case 'overdue': return <Clock className="text-red-500" size={20} />;
      case 'system': return <Info className="text-blue-500" size={20} />;
      default: return <Bell className="text-slate-400" size={20} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'low-stock': return 'bg-amber-50 border-amber-100';
      case 'overdue': return 'bg-red-50 border-red-100';
      case 'system': return 'bg-blue-50 border-blue-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-500">Stay updated with critical events and alerts.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filter === 'all' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
            )}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filter === 'unread' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Unread
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex items-start space-x-4",
                    getBgColor(notification.type),
                    !notification.read && "ring-2 ring-offset-2 ring-emerald-500/20"
                  )}
                >
                  <div className="mt-1">
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">{notification.title}</h4>
                        {notification.projectName && (
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {notification.projectName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                        {format(new Date(notification.date), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 mt-1 text-sm leading-relaxed">
                      {notification.message}
                    </p>

                    <div className="mt-4 flex items-center space-x-4">
                      {notification.projectId && (
                        <button 
                          onClick={() => setActiveTab('projects')}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                        >
                          <ExternalLink size={14} />
                          <span>View Project</span>
                        </button>
                      )}
                      
                      {!notification.read && !notification.id.includes('-') && (
                        <button 
                          onClick={() => markAsRead(notification)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark as read</span>
                        </button>
                      )}

                      {!notification.id.includes('-') && (
                        <button 
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center space-x-1"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="text-slate-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Notifications</h3>
                <p className="text-slate-500 mt-1">You're all caught up! No new alerts at the moment.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default NotificationModule;
