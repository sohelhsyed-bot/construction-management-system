import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  collectionGroup,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { 
  Receipt, 
  Calendar, 
  Tag, 
  User,
  Search,
  Filter,
  Briefcase,
  Download,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  X,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, Project, Income } from '../types';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { ToastType } from './Toast';

interface ExpensesModuleProps {
  projects: Project[];
  onShowToast: (message: string, type: ToastType) => void;
}

const ExpensesModule: React.FC<ExpensesModuleProps> = ({ projects, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('other');
  const [source, setSource] = useState('Project Owner');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');

  const categories: Expense['category'][] = ['material', 'labour', 'equipment', 'other'];

  useEffect(() => {
    setLoading(true);
    const expensesQuery = query(collectionGroup(db, 'expenses'), orderBy('date', 'desc'));
    const incomeQuery = query(collectionGroup(db, 'income'), orderBy('date', 'desc'));
    
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      setAllExpenses(data);
      if (activeTab === 'expenses') setLoading(false);
    });

    const unsubIncome = onSnapshot(incomeQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Income[];
      setAllIncome(data);
      if (activeTab === 'income') setLoading(false);
    });

    return () => {
      unsubExpenses();
      unsubIncome();
    };
  }, [activeTab]);

  const filteredData = activeTab === 'expenses' 
    ? allExpenses.filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        const matchesProject = filterProject === 'all' || e.projectId === filterProject;
        return matchesSearch && matchesCategory && matchesProject;
      })
    : allIncome.filter(i => {
        const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProject = filterProject === 'all' || i.projectId === filterProject;
        return matchesSearch && matchesProject;
      });

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'material': return 'bg-blue-100 text-blue-600';
      case 'labour': return 'bg-emerald-100 text-emerald-600';
      case 'equipment': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !projectId) return;

    try {
      if (activeTab === 'expenses') {
        const expenseData = {
          description,
          amount: Number(amount),
          category,
          date,
          notes: notes.trim() || undefined,
          projectId,
          recordedBy: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'projects', projectId, 'expenses'), expenseData);
        onShowToast("Expense recorded successfully!", "success");
      } else {
        const incomeData = {
          description,
          amount: Number(amount),
          source,
          date,
          notes: notes.trim() || undefined,
          projectId,
          recordedBy: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'projects', projectId, 'income'), incomeData);
        onShowToast("Income recorded successfully!", "success");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving record:", error);
      onShowToast("Failed to save record.", "error");
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory('other');
    setSource('Project Owner');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setProjectId('');
    setNotes('');
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) return;
    
    try {
      const currentData = activeTab === 'expenses' ? allExpenses : allIncome;
      const promises = currentData
        .filter(item => selectedIds.includes(item.id))
        .map(item => deleteDoc(doc(db, 'projects', item.projectId, activeTab, item.id)));
      
      await Promise.all(promises);
      onShowToast(`Deleted ${selectedIds.length} items.`, "success");
      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk delete error:", error);
      onShowToast("Failed to delete items.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Financial Tracking</h2>
          <p className="text-slate-500">Manage expenses and owner payments across all projects.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center space-x-2 shadow-lg shadow-slate-900/10"
          >
            <Plus size={18} />
            <span>Add {activeTab === 'expenses' ? 'Expense' : 'Income'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('expenses'); setSelectedIds([]); }}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2",
            activeTab === 'expenses' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <TrendingDown size={16} />
          <span>Expenses</span>
        </button>
        <button
          onClick={() => { setActiveTab('income'); setSelectedIds([]); }}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2",
            activeTab === 'income' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <TrendingUp size={16} />
          <span>Income (Owner Payments)</span>
        </button>
      </div>

      {selectedIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-700"
        >
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium">Selected</span>
          </div>
          <button 
            onClick={handleBulkDelete}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2"
          >
            <Trash2 size={14} />
            <span>Delete Selected</span>
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
              <TrendingDown size={20} />
            </div>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">OUT</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-black text-slate-900 mt-1">₹{allExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">IN</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Income</p>
          <p className="text-2xl font-black text-slate-900 mt-1">₹{allIncome.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">BALANCE</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            ₹{(allIncome.reduce((s, i) => s + i.amount, 0) - allExpenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center space-x-3">
          {activeTab === 'expenses' && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="material">Material</option>
                <option value="labour">Labour</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <Briefcase size={14} className="text-slate-400" />
            <select 
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox"
                    checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredData.map(item => item.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'expenses' ? 'Category' : 'Source'}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Loading records...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No {activeTab} found matching filters.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-slate-600">
                        <Calendar size={14} className="mr-2 text-slate-300" />
                        {format(parseISO(item.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.description}</p>
                        {item.notes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">"{item.notes}"</p>
                        )}
                        <p className="text-[10px] text-slate-400 font-medium flex items-center mt-0.5">
                          <User size={10} className="mr-1" />
                          {item.recordedBy}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs font-bold text-slate-500">
                        <Briefcase size={12} className="mr-1.5 text-slate-300" />
                        {getProjectName(item.projectId)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === 'expenses' ? (
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          getCategoryColor((item as Expense).category)
                        )}>
                          {(item as Expense).category}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">
                          {(item as Income).source}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-sm font-black",
                        activeTab === 'expenses' ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {activeTab === 'expenses' ? '-' : '+'}₹{item.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Record {activeTab === 'expenses' ? 'Expense' : 'Income'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder={activeTab === 'expenses' ? "e.g. 50 Bags of Cement" : "e.g. Initial Project Payment"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    {activeTab === 'expenses' ? (
                      <>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select
                          required
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                        <input
                          type="text"
                          required
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          placeholder="Project Owner"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                    placeholder="Add extra details..."
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Save {activeTab === 'expenses' ? 'Expense' : 'Income'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpensesModule;
