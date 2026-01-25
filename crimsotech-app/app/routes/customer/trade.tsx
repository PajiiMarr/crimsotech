"use client";

import type { Route } from "./+types/trade";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '~/components/ui/input';
import { 
  Card, 
  CardContent
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Search,
  Package,
  Store,
  Tag,
  MapPin,
  CalendarDays,
  ShoppingBag,
  RefreshCcw,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  MessageCircle,
  Filter,
  DollarSign,
  Scale,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  User,
  Shield,
  AlertCircle,
  PhilippinePeso
} from 'lucide-react';

// Define interfaces based on the Django endpoint response
interface Category {
  id: string;
  name: string;
}

interface ProductVariantOption {
  id: string;
  title: string;
  variant_id: string | null;
}

interface Shop {
  id: string | null;
  name: string | null;
  verified: boolean;
  province: string | null;
  city: string | null;
}

interface Seller {
  id: string | null;
  username: string | null;
  first_name: string;
  last_name: string;
}

interface ProductCategory {
  id: string | null;
  name: string | null;
}

interface SwapProductSKU {
  id: string;
  product_id: string | null;
  product_name: string;
  product_description: string;
  product_price: string;
  product_condition: string;
  
  // SKU specific
  sku_code: string | null;
  price: string | null;
  compare_price: string | null;
  quantity: number;
  
  // Dimensions and weight
  length: string | null;
  width: string | null;
  height: string | null;
  weight: string | null;
  weight_unit: string;
  
  // Swap details
  allow_swap: boolean;
  swap_type: 'direct_swap' | 'swap_plus_payment';
  minimum_additional_payment: string;
  maximum_additional_payment: string;
  swap_description: string | null;
  accepted_categories: Category[];
  
  // Product relations
  shop: Shop;
  seller: Seller;
  category: ProductCategory | null;
  
  // Variant options
  variant_options: ProductVariantOption[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Status
  stock_status: string;
  is_active: boolean;
  critical_trigger: number | null;
  
  // Image
  product_image: string | null;
  
  // User info
  current_user_id: string | null;
  is_current_user_seller: boolean;
}

interface SwapProductsResponse {
  success: boolean;
  data: SwapProductSKU[];
  total: number;
  message: string;
  current_user_id?: string | null;
}

// Tabs configuration
const SWAP_TYPE_TABS = [
  { id: 'all', label: 'All Swaps', icon: RefreshCcw },
  { id: 'direct_swap', label: 'Direct Swap', icon: ArrowLeftRight },
  { id: 'swap_plus_payment', label: 'Swap + Payment', icon: PhilippinePeso },
];

// Status filter tabs
const STATUS_TABS = [
  { id: 'all_status', label: 'All', icon: Package },
  { id: 'available', label: 'Available', icon: CheckCircle },
  { id: 'low_stock', label: 'Low Stock', icon: AlertCircle },
  { id: 'out_of_stock', label: 'Out of Stock', icon: XCircle },
];

// Swap type badges configuration
const SWAP_TYPE_CONFIG = {
  direct_swap: { 
    label: 'Direct Swap', 
    color: 'bg-green-100 text-green-800',
    icon: ArrowLeftRight
  },
  swap_plus_payment: { 
    label: 'Swap + Payment', 
    color: 'bg-blue-100 text-blue-800',
    icon: PhilippinePeso
  }
};

// Stock status badges configuration
const STOCK_STATUS_CONFIG = {
  available: { 
    label: 'Available', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  low_stock: { 
    label: 'Low Stock', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle
  },
  out_of_stock: { 
    label: 'Out of Stock', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
};

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Swap Products | TradEase",
    },
  ];
}

export async function loader({ request, context}: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  try {
    // Import AxiosInstance here (it's only available on client side)
    const { default: AxiosInstance } = await import('~/components/axios/Axios');
    
    // Fetch swap products from backend - note: URL doesn't include /api prefix
    // because AxiosInstance already handles the base URL
    const response = await AxiosInstance.get<SwapProductsResponse>('/swap-products/get_swap/', {
      headers: {
        'X-User-Id': user?.user_id || ''
      }
    });

    const swapProducts = response.data.data || [];

    return {
      user: {
        id: user?.user_id || '',
        // name: user?.username || '',
        // username: user?.username || '',
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        isSeller: false,
      },
      swapProducts,
      totalProducts: response.data.total || 0,
      currentUserId: response.data.current_user_id || user?.user_id || ''
    };
  } catch (error) {
    console.error('Error fetching swap products:', error);
    
    // Return empty data on error
    return {
      user: {
        id: user?.user_id || '',
        // name: user?.username || '',
        // username: user?.username || '',
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        isSeller: false,
      },
      swapProducts: [],
      totalProducts: 0,
      currentUserId: user?.user_id || ''
    };
  }
}

export default function SwapProducts({ loaderData }: { 
  loaderData: { 
    user: any, 
    swapProducts: SwapProductSKU[], 
    totalProducts: number,
    currentUserId: string 
  } 
}) {
  const { user, swapProducts: initialSwapProducts, currentUserId } = loaderData;
  const [activeSwapTab, setActiveSwapTab] = useState<string>('all');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all_status');
  const navigate = useNavigate();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<SwapProductSKU[]>(initialSwapProducts);

  useEffect(() => {
    // Apply filters whenever search or active tabs change
    let filtered = initialSwapProducts;
    
    // Search filter
    if (search) {
      filtered = filtered.filter(product => 
        product.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (product.shop.name && product.shop.name.toLowerCase().includes(search.toLowerCase())) ||
        (product.sku_code && product.sku_code.toLowerCase().includes(search.toLowerCase())) ||
        (product.seller.username && product.seller.username.toLowerCase().includes(search.toLowerCase())) ||
        (product.category?.name && product.category.name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Swap type filter
    if (activeSwapTab !== 'all') {
      filtered = filtered.filter(product => product.swap_type === activeSwapTab);
    }
    
    // Status filter
    if (activeStatusTab !== 'all_status') {
      filtered = filtered.filter(product => product.stock_status === activeStatusTab);
    }
    
    setFilteredProducts(filtered);
  }, [search, activeSwapTab, activeStatusTab, initialSwapProducts]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '₱0.00';
    
    try {
      const numAmount = parseFloat(amount);
      return `₱${numAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } catch (error) {
      return `₱${amount}`;
    }
  };

  const getSwapTypeBadge = (swapType: string) => {
    const config = SWAP_TYPE_CONFIG[swapType as keyof typeof SWAP_TYPE_CONFIG] || 
                   { label: swapType, color: 'bg-gray-100 text-gray-800', icon: RefreshCcw };
    const Icon = config.icon;
    
    return (
      <Badge 
        className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const getStockStatusBadge = (stockStatus: string) => {
    const config = STOCK_STATUS_CONFIG[stockStatus as keyof typeof STOCK_STATUS_CONFIG] || 
                   { label: stockStatus, color: 'bg-gray-100 text-gray-800', icon: Package };
    const Icon = config.icon;
    
    return (
      <Badge 
        className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return initialSwapProducts.length;
    if (tabId === 'direct_swap' || tabId === 'swap_plus_payment') {
      return initialSwapProducts.filter(product => product.swap_type === tabId).length;
    }
    
    // For status tabs
    if (tabId === 'available') {
      return initialSwapProducts.filter(product => product.stock_status === 'available').length;
    }
    if (tabId === 'low_stock') {
      return initialSwapProducts.filter(product => product.stock_status === 'low_stock').length;
    }
    if (tabId === 'out_of_stock') {
      return initialSwapProducts.filter(product => product.stock_status === 'out_of_stock').length;
    }
    
    return 0;
  };

  const toggleProductExpansion = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const getProductImage = (product: SwapProductSKU): string => {
    // Use product image if available
    if (product.product_image) {
      return product.product_image;
    }
    
    // Default image
    return '/phon.jpg';
  };

  const getAcceptedCategoriesText = (product: SwapProductSKU): string => {
    if (!product.accepted_categories || product.accepted_categories.length === 0) {
      return "All categories accepted";
    }
    
    const categoryNames = product.accepted_categories.map(cat => cat.name);
    if (categoryNames.length <= 2) {
      return categoryNames.join(", ");
    }
    
    return `${categoryNames.slice(0, 2).join(", ")} +${categoryNames.length - 2} more`;
  };

  const getSellerDisplayName = (product: SwapProductSKU): string => {
    const { first_name, last_name, username } = product.seller;
    const fullName = `${first_name} ${last_name}`.trim();
    return fullName || username || 'Unknown Seller';
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Swap Products</h1>
            <p className="text-gray-500 text-xs">Browse products available for trading or swapping</p>
          </div>

          {/* Search Bar */}
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                type="text"
                placeholder="Search swap products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
            </div>
          </div>

          {/* Swap Type Tabs */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCcw className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Swap Type</span>
            </div>
            <div className="flex items-center space-x-1 overflow-x-auto">
              {SWAP_TYPE_TABS.map((tab) => {
                const Icon = tab.icon;
                const count = getTabCount(tab.id);
                const isActive = activeSwapTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSwapTab(tab.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1 py-0.5 rounded ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Stock Status</span>
            </div>
            <div className="flex items-center space-x-1 overflow-x-auto">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const count = getTabCount(tab.id);
                const isActive = activeStatusTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveStatusTab(tab.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1 py-0.5 rounded ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products List */}
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-4">
                <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-gray-500 text-xs">
                  {search ? 'No swap products found matching your search' :
                   activeSwapTab !== 'all' ? `No ${activeSwapTab.replace('_', ' ')} products available` :
                   'No swap products available'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                const hasAdditionalPayment = product.swap_type === 'swap_plus_payment' && 
                  parseFloat(product.minimum_additional_payment) > 0;
                
                return (
                  <Card key={product.id} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{product.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {product.sku_code && (
                              <>
                                <span className="truncate">{product.sku_code}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{formatDate(product.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getSwapTypeBadge(product.swap_type)}
                          <button 
                            onClick={() => toggleProductExpansion(product.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="my-2">
                        <img 
                          src={getProductImage(product)} 
                          alt={product.product_name} 
                          className="h-16 w-16 rounded-md object-cover border mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/phon.jpg';
                          }}
                        />
                      </div>

                      {/* Middle Section - Summary */}
                      <div className="mb-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Store className="w-3 h-3" />
                          <span className="truncate">{product.shop.name || 'No Shop'}</span>
                          {product.shop.verified && (
                            <Shield className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {getSellerDisplayName(product)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <div className="text-gray-600">
                            <span className="font-medium">Qty:</span> {product.quantity}
                          </div>
                          <div className="font-medium">
                            {formatCurrency(product.price || product.product_price)}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            {getStockStatusBadge(product.stock_status)}
                          </div>
                          {hasAdditionalPayment && (
                            <Badge 
                              className="text-[10px] h-5 px-1.5 py-0 bg-purple-100 text-purple-800"
                            >
                              <PhilippinePeso className="w-2.5 h-2.5 mr-1" />
                              +{formatCurrency(product.minimum_additional_payment)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section - Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs space-y-3">
                            {/* Product Description */}
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Description</div>
                              <div className="text-gray-600 line-clamp-3">
                                {product.product_description}
                              </div>
                            </div>

                            {/* Swap Details */}
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Swap Details</div>
                              <div className="text-gray-600 space-y-1">
                                <div className="flex items-center gap-2">
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Type: {product.swap_type.replace('_', ' ')}</span>
                                </div>
                                
                                {product.swap_type === 'swap_plus_payment' && (
                                  <div className="flex items-center gap-2">
                                    <PhilippinePeso className="w-3 h-3" />
                                    <span>
                                      Additional Payment: {formatCurrency(product.minimum_additional_payment)} - {formatCurrency(product.maximum_additional_payment)}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Scale className="w-3 h-3" />
                                  <span>Condition: {product.product_condition}</span>
                                </div>
                              </div>
                            </div>

                            {/* Accepted Categories */}
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Accepts Trades For</div>
                              <div className="text-gray-600">
                                {getAcceptedCategoriesText(product)}
                              </div>
                            </div>

                            {/* Variant Options */}
                            {product.variant_options && product.variant_options.length > 0 && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Available Variants</div>
                                <div className="flex flex-wrap gap-1">
                                  {product.variant_options.map((option) => (
                                    <Badge 
                                      key={option.id}
                                      className="text-[10px] h-5 px-1.5 py-0 bg-gray-100 text-gray-800"
                                    >
                                      {option.title}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Physical Dimensions */}
                            {(product.length || product.width || product.height || product.weight) && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Physical Details</div>
                                <div className="grid grid-cols-2 gap-1 text-gray-600">
                                  {product.length && (
                                    <div>Length: {product.length}cm</div>
                                  )}
                                  {product.width && (
                                    <div>Width: {product.width}cm</div>
                                  )}
                                  {product.height && (
                                    <div>Height: {product.height}cm</div>
                                  )}
                                  {product.weight && (
                                    <div>Weight: {product.weight}{product.weight_unit}</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Shop Location */}
                            {product.shop.city && product.shop.province && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Shop Location</div>
                                <div className="flex items-center gap-1 text-gray-600">
                                  <MapPin className="w-3 h-3" />
                                  <span>{product.shop.city}, {product.shop.province}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom Section - Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/products/${product.product_id}`)}
                          className="h-6 px-2 text-xs"
                          disabled={!product.product_id}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Product
                        </Button>
                        
                        <div className="flex gap-1">
                          {/* Initiate Swap button - disabled if user owns the product */}
                          {!product.is_current_user_seller && product.stock_status !== 'out_of_stock' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                              title="Initiate Swap"
                              onClick={() => navigate(`/swap/initiate/${product.id}`)}
                            >
                              <ArrowLeftRight className="w-3 h-3 mr-1" />
                              Swap
                            </Button>
                          )}
                          
                          {/* Contact Seller button - disabled if user owns the product */}
                          {!product.is_current_user_seller && product.shop.name && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Contact Seller"
                              onClick={() => navigate(`/chat/seller/${product.shop.name}`)}
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {/* Show owner badge if user owns this product */}
                          {product.is_current_user_seller && (
                            <Badge className="text-[10px] h-5 px-1.5 py-0 bg-gray-100 text-gray-800">
                              Your Product
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Total Count */}
          <div className="text-center text-xs text-gray-500 pt-2">
            Showing {filteredProducts.length} of {initialSwapProducts.length} swap products
          </div>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}