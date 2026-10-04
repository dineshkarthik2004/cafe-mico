import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Clock, RefreshCcw, CheckCircle2, ChevronRight, Receipt, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import CustomerLayout from '../../components/CustomerLayout';
import { useNavigate, useLocation } from 'react-router-dom';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'text-status-pending';
    case 'ACCEPTED': return 'text-status-accepted';
    case 'PREPARING': return 'text-status-preparing';
    case 'READY': return 'text-status-ready';
    case 'SERVED': return 'text-text-muted';
    case 'CANCELLED': return 'text-status-cancelled';
    default: return 'text-text-secondary';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING': return <span className="bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-md text-xs font-bold border border-orange-500/20">RECEIVED</span>;
    case 'ACCEPTED': return <span className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-500/20">ACCEPTED</span>;
    case 'PREPARING': return <span className="bg-purple-500/10 text-purple-500 px-2.5 py-1 rounded-md text-xs font-bold border border-purple-500/20 animate-pulse">PREPARING</span>;
    case 'READY': return <span className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-md text-xs font-bold border border-green-500/20">READY</span>;
    case 'SERVED': return <span className="bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-md text-xs font-bold border border-gray-500/20">SERVED</span>;
    case 'CANCELLED': return <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-md text-xs font-bold border border-red-500/20">CANCELLED</span>;
    default: return <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">{status}</span>;
  }
};

const CustomerOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showSuccessBanner = (location.state as any)?.orderPlaced;
  const { sessionId, tableName, clearSession } = useSessionStore();
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  const { data: sessionData, refetch, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await api.get(`/session/${sessionId}`);
      return res.data;
    },
    enabled: !!sessionId,
    refetchInterval: 10000 // poll every 10s as backup to sockets
  });

  // Socket.io Realtime Updates
  useEffect(() => {
    if (!sessionId) return;

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join_session', sessionId);
    });

    socket.on('order_status_update', (data) => {
      toast.success(`Order ${data.orderNumber} is now ${data.status.toLowerCase()}`, { icon: '🔔' });
      refetch();
    });

    socket.on('session_closed', (data) => {
      toast('Your bill has been generated. Session closed.', { icon: '🧾' });
      clearSession(); // Remove session so they scan QR again for next time
    });

    return () => {
      socket.emit('leave_session', sessionId);
      socket.disconnect();
    };
  }, [sessionId, refetch]);

  const handleRequestBill = async () => {
    try {
      setIsRequestingBill(true);
      await api.post(`/session/${sessionId}/request-bill`);
      toast.success('Bill requested successfully! Staff will be with you shortly.');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to request bill');
    } finally {
      setIsRequestingBill(false);
    }
  };

  if (!sessionId) {
    return (
      <CustomerLayout title="My Orders">
        <div className="flex flex-col items-center justify-center h-[70vh] p-4 text-center">
          <div className="w-24 h-24 rounded-full bg-surface border border-border-subtle flex items-center justify-center mb-6 text-text-muted">
            <Receipt size={40} />
          </div>
          <h2 className="text-xl font-display font-bold mb-2">No Active Session</h2>
          <p className="text-text-muted mb-8 max-w-xs">Please scan the QR code on your table to view your session and orders.</p>
        </div>
      </CustomerLayout>
    );
  }

  const session = sessionData?.session;
  const isBillRequested = session?.status === 'BILL_REQUESTED';
  const orders = session?.orders || [];

  return (
    <CustomerLayout title="Table Session">
      <div className="p-4 lg:p-8 max-w-3xl mx-auto pb-32">
        
        {/* Order Confirmed Banner */}
        {showSuccessBanner && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center gap-3 animate-pageSlideIn shadow-glow">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-400">Order Confirmed!</h3>
              <p className="text-xs text-text-secondary">Your order has been sent to the kitchen. You can track live updates below.</p>
            </div>
          </div>
        )}

        {/* Session Header */}
        <div className="glass rounded-xl p-5 mb-8 border border-border-subtle shadow-glow flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gradient mb-1">Active Dining Session</h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {tableName || 'Your Table'}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Session Total</p>
            <p className="text-2xl font-bold text-gold">₹{(sessionData?.sessionTotal || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6 mb-10">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock size={20} className="text-gold" /> 
            Order History
          </h3>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 rounded-xl skeleton"></div>)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 bg-surface rounded-xl border border-border-subtle text-text-muted">
              No orders placed yet.
            </div>
          ) : (
            orders.map((order: any) => (
              <div key={order.id} className="card p-5 relative overflow-hidden group">
                {/* Accent line for status */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  order.status === 'READY' ? 'bg-status-ready' :
                  order.status === 'PREPARING' ? 'bg-status-preparing' :
                  order.status === 'ACCEPTED' ? 'bg-status-accepted' :
                  order.status === 'PENDING' ? 'bg-status-pending' : 'bg-surface'
                }`}></div>

                <div className="flex justify-between items-start mb-4 border-b border-border-subtle pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-text-primary">{order.orderNumber}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="text-xs text-text-muted">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">₹{order.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div className="flex gap-3">
                        <span className="font-bold text-text-secondary w-5">{item.quantity}x</span>
                        <div>
                          <p className={`font-medium ${getStatusColor(item.status)}`}>{item.menuItem.name}</p>
                          {item.customizations?.length > 0 && (
                            <p className="text-xs text-text-muted mt-0.5">
                              {item.customizations.map((c:any) => c.optionName).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-text-muted">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Area */}
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/menu')}
            className="w-full btn-outline rounded-xl py-4 flex items-center justify-center gap-2 text-[15px]"
          >
            <Plus size={18} />
            <span>Order More Items</span>
          </button>

          <button 
            onClick={handleRequestBill}
            disabled={isRequestingBill || isBillRequested || orders.length === 0}
            className={`w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-[15px] transition-all ${
              isBillRequested 
                ? 'bg-surface text-text-muted border border-border-subtle cursor-not-allowed' 
                : orders.length === 0 
                  ? 'bg-surface text-text-muted border border-border-subtle opacity-50 cursor-not-allowed'
                  : 'bg-gradient-gold text-bg-primary shadow-glow hover:shadow-elevated'
            }`}
          >
            {isBillRequested ? (
              <>
                <CheckCircle2 size={20} />
                Bill Requested
              </>
            ) : (
              <>
                <Receipt size={20} />
                {isRequestingBill ? 'Requesting...' : 'Request Bill'}
              </>
            )}
          </button>
        </div>

      </div>
    </CustomerLayout>
  );
};

export default CustomerOrders;
