import React, { useMemo } from 'react';
import { Task } from '../types';
import { format, parseISO, differenceInDays, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, onUpdateTaskStatus }) => {
  const headerHeight = 52;
  const rowHeight = 64;

  const { startDate, endDate, totalDays, dateRange } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return { startDate: now, endDate: addDays(now, 30), totalDays: 30, dateRange: [] };
    }

    const starts = tasks.map(t => parseISO(t.startDate));
    const ends = tasks.map(t => parseISO(t.endDate));
    
    const start = startOfDay(new Date(Math.min(...starts.map(d => d.getTime()))));
    const end = endOfDay(new Date(Math.max(...ends.map(d => d.getTime()))));
    
    // Add some padding
    const paddedStart = addDays(start, -2);
    const paddedEnd = addDays(end, 5);
    
    const diff = differenceInDays(paddedEnd, paddedStart);
    
    const range = [];
    for (let i = 0; i <= diff; i++) {
      range.push(addDays(paddedStart, i));
    }

    return { startDate: paddedStart, endDate: paddedEnd, totalDays: diff, dateRange: range };
  }, [tasks]);

  const getTaskPosition = (task: Task) => {
    const start = parseISO(task.startDate);
    const end = parseISO(task.endDate);
    
    const left = (differenceInDays(start, startDate) / totalDays) * 100;
    const width = (differenceInDays(end, start) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'in-progress': return <PlayCircle size={14} className="text-blue-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 bg-slate-50/30">
        <h3 className="text-lg font-bold text-slate-900">Project Timeline (Gantt)</h3>
        <p className="text-xs text-slate-500">Visualize task durations and dependencies</p>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px] relative">
          {/* Header Dates */}
          <div className="flex border-b border-slate-100">
            <div className="w-48 flex-shrink-0 p-4 border-r border-slate-100 bg-slate-50/50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
              Task Name
            </div>
            <div className="flex-1 flex">
              {dateRange.map((date, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 min-w-[40px] p-2 text-center border-r border-slate-50 last:border-r-0",
                    [0, 6].includes(date.getDay()) ? "bg-slate-50/30" : ""
                  )}
                >
                  <span className="block text-[10px] font-bold text-slate-400">{format(date, 'EEE')}</span>
                  <span className="block text-xs font-black text-slate-900">{format(date, 'dd')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="relative">
            {tasks.map((task) => {
              const pos = getTaskPosition(task);
              return (
                <div key={task.id} className="flex border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                  <div className="w-48 flex-shrink-0 p-4 border-r border-slate-100 flex items-center justify-between">
                    <div className="truncate">
                      <p className="text-sm font-bold text-slate-900 truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{task.assignee}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => onUpdateTaskStatus(task.id, task.status === 'completed' ? 'in-progress' : 'completed')}
                        className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 relative h-16">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {dateRange.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-slate-50/50 last:border-r-0" />
                      ))}
                    </div>

                    {/* Task Bar */}
                    <motion.div 
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      style={{ 
                        left: pos.left, 
                        width: pos.width,
                        transformOrigin: 'left'
                      }}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm flex items-center px-3 overflow-hidden",
                        task.status === 'completed' ? "bg-emerald-500" : 
                        task.status === 'in-progress' ? "bg-blue-500" : "bg-slate-300"
                      )}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">
                        {task.progress}%
                      </span>
                    </motion.div>

                    {/* Dependency Lines (Simplified visualization) */}
                    {task.dependencies.map(depId => {
                      const depTask = tasks.find(t => t.id === depId);
                      if (!depTask) return null;
                      
                      // This is a very simplified dependency visualization
                      // In a real app, we'd draw SVG paths between bars
                      return null; 
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dependency SVG Layer */}
          <svg 
            className="absolute inset-0 pointer-events-none w-full h-full"
            style={{ minHeight: headerHeight + (tasks.length * rowHeight) }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            {tasks.map((task, taskIdx) => {
              return task.dependencies.map(depId => {
                const depIdx = tasks.findIndex(t => t.id === depId);
                if (depIdx === -1) return null;
                
                const depTask = tasks[depIdx];
                const depPos = getTaskPosition(depTask);
                const taskPos = getTaskPosition(task);
                
                // Calculate coordinates in percentages for X and pixels for Y
                // We'll use a trick: use a nested SVG or just use the parent's coordinate system
                // Since we can't easily mix units in 'd', we'll use 'x' and 'y' on 'line' or 'polyline'
                // Or better, just use a viewBox that maps 0-100 to the width
                
                const x1 = parseFloat(depPos.left) + parseFloat(depPos.width);
                const y1 = headerHeight + (depIdx * rowHeight) + (rowHeight / 2);
                
                const x2 = parseFloat(taskPos.left);
                const y2 = headerHeight + (taskIdx * rowHeight) + (rowHeight / 2);

                // Midpoint for the elbow
                const midX = x1 + (x2 - x1) / 2;

                return (
                  <g key={`${task.id}-${depId}`}>
                    {/* We use multiple lines to simulate the path since we can't mix % and px in 'd' easily without a viewBox */}
                    <line 
                      x1={`${x1}%`} y1={y1} 
                      x2={`${midX}%`} y2={y1} 
                      stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" 
                    />
                    <line 
                      x1={`${midX}%`} y1={y1} 
                      x2={`${midX}%`} y2={y2} 
                      stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" 
                    />
                    <line 
                      x1={`${midX}%`} y1={y2} 
                      x2={`${x2}%`} y2={y2} 
                      stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" 
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              });
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
