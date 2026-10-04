import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../stores/cartStore';
import { useSessionStore } from '../../stores/sessionStore';
import { api } from '../../services/api';
import CustomerLayout from '../../components/CustomerLayout';

const CustomerCart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, getCartTotal } = useCartStore();
  const { sessionId } = useSessionStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const cartTotal = getCartTotal();
  // We'll calculate mock tax just for display, backend calculates final.
  const tax = cartTotal * 0.05; 
  const total = cartTotal + tax;

  const handlePlaceOrder = async () => {
    if (!sessionId) {
      toast.error('No active table session found. Please scan the table QR code.');
      return;
    }

    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      // Check if this is a new order or adding to existing
      // For simplicity in UI, we can just hit the /orders endpoint.
      // But wait! If there's an active session, does /orders create a new order or add items?
      // Our backend API says POST /api/orders creates a new order in that session. 
      // This matches the requirement: "All items should eventually be part of the same table session bill."
      // So multiple orders inside the same session is fine, backend aggregates them in the bill.

      const payload = {
        sessionId,
        customerName: customerName.trim() || undefined,
        items: items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations.map(c => c.id),
          specialInstructions: item.specialInstructions
        }))
      };

      await api.post('/orders', payload);
      
      clearCart();
      toast.success('Order placed successfully!');
      navigate('/orders', { state: { orderPlaced: true } });
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <CustomerLayout title="Your Cart">
        <div className="flex flex-col items-center justify-center h-[70vh] p-4 text-center">
          <div className="w-24 h-24 rounded-full bg-surface border border-border-subtle flex items-center justify-center mb-6 text-text-muted">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
              <path d="M3 6h18"></path>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold mb-2 text-gradient">Your cart is empty</h2>
          <p className="text-text-muted mb-8 max-w-xs">Looks like you haven't added anything to your cart yet.</p>
          <button 
            onClick={() => navigate('/menu')}
            className="btn-primary rounded-xl px-8"
          >
            Browse Menu
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout showBack title="Your Cart">
      <div className="p-4 lg:p-8 max-w-3xl mx-auto pb-32">
        <div className="space-y-4 mb-8">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex gap-4">
                {item.image ? (
                  <div className="w-20 h-20 bg-surface rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-surface rounded-lg flex-shrink-0 border border-border-subtle flex items-center justify-center">
                    <span className="text-[10px] text-text-muted">No img</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-text-primary leading-tight line-clamp-1">{item.name}</h3>
                    <button onClick={() => removeItem(item.id)} className="text-text-muted hover:text-status-cancelled transition-colors p-1 -mr-1 -mt-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {item.customizations.length > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      {item.customizations.map(c => c.name).join(', ')}
                    </div>
                  )}
                  
                  {item.specialInstructions && (
                    <div className="text-xs text-status-pending mt-1">
                      Note: {item.specialInstructions}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold">
                      ₹{(item.price + item.customizations.reduce((sum, c) => sum + c.price, 0)) * item.quantity}
                    </span>
                    
                    <div className="flex items-center bg-surface border border-border-subtle rounded-lg">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-gold hover:bg-bg-card rounded-l-lg transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-gold hover:bg-bg-card rounded-r-lg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => navigate('/menu')}
          className="w-full btn-outline rounded-xl py-3 border-dashed border-2 flex items-center justify-center gap-2 mb-8"
        >
          <Plus size={18} />
          <span>Add more items</span>
        </button>

        <div className="card p-5 space-y-4 mb-6">
          <h3 className="font-semibold text-lg border-b border-border-subtle pb-3">Bill Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Item Total</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Taxes (Estimated)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="pt-3 border-t border-border-subtle flex justify-between items-center">
            <span className="font-bold text-lg">Grand Total</span>
            <span className="font-bold text-xl text-gold">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Your Name (Optional)"
            className="input rounded-xl"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-glass border-t border-border-subtle z-40 lg:pl-64">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex-1 hide-mobile">
            <p className="text-sm text-text-muted">Total to pay</p>
            <p className="text-xl font-bold text-gold">₹{total.toFixed(2)}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="btn-primary rounded-xl py-4 flex-1 lg:flex-none lg:px-12 flex justify-between lg:justify-center items-center shadow-elevated"
          >
            <span className="font-bold text-[15px]">{isSubmitting ? 'Placing...' : 'Place Order'}</span>
            <span className="lg:hidden flex items-center gap-2 font-bold">
              ₹{total.toFixed(2)} <ArrowRight size={18} />
            </span>
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerCart;
