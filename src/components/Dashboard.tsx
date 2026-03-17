import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertTriangle,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectForm from './ProjectForm';
import { generateTransactionReport, Transaction } from '../services/ReportService';
import { cn } from '../lib/utils';
import { Project, Labour, Material, Expense } from '../types';
import { db } from '../firebase';
import { collectionGroup, onSnapshot, query } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isPast } from 'date-fns';
import { ToastType } from './Toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

interface DashboardProps {
  projects: Project[];
  onShowToast: (message: string, type: ToastType) => void;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onShowToast, setActiveTab }) => {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [allLabour, setAllLabour] = useState<Labour[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const labourQuery = query(collectionGroup(db, 'labour'));
    const materialsQuery = query(collectionGroup(db, 'materials'));
    const expensesQuery = query(collectionGroup(db, 'expenses'));

    const unsubLabour = onSnapshot(labourQuery, (snapshot) => {
      setAllLabour(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Labour)));
    });

    const unsubMaterials = onSnapshot(materialsQuery, (snapshot) => {
      setAllMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setAllExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setLoading(false);
    });

    return () => {
      unsubLabour();
      unsubMaterials();
      unsubExpenses();
    };
  }, []);

  const stats = useMemo(() => {
    const activeWorkers = allLabour.filter(l => l.status === 'active').length;
    const lowStockItems = allMaterials.filter(m => m.quantity <= m.minThreshold).length;
    const overdueProjects = projects.filter(p => p.status !== 'completed' && p.deadline && isPast(parseISO(p.deadline))).length;
    
    return [
      { 
        label: 'Total Projects', 
        value: projects.length.toString(), 
        icon: TrendingUp, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-50', 
        trend: `${projects.filter(p => p.status === 'in-progress').length} Active` 
      },
      { 
        label: 'Active Workers', 
        value: activeWorkers.toString(), 
        icon: Users, 
        color: 'text-blue-500', 
        bg: 'bg-blue-50', 
        trend: `${allLabour.length} Total Registered` 
      },
      { 
        label: 'Material Stock', 
        value: lowStockItems > 0 ? 'Low' : 'Healthy', 
        icon: Package, 
        color: lowStockItems > 0 ? 'text-amber-500' : 'text-emerald-500', 
        bg: lowStockItems > 0 ? 'bg-amber-50' : 'bg-emerald-50', 
        trend: `${lowStockItems} items critical` 
      },
      { 
        label: 'Pending Alerts', 
        value: (lowStockItems + overdueProjects).toString(), 
        icon: AlertTriangle, 
        color: 'text-rose-500', 
        bg: 'bg-rose-50', 
        trend: `${overdueProjects} overdue projects` 
      },
    ];
  }, [projects, allLabour, allMaterials]);

  const weeklyExpensesData = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayExpenses = allExpenses.filter(e => isSameDay(parseISO(e.date), day));
      const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        name: format(day, 'EEE'),
        expenses: total
      };
    });
  }, [allExpenses]);

  const projectStatusData = useMemo(() => {
    const statuses = ['completed', 'in-progress', 'planned', 'on-hold'];
    return statuses.map(status => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
      value: projects.filter(p => p.status === status).length
    }));
  }, [projects]);

  const handleDownloadReport = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const transactions: Transaction[] = allExpenses.map(e => ({
      id: e.id,
      type: 'expense',
      amount: e.amount,
      category: e.category,
      description: e.description,
      date: e.date,
      projectName: projects.find(p => p.id === e.projectId)?.name || 'Unknown'
    }));
    
    generateTransactionReport(transactions, period);
    onShowToast(`${period.charAt(0).toUpperCase() + period.slice(1)} report generated!`, 'success');
    setIsReportMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ProjectForm 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onSuccess={(name) => onShowToast(`Project "${name}" created successfully!`, 'success')}
        onNavigateToProjects={() => setActiveTab('projects')}
      />
      
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Project Overview</h2>
          <p className="text-slate-500">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex space-x-3 relative">
          <div className="relative">
            <button 
              onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center space-x-2"
            >
              <span>Download Report</span>
              <ArrowDownRight size={16} className={isReportMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            
            <AnimatePresence>
              {isReportMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden"
                >
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => handleDownloadReport(period)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 transition-colors capitalize border-b border-slate-50 last:border-0"
                    >
                      {period} Report
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            Add Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              <p className="text-sm text-slate-500 mt-1">{stat.trend}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Weekly Expenses</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyExpensesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Expenses']}
                />
                <Bar dataKey="expenses" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Project Status</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {projectStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Projects']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {projectStatusData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">
                  {projects.length > 0 ? Math.round((item.value / projects.length) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
