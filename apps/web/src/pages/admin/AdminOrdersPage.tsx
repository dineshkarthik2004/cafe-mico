import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Check, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { api } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const AdminOrdersPage = () => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin_sessions', activeTab],
    queryFn: async () => {
      const res = await api.get(`/admin/sessions?status=${activeTab === 'ACTIVE' ? 'ACTIVE' : 'CLOSED'}`);
      // Also fetch BILL_REQUESTED in the ACTIVE tab
      if (activeTab === 'ACTIVE') {
        const reqRes = await api.get(`/admin/sessions?status=BILL_REQUESTED`);
        return { sessions: [...reqRes.data.sessions, ...res.data.sessions] };
      }
      return res.data;
    },
    refetchInterval: 15000
  });

  // Realtime updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join_staff');
      socket.emit('join_admin');
    });

    socket.on('bill_requested', (data) => {
      toast(`${data.displayName} requested the bill!`, { icon: '🧾', duration: 6000 });
      refetch();
    });
    
    socket.on('table_freed', () => refetch());
    socket.on('new_order', () => refetch());

    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  const closeSession = async (sessionId: string, paymentMethod: string = 'CASH') => {
    try {
      await api.post(`/admin/sessions/${sessionId}/close`, { paymentMethod });
      toast.success('Session closed and bill generated');
      setSelectedSession(null);
      refetch();
    } catch (error) {
      toast.error('Failed to close session');
    }
  };

  const sessions = data?.sessions || [];

  return (
    <AdminLayout title="Orders & Billing">
      <div className="flex gap-4 mb-6 border-b border-border-subtle">
        <button 
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'ACTIVE' ? 'text-gold' : 'text-text-muted hover:text-text-primary'}`}
        >
          Active Dining Sessions
          {activeTab === 'ACTIVE' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gold rounded-t"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('CLOSED')}
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'CLOSED' ? 'text-gold' : 'text-text-muted hover:text-text-primary'}`}
        >
          Past Bills
          {activeTab === 'CLOSED' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gold rounded-t"></span>}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 skeleton rounded-xl"></div>)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <Receipt size={48} className="mx-auto mb-4 opacity-50" />
          <p>No {activeTab.toLowerCase()} sessions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {sessions.map((session: any) => (
            <div key={session.id} className={`card p-5 ${session.status === 'BILL_REQUESTED' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{session.table.displayName}</h3>
                  <p className="text-xs text-text-muted">
                    {new Date(session.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                {session.status === 'BILL_REQUESTED' ? (
                  <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">BILL REQUESTED</span>
                ) : session.status === 'CLOSED' ? (
                  <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-500/30">CLOSED</span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">ACTIVE</span>
                )}
              </div>

              <div className="bg-surface rounded-lg p-3 mb-4 border border-border-subtle">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Orders</span>
                  <span className="font-bold">{session.orders.length}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Items</span>
                  <span className="font-bold">{session.orders.reduce((sum: number, o: any) => sum + o.items.length, 0)}</span>
                </div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t border-border-subtle">
                  <span>Subtotal</span>
                  <span className="text-gold">
                    ₹{session.orders.reduce((sum: number, o: any) => sum + o.subtotal, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {activeTab === 'ACTIVE' ? (
                <button 
                  onClick={() => setSelectedSession(session)}
                  className={`w-full btn-primary py-2 ${session.status === 'BILL_REQUESTED' ? 'bg-orange-500 hover:bg-orange-400' : ''}`}
                >
                  {session.status === 'BILL_REQUESTED' ? 'Generate & Close Bill' : 'View Session & Bill'}
                </button>
              ) : (
                <button 
                  onClick={() => setSelectedSession(session)}
                  className="w-full btn-secondary py-2"
                >
                  <Eye size={16} /> View Final Bill
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bill Generation Modal */}
      {selectedSession && (
        <div className="modal-overlay">
          <div className="modal-content !max-w-md p-6">
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl font-bold text-gradient">Cafe Mico</h2>
              <p className="text-sm text-text-muted">{selectedSession.table.displayName} • {selectedSession.status === 'CLOSED' ? 'FINAL BILL' : 'CURRENT SESSION'}</p>
            </div>

            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {selectedSession.orders.map((order: any, idx: number) => (
                <div key={order.id} className="border-b border-border-subtle pb-3">
                  <div className="text-xs font-bold text-text-muted mb-2">Order {order.orderNumber}</div>
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm mb-1">
                      <div>
                        <span>{item.quantity}x {item.menuItem.name}</span>
                        {item.customizations?.length > 0 && (
                          <div className="text-xs text-text-muted ml-4">
                            {item.customizations.map((c:any) => c.optionName).join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="bg-surface p-4 rounded-xl mb-6 border border-border-subtle">
              <div className="flex justify-between text-sm mb-2 text-text-secondary">
                <span>Subtotal</span>
                <span>₹{selectedSession.orders.reduce((sum: number, o: any) => sum + o.subtotal, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-text-secondary">
                <span>Taxes</span>
                <span>₹{selectedSession.orders.reduce((sum: number, o: any) => sum + o.tax, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-3 pt-3 border-t border-border-subtle">
                <span>Grand Total</span>
                <span className="text-gold">
                  ₹{selectedSession.orders.reduce((sum: number, o: any) => sum + o.total, 0).toFixed(2)}
                </span>
              </div>
            </div>

            {selectedSession.status !== 'CLOSED' ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-center text-text-muted mb-2">Select Payment Method to Close</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => closeSession(selectedSession.id, 'CASH')} className="btn-primary bg-green-600 hover:bg-green-500 py-2">
                    Paid via Cash
                  </button>
                  <button onClick={() => closeSession(selectedSession.id, 'UPI')} className="btn-primary bg-blue-600 hover:bg-blue-500 py-2">
                    Paid via UPI
                  </button>
                </div>
                <button onClick={() => setSelectedSession(null)} className="w-full btn-secondary py-2 mt-2">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setSelectedSession(null)} className="w-full btn-secondary py-2">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrdersPage;
