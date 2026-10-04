import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const AdminSettingsPage = () => {
  const [formData, setFormData] = useState({
    isOpen: true,
    taxEnabled: true,
    taxPercentage: 5,
    openingTime: '10:00',
    closingTime: '23:00'
  });

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin_settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return res.data;
    }
  });

  useEffect(() => {
    if (data?.settings) {
      setFormData({
        isOpen: data.settings.isOpen,
        taxEnabled: data.settings.taxEnabled,
        taxPercentage: data.settings.taxPercentage,
        openingTime: data.settings.openingTime,
        closingTime: data.settings.closingTime
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/admin/settings', {
        ...formData,
        taxPercentage: parseFloat(formData.taxPercentage.toString())
      });
      toast.success('Settings saved successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) return <AdminLayout title="Cafe Settings"><div className="p-8 text-center text-text-muted">Loading settings...</div></AdminLayout>;

  return (
    <AdminLayout title="Cafe Settings">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-border-subtle pb-2">Operating Status</h3>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-medium">Accept Orders (Cafe Open)</div>
                <div className="text-sm text-text-muted">Turn off to temporarily stop accepting orders from QR codes</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.isOpen}
                  onChange={(e) => setFormData({...formData, isOpen: e.target.checked})}
                />
                <div className="w-14 h-7 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500 border border-border-subtle"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Opening Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={formData.openingTime}
                  onChange={(e) => setFormData({...formData, openingTime: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Closing Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={formData.closingTime}
                  onChange={(e) => setFormData({...formData, closingTime: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-border-subtle pb-2">Billing & Taxes</h3>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-medium">Enable GST/Tax Calculation</div>
                <div className="text-sm text-text-muted">Automatically add tax to final bill</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.taxEnabled}
                  onChange={(e) => setFormData({...formData, taxEnabled: e.target.checked})}
                />
                <div className="w-14 h-7 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gold border border-border-subtle"></div>
              </label>
            </div>

            {formData.taxEnabled && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Tax Percentage (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input" 
                  value={formData.taxPercentage}
                  onChange={(e) => setFormData({...formData, taxPercentage: parseFloat(e.target.value) || 0})}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary px-8">
              <Save size={18} /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
