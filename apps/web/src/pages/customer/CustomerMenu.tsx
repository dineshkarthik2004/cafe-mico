import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import CustomerLayout from '../../components/CustomerLayout';
import ItemModal from '../../components/ItemModal';

const CustomerMenu = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTableData, setSessionId } = useSessionStore();
  const token = searchParams.get('token');
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Validate QR and Start Session
  useEffect(() => {
    const initializeTable = async () => {
      if (!token) return;
      
      try {
        // First validate the table
        const tableRes = await api.get(`/table/${token}`);
        const { table, activeSession, cafe } = tableRes.data;
        
        if (cafe?.isOpen === false) {
          toast.error(tableRes.data.error || 'Cafe is currently closed');
          return; // Stay on page but show warning
        }

        setTableData(token, table.tableNumber, table.displayName);

        // Start or join session
        const sessionRes = await api.post('/session/start', { tableToken: token });
        setSessionId(sessionRes.data.session.id);
        
        if (sessionRes.data.isNewSession) {
          toast.success(`Welcome to ${cafe?.name || 'Cafe Mico'}! You're at ${table.displayName}`);
        } else {
          toast.success(`Joined existing session at ${table.displayName}`);
        }
        
        // Remove token from URL for clean look
        navigate('/menu', { replace: true });
        
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Invalid QR code');
      }
    };

    initializeTable();
  }, [token]);

  // Fetch Menu
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const res = await api.get('/menu');
      return res.data;
    }
  });

  // Search Results
  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return { items: [] };
      const res = await api.get(`/menu/search?q=${searchQuery}`);
      return res.data;
    },
    enabled: searchQuery.length > 0
  });

  const categories = menuData?.categories || [];
  
  // Filtered items logic
  let displayCategories = categories;
  let flatItems: any[] = [];
  
  if (searchQuery) {
    flatItems = searchData?.items || [];
  } else if (activeCategory !== 'all') {
    displayCategories = categories.filter((c: any) => c.slug === activeCategory);
  }

  return (
    <CustomerLayout showSearch onSearch={setSearchQuery}>
      {/* Category Navigation (Horizontal scroll) */}
      {!searchQuery && (
        <div className="sticky top-[60px] lg:top-0 z-20 bg-bg-primary/95 backdrop-blur border-b border-border-subtle py-3 px-4 -mx-4 lg:mx-0 overflow-x-auto hide-scrollbar">
          <div className="flex space-x-3 w-max">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === 'all' 
                  ? 'bg-gold text-bg-primary shadow-glow' 
                  : 'bg-surface border border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.slug 
                    ? 'bg-gold text-bg-primary shadow-glow' 
                    : 'bg-surface border border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 lg:p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-4 flex gap-4 h-36">
                <div className="w-24 h-24 rounded-lg skeleton"></div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="w-3/4 h-5 skeleton rounded"></div>
                  <div className="w-full h-3 skeleton rounded mt-2"></div>
                  <div className="w-1/4 h-6 skeleton rounded mt-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Search Results</h2>
            {isSearchLoading ? (
              <div className="text-text-muted">Searching...</div>
            ) : flatItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {flatItems.map(item => (
                  <FoodCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-text-muted bg-surface rounded-xl border border-border-subtle">
                No items found for "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          displayCategories.map((cat: any) => (
            cat.items.length > 0 && (
              <div key={cat.id} className="mb-10 animate-pageSlideIn">
                <h2 className="text-xl font-display font-bold mb-6 text-gradient">{cat.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {cat.items.map((item: any) => (
                    <FoodCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </div>

      {selectedItem && (
        <ItemModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </CustomerLayout>
  );
};

const FoodCard = ({ item, onClick }: { item: any, onClick: () => void }) => {
  return (
    <div 
      onClick={onClick}
      className="card p-3 flex gap-4 cursor-pointer group"
    >
      {/* Image Side */}
      <div className="w-28 h-28 flex-shrink-0 bg-surface rounded-lg overflow-hidden relative">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface border border-border-subtle text-text-muted">
            <span className="text-xs">No image</span>
          </div>
        )}
        {item.isBestseller && (
          <div className="absolute top-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg shadow-md">
            Bestseller
          </div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Details Side */}
      <div className="flex-1 flex flex-col justify-between py-1 relative">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold leading-tight text-text-primary group-hover:text-gold transition-colors line-clamp-2">
              {item.name}
            </h3>
            <div className={`food-type-indicator ${item.foodType.toLowerCase().replace('_', '-')}`} />
          </div>
          <p className="text-xs text-text-muted line-clamp-2">{item.description}</p>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-lg">₹{item.price}</span>
          <button 
            disabled={!item.isAvailable}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
              item.isAvailable 
                ? 'border-gold text-gold hover:bg-gold hover:text-bg-primary' 
                : 'border-border-subtle text-text-muted bg-surface cursor-not-allowed'
            }`}
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerMenu;
