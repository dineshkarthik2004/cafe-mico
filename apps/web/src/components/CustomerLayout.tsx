import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Clock, Coffee, Search, ChevronLeft } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useSessionStore } from '../../stores/sessionStore';
import { api } from '../../services/api';

interface CustomerLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ 
  children, 
  showSearch = false,
  onSearch,
  showBack = false,
  onBack,
  title
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getCartTotal());
  const { tableName, tableToken } = useSessionStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    // If we have no table token and we're not just browsing locally, we should probably warn or redirect.
    // For now, let's just make sure we display the right info if it's there.
  }, [tableToken]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 flex flex-col">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border-subtle hidden lg:flex flex-col z-40 shadow-elevated">
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-gradient mb-1">Cafe Mico</h1>
          <p className="text-sm text-text-secondary mb-8">Good food. Good mood.</p>
          
          {tableName && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-full text-sm font-medium border border-border-subtle text-gold">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {tableName}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => navigate('/menu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/menu' ? 'bg-gold/10 text-gold' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
          >
            <Coffee size={20} />
            <span className="font-medium">Menu</span>
          </button>
          
          <button 
            onClick={() => navigate('/orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/orders' ? 'bg-gold/10 text-gold' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
          >
            <Clock size={20} />
            <span className="font-medium">My Orders</span>
          </button>
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 lg:hidden glass">
        <div className="px-4 py-3">
          {isSearchOpen && showSearch ? (
            <div className="flex items-center gap-2 animate-fadeIn">
              <button onClick={() => setIsSearchOpen(false)} className="p-2 text-text-secondary">
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  autoFocus
                  type="text" 
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search menu..." 
                  className="w-full bg-surface border border-border-subtle rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showBack && (
                  <button onClick={onBack || (() => navigate(-1))} className="p-1 -ml-1 text-text-primary">
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div>
                  <h1 className="font-display text-xl font-bold text-gradient leading-tight">
                    {title || 'Cafe Mico'}
                  </h1>
                  {tableName && !title && (
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      {tableName}
                    </div>
                  )}
                </div>
              </div>
              
              {showSearch && (
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border-subtle text-text-primary"
                >
                  <Search size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Sticky Bottom Cart (Mobile) */}
      {cartItemCount > 0 && location.pathname !== '/cart' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 lg:hidden bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <button 
              onClick={() => navigate('/cart')}
              className="w-full btn-primary rounded-xl flex items-center justify-between py-4 shadow-elevated"
            >
              <div className="flex items-center gap-2">
                <div className="bg-bg-primary/20 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {cartItemCount}
                </div>
                <span className="font-semibold">View Cart</span>
              </div>
              <div className="font-bold flex items-center gap-2">
                <span>₹{cartTotal.toFixed(2)}</span>
                <span className="text-xl">→</span>
              </div>
            </button>
          </div>
        </div>
      )}
      
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border-subtle lg:hidden z-30 pb-safe">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/menu')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${location.pathname === '/menu' ? 'text-gold' : 'text-text-muted hover:text-text-primary'}`}
          >
            <Coffee size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Menu</span>
          </button>
          
          <button 
            onClick={() => navigate('/orders')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${location.pathname === '/orders' ? 'text-gold' : 'text-text-muted hover:text-text-primary'}`}
          >
            <Clock size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Orders</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CustomerLayout;
