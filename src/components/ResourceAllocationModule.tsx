import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, collectionGroup, onSnapshot } from 'firebase/firestore';
import { 
  Users, 
  HardHat, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  Briefcase,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Project, Labour, Expense } from '../types';
import { cn } from '../lib/utils';

interface ResourceAllocationModuleProps {
  projects: Project[];
}

const ResourceAllocationModule: React.FC<ResourceAllocationModuleProps> = ({ projects }) => {
  const [labour, setLabour] = useState<Labour[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubLabour = onSnapshot(collectionGroup(db, 'labour'), (snapshot) => {
      setLabour(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Labour)));
    });

    const unsubExpenses = onSnapshot(collectionGroup(db, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });

    return () => {
      unsubLabour();
      unsubExpenses();
    };
  }, []);

  // Calculate allocations
  const resourceAllocations = useMemo(() => {
    const allocations: Record<string, { name: string, type: 'team' | 'labour' | 'equipment', projects: string[], count: number }> = {};

    // 1. Team Members from Projects
    projects.forEach(project => {
      project.assignedTeam?.forEach(member => {
        if (!allocations[member]) {
          allocations[member] = { name: member, type: 'team', projects: [], count: 0 };
        }
        if (!allocations[member].projects.includes(project.name)) {
          allocations[member].projects.push(project.name);
          allocations[member].count++;
        }
      });
    });

    // 2. Labour from Labour collection
    labour.forEach(worker => {
      if (worker.status === 'active') {
        if (!allocations[worker.name]) {
          allocations[worker.name] = { name: worker.name, type: 'labour', projects: [], count: 0 };
        }
        const projectName = projects.find(p => p.id === worker.projectId)?.name || 'Unknown Project';
        if (!allocations[worker.name].projects.includes(projectName)) {
          allocations[worker.name].projects.push(projectName);
          allocations[worker.name].count++;
        }
      }
    });

    // 3. Equipment from Expenses (simplified)
    expenses.filter(e => e.category === 'equipment').forEach(expense => {
      const equipmentName = expense.description;
      if (!allocations[equipmentName]) {
        allocations[equipmentName] = { name: equipmentName, type: 'equipment', projects: [], count: 0 };
      }
      const projectName = projects.find(p => p.id === expense.projectId)?.name || 'Unknown Project';
      if (!allocations[equipmentName].projects.includes(projectName)) {
        allocations[equipmentName].projects.push(projectName);
        allocations[equipmentName].count++;
      }
    });

    return Object.values(allocations);
  }, [projects, labour, expenses]);

  const filteredAllocations = resourceAllocations.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Resource Allocation</h2>
        <p className="text-slate-500">Monitor team and equipment assignments across all projects.</p>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
            <Search className="text-slate-400 mr-3" size={20} />
            <input 
              type="text"
              placeholder="Search resources, types, or projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-600"
            />
          </div>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Over-Allocated</p>
              <p className="text-xl font-black text-rose-900">
                {resourceAllocations.filter(a => a.count > 1).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAllocations.map((resource, i) => (
          <motion.div
            key={resource.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all",
              resource.count > 1 ? "border-rose-100 bg-rose-50/30" : "border-slate-100"
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                  resource.type === 'team' ? "bg-blue-50 text-blue-600" :
                  resource.type === 'labour' ? "bg-emerald-50 text-emerald-600" :
                  "bg-amber-50 text-amber-600"
                )}>
                  {resource.type === 'team' ? <User size={24} /> :
                   resource.type === 'labour' ? <HardHat size={24} /> :
                   <Truck size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{resource.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{resource.type}</p>
                </div>
              </div>
              {resource.count > 1 ? (
                <div className="px-2 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center">
                  <AlertTriangle size={10} className="mr-1" />
                  Over-Allocated
                </div>
              ) : (
                <div className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center">
                  <CheckCircle2 size={10} className="mr-1" />
                  Optimal
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Assignments ({resource.count})</p>
              <div className="flex flex-wrap gap-2">
                {resource.projects.map(project => (
                  <div key={project} className="flex items-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Briefcase size={12} className="text-slate-400 mr-2" />
                    <span className="text-xs font-bold text-slate-600">{project}</span>
                  </div>
                ))}
              </div>
            </div>

            {resource.count > 1 && (
              <div className="mt-6 p-3 bg-rose-100/50 rounded-xl border border-rose-100 text-[10px] text-rose-700 font-medium">
                Warning: This resource is assigned to multiple projects simultaneously. Consider re-allocation.
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ResourceAllocationModule;
