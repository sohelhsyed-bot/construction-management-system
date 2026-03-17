export type UserRole = 'admin' | 'manager' | 'supervisor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  mobileNumber?: string;
  experienceYears?: number;
  role: UserRole;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface SubTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignee: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
  dependencies: string[]; // IDs of tasks that must be completed first
  subTasks: SubTask[];
  assignee: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  budget: number;
  deadline: string;
  status: 'planned' | 'in-progress' | 'completed' | 'on-hold';
  progress: number;
  assignedTeam: string[];
  milestones: Milestone[];
  createdBy: string;
  createdAt: string;
}

export interface Labour {
  id: string;
  name: string;
  trade: string;
  dailyWage: number;
  phoneNumber: string;
  status: 'active' | 'inactive';
  projectId: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  labourId: string;
  date: string;
  status: 'present' | 'absent' | 'half-day';
  projectId: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minThreshold: number;
  expiryDate?: string;
  batchNumber?: string;
  projectId: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'material' | 'labour' | 'equipment' | 'other';
  date: string;
  projectId: string;
  recordedBy: string;
  notes?: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  source: string; // e.g., "Project Owner"
  date: string;
  projectId: string;
  recordedBy: string;
  notes?: string;
}

export interface DPR {
  id: string;
  date: string;
  workDone: string;
  images: string[];
  notes?: string;
  projectId: string;
  submittedBy: string;
}

export interface AppNotification {
  id: string;
  type: 'low-stock' | 'overdue' | 'system';
  title: string;
  message: string;
  date: string;
  read: boolean;
  projectId?: string;
  projectName?: string;
  entityId?: string;
}
