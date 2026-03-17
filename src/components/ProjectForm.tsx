import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
  onNavigateToProjects?: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ isOpen, onClose, onSuccess, onNavigateToProjects }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [labourPhone, setLabourPhone] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickContact = async (type: 'labour' | 'owner') => {
    try {
      const nav = navigator as any;
      if (!(nav.contacts && nav.contacts.select)) {
        alert('Contact Picker API not supported on this browser.');
        return;
      }

      const props = ['tel'];
      const opts = { multiple: false };
      const contacts = await nav.contacts.select(props, opts);
      
      if (contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
        const phone = contacts[0].tel[0];
        if (type === 'labour') setLabourPhone(phone);
        else setOwnerPhone(phone);
      }
    } catch (err) {
      console.error('Error picking contact:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name.trim() || !location.trim() || !budget || !deadline) {
      setError('All fields are required.');
      return;
    }

    const budgetNum = Number(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setError('Budget must be a positive number.');
      return;
    }

    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name,
        location,
        budget: budgetNum,
        deadline,
        labourPhone,
        ownerPhone,
        status: 'planned',
        progress: 0,
        assignedTeam: [],
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      onSuccess(name);
      onClose();
      
      // Reset form
      setName('');
      setLocation('');
      setBudget('');
      setDeadline('');
      setLabourPhone('');
      setOwnerPhone('');

      // Jump to next page (Projects tab)
      if (onNavigateToProjects) {
        onNavigateToProjects();
      }
    } catch (error: any) {
      console.error("Error adding project:", error);
      
      if (error.code === 'permission-denied') {
        const errInfo = {
          error: error.message,
          operationType: 'create',
          path: 'projects',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
          }
        };
        console.error('Firestore Permission Error:', JSON.stringify(errInfo));
        setError(`Permission denied. Please ensure you have the correct role to create projects. (UID: ${auth.currentUser?.uid})`);
      } else {
        setError('Failed to create project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">New Project</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. Skyline Residency"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="City, State"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-sm font-semibold text-slate-900">Contacts</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Labour Phone"
                    value={labourPhone}
                    onChange={(e) => setLabourPhone(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => pickContact('labour')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    Pick
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Site Owner Phone"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => pickContact('owner')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    Pick
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? 'Creating...' : (
                  <>
                    <Plus size={20} />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProjectForm;
