import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  AlertCircle,
  X,
  Briefcase,
  Layers,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Material } from '../types';
import { ToastType } from './Toast';
import { cn } from '../lib/utils';

interface MaterialsModuleProps {
  projects: Project[];
  onShowToast: (message: string, type: ToastType) => void;
}

const MaterialsModule: React.FC<MaterialsModuleProps> = ({ projects, onShowToast }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');

  const units = ['Bags', 'kg', 'm3', 'sqft', 'Units', 'Liters', 'Tons', 'Other'];

  useEffect(() => {
    if (!selectedProjectId) {
      setMaterials([]);
      return;
    }

    setLoading(true);
    const q = collection(db, 'projects', selectedProjectId, 'materials');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      setMaterials(materialsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      onShowToast("Failed to fetch material inventory.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const materialData = {
      name,
      unit,
      quantity: Number(quantity),
      minThreshold: Number(minThreshold),
      expiryDate: expiryDate || null,
      batchNumber: batchNumber || null,
      projectId: selectedProjectId
    };

    try {
      if (editingMaterial) {
        await updateDoc(doc(db, 'projects', selectedProjectId, 'materials', editingMaterial.id), materialData);
        onShowToast("Material updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'projects', selectedProjectId, 'materials'), materialData);
        onShowToast("Material added successfully!", "success");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving material:", error);
      onShowToast("Failed to save material details.", "error");
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete || !selectedProjectId) return;
    try {
      await deleteDoc(doc(db, 'projects', selectedProjectId, 'materials', materialToDelete));
      onShowToast("Material deleted successfully!", "success");
      setIsDeleteModalOpen(false);
      setMaterialToDelete(null);
    } catch (error) {
      console.error("Error deleting material:", error);
      onShowToast("Failed to delete material.", "error");
    }
  };

  const confirmDelete = (materialId: string) => {
    setMaterialToDelete(materialId);
    setIsDeleteModalOpen(true);
  };

  const openModal = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setName(material.name);
      setUnit(material.unit);
      setQuantity(material.quantity.toString());
      setMinThreshold(material.minThreshold.toString());
      setExpiryDate(material.expiryDate || '');
      setBatchNumber(material.batchNumber || '');
    } else {
      setEditingMaterial(null);
      setName('');
      setUnit('');
      setQuantity('');
      setMinThreshold('');
      setExpiryDate('');
      setBatchNumber('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedProjectId || selectedMaterialIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMaterialIds.length} materials?`)) return;
    
    try {
      const promises = selectedMaterialIds.map(id => 
        deleteDoc(doc(db, 'projects', selectedProjectId, 'materials', id))
      );
      await Promise.all(promises);
      onShowToast(`Deleted ${selectedMaterialIds.length} materials.`, "success");
      setSelectedMaterialIds([]);
    } catch (error) {
      console.error("Bulk delete error:", error);
      onShowToast("Failed to delete materials.", "error");
    }
  };

  const handleBulkExport = () => {
    if (selectedMaterialIds.length === 0) return;
    const selectedItems = materials.filter(m => selectedMaterialIds.includes(m.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Unit,Quantity,Min Threshold,Batch,Expiry\n"
      + selectedItems.map(m => `${m.name},${m.unit},${m.quantity},${m.minThreshold},${m.batchNumber || ''},${m.expiryDate || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `materials_export_${selectedProjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`Exported ${selectedMaterialIds.length} materials.`, "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Material Inventory</h2>
          <p className="text-slate-500">Track and manage site resources.</p>
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
            <button 
              onClick={() => openModal()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Material</span>
            </button>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Project Selected</h3>
          <p className="text-slate-500 mt-1">Please select a project to manage its material inventory.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          {selectedMaterialIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-700"
            >
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {selectedMaterialIds.length}
                </span>
                <span className="text-sm font-medium">Selected</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-700" />
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected</span>
                </button>
                <button 
                  onClick={handleBulkExport}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2"
                >
                  <ArrowDown size={14} className="text-slate-400" />
                  <span>Export CSV</span>
                </button>
                <button 
                  onClick={() => setSelectedMaterialIds([])}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredMaterials.map((material, i) => {
                const isLowStock = material.quantity <= material.minThreshold;
                return (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group relative",
                      isLowStock ? "border-rose-100 bg-rose-50/30" : "border-slate-100"
                    )}
                  >
                    <div className="absolute top-4 left-4 z-10">
                      <input 
                        type="checkbox"
                        checked={selectedMaterialIds.includes(material.id)}
                        onChange={() => toggleSelection(material.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between items-start mb-4 pl-8">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isLowStock ? "bg-rose-100 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <Package size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{material.name}</h4>
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{material.unit}</span>
                        </div>
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(material)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => confirmDelete(material.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Current Stock</span>
                          <div className="flex items-baseline space-x-1">
                            <span className={cn(
                              "text-3xl font-bold",
                              isLowStock ? "text-rose-600" : "text-slate-900"
                            )}>
                              {material.quantity}
                            </span>
                            <span className="text-slate-400 text-sm font-medium">{material.unit}</span>
                          </div>
                        </div>
                        {isLowStock && (
                          <div className="flex items-center space-x-1 text-rose-600 bg-rose-100 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            <AlertCircle size={12} />
                            <span>Low Stock</span>
                          </div>
                        )}
                      </div>

                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            isLowStock ? "bg-rose-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((material.quantity / (material.minThreshold * 2)) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-400">Min. Threshold: {material.minThreshold} {material.unit}</span>
                        <span className={cn(
                          isLowStock ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {isLowStock ? 'Restock Required' : 'Stock Healthy'}
                        </span>
                      </div>

                      {(material.batchNumber || material.expiryDate) && (
                        <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 text-[10px]">
                          {material.batchNumber && (
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider block">Batch No.</span>
                              <span className="font-bold text-slate-700">{material.batchNumber}</span>
                            </div>
                          )}
                          {material.expiryDate && (
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider block">Expiry Date</span>
                              <span className={cn(
                                "font-bold",
                                new Date(material.expiryDate) < new Date() ? "text-rose-500" : "text-slate-700"
                              )}>
                                {material.expiryDate}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredMaterials.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                No materials found for this project.
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
                  {editingMaterial ? 'Edit Material' : 'Add New Material'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Material Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. Cement, Steel, Bricks"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <select
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      <option value="">Select Unit</option>
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min. Threshold</label>
                    <input
                      type="number"
                      required
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Low stock alert at..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Quantity</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col">
                      <button 
                        type="button" 
                        onClick={() => setQuantity((Number(quantity) + 1).toString())}
                        className="p-0.5 hover:text-emerald-500 transition-colors"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setQuantity(Math.max(0, Number(quantity) - 1).toString())}
                        className="p-0.5 hover:text-rose-500 transition-colors"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Add Material')}
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
              <h3 className="text-xl font-bold text-slate-900">Delete Material?</h3>
              <p className="text-slate-500 mt-2">This action cannot be undone. This material will be removed from inventory.</p>
              
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
    </div>
  );
};

export default MaterialsModule;
