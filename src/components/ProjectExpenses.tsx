import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Calendar, 
  Tag, 
  User,
  AlertCircle,
  X,
  TrendingUp,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, Project } from '../types';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

interface ProjectExpensesProps {
  project: Project;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ProjectExpenses: React.FC<ProjectExpensesProps> = ({ project, onShowToast }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('other');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const categories: Expense['category'][] = ['material', 'labour', 'equipment', 'other'];

  useEffect(() => {
    const q = query(
      collection(db, 'projects', project.id, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      onShowToast("Failed to fetch expenses.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [project.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const expenseData = {
      description,
      amount: Number(amount),
      category,
      date,
      notes: notes.trim() || undefined,
      projectId: project.id,
      recordedBy: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'projects', project.id, 'expenses'), expenseData);
      onShowToast("Expense recorded successfully!", "success");
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving expense:", error);
      onShowToast("Failed to save expense.", "error");
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory('other');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const handleDelete = async (expenseId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'expenses', expenseId));
      onShowToast("Expense deleted.", "success");
    } catch (error) {
      console.error("Error deleting expense:", error);
      onShowToast("Failed to delete expense.", "error");
    }
  };

  const filteredExpenses = filterCategory === 'all' 
    ? expenses 
    : expenses.filter(e => e.category === filterCategory);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'material': return 'bg-blue-100 text-blue-600';
      case 'labour': return 'bg-emerald-100 text-emerald-600';
      case 'equipment': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-emerald-500" size={20} />
          <h4 className="text-lg font-bold text-slate-900">Project Expenses</h4>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center space-x-2 shadow-lg shadow-slate-900/10"
        >
          <Plus size={18} />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Project Spending</p>
          <p className="text-2xl font-black text-slate-900">₹{totalSpent.toLocaleString()}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400" />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="py-8 text-center text-slate-400 italic">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <Receipt className="mx-auto text-slate-200 mb-2" size={32} />
            <p className="text-sm text-slate-400 font-medium">No expenses recorded yet.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredExpenses.map((expense) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className={cn("p-2 rounded-xl", getCategoryColor(expense.category))}>
                      <Receipt size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">{expense.description}</h5>
                      {expense.notes && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">"{expense.notes}"</p>
                      )}
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Calendar size={10} className="mr-1" />
                          {format(parseISO(expense.date), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <User size={10} className="mr-1" />
                          {expense.recordedBy}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-slate-900">₹{expense.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => handleDelete(expense.id)}
                      className="mt-1 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Expense Modal */}
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
                <h3 className="text-xl font-bold text-slate-900">Record Expense</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. 50 Bags of Cement"
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
                  Save Expense
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectExpenses;
