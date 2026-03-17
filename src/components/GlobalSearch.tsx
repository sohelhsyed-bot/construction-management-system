import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  collectionGroup 
} from 'firebase/firestore';
import { 
  Search, 
  X, 
  Briefcase, 
  Users, 
  Package, 
  Receipt, 
  ArrowRight,
  Loader2,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Labour, Material, Expense } from '../types';
import { cn } from '../lib/utils';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'project' | 'labour' | 'material' | 'expense';
  projectId?: string;
  projectName?: string;
}

interface GlobalSearchProps {
  setActiveTab: (tab: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Fetch Projects
    const qProjects = query(collection(db, 'projects'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }));

    // Fetch Labour (Global)
    const qLabour = query(collectionGroup(db, 'labour'));
    unsubscribes.push(onSnapshot(qLabour, (snapshot) => {
      setLabour(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Labour)));
    }));

    // Fetch Materials (Global)
    const qMaterials = query(collectionGroup(db, 'materials'));
    unsubscribes.push(onSnapshot(qMaterials, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
    }));

    // Fetch Expenses (Global)
    const qExpenses = query(collectionGroup(db, 'expenses'));
    unsubscribes.push(onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const newResults: SearchResult[] = [];

    // Search Projects
    projects.forEach(p => {
      if (p.name.toLowerCase().includes(term) || p.location.toLowerCase().includes(term)) {
        newResults.push({
          id: p.id,
          title: p.name,
          subtitle: p.location,
          type: 'project'
        });
      }
    });

    // Search Labour
    labour.forEach(l => {
      if (l.name.toLowerCase().includes(term) || l.trade.toLowerCase().includes(term)) {
        const projectName = projects.find(p => p.id === l.projectId)?.name || 'Unknown Project';
        newResults.push({
          id: l.id,
          title: l.name,
          subtitle: `${l.trade} • ${projectName}`,
          type: 'labour',
          projectId: l.projectId,
          projectName
        });
      }
    });

    // Search Materials
    materials.forEach(m => {
      if (m.name.toLowerCase().includes(term)) {
        const projectName = projects.find(p => p.id === m.projectId)?.name || 'Unknown Project';
        newResults.push({
          id: m.id,
          title: m.name,
          subtitle: `${m.quantity} ${m.unit} • ${projectName}`,
          type: 'material',
          projectId: m.projectId,
          projectName
        });
      }
    });

    // Search Expenses
    expenses.forEach(e => {
      if (e.description.toLowerCase().includes(term) || e.category.toLowerCase().includes(term)) {
        const projectName = projects.find(p => p.id === e.projectId)?.name || 'Unknown Project';
        newResults.push({
          id: e.id,
          title: e.description,
          subtitle: `₹${e.amount.toLocaleString()} • ${e.category} • ${projectName}`,
          type: 'expense',
          projectId: e.projectId,
          projectName
        });
      }
    });

    setResults(newResults.slice(0, 10)); // Limit to 10 results
  }, [searchTerm, projects, labour, materials, expenses]);

  const handleSelect = (result: SearchResult) => {
    let tab = 'dashboard';
    switch (result.type) {
      case 'project': tab = 'projects'; break;
      case 'labour': tab = 'labour'; break;
      case 'material': tab = 'materials'; break;
      case 'expense': tab = 'expenses'; break;
    }
    setActiveTab(tab);
    setIsOpen(false);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return <Briefcase size={16} className="text-blue-500" />;
      case 'labour': return <Users size={16} className="text-emerald-500" />;
      case 'material': return <Package size={16} className="text-amber-500" />;
      case 'expense': return <Receipt size={16} className="text-rose-500" />;
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Trigger */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-all w-full md:w-64 lg:w-96 group"
      >
        <Search size={18} className="group-hover:text-emerald-500 transition-colors" />
        <span className="text-sm font-medium">Search projects, labour...</span>
        <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 ml-auto text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-lg">
          ⌘K
        </kbd>
      </button>

      {/* Search Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center space-x-4">
                <Search size={24} className="text-slate-400" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="What are you looking for?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent text-lg font-medium text-slate-900 outline-none placeholder:text-slate-300"
                />
                {loading && <Loader2 size={20} className="animate-spin text-emerald-500" />}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                {searchTerm.trim().length < 2 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Search size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Type at least 2 characters to search...</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 font-medium">No results found for "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl transition-all group border border-transparent hover:border-emerald-100"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            {getTypeIcon(result.type)}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {result.title}
                            </p>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                              {result.subtitle}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center">
                    <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded mr-1.5">↵</span>
                    Select
                  </div>
                  <div className="flex items-center">
                    <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded mr-1.5">ESC</span>
                    Close
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  Global Search Active
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
