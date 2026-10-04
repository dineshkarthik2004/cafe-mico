import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QrCode, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const AdminTablesPage = () => {
  const [selectedQR, setSelectedQR] = useState<{url: string, qrCode: string, name: string} | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin_tables'],
    queryFn: async () => {
      const res = await api.get('/admin/tables');
      return res.data;
    },
    refetchInterval: 10000 // Poll every 10s for status updates
  });

  const generateQR = async (tableId: string) => {
    try {
      const res = await api.get(`/admin/tables/${tableId}/qr`);
      setSelectedQR({
        url: res.data.url,
        qrCode: res.data.qrCode,
        name: res.data.table.displayName
      });
    } catch (error) {
      toast.error('Failed to generate QR');
    }
  };

  const regenerateToken = async (tableId: string) => {
    if (!window.confirm("Are you sure? This will invalidate the old QR code for this table.")) return;
    try {
      await api.post(`/admin/tables/${tableId}/regenerate-qr`);
      toast.success('Token regenerated successfully');
      generateQR(tableId);
      refetch();
    } catch (error) {
      toast.error('Failed to regenerate token');
    }
  };

  const tables = data?.tables || [];

  return (
    <AdminLayout title="Tables & QR Codes">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 skeleton rounded-xl"></div>)
        ) : (
          tables.map((table: any) => (
            <div key={table.id} className="card p-5 border-t border-t-gold/30 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{table.displayName}</h3>
                  <p className="text-xs text-text-muted">Capacity: {table.capacity}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  table.activeSession 
                    ? table.activeSession.status === 'BILL_REQUESTED' 
                      ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    : 'bg-green-500/10 text-green-500 border border-green-500/20'
                }`}>
                  {table.activeSession ? (table.activeSession.status === 'BILL_REQUESTED' ? 'BILL REQUESTED' : 'OCCUPIED') : 'AVAILABLE'}
                </span>
              </div>

              {table.activeSession ? (
                <div className="mb-4 flex-1">
                  <div className="bg-surface rounded-lg p-3 border border-border-subtle">
                    <p className="text-xs text-text-muted mb-1">Active Session Amount</p>
                    <p className="font-bold text-gold text-xl">₹{table.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-text-muted mt-1">{table.itemCount} items ordered</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex-1 flex flex-col items-center justify-center text-text-muted border border-dashed border-border-subtle rounded-lg p-3 bg-surface/50">
                  <span className="text-sm">Ready for seating</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button 
                  onClick={() => generateQR(table.id)}
                  className="btn-secondary py-2 text-xs flex justify-center"
                >
                  <QrCode size={14} /> View QR
                </button>
                <button 
                  onClick={() => regenerateToken(table.id)}
                  className="btn-outline py-2 text-xs flex justify-center text-text-muted border-border-subtle hover:text-red-400 hover:border-red-400"
                >
                  <RefreshCw size={14} /> Reset
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Modal */}
      {selectedQR && (
        <div className="modal-overlay">
          <div className="modal-content !max-w-sm p-6 text-center">
            <h2 className="text-2xl font-display font-bold text-gradient mb-1">Cafe Mico</h2>
            <h3 className="text-lg font-bold mb-6">{selectedQR.name}</h3>
            
            <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-glow">
              <img src={selectedQR.qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            
            <p className="text-sm text-text-muted mb-6 px-4">
              Scan this QR code to view the menu and place your order directly from your phone.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `CafeMico-${selectedQR.name}-QR.png`;
                  link.href = selectedQR.qrCode;
                  link.click();
                }}
                className="btn-primary py-2"
              >
                Download
              </button>
              <button onClick={() => setSelectedQR(null)} className="btn-secondary py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminTablesPage;
