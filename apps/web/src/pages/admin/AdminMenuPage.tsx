import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Trash2, Plus, EyeOff, Eye, X, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const AdminMenuPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    foodType: 'VEG',
    image: '',
    preparationTime: '15',
    isBestseller: false,
    isRecommended: false,
  });

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin_menu'],
    queryFn: async () => {
      const res = await api.get('/menu/all');
      return res.data;
    }
  });

  const categories = data?.categories || [];

  const toggleAvailability = async (item: any) => {
    try {
      await api.patch(`/admin/menu/${item.id}`, { isAvailable: !item.isAvailable });
      toast.success(`${item.name} is now ${!item.isAvailable ? 'Available' : 'Sold Out'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/admin/menu/${itemId}`);
      toast.success(`Deleted ${name}`);
      refetch();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.categoryId) {
      toast.error('Please fill in Name, Price, and Category');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/admin/menu', {
        name: newItem.name.trim(),
        description: newItem.description.trim() || undefined,
        price: parseFloat(newItem.price),
        categoryId: newItem.categoryId,
        foodType: newItem.foodType,
        image: newItem.image.trim() || undefined,
        preparationTime: parseInt(newItem.preparationTime) || 15,
        isBestseller: newItem.isBestseller,
        isRecommended: newItem.isRecommended,
      });

      toast.success(`Added ${newItem.name} to menu!`);
      setIsAddItemOpen(false);
      setNewItem({
        name: '',
        description: '',
        price: '',
        categoryId: '',
        foodType: 'VEG',
        image: '',
        preparationTime: '15',
        isBestseller: false,
        isRecommended: false,
      });
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/admin/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });

      toast.success(`Category "${newCatName}" created!`);
      setIsAddCategoryOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCategories = activeCategory === 'all' 
    ? categories 
    : categories.filter((c: any) => c.slug === activeCategory);

  return (
    <AdminLayout title="Menu Management">
      
      {/* Sticky Action Header & Category Filters */}
      <div className="sticky top-16 z-20 bg-bg-primary/95 backdrop-blur-md py-4 mb-6 border-b border-border-subtle flex flex-wrap items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1 min-w-[280px]">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === 'all' 
                ? 'bg-gold text-bg-primary font-bold shadow-glow' 
                : 'bg-surface border border-border-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            All Categories ({categories.reduce((acc: number, c: any) => acc + c.items.length, 0)})
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.slug 
                  ? 'bg-gold text-bg-primary font-bold shadow-glow' 
                  : 'bg-surface border border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsAddCategoryOpen(true)}
            className="btn-secondary rounded-xl py-2 px-4 text-sm flex items-center gap-2"
          >
            <FolderPlus size={18} /> Add Category
          </button>
          <button 
            onClick={() => {
              if (categories.length > 0 && !newItem.categoryId) {
                setNewItem(prev => ({ ...prev, categoryId: categories[0].id }));
              }
              setIsAddItemOpen(true);
            }}
            className="btn-primary rounded-xl py-2 px-4 text-sm flex items-center gap-2 shadow-glow"
          >
            <Plus size={18} /> Add New Menu Item
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-muted">Loading menu...</div>
      ) : (
        <div className="space-y-8">
          {displayCategories.map((cat: any) => (
            <div key={cat.id} className="card p-6">
              <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
                <h3 className="text-xl font-bold text-gradient">
                  {cat.name}
                </h3>
                <span className="text-xs text-text-muted font-medium">{cat.items.length} items</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="text-text-muted text-sm border-b border-border-subtle bg-surface/30">
                      <th className="py-3 px-4 font-medium w-[40%]">Item Name</th>
                      <th className="py-3 px-4 font-medium w-[12%]">Type</th>
                      <th className="py-3 px-4 font-medium w-[18%]">Price</th>
                      <th className="py-3 px-4 font-medium w-[15%]">Status</th>
                      <th className="py-3 px-4 font-medium w-[15%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item: any) => (
                      <tr key={item.id} className="border-b border-border-subtle/50 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{item.name}</span>
                            {item.isBestseller && (
                              <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Bestseller
                              </span>
                            )}
                            {item.isRecommended && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Chef Special
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-text-muted line-clamp-1 mt-0.5 max-w-md">{item.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className={`food-type-indicator ${item.foodType.toLowerCase().replace('_', '-')}`} />
                        </td>
                        <td className="py-3 px-4 font-bold text-gold text-base whitespace-nowrap">₹{item.price}</td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => toggleAvailability(item)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                              item.isAvailable 
                                ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20' 
                                : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                            }`}
                          >
                            {item.isAvailable ? <Eye size={12} /> : <EyeOff size={12} />}
                            {item.isAvailable ? 'Available' : 'Sold Out'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors bg-surface rounded-md border border-border-subtle"
                              title="Delete Item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {cat.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 px-4 text-center text-text-muted">No items in this category yet. Click "Add New Menu Item" above to add one.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Menu Item Modal */}
      {isAddItemOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 relative max-w-lg w-full">
            <button 
              onClick={() => setIsAddItemOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-full bg-surface"
            >
              <X size={20} />
            </button>

            <h2 className="font-display text-2xl font-bold text-gradient mb-6">Add New Menu Item</h2>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Item Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="E.g., Chicken Supreme Pizza"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Price (₹) *</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    placeholder="299"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Category *</label>
                  <select 
                    required
                    value={newItem.categoryId}
                    onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                    className="input bg-surface"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Food Type</label>
                  <select 
                    value={newItem.foodType}
                    onChange={(e) => setNewItem({ ...newItem, foodType: e.target.value })}
                    className="input bg-surface"
                  >
                    <option value="VEG">Vegetarian 🟢</option>
                    <option value="NON_VEG">Non-Vegetarian 🔴</option>
                    <option value="EGG">Contains Egg 🟡</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Prep Time (Mins)</label>
                  <input 
                    type="number" 
                    placeholder="15"
                    value={newItem.preparationTime}
                    onChange={(e) => setNewItem({ ...newItem, preparationTime: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea 
                  placeholder="Delicious ingredients, spices, serving style..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="input min-h-[70px] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Image URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://images.unsplash.com/..."
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex gap-6 py-2">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newItem.isBestseller}
                    onChange={(e) => setNewItem({ ...newItem, isBestseller: e.target.checked })}
                    className="w-4 h-4 accent-gold"
                  />
                  Mark as Bestseller
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newItem.isRecommended}
                    onChange={(e) => setNewItem({ ...newItem, isRecommended: e.target.checked })}
                    className="w-4 h-4 accent-gold"
                  />
                  Chef's Special
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-subtle">
                <button 
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="w-1/2 btn-secondary py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 btn-primary py-3 rounded-xl"
                >
                  {isSubmitting ? 'Creating...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Category Modal */}
      {isAddCategoryOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 relative max-w-md w-full">
            <button 
              onClick={() => setIsAddCategoryOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-full bg-surface"
            >
              <X size={20} />
            </button>

            <h2 className="font-display text-2xl font-bold text-gradient mb-6">Add New Category</h2>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Category Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="E.g., Shakes & Mocktails"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
                <textarea 
                  placeholder="Category highlights..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="input min-h-[70px] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-subtle">
                <button 
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="w-1/2 btn-secondary py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 btn-primary py-3 rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default AdminMenuPage;
