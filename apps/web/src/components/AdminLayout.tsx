import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Coffee, Grid, Receipt, Settings, LogOut, UtensilsCrossed } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const AdminLayout = ({ children, title }: { children: React.ReactNode, title?: string }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/admin/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    logout();
    navigate('/admin/login');
  };

  if (!isAuthenticated) return null;

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Menu & Items', path: '/admin/menu', icon: UtensilsCrossed },
    { name: 'Tables & QR', path: '/admin/tables', icon: Grid },
    { name: 'Orders & Bills', path: '/admin/orders', icon: Receipt },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border-subtle flex flex-col hidden lg:flex fixed inset-y-0 z-20">
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-gradient mb-1">Cafe Admin</h1>
          <p className="text-xs text-text-muted">{user?.email}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                location.pathname === item.path 
                  ? 'bg-gold/10 text-gold font-medium' 
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-status-cancelled hover:bg-status-cancelled/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-glass sticky top-0 z-10 border-b border-border-subtle px-6 py-4 flex items-center justify-between lg:justify-end">
          <h2 className="text-xl font-bold lg:hidden">{title}</h2>
          
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/kitchen')} className="text-sm font-medium text-gold hover:underline mr-4">
              Switch to KDS
            </button>
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
              {user?.name.charAt(0)}
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-6">
          {title && <h1 className="text-2xl font-bold mb-6 hidden lg:block">{title}</h1>}
          {children}
        </div>
      </main>

      {/* Mobile Nav (Bottom) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border-subtle z-30 pb-safe">
        <div className="flex justify-around p-2">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg ${
                location.pathname === item.path ? 'text-gold' : 'text-text-muted'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
