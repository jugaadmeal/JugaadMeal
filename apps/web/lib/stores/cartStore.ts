import { create } from 'zustand';
import { MenuItemDTO } from 'shared-types';

export interface CartItem {
  menuItem: MenuItemDTO;
  quantity: number;
}

interface CartState {
  menuId: string | null;
  items: CartItem[];
  deliveryBlockId: string | null;
  deliveryAddress: string;
  paymentMethod: 'WALLET' | 'UPI' | 'CARD' | 'CASH_ON_DELIVERY';
  couponCode: string;
  specialInstructions: string;

  addItem: (menuId: string, item: MenuItemDTO) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryBlockId: (blockId: string) => void;
  setDeliveryAddress: (address: string) => void;
  setPaymentMethod: (method: 'WALLET' | 'UPI' | 'CARD' | 'CASH_ON_DELIVERY') => void;
  setCouponCode: (code: string) => void;
  setSpecialInstructions: (instructions: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  menuId: null,
  items: [],
  deliveryBlockId: null,
  deliveryAddress: '',
  paymentMethod: 'WALLET',
  couponCode: '',
  specialInstructions: '',

  addItem: (menuId, item) => {
    set((state) => {
      // If adding items from a different menu, reset the cart with the new item
      const isDifferentMenu = state.menuId !== menuId;
      const currentItems = isDifferentMenu ? [] : [...state.items];

      const existingIndex = currentItems.findIndex((i) => i.menuItem.id === item.id);
      if (existingIndex > -1) {
        currentItems[existingIndex].quantity += 1;
      } else {
        currentItems.push({ menuItem: item, quantity: 1 });
      }

      return {
        menuId,
        items: currentItems,
      };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const filtered = state.items.filter((i) => i.menuItem.id !== itemId);
      return {
        items: filtered,
        menuId: filtered.length === 0 ? null : state.menuId,
      };
    });
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const filtered = state.items.filter((i) => i.menuItem.id !== itemId);
        return {
          items: filtered,
          menuId: filtered.length === 0 ? null : state.menuId,
        };
      }

      const updated = state.items.map((i) =>
        i.menuItem.id === itemId ? { ...i, quantity } : i
      );
      return { items: updated };
    });
  },

  clearCart: () => {
    set({
      menuId: null,
      items: [],
      couponCode: '',
      specialInstructions: '',
    });
  },

  setDeliveryBlockId: (deliveryBlockId) => set({ deliveryBlockId }),
  setDeliveryAddress: (deliveryAddress) => set({ deliveryAddress }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCouponCode: (couponCode) => set({ couponCode }),
  setSpecialInstructions: (specialInstructions) => set({ specialInstructions }),
}));
