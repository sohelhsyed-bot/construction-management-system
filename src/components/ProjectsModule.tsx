import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  X,
  User,
  PieChart,
  ListTodo,
  Flag,
  GanttChartSquare,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

import ProjectExpenses from './ProjectExpenses';
import GanttChart from './GanttChart';
import { ToastType } from './Toast';
import { Task, Milestone, SubTask } from '../types';

interface ProjectsModuleProps {
  projects: Project[];
  onShowToast: (message: string, type: ToastType) => void;
}

const ProjectsModule: React.FC<ProjectsModuleProps> = ({ projects, onShowToast }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectExpenses, setProjectExpenses] = useState<Record<string, number>>({});
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'tasks' | 'milestones' | 'expenses'>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'on-hold': return <AlertCircle className="text-amber-500" size={18} />;
      case 'delayed': return <AlertCircle className="text-rose-500" size={18} />;
      default: return <Clock className="text-blue-500" size={18} />;
    }
  };

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskEndDate, setTaskEndDate] = useState('');
  const [taskDependencies, setTaskDependencies] = useState<string[]>([]);

  // Milestone Form State
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const newTask: Omit<Task, 'id'> = {
      projectId: selectedProject.id,
      title: taskTitle,
      description: '',
      startDate: taskStartDate,
      endDate: taskEndDate,
      status: 'pending',
      progress: 0,
      dependencies: taskDependencies,
      subTasks: [],
      assignee: taskAssignee
    };

    try {
      await addDoc(collection(db, 'projects', selectedProject.id, 'tasks'), newTask);
      onShowToast("Task added successfully", "success");
      setIsAddTaskModalOpen(false);
      setTaskTitle('');
      setTaskAssignee('');
      setTaskStartDate('');
      setTaskEndDate('');
      setTaskDependencies([]);
    } catch (error) {
      onShowToast("Failed to add task", "error");
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const newMilestone: Milestone = {
      id: Math.random().toString(36).substr(2, 9),
      title: milestoneTitle,
      description: milestoneDesc,
      dueDate: milestoneDate,
      completed: false
    };

    const updatedMilestones = [...(selectedProject.milestones || []), newMilestone];
    
    // Recalculate progress
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : selectedProject.progress;

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        milestones: updatedMilestones,
        progress: newProgress
      });
      onShowToast("Milestone added and progress recalculated", "success");
      setIsAddMilestoneModalOpen(false);
      setMilestoneTitle('');
      setMilestoneDesc('');
      setMilestoneDate('');
    } catch (error) {
      onShowToast("Failed to add milestone", "error");
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      setTasks([]);
      return;
    }

    const q = query(collection(db, 'projects', selectedProject.id, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    return () => unsubscribe();
  }, [selectedProject]);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    projects.forEach((project) => {
      const q = query(collection(db, 'projects', project.id, 'expenses'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const totalSpent = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        setProjectExpenses(prev => ({
          ...prev,
          [project.id]: totalSpent
        }));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'on-hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (!selectedProject) return;
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id, 'tasks', taskId), { status });
      onShowToast("Task status updated", "success");
    } catch (error) {
      onShowToast("Failed to update task", "error");
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    const updatedMilestones = selectedProject.milestones.map(m => {
      if (m.id === milestoneId) {
        return { 
          ...m, 
          completed: !m.completed, 
          completedAt: !m.completed ? new Date().toISOString() : undefined 
        };
      }
      return m;
    });

    // Calculate new project progress based on milestones
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : selectedProject.progress;

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), { 
        milestones: updatedMilestones,
        progress: newProgress
      });
      onShowToast("Milestone updated and progress recalculated", "success");
    } catch (error) {
      onShowToast("Failed to update milestone", "error");
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    const updatedMilestones = selectedProject.milestones.filter(m => m.id !== milestoneId);
    
    // Calculate new project progress based on remaining milestones
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : selectedProject.progress;

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), { 
        milestones: updatedMilestones,
        progress: newProgress
      });
      onShowToast("Milestone deleted and progress recalculated", "success");
    } catch (error) {
      onShowToast("Failed to delete milestone", "error");
    }
  };

  const handleAddSubTask = async (taskId: string, subTaskTitle: string, assignee: string) => {
    if (!selectedProject) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubTask: SubTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: subTaskTitle,
      status: 'pending',
      assignee
    };

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id, 'tasks', taskId), {
        subTasks: [...task.subTasks, newSubTask]
      });
      onShowToast("Sub-task added", "success");
    } catch (error) {
      onShowToast("Failed to add sub-task", "error");
    }
  };

  const handleToggleSubTask = async (taskId: string, subTaskId: string) => {
    if (!selectedProject) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubTasks = task.subTasks.map(st => {
      if (st.id === subTaskId) {
        return { ...st, status: st.status === 'completed' ? 'pending' : 'completed' };
      }
      return st;
    });

    // Calculate overall task progress based on sub-tasks
    const completedCount = updatedSubTasks.filter(st => st.status === 'completed').length;
    const progress = Math.round((completedCount / updatedSubTasks.length) * 100);

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id, 'tasks', taskId), {
        subTasks: updatedSubTasks,
        progress: progress,
        status: progress === 100 ? 'completed' : 'in-progress'
      });
    } catch (error) {
      onShowToast("Failed to update sub-task", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Projects</h2>
        <p className="text-slate-500">Manage and track all your construction projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedProject(project)}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1",
                  getStatusColor(project.status)
                )}>
                  {getStatusIcon(project.status)}
                  <span className="capitalize">{project.status.replace('-', ' ')}</span>
                </div>
                <div className="text-slate-400 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight size={20} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                {project.name}
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-slate-500 text-sm">
                  <MapPin size={16} className="mr-2" />
                  {project.location}
                </div>
                <div className="flex items-center text-slate-500 text-sm">
                  <Calendar size={16} className="mr-2" />
                  Deadline: {project.deadline ? format(parseISO(project.deadline), 'MMM dd, yyyy') : 'N/A'}
                </div>
              </div>

              {/* Budget Tracker */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center space-x-1">
                      <PieChart size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget Spent</span>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      (projectExpenses[project.id] || 0) > project.budget ? "text-rose-600" : "text-slate-900"
                    )}>
                      ₹{(projectExpenses[project.id] || 0).toLocaleString()} / ₹{project.budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((projectExpenses[project.id] || 0) / project.budget) * 100, 100)}%` }}
                      className={cn(
                        "h-full rounded-full",
                        (projectExpenses[project.id] || 0) > project.budget ? "bg-rose-500" : "bg-blue-500"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center space-x-1">
                      <TrendingUp size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                {project.milestones && project.milestones.length > 0 && (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center space-x-1">
                        <Flag size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestones</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {project.milestones.filter(m => m.completed).length} / {project.milestones.length}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {project.milestones.map((m, idx) => (
                        <div 
                          key={m.id} 
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            m.completed ? "bg-emerald-500" : "bg-slate-100"
                          )}
                          title={m.title}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex justify-between items-start border-b border-slate-50">
                <div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold border inline-flex items-center space-x-2 mb-4",
                    getStatusColor(selectedProject.status)
                  )}>
                    {selectedProject.status === 'completed' ? <CheckCircle2 size={16} /> : 
                     selectedProject.status === 'in-progress' ? <TrendingUp size={16} /> : 
                     selectedProject.status === 'on-hold' ? <AlertCircle size={16} /> : <Clock size={16} />}
                    <span className="capitalize">{selectedProject.status.replace('-', ' ')}</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                    {selectedProject.name}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-8 pt-4 flex space-x-6 border-b border-slate-50 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'overview', label: 'Overview', icon: PieChart },
                  { id: 'tasks', label: 'Tasks & Gantt', icon: GanttChartSquare },
                  { id: 'milestones', label: 'Milestones', icon: Flag },
                  { id: 'expenses', label: 'Expenses', icon: DollarSign },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id as any)}
                    className={cn(
                      "flex items-center space-x-2 pb-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
                      activeDetailTab === tab.id 
                        ? "text-emerald-500 border-emerald-500" 
                        : "text-slate-400 border-transparent hover:text-slate-600"
                    )}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                {activeDetailTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Project Details</h4>
                        <div className="space-y-4">
                          <div className="flex items-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm mr-4">
                              <MapPin size={20} />
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Location</p>
                              <p className="text-slate-900 font-bold">{selectedProject.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm mr-4">
                              <Calendar size={20} />
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Deadline</p>
                              <p className="text-slate-900 font-bold">
                                {selectedProject.deadline ? format(parseISO(selectedProject.deadline), 'MMMM dd, yyyy') : 'Not set'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm mr-4">
                              <DollarSign size={20} />
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Total Budget</p>
                              <p className="text-slate-900 font-bold">₹{selectedProject.budget.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Budget Allocation</h4>
                        <div className={cn(
                          "p-6 rounded-3xl border",
                          (projectExpenses[selectedProject.id] || 0) > selectedProject.budget 
                            ? "bg-rose-50 border-rose-100" 
                            : "bg-blue-50 border-blue-100"
                        )}>
                          <div className="flex justify-between items-end mb-3">
                            <span className={cn(
                              "font-bold",
                              (projectExpenses[selectedProject.id] || 0) > selectedProject.budget ? "text-rose-700" : "text-blue-700"
                            )}>Spent</span>
                            <span className={cn(
                              "text-2xl font-black",
                              (projectExpenses[selectedProject.id] || 0) > selectedProject.budget ? "text-rose-900" : "text-blue-900"
                            )}>
                              ₹{(projectExpenses[selectedProject.id] || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner mb-2">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(((projectExpenses[selectedProject.id] || 0) / selectedProject.budget) * 100, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full shadow-lg",
                                (projectExpenses[selectedProject.id] || 0) > selectedProject.budget 
                                  ? "bg-rose-500 shadow-rose-500/30" 
                                  : "bg-blue-500 shadow-blue-500/30"
                              )}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-slate-400">0%</span>
                            <span className={cn(
                              (projectExpenses[selectedProject.id] || 0) > selectedProject.budget ? "text-rose-500" : "text-blue-500"
                            )}>
                              {Math.round(((projectExpenses[selectedProject.id] || 0) / selectedProject.budget) * 100)}% Used
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="space-y-6">
                      <section>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Site Progress</h4>
                          {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                              <Flag size={10} />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Milestone Driven</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                          <div className="flex justify-between items-end mb-3">
                            <span className="text-emerald-700 font-bold">Overall Completion</span>
                            <span className="text-2xl font-black text-emerald-900">{selectedProject.progress}%</span>
                          </div>
                          <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedProject.progress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"
                            />
                          </div>
                        </div>
                      </section>

                      {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                        <section>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Milestone Progress</h4>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="flex justify-between items-end mb-3">
                              <span className="text-slate-700 font-bold">Completed Milestones</span>
                              <span className="text-2xl font-black text-slate-900">
                                {selectedProject.milestones.filter(m => m.completed).length} / {selectedProject.milestones.length}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {selectedProject.milestones.map((m) => (
                                <div 
                                  key={m.id}
                                  className={cn(
                                    "h-2 flex-1 rounded-full transition-all duration-500",
                                    m.completed ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-slate-200"
                                  )}
                                  title={m.title}
                                />
                              ))}
                            </div>
                            <div className="mt-4 space-y-2">
                              {selectedProject.milestones.slice(0, 3).map(m => (
                                <div key={m.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center space-x-2">
                                    {m.completed ? (
                                      <CheckCircle2 size={12} className="text-emerald-500" />
                                    ) : (
                                      <Clock size={12} className="text-slate-300" />
                                    )}
                                    <span className={cn(m.completed ? "text-slate-900 font-medium" : "text-slate-500")}>
                                      {m.title}
                                    </span>
                                  </div>
                                  <span className="text-slate-400">
                                    {format(parseISO(m.dueDate), 'MMM dd')}
                                  </span>
                                </div>
                              ))}
                              {selectedProject.milestones.length > 3 && (
                                <button 
                                  onClick={() => setActiveDetailTab('milestones')}
                                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest pt-1"
                                >
                                  View all {selectedProject.milestones.length} milestones
                                </button>
                              )}
                            </div>
                          </div>
                        </section>
                      )}

                      <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Assigned Team</h4>
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                          {selectedProject.assignedTeam && selectedProject.assignedTeam.length > 0 ? (
                            <div className="space-y-3">
                              {selectedProject.assignedTeam.map((member, idx) => (
                                <div key={idx} className="flex items-center space-x-3 bg-white p-3 rounded-xl shadow-sm">
                                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                    {member.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{member}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Users className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="text-sm text-slate-400">No team members assigned yet.</p>
                            </div>
                          )}
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Metadata</h4>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-slate-500">
                            <User size={14} className="mr-2" />
                            Created by: <span className="font-bold text-slate-700 ml-1">{selectedProject.createdBy}</span>
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock size={14} className="mr-2" />
                            Created on: <span className="font-bold text-slate-700 ml-1">
                              {format(parseISO(selectedProject.createdAt), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'tasks' && (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tasks Management</h4>
                      <button 
                        onClick={() => setIsAddTaskModalOpen(true)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center space-x-2"
                      >
                        <Plus size={14} />
                        <span>Add Task</span>
                      </button>
                    </div>

                    <GanttChart tasks={tasks} onUpdateTaskStatus={handleUpdateTaskStatus} />

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Task List & Sub-tasks</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {tasks.map(task => (
                          <div key={task.id} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="p-4 flex items-center justify-between bg-white">
                              <div className="flex items-center space-x-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center",
                                  task.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  <ListTodo size={18} />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-slate-900">{task.title}</h5>
                                  <p className="text-[10px] text-slate-400 font-medium">Assignee: {task.assignee}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-xs font-black text-slate-900">{task.progress}%</p>
                                  <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${task.progress}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Sub-tasks */}
                            <div className="p-4 space-y-3">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-tasks ({task.subTasks.length})</p>
                                <button 
                                  onClick={() => {
                                    const title = prompt("Enter sub-task title:");
                                    const assignee = prompt("Enter assignee name:");
                                    if (title && assignee) handleAddSubTask(task.id, title, assignee);
                                  }}
                                  className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600"
                                >
                                  + Add Sub-task
                                </button>
                              </div>
                              {task.subTasks.map(st => (
                                <div key={st.id} className="flex items-center justify-between bg-white/50 p-2 rounded-xl border border-slate-100/50">
                                  <div className="flex items-center space-x-3">
                                    <button 
                                      onClick={() => handleToggleSubTask(task.id, st.id)}
                                      className={cn(
                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                        st.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"
                                      )}
                                    >
                                      {st.status === 'completed' && <CheckCircle2 size={12} />}
                                    </button>
                                    <div>
                                      <p className={cn("text-xs font-bold", st.status === 'completed' ? "text-slate-400 line-through" : "text-slate-700")}>
                                        {st.title}
                                      </p>
                                      <p className="text-[9px] text-slate-400">Assignee: {st.assignee}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'milestones' && (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Roadmap</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Track key project achievements and phases</p>
                      </div>
                      <button 
                        onClick={() => setIsAddMilestoneModalOpen(true)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Plus size={14} />
                        <span>Add Milestone</span>
                      </button>
                    </div>

                    <div className="relative pl-8 space-y-8">
                      {/* Vertical Timeline Line */}
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100" />

                      {selectedProject.milestones?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <Flag className="mx-auto text-slate-300 mb-3" size={32} />
                          <p className="text-sm text-slate-500 font-medium">No milestones defined yet.</p>
                          <button 
                            onClick={() => setIsAddMilestoneModalOpen(true)}
                            className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                          >
                            Create your first milestone
                          </button>
                        </div>
                      ) : (
                        selectedProject.milestones?.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((milestone, i) => (
                          <div key={milestone.id} className="relative">
                            {/* Timeline Dot */}
                            <div className={cn(
                              "absolute -left-[27px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-all duration-500",
                              milestone.completed ? "bg-emerald-500 scale-125" : "bg-slate-200"
                            )} />

                            <motion.div 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className={cn(
                                "p-6 rounded-3xl border transition-all flex items-center justify-between group",
                                milestone.completed ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                              )}
                            >
                              <div className="flex items-center space-x-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-500",
                                  milestone.completed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                  <Flag size={24} />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h5 className={cn("text-lg font-bold", milestone.completed ? "text-emerald-900" : "text-slate-900")}>
                                      {milestone.title}
                                    </h5>
                                    {milestone.completed && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                                        Achieved
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 max-w-md">{milestone.description}</p>
                                  <div className="flex items-center mt-3 space-x-4">
                                    <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      <Calendar size={12} className="mr-1.5" />
                                      Due: {format(parseISO(milestone.dueDate), 'MMM dd, yyyy')}
                                    </div>
                                    {milestone.completed && (
                                      <div className="flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                        <CheckCircle2 size={12} className="mr-1.5" />
                                        Completed: {format(parseISO(milestone.completedAt!), 'MMM dd')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={() => handleDeleteMilestone(milestone.id)}
                                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Delete Milestone"
                                >
                                  <X size={16} />
                                </button>
                                <button 
                                  onClick={() => handleToggleMilestone(milestone.id)}
                                  className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm",
                                    milestone.completed 
                                      ? "bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-100" 
                                      : "bg-slate-900 text-white hover:bg-slate-800"
                                  )}
                                >
                                  {milestone.completed ? 'Undo' : 'Mark Complete'}
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeDetailTab === 'expenses' && (
                  <section>
                    <ProjectExpenses project={selectedProject} onShowToast={onShowToast} />
                  </section>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 pt-0 mt-auto">
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/20"
                >
                  Close Detail View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add New Task</h3>
                  <button onClick={() => setIsAddTaskModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={20} /></button>
                </div>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Task Title</label>
                    <input 
                      type="text" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g., Foundation Work"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                    <input 
                      type="text" required value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                      <input 
                        type="date" required value={taskStartDate} onChange={(e) => setTaskStartDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                      <input 
                        type="date" required value={taskEndDate} onChange={(e) => setTaskEndDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dependencies</label>
                    <select 
                      multiple
                      value={taskDependencies}
                      onChange={(e) => setTaskDependencies(Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                    >
                      {tasks.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple dependencies</p>
                  </div>
                  <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                    Create Task
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {isAddMilestoneModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add Milestone</h3>
                  <button onClick={() => setIsAddMilestoneModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={20} /></button>
                </div>
                <form onSubmit={handleAddMilestone} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Milestone Title</label>
                    <input 
                      type="text" required value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g., Foundation Completion"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      required value={milestoneDesc} onChange={(e) => setMilestoneDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                      placeholder="What needs to be achieved?"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Due Date</label>
                    <input 
                      type="date" required value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                    Add Milestone
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectsModule;
