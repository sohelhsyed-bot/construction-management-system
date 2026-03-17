import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Package, 
  Receipt, 
  FileText, 
  Bell, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userRole?: string;
  notificationsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, userRole, notificationsCount }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'projects', label: 'Projects', icon: Briefcase, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'labour', label: 'Labour', icon: Users, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'materials', label: 'Materials', icon: Package, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'manager'] },
    { id: 'allocation', label: 'Resources', icon: Users, roles: ['admin', 'manager'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'manager', 'supervisor'] },
  ];

  const filteredMenu = menuItems.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <>
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Onesite</h1>
          <p className="text-xs text-slate-400 mt-1">Construction Management</p>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.id === 'notifications' && notificationsCount !== undefined && notificationsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {notificationsCount > 99 ? '99+' : notificationsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 w-full px-4">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
