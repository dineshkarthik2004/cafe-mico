import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import toast from 'react-hot-toast';

interface ItemModalProps {
  item: any;
  onClose: () => void;
}

const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  const addItem = useCartStore(state => state.addItem);
  
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Customization state: map of groupId -> selected optionIds
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    if (item.customizationGroups) {
      item.customizationGroups.forEach((group: any) => {
        // Find default options
        const defaults = group.options.filter((o: any) => o.isDefault).map((o: any) => o.id);
        initial[group.id] = defaults;
      });
    }
    return initial;
  });

  const handleOptionToggle = (groupId: string, optionId: string, isMultiple: boolean, maxSelect: number) => {
    setSelectedCustomizations(prev => {
      const current = prev[groupId] || [];
      
      if (!isMultiple) {
        // Single select (radio)
        return { ...prev, [groupId]: [optionId] };
      } else {
        // Multi select (checkbox)
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) };
        } else {
          if (maxSelect > 0 && current.length >= maxSelect) {
            toast(`You can only select up to ${maxSelect} options here.`);
            return prev;
          }
          return { ...prev, [groupId]: [...current, optionId] };
        }
      }
    });
  };

  // Calculate total price based on selections
  let customizationPrice = 0;
  const selectedOptionObjects: any[] = [];
  
  if (item.customizationGroups) {
    item.customizationGroups.forEach((group: any) => {
      const selectedIds = selectedCustomizations[group.id] || [];
      selectedIds.forEach(id => {
        const option = group.options.find((o: any) => o.id === id);
        if (option) {
          customizationPrice += option.price;
          selectedOptionObjects.push({
            id: option.id,
            name: option.name,
            price: option.price
          });
        }
      });
    });
  }

  const totalPrice = (item.price + customizationPrice) * quantity;

  const handleAddToCart = () => {
    // Validate required groups
    if (item.customizationGroups) {
      for (const group of item.customizationGroups) {
        if (group.isRequired) {
          const selected = selectedCustomizations[group.id] || [];
          if (selected.length < group.minSelect) {
            toast.error(`Please select at least ${group.minSelect} option(s) for ${group.name}`);
            return;
          }
        }
      }
    }

    addItem({
      id: crypto.randomUUID(),
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      customizations: selectedOptionObjects,
      specialInstructions: specialInstructions.trim() || undefined,
      image: item.image
    });

    toast.success(`Added ${quantity} ${item.name} to cart`);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content relative flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full backdrop-blur"
        >
          <X size={20} />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {/* Header Image */}
          {item.image ? (
            <div className="w-full h-56 bg-surface relative">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-12 bg-surface"></div>
          )}

          <div className="p-5 -mt-6 relative z-10">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-2xl font-display font-bold text-gradient">{item.name}</h2>
              <div className={`food-type-indicator mt-2 ${item.foodType.toLowerCase().replace('_', '-')}`} />
            </div>
            
            <p className="text-text-secondary text-sm mb-4 leading-relaxed">
              {item.description}
            </p>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl font-bold">₹{item.price}</span>
              {item.preparationTime && (
                <>
                  <span className="text-text-muted text-xs">•</span>
                  <span className="text-text-muted text-xs flex items-center gap-1">
                    Wait {item.preparationTime} mins
                  </span>
                </>
              )}
            </div>

            {/* Customization Groups */}
            {item.customizationGroups?.map((group: any) => (
              <div key={group.id} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  {group.isRequired && (
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-400/10 px-2 py-0.5 rounded">Required</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {group.options.map((option: any) => {
                    const isSelected = (selectedCustomizations[group.id] || []).includes(option.id);
                    return (
                      <label 
                        key={option.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-gold bg-gold/5' 
                            : 'border-border-subtle bg-surface hover:border-border-medium'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 flex items-center justify-center rounded ${
                            !group.isMultiple ? 'rounded-full' : 'rounded-md'
                          } border transition-colors ${
                            isSelected ? 'bg-gold border-gold' : 'border-text-muted'
                          }`}>
                            {isSelected && (
                              <div className={`bg-bg-primary ${!group.isMultiple ? 'w-2 h-2 rounded-full' : 'w-2.5 h-2.5'}`} style={group.isMultiple ? { clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' } : {}} />
                            )}
                          </div>
                          <span className={isSelected ? 'text-text-primary' : 'text-text-secondary'}>
                            {option.name}
                          </span>
                        </div>
                        {option.price > 0 && (
                          <span className={`text-sm ${isSelected ? 'text-gold font-medium' : 'text-text-muted'}`}>
                            +₹{option.price}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Special Instructions */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Special Instructions</h3>
              <textarea 
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="E.g., Make it less spicy, no onions..."
                className="input min-h-[80px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer (Fixed at bottom) */}
        <div className="p-4 border-t border-border-subtle bg-bg-secondary mt-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-surface border border-border-subtle rounded-xl p-1 w-32">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-gold hover:bg-bg-card rounded-lg transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="font-bold text-lg">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center text-gold hover:bg-bg-card rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button 
              onClick={handleAddToCart}
              className="btn-primary flex-1 py-3.5 rounded-xl text-[15px]"
            >
              Add item • ₹{totalPrice}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemModal;
