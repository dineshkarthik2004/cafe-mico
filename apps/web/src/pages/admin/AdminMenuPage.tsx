import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Trash2, Plus, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const AdminMenuPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin_menu'],
    queryFn: async () => {
      // For simplicity, we just use the public menu endpoint which we made accessible to all items for admin
      const res = await api.get('/menu/all');
      return res.data;
    }
  });

  const toggleAvailability = async (item: any) => {
    try {
      await api.patch(`/admin/menu/${item.id}`, { isAvailable: !item.isAvailable });
      toast.success(`${item.name} is now ${!item.isAvailable ? 'Available' : 'Unavailable'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const categories = data?.categories || [];
  
  const displayCategories = activeCategory === 'all' 
    ? categories 
    : categories.filter((c: any) => c.slug === activeCategory);

  return (
    <AdminLayout title="Menu Management">
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 flex-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === 'all' 
                ? 'bg-gold text-bg-primary' 
                : 'bg-surface border border-border-subtle text-text-secondary'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.slug 
                  ? 'bg-gold text-bg-primary' 
                  : 'bg-surface border border-border-subtle text-text-secondary'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <button className="btn-primary rounded-xl shrink-0 whitespace-nowrap">
          <Plus size={18} /> Add New Item
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-muted">Loading menu...</div>
      ) : (
        <div className="space-y-8">
          {displayCategories.map((cat: any) => (
            <div key={cat.id} className="card p-6">
              <h3 className="text-xl font-bold mb-4 border-b border-border-subtle pb-2 text-gradient">
                {cat.name}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-text-muted text-sm border-b border-border-subtle">
                      <th className="py-3 px-4 font-medium">Item Name</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Price</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item: any) => (
                      <tr key={item.id} className="border-b border-border-subtle/50 hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-text-primary">{item.name}</div>
                          {item.isBestseller && <span className="text-[10px] bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-2">Bestseller</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className={`food-type-indicator ${item.foodType.toLowerCase().replace('_', '-')}`} />
                        </td>
                        <td className="py-3 px-4 font-medium">₹{item.price}</td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => toggleAvailability(item)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              item.isAvailable 
                                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                          >
                            {item.isAvailable ? <Eye size={12} /> : <EyeOff size={12} />}
                            {item.isAvailable ? 'Available' : 'Sold Out'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-1.5 text-text-muted hover:text-gold transition-colors bg-surface rounded-md border border-border-subtle">
                              <Edit2 size={16} />
                            </button>
                            <button className="p-1.5 text-text-muted hover:text-red-500 transition-colors bg-surface rounded-md border border-border-subtle">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {cat.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 px-4 text-center text-text-muted">No items in this category</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminMenuPage;
