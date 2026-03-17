import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  Users, 
  UserPlus, 
  Phone, 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  ChevronRight,
  HardHat,
  AlertCircle,
  X,
  Briefcase,
  Banknote,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Labour } from '../types';
import { ToastType } from './Toast';
import { cn } from '../lib/utils';

interface LabourModuleProps {
  projects: Project[];
  onShowToast: (message: string, type: ToastType) => void;
}

const LabourModule: React.FC<LabourModuleProps> = ({ projects, onShowToast }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [labour, setLabour] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterTrade, setFilterTrade] = useState<string>('all');
  const [selectedLabourIds, setSelectedLabourIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [labourToDelete, setLabourToDelete] = useState<string | null>(null);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const trades = [
    'Mason', 'Carpenter', 'Plumber', 'Electrician', 
    'Painter', 'Labourer', 'Supervisor', 'Welder', 'Other'
  ];

  useEffect(() => {
    if (!selectedProjectId) {
      setLabour([]);
      return;
    }

    setLoading(true);
    const q = collection(db, 'projects', selectedProjectId, 'labour');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const labourData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Labour[];
      setLabour(labourData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      onShowToast("Failed to fetch labour details.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const labourData = {
      name,
      trade,
      dailyWage: Number(dailyWage),
      phoneNumber,
      status,
      notes: notes.trim() || undefined,
      projectId: selectedProjectId
    };

    try {
      if (editingLabour) {
        await updateDoc(doc(db, 'projects', selectedProjectId, 'labour', editingLabour.id), labourData);
        onShowToast("Labour updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'projects', selectedProjectId, 'labour'), labourData);
        onShowToast("Labour added successfully!", "success");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving labour:", error);
      onShowToast("Failed to save labour details.", "error");
    }
  };

  const handleDelete = async () => {
    if (!labourToDelete || !selectedProjectId) return;
    try {
      await deleteDoc(doc(db, 'projects', selectedProjectId, 'labour', labourToDelete));
      onShowToast("Labour deleted successfully!", "success");
      setIsDeleteModalOpen(false);
      setLabourToDelete(null);
    } catch (error) {
      console.error("Error deleting labour:", error);
      onShowToast("Failed to delete labour.", "error");
    }
  };

  const confirmDelete = (labourId: string) => {
    setLabourToDelete(labourId);
    setIsDeleteModalOpen(true);
  };

  const openModal = (worker?: Labour) => {
    if (worker) {
      setEditingLabour(worker);
      setName(worker.name);
      setTrade(worker.trade);
      setDailyWage(worker.dailyWage.toString());
      setPhoneNumber(worker.phoneNumber);
      setStatus(worker.status);
      setNotes(worker.notes || '');
    } else {
      setEditingLabour(null);
      setName('');
      setTrade('');
      setDailyWage('');
      setPhoneNumber('');
      setStatus('active');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLabour(null);
  };

  const pickContact = async () => {
    try {
      const nav = navigator as any;
      if (!(nav.contacts && nav.contacts.select)) {
        onShowToast('Contact Picker API not supported on this browser.', 'error');
        return;
      }

      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await nav.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        const contact = contacts[0];
        if (contact.name && contact.name.length > 0) setName(contact.name[0]);
        if (contact.tel && contact.tel.length > 0) setPhoneNumber(contact.tel[0]);
      }
    } catch (err) {
      console.error('Error picking contact:', err);
    }
  };

  const filteredLabour = labour.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phoneNumber.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    const matchesTrade = filterTrade === 'all' || l.trade === filterTrade;

    return matchesSearch && matchesStatus && matchesTrade;
  });

  const reportData = labour.filter(l => filterTrade === 'all' || l.trade === filterTrade);
  const totalDailyWage = reportData.reduce((sum, l) => sum + l.dailyWage, 0);
  const activeCount = reportData.filter(l => l.status === 'active').length;
  const inactiveCount = reportData.filter(l => l.status === 'inactive').length;

  const toggleSelection = (id: string) => {
    setSelectedLabourIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkMarkInactive = async () => {
    if (!selectedProjectId || selectedLabourIds.length === 0) return;
    
    try {
      const promises = selectedLabourIds.map(id => 
        updateDoc(doc(db, 'projects', selectedProjectId, 'labour', id), { status: 'inactive' })
      );
      await Promise.all(promises);
      onShowToast(`Marked ${selectedLabourIds.length} workers as inactive.`, "success");
      setSelectedLabourIds([]);
    } catch (error) {
      console.error("Bulk update error:", error);
      onShowToast("Failed to update workers.", "error");
    }
  };

  const handleBulkExport = () => {
    if (selectedLabourIds.length === 0) return;
    const selectedWorkers = labour.filter(l => selectedLabourIds.includes(l.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Trade,Daily Wage,Phone,Status\n"
      + selectedWorkers.map(l => `${l.name},${l.trade},${l.dailyWage},${l.phoneNumber},${l.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `labour_export_${selectedProjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`Exported ${selectedLabourIds.length} workers.`, "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Labour Management</h2>
          <p className="text-slate-500">Manage workers and their assignments.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {selectedProjectId && (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsReportOpen(true)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors flex items-center space-x-2"
              >
                <Banknote size={18} />
                <span>Wage Report</span>
              </button>
              <button 
                onClick={() => openModal()}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
              >
                <UserPlus size={18} />
                <span>Add Worker</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Project Selected</h3>
          <p className="text-slate-500 mt-1">Please select a project to manage its labour force.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search by name, trade or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select 
                value={filterTrade}
                onChange={(e) => setFilterTrade(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
              >
                <option value="all">All Trades</option>
                {trades.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {selectedLabourIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-700"
            >
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {selectedLabourIds.length}
                </span>
                <span className="text-sm font-medium">Selected</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-700" />
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleBulkMarkInactive}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2"
                >
                  <X size={14} className="text-slate-400" />
                  <span>Mark Inactive</span>
                </button>
                <button 
                  onClick={handleBulkExport}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2"
                >
                  <Download size={14} className="text-slate-400" />
                  <span>Export CSV</span>
                </button>
                <button 
                  onClick={() => setSelectedLabourIds([])}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredLabour.map((worker, i) => (
                <motion.div
                  key={worker.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative"
                >
                  <div className="absolute top-4 left-4 z-10">
                    <input 
                      type="checkbox"
                      checked={selectedLabourIds.includes(worker.id)}
                      onChange={() => toggleSelection(worker.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between items-start mb-4 pl-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{worker.name}</h4>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{worker.trade}</span>
                      </div>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(worker)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => confirmDelete(worker.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {worker.notes && (
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 italic line-clamp-2">"{worker.notes}"</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Daily Wage</span>
                      <span className="font-bold text-slate-900">${worker.dailyWage}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        worker.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {worker.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${worker.phoneNumber}`}
                      className="flex items-center justify-center space-x-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                    >
                      <Phone size={16} />
                      <span className="text-xs font-bold">Call</span>
                    </a>
                    <a 
                      href={`sms:${worker.phoneNumber}`}
                      className="flex items-center justify-center space-x-2 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-600 transition-colors"
                    >
                      <MessageSquare size={16} />
                      <span className="text-xs font-bold">SMS</span>
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredLabour.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                No workers found for this project.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingLabour ? 'Edit Worker' : 'Add New Worker'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Worker Name</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Full Name"
                    />
                    <button 
                      type="button"
                      onClick={pickContact}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium transition-colors"
                    >
                      Pick
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trade</label>
                    <select
                      required
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      <option value="">Select Trade</option>
                      {trades.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily Wage ($)</label>
                    <input
                      type="number"
                      required
                      value={dailyWage}
                      onChange={(e) => setDailyWage(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="+1 234 567 890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <div className="flex space-x-2">
                    {(['active', 'inactive'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                          status === s 
                            ? "bg-emerald-500 text-white shadow-md" 
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                    placeholder="Worker specific information..."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingLabour ? 'Update Worker' : 'Add Worker')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Worker?</h3>
              <p className="text-slate-500 mt-2">This action cannot be undone. All data for this worker will be removed.</p>
              
              <div className="mt-8 flex space-x-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wage Report Modal */}
      <AnimatePresence>
        {isReportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Labour Wage Report</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {projects.find(p => p.id === selectedProjectId)?.name}
                  </p>
                </div>
                <button onClick={() => setIsReportOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Daily Wage</p>
                    <p className="text-2xl font-black text-emerald-700">₹{totalDailyWage.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Active Workers</p>
                    <p className="text-2xl font-black text-blue-700">{activeCount}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Inactive Workers</p>
                    <p className="text-2xl font-black text-slate-700">{inactiveCount}</p>
                  </div>
                </div>

                <div className="max-h-[40vh] overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Worker</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trade</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Daily Wage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reportData.map(worker => (
                        <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{worker.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{worker.trade}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              worker.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}>
                              {worker.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-slate-900 text-right">₹{worker.dailyWage.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsReportOpen(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LabourModule;
