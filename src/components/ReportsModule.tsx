import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, collectionGroup, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Briefcase, 
  Users, 
  Package, 
  Receipt,
  ChevronRight,
  Loader2,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Labour, Material, Expense, Income, UserProfile } from '../types';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { cn } from '../lib/utils';
import { ToastType } from './Toast';
import { generateTransactionReport, generateProjectFinancialReport } from '../services/ReportService';

interface ReportsModuleProps {
  projects: Project[];
  onShowToast: (message: string, type: ToastType) => void;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReportCategory = 'projects' | 'labour' | 'materials' | 'expenses' | 'financial';

const ReportsModule: React.FC<ReportsModuleProps> = ({ projects, onShowToast }) => {
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [reportCategory, setReportCategory] = useState<ReportCategory>('expenses');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Data states
  const [labour, setLabour] = useState<Labour[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);

  useEffect(() => {
    setLoading(true);
    
    // Fetch User Profile
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      });
    }

    // Fetch all data for reporting
    const unsubLabour = onSnapshot(collectionGroup(db, 'labour'), (snapshot) => {
      setLabour(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Labour)));
    });

    const unsubMaterials = onSnapshot(collectionGroup(db, 'materials'), (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
    });

    const unsubExpenses = onSnapshot(collectionGroup(db, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });

    const unsubIncome = onSnapshot(collectionGroup(db, 'income'), (snapshot) => {
      setIncome(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income)));
      setLoading(false);
    });

    return () => {
      unsubLabour();
      unsubMaterials();
      unsubExpenses();
      unsubIncome();
    };
  }, []);

  const getInterval = () => {
    const now = new Date();
    switch (reportType) {
      case 'daily': return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly': return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const filterData = (data: any[]) => {
    const interval = getInterval();
    return data.filter(item => {
      const itemDate = item.date ? parseISO(item.date) : (item.createdAt ? parseISO(item.createdAt) : new Date());
      const matchesDate = isWithinInterval(itemDate, interval);
      const matchesProject = selectedProjectId === 'all' || item.projectId === selectedProjectId;
      return matchesDate && matchesProject;
    });
  };

  const handleDownload = () => {
    if (!userProfile) {
      onShowToast("User profile not loaded.", "error");
      return;
    }

    if (reportCategory === 'financial') {
      if (selectedProjectId === 'all') {
        onShowToast("Please select a specific project for financial summary.", "info");
        return;
      }
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        const projectIncome = income.filter(i => i.projectId === selectedProjectId);
        const projectExpenses = expenses.filter(e => e.projectId === selectedProjectId);
        generateProjectFinancialReport(project, projectIncome, projectExpenses, userProfile, projects.length);
      }
    } else {
      const transactions = [
        ...expenses.map(e => ({ ...e, type: 'expense' as const, projectName: projects.find(p => p.id === e.projectId)?.name || 'N/A' })),
        ...income.map(i => ({ ...i, type: 'income' as const, projectName: projects.find(p => p.id === i.projectId)?.name || 'N/A', category: 'Owner Payment' }))
      ];
      generateTransactionReport(transactions, reportType, userProfile, projects.length);
    }
    onShowToast("Report downloaded successfully!", "success");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Reports Center</h2>
        <p className="text-slate-500">Generate and download detailed project reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Report Category</label>
              <div className="space-y-2">
                {[
                  { id: 'expenses', label: 'Expenses', icon: Receipt },
                  { id: 'financial', label: 'Financial Summary', icon: Wallet },
                  { id: 'labour', label: 'Labour', icon: Users },
                  { id: 'materials', label: 'Materials', icon: Package },
                  { id: 'projects', label: 'Projects', icon: Briefcase },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setReportCategory(cat.id as ReportCategory)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                      reportCategory === cat.id 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <cat.icon size={18} />
                      <span className="text-sm font-bold">{cat.label}</span>
                    </div>
                    <ChevronRight size={16} className={cn(reportCategory === cat.id ? "opacity-100" : "opacity-0")} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Time Range</label>
              <div className="grid grid-cols-2 gap-2">
                {['daily', 'weekly', 'monthly', 'yearly'].map(type => (
                  <button
                    key={type}
                    disabled={reportCategory === 'financial'}
                    onClick={() => setReportType(type as ReportType)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                      reportType === type 
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                      reportCategory === 'financial' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Project Scope</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDownload}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
            >
              <Download size={20} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 capitalize">{reportCategory.replace('-', ' ')} {reportCategory !== 'financial' ? reportType : ''} Preview</h3>
                  <p className="text-xs text-slate-500 font-medium">Generated for {selectedProjectId === 'all' ? 'All Projects' : projects.find(p => p.id === selectedProjectId)?.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                <Calendar size={14} />
                <span>{format(getInterval().start, 'MMM dd')} - {format(getInterval().end, 'MMM dd, yyyy')}</span>
              </div>
            </div>

            <div className="flex-1 p-6">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p className="text-sm font-medium">Preparing report data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {reportCategory === 'expenses' && (
                          <>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                          </>
                        )}
                        {reportCategory === 'financial' && (
                          <>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                          </>
                        )}
                        {reportCategory === 'labour' && (
                          <>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trade</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Wage</th>
                          </>
                        )}
                        {reportCategory === 'materials' && (
                          <>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Material</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Threshold</th>
                          </>
                        )}
                        {reportCategory === 'projects' && (
                          <>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Name</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Budget</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reportCategory === 'expenses' && filterData(expenses).map(e => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">{e.date}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{e.description}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">₹{e.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {reportCategory === 'financial' && [
                        ...expenses.filter(e => selectedProjectId === 'all' || e.projectId === selectedProjectId).map(e => ({ ...e, type: 'EXPENSE' })),
                        ...income.filter(i => selectedProjectId === 'all' || i.projectId === selectedProjectId).map(i => ({ ...i, type: 'INCOME' }))
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">{t.date}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              t.type === 'INCOME' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                            )}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{(t as any).description || (t as any).source}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">₹{t.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {reportCategory === 'labour' && filterData(labour).map(l => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{l.name}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">{l.trade}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">₹{l.dailyWage.toLocaleString()}</td>
                        </tr>
                      ))}
                      {reportCategory === 'materials' && filterData(materials).map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{m.name}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">{m.quantity} {m.unit}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">{m.minThreshold}</td>
                        </tr>
                      ))}
                      {reportCategory === 'projects' && projects.filter(p => isWithinInterval(parseISO(p.createdAt), getInterval())).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{p.name}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">{p.location}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">₹{p.budget.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {((reportCategory === 'expenses' && filterData(expenses).length === 0) ||
                    (reportCategory === 'labour' && filterData(labour).length === 0) ||
                    (reportCategory === 'materials' && filterData(materials).length === 0) ||
                    (reportCategory === 'projects' && projects.filter(p => isWithinInterval(parseISO(p.createdAt), getInterval())).length === 0)) && (
                    <div className="py-20 text-center text-slate-400 italic">
                      No data found for the selected filters.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
