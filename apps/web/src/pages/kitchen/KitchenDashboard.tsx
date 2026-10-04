import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Clock, ChefHat, Check, LogOut, Search, Filter, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'];

const playOrderChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + idx * 0.15;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
};

const KitchenDashboard = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all, PENDING, ACCEPTED, PREPARING
  const [search, setSearch] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'KITCHEN' && user?.role !== 'ADMIN')) {
      navigate('/kitchen/login');
    }
  }, [isAuthenticated, user, navigate]);

  const { data: ordersData, refetch, isLoading } = useQuery({
    queryKey: ['kitchen_orders'],
    queryFn: async () => {
      const res = await api.get('/kitchen/orders');
      return res.data;
    },
    refetchInterval: 15000 // Poll every 15s fallback
  });

  // Realtime updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join_kitchen');
    });

    socket.on('new_order', (data) => {
      toast('🔥 New Order Received!', { duration: 5000 });
      if (soundEnabled) playOrderChime();
      refetch();
    });

    socket.on('items_added', (data) => {
      toast(`➕ Items added to ${data.displayName || 'table'}'s order!`, { duration: 5000 });
      if (soundEnabled) playOrderChime();
      refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [refetch, soundEnabled]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/kitchen/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      refetch();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    logout();
    navigate('/kitchen/login');
  };

  const orders = ordersData?.orders || [];
  
  // Filter & Search
  const displayOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const matchesFilter = filter === 'all' || order.status === filter;
      const matchesSearch = search === '' || 
        order.orderNumber.toLowerCase().includes(search.toLowerCase()) || 
        order.tableSession.table.displayName.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, search]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border-subtle sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center border border-gold/30">
              <ChefHat size={24} className="text-gold" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-gradient leading-tight">Kitchen KDS</h1>
              <p className="text-xs text-text-muted">{orders.length} Active Orders</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Alert Toggle */}
            <button 
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playOrderChime();
                toast(next ? 'Order Sound Alert Enabled' : 'Order Sound Alert Muted');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                soundEnabled 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                  : 'bg-surface text-text-muted border-border-subtle hover:text-text-primary'
              }`}
              title="Click to toggle order sound alert"
            >
              {soundEnabled ? <Volume2 size={16} className="animate-pulse" /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>

            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input py-2 !pl-9 pr-4 text-sm w-64 bg-surface"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary border-l border-border-subtle pl-4 ml-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {user?.name}
            </div>
            <button onClick={handleLogout} className="p-2 text-text-muted hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="px-6 py-2 bg-surface flex gap-2 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-bg-card border border-border-medium text-gold' : 'text-text-muted hover:text-text-primary'}`}
          >
            All Active
          </button>
          {ORDER_STATUSES.map(status => (
            <button 
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === status ? 'bg-bg-card border border-border-medium text-gold' : 'text-text-muted hover:text-text-primary'}`}
            >
              {status} ({orders.filter((o:any) => o.status === status).length})
            </button>
          ))}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted">
            <ChefHat size={48} className="mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2 text-text-primary">All Caught Up!</h2>
            <p>No active orders in this view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {displayOrders.map((order: any) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onUpdateStatus={updateOrderStatus} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const OrderCard = ({ order, onUpdateStatus }: { order: any, onUpdateStatus: (id: string, status: string) => void }) => {
  
  // Calculate time elapsed
  const orderTime = new Date(order.createdAt);
  const elapsedMins = Math.floor((Date.now() - orderTime.getTime()) / 60000);
  
  let headerColor = 'bg-surface border-border-subtle';
  let badgeColor = 'bg-gray-800 text-gray-300';
  
  if (order.status === 'PENDING') {
    headerColor = 'bg-orange-500/10 border-orange-500/30';
    badgeColor = 'bg-orange-500 text-white';
  } else if (order.status === 'ACCEPTED') {
    headerColor = 'bg-blue-500/10 border-blue-500/30';
    badgeColor = 'bg-blue-500 text-white';
  } else if (order.status === 'PREPARING') {
    headerColor = 'bg-purple-500/10 border-purple-500/30';
    badgeColor = 'bg-purple-500 text-white animate-pulse';
  } else if (order.status === 'READY') {
    headerColor = 'bg-green-500/10 border-green-500/30';
    badgeColor = 'bg-green-500 text-white';
  }

  // Has new items (items added recently with isNew flag)
  const hasNewItems = order.items.some((i:any) => i.isNew);

  return (
    <div className={`card shadow-elevated border-2 transition-all ${elapsedMins > 20 && order.status !== 'READY' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-border-subtle'}`}>
      
      {/* Header */}
      <div className={`p-4 border-b ${headerColor}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
              {order.status}
            </span>
            {hasNewItems && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-glow animate-pulse">
                UPDATED
              </span>
            )}
          </div>
          <div className={`flex items-center gap-1 text-sm font-bold ${elapsedMins > 20 && order.status !== 'READY' ? 'text-red-400' : 'text-text-secondary'}`}>
            <Clock size={14} />
            {elapsedMins}m
          </div>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <h3 className="font-display text-xl font-bold text-gradient">
              {order.tableSession.table.displayName}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{order.orderNumber}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-4">
        {order.items.map((item: any) => (
          <div key={item.id} className={`flex items-start gap-3 p-2 -mx-2 rounded-lg ${item.isNew ? 'bg-blue-500/10 border border-blue-500/20' : ''}`}>
            <div className="font-bold text-lg w-6 flex-shrink-0 text-gold">{item.quantity}x</div>
            <div className="flex-1">
              <p className="font-medium text-text-primary leading-tight">{item.menuItem.name}</p>
              
              {item.customizations?.length > 0 && (
                <div className="text-xs text-text-muted mt-1">
                  {item.customizations.map((c:any) => c.optionName).join(', ')}
                </div>
              )}
              
              {item.specialInstructions && (
                <div className="text-xs font-medium text-status-pending mt-1 bg-status-pending/10 p-1.5 rounded inline-block">
                  Note: {item.specialInstructions}
                </div>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="p-2 bg-surface rounded text-sm text-text-secondary border border-border-subtle">
            {order.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border-subtle bg-surface/50 grid grid-cols-2 gap-2">
        {order.status === 'PENDING' && (
          <>
            <button 
              onClick={() => onUpdateStatus(order.id, 'ACCEPTED')}
              className="col-span-2 btn-primary bg-blue-600 hover:bg-blue-500 shadow-none py-2"
            >
              Accept Order
            </button>
          </>
        )}
        
        {order.status === 'ACCEPTED' && (
          <>
            <button 
              onClick={() => onUpdateStatus(order.id, 'PREPARING')}
              className="col-span-2 btn-primary bg-purple-600 hover:bg-purple-500 shadow-none py-2"
            >
              Start Preparing
            </button>
          </>
        )}
        
        {order.status === 'PREPARING' && (
          <>
            <button 
              onClick={() => onUpdateStatus(order.id, 'READY')}
              className="col-span-2 btn-primary bg-green-600 hover:bg-green-500 shadow-none py-2 flex justify-center gap-2"
            >
              <Check size={18} /> Mark Ready
            </button>
          </>
        )}

        {order.status === 'READY' && (
          <div className="col-span-2 text-center py-2 text-green-500 font-bold bg-green-500/10 rounded-lg">
            Waiting to be served
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;
