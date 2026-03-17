import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { UserProfile, Project } from '../types';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  projectName: string;
}

const addHeader = (doc: jsPDF, user: UserProfile, totalProjects: number) => {
  const companyName = user.companyName || 'ONESITE CONSTRUCTION';
  const userName = user.displayName || 'User';
  const mobile = user.mobileNumber || 'N/A';
  const experience = user.experienceYears || 0;

  // Company Name
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 14, 22);

  // User Details
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proprietor: ${userName}`, 14, 30);
  doc.text(`Mobile: ${mobile}`, 14, 35);
  doc.text(`Experience: ${experience} Years`, 14, 40);
  doc.text(`Total Projects: ${totalProjects}`, 14, 45);

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, 50, 196, 50);
};

const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageSize = doc.internal.pageSize;
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Developed by Sohel Hanif Sayyed Group`, 14, pageHeight - 10);
    
    // Red Heart
    doc.setTextColor(239, 68, 68); // Red 500
    doc.text('❤️', 82, pageHeight - 10);
    
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageSize.width - 30, pageHeight - 10);
  }
};

export const generateTransactionReport = (
  transactions: Transaction[],
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  user: UserProfile,
  totalProjects: number
) => {
  const doc = new jsPDF();
  const now = new Date();
  
  let interval: { start: Date; end: Date };
  let title = '';

  switch (period) {
    case 'daily':
      interval = { start: startOfDay(now), end: endOfDay(now) };
      title = `Daily Transaction Report - ${format(now, 'PPP')}`;
      break;
    case 'weekly':
      interval = { start: startOfWeek(now), end: endOfWeek(now) };
      title = `Weekly Transaction Report - ${format(interval.start, 'PP')} to ${format(interval.end, 'PP')}`;
      break;
    case 'monthly':
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
      title = `Monthly Transaction Report - ${format(now, 'MMMM yyyy')}`;
      break;
    case 'yearly':
      interval = { start: startOfYear(now), end: endOfYear(now) };
      title = `Yearly Transaction Report - ${format(now, 'yyyy')}`;
      break;
  }

  const filteredTransactions = transactions.filter(t => 
    isWithinInterval(new Date(t.date), interval)
  );

  addHeader(doc, user, totalProjects);

  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.text(title, 14, 60);
  doc.setFontSize(9);
  doc.text(`Generated on: ${format(now, 'PPpp')}`, 14, 65);

  // Summary
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Summary:`, 14, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Income: ₹${totalIncome.toLocaleString()}`, 14, 82);
  doc.text(`Total Expenses: ₹${totalExpense.toLocaleString()}`, 14, 88);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Balance: ₹${(totalIncome - totalExpense).toLocaleString()}`, 14, 94);

  // Table
  const tableData = filteredTransactions.map(t => [
    format(new Date(t.date), 'PP'),
    t.projectName,
    t.type.toUpperCase(),
    t.category,
    t.description,
    `₹${t.amount.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Project', 'Type', 'Category', 'Description', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);
  doc.save(`${user.companyName || 'Onesite'}_Report_${period}_${format(now, 'yyyyMMdd')}.pdf`);
};

export const generateProjectFinancialReport = (
  project: Project,
  income: any[],
  expenses: any[],
  user: UserProfile,
  totalProjects: number
) => {
  const doc = new jsPDF();
  const now = new Date();

  addHeader(doc, user, totalProjects);

  doc.setFontSize(14);
  doc.setTextColor(50);
  doc.setFont('helvetica', 'bold');
  doc.text(`Project Financial Summary: ${project.name}`, 14, 60);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Location: ${project.location}`, 14, 68);
  doc.text(`Finalized Budget: ₹${project.budget.toLocaleString()}`, 14, 74);

  const totalReceived = income.reduce((sum, i) => sum + i.amount, 0);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = project.budget - totalSpent;
  const overBudget = totalSpent > project.budget ? totalSpent - project.budget : 0;
  const balanceToReceive = project.budget - totalReceived;

  // Financial Breakdown
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Overview:', 14, 85);
  doc.setFont('helvetica', 'normal');
  
  const stats = [
    [`Finalized Amount:`, `₹${project.budget.toLocaleString()}`],
    [`Total Received from Owner:`, `₹${totalReceived.toLocaleString()}`],
    [`Total Spent on Project:`, `₹${totalSpent.toLocaleString()}`],
    [`Remaining Budget:`, `₹${Math.max(0, remainingBudget).toLocaleString()}`],
    [`Balance to Receive:`, `₹${Math.max(0, balanceToReceive).toLocaleString()}`]
  ];

  if (overBudget > 0) {
    stats.push([`OVER BUDGET AMOUNT:`, `₹${overBudget.toLocaleString()}`]);
  }

  autoTable(doc, {
    startY: 90,
    body: stats,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 }, 1: { halign: 'right' } }
  });

  // Detailed Transactions
  doc.setFont('helvetica', 'bold');
  doc.text('Recent Transactions:', 14, (doc as any).lastAutoTable.finalY + 15);

  const transactions = [
    ...income.map(i => ({ ...i, type: 'INCOME' })),
    ...expenses.map(e => ({ ...e, type: 'EXPENSE' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const tableData = transactions.map(t => [
    format(new Date(t.date), 'PP'),
    t.type,
    t.description || t.source || 'N/A',
    `₹${t.amount.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Date', 'Type', 'Description/Source', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  });

  addFooter(doc);
  doc.save(`${project.name}_Financial_Report_${format(now, 'yyyyMMdd')}.pdf`);
};
