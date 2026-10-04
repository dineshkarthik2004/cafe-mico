import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique local ID for the cart item
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  customizations: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  image?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        // Check if identical item exists (same ID and customizations and instructions)
        const existingItemIndex = state.items.findIndex(
          (i) => i.menuItemId === item.menuItemId &&
                 JSON.stringify(i.customizations) === JSON.stringify(item.customizations) &&
                 i.specialInstructions === item.specialInstructions
        );

        if (existingItemIndex >= 0) {
          const newItems = [...state.items];
          newItems[existingItemIndex].quantity += item.quantity;
          return { items: newItems };
        }

        return { items: [...state.items, item] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) => 
          item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
        ),
      })),
      clearCart: () => set({ items: [] }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => {
          const itemBasePrice = item.price;
          const customizationsPrice = item.customizations.reduce((sum, cust) => sum + cust.price, 0);
          return total + (itemBasePrice + customizationsPrice) * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cafe-mico-cart',
    }
  )
);
