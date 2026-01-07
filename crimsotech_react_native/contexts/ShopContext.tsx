// contexts/ShopContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string;
  productType: string;
  brand: string;
  model: string;
  color: string;
  ram: string;
  rom: string;
  specifications: string;
  packageContents: string;
  knownIssues: string;
  targetBuyer: 'daily users' | 'resellers' | 'recyclers';
  images: string[];
  shopId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'archived';
}

interface ShopState {
  products: Product[];
  shops: any[];
  currentShopId: string | null;
  loading: boolean;
}

type ShopAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_CURRENT_SHOP'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SHOPS'; payload: any[] };

const initialState: ShopState = {
  products: [],
  shops: [],
  currentShopId: null,
  loading: false,
};

const ShopContext = createContext<{
  state: ShopState;
  dispatch: React.Dispatch<ShopAction>;
}>({
  state: initialState,
  dispatch: () => {},
});

const shopReducer = (state: ShopState, action: ShopAction): ShopState => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
      };
    case 'SET_CURRENT_SHOP':
      return { ...state, currentShopId: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SHOPS':
      return { ...state, shops: action.payload };
    default:
      return state;
  }
};

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(shopReducer, initialState);

  return (
    <ShopContext.Provider value={{ state, dispatch }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};