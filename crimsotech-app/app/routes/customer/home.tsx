// app/routes/home.tsx
import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { useState, useEffect } from "react"
import { 
  Search, 
  X, 
  Heart, 
  Handshake, 
  Gift, 
  Flame, 
  ShoppingBasket, 
  Zap, 
  Package,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Tag,
  Star,
  Award,
  Clock,
  TrendingUp
} from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useNavigate } from 'react-router'
import AxiosInstance from '~/components/axios/Axios'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/components/ui/dialog'

// ----------------------------
// URL Conversion Utility
// ----------------------------
const convertS3ToPublicUrl = (s3Url: string | null | undefined): string | null => {
  if (!s3Url) return null;
  
  try {
    // Convert Supabase S3 URL to public URL format
    // S3 URL: https://project-ref.storage.supabase.co/storage/v1/s3/bucket-name/file-path
    // Public URL: https://project-ref.supabase.co/storage/v1/object/public/bucket-name/file-path
    
    // Method 1: Regex extraction
    const match = s3Url.match(/https:\/\/([^\.]+)\.storage\.supabase\.co\/storage\/v1\/s3\/([^\/]+)\/(.+)/);
    
    if (match) {
      const projectRef = match[1];  // e.g., "nkbunzcxponphxlrzvfh"
      const bucketName = match[2];  // e.g., "crimsotech_medias"
      const filePath = match[3];    // e.g., "product/Screenshot_2026-02-05_at_5.13.35PM.png"
      
      // Construct public URL
      return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
    }
    
    // Method 2: Simple string replacement
    if (s3Url.includes("/s3/")) {
      let publicUrl = s3Url.replace("/s3/", "/object/public/");
      publicUrl = publicUrl.replace(".storage.supabase.co", ".supabase.co");
      return publicUrl;
    }
    
  } catch (error) {
    console.error('Error converting URL:', error, s3Url);
  }
  
  return s3Url; // Return original if conversion fails
};

// ----------------------------
// Meta
// ----------------------------
export function meta(): Route.MetaDescriptors {
  return [{ title: "Home" }]
}

// ----------------------------
// Product type
// ----------------------------
interface Product {
  id: string
  name: string
  description: string
  price?: number
  price_display?: string
  price_range?: {
    min: number
    max: number
    is_range: boolean
  }
  total_stock?: number
  media_files?: Array<{
    id: string
    file_data: string
    file_type: string
    product: string
  }>
  primary_image?: {
    id: string
    url: string
    file_type: string
  } | null
  shop?: {
    id: string
    name: string
    shop_picture: string | null
    address: string
    avg_rating: number
  }
  condition?: string
  created_at?: string
  updated_at?: string
  used_for?: string
  status?: string
  upload_status?: string
  customer?: string
  category_admin?: any
  category?: any
  variants?: any[]
  discount?: number
  compare_price?: number
  open_for_swap?: boolean
}

// ----------------------------
// Category type
// ----------------------------
interface Category {
  id: string
  name: string
  shop: any
  user: {
    id: string
    username: string
  } | null
}

// ----------------------------
// Hot Item type
// ----------------------------
interface HotItem {
  product_id: string
  product_name: string
  product_price: number
  seller_username: string
  boost_plan: string
  days_remaining: number
}

// ----------------------------
// Compact Search Bar Component
// ----------------------------
const CompactSearchBar = ({ 
  searchTerm, 
  setSearchTerm 
}: { 
  searchTerm: string
  setSearchTerm: (term: string) => void 
}) => {
  return (
    <div className="mb-4">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 h-8 text-sm border-gray-300 rounded-md"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ----------------------------
// Get product image helper (Simplified)
// ----------------------------
const getProductImage = (product: Product): string => {
  // Try primary image first
  if (product.primary_image?.url) {
    const publicUrl = convertS3ToPublicUrl(product.primary_image.url);
    return publicUrl || '/Crimsotech.png';
  }
  
  // Try media files
  if (product.media_files && product.media_files.length > 0) {
    const firstMedia = product.media_files[0];
    if (firstMedia?.file_data) {
      const publicUrl = convertS3ToPublicUrl(firstMedia.file_data);
      return publicUrl || '/Crimsotech.png';
    }
  }
  
  // Default fallback
  return '/Crimsotech.png';
}

// ----------------------------
// Get product price display
// ----------------------------
const getProductPrice = (product: Product): string => {
  // If price_display is provided from backend, use it
  if (product.price_display) {
    return product.price_display;
  }
  
  // Fallback to price_range if available
  if (product.price_range) {
    if (!product.price_range.is_range) {
      return `₱${product.price_range.min.toFixed(2)}`;
    } else {
      return `₱${product.price_range.min.toFixed(2)} - ₱${product.price_range.max.toFixed(2)}`;
    }
  }
  
  // Legacy fallback
  if (product.price === 0) {
    return "FREE GIFT";
  }
  
  if (product.price) {
    return `₱${product.price.toFixed(2)}`;
  }
  
  return "Price unavailable";
}

// ----------------------------
// Compact Product Card
// ----------------------------
const CompactProductCard = ({ 
  product, 
  user, 
  favoriteIds = [], 
  onToggleFavorite 
}: { 
  product: Product, 
  user?: any, 
  favoriteIds?: string[], 
  onToggleFavorite?: (productId: string, nowFavorite: boolean) => void 
}) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(favoriteIds.includes(product.id));
  const [loadingFav, setLoadingFav] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('/Crimsotech.png');
  const [priceDisplay, setPriceDisplay] = useState<string>('');

  useEffect(() => {
    setIsFavorite(favoriteIds.includes(product.id));
  }, [favoriteIds, product.id]);

  // Load and convert image URL
  useEffect(() => {
    const url = getProductImage(product);
    setImageUrl(url);
  }, [product]);

  // Set price display
  useEffect(() => {
    setPriceDisplay(getProductPrice(product));
  }, [product]);

  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.user_id) {
      console.error('No user id available');
      return;
    }

    setLoadingFav(true);
    try {
      if (!isFavorite) {
        await AxiosInstance.post('/customer-favorites/', { 
          product: product.id,
          customer: user.user_id 
        }, { 
          headers: { 'X-User-Id': user.user_id } 
        });
        setIsFavorite(true);
        onToggleFavorite && onToggleFavorite(product.id, true);
      } else {
        await AxiosInstance.delete('/customer-favorites/', { 
          data: { product: product.id, customer: user.user_id },
          headers: { 'X-User-Id': user.user_id } 
        });
        setIsFavorite(false);
        onToggleFavorite && onToggleFavorite(product.id, false);
      }
    } catch (err) {
      console.error('Failed to update favorite:', err);
    } finally {
      setLoadingFav(false);
    }
  };

  // Check if product is a gift (price is 0 or it's a gift item)
  const isGift = product.price === 0 || priceDisplay === "FREE GIFT";

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative"
    >
      {isGift ? (
        <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-600" />
          <span className="text-xs text-emerald-700 font-medium">FREE GIFT</span>
        </div>
      ) : product.open_for_swap ? (
        <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-2">
          <Handshake className="h-4 w-4 text-indigo-600" />
          <span className="text-xs text-indigo-700 font-medium">Open for Swap</span>
        </div>
      ) : null}

      <button
        onClick={handleFavoriteClick}
        disabled={loadingFav}
        className="absolute top-1 right-1 z-10 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>

      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.onerror = null;
            el.src = '/Crimsotech.png';
          }}
        />
      </div>
      
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {product.name}
        </h3>
        
        {(() => {
          const categoryName = typeof product.category === 'string' 
            ? product.category 
            : product.category?.name || product.category_admin?.name;
          return categoryName ? (
            <p className="text-[10px] text-blue-600 font-medium truncate mb-1">
              {categoryName}
            </p>
          ) : null;
        })()}
        
        {product.shop?.name && (
          <p className="text-[10px] text-gray-500 truncate mb-1">
            {product.shop.name}
          </p>
        )}
        
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between">
            {isGift ? (
              <span className="text-sm font-bold text-emerald-600">FREE GIFT</span>
            ) : (
              <span className="text-sm font-bold text-gray-900">{priceDisplay}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// Enhanced Categories Section Component
// ----------------------------
const CategoriesSection = ({ 
  categories, 
  selectedCategory, 
  setSelectedCategory,
  productCount
}: { 
  categories: Category[]
  selectedCategory: string
  setSelectedCategory: (id: string) => void
  productCount: number
}) => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useState<HTMLDivElement | null>(null);

  // Category colors for visual variety
  const categoryColors = [
    { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', light: 'bg-blue-50' },
    { bg: 'from-purple-500 to-purple-600', text: 'text-purple-700', light: 'bg-purple-50' },
    { bg: 'from-pink-500 to-pink-600', text: 'text-pink-700', light: 'bg-pink-50' },
    { bg: 'from-orange-500 to-orange-600', text: 'text-orange-700', light: 'bg-orange-50' },
    { bg: 'from-green-500 to-green-600', text: 'text-green-700', light: 'bg-green-50' },
    { bg: 'from-red-500 to-red-600', text: 'text-red-700', light: 'bg-red-50' },
    { bg: 'from-indigo-500 to-indigo-600', text: 'text-indigo-700', light: 'bg-indigo-50' },
    { bg: 'from-yellow-500 to-yellow-600', text: 'text-yellow-700', light: 'bg-yellow-50' },
    { bg: 'from-teal-500 to-teal-600', text: 'text-teal-700', light: 'bg-teal-50' },
    { bg: 'from-cyan-500 to-cyan-600', text: 'text-cyan-700', light: 'bg-cyan-50' },
  ];

  const getCategoryColor = (index: number) => {
    return categoryColors[index % categoryColors.length];
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollAmount = 200;
      const newPosition = direction === 'left' 
        ? scrollPosition - scrollAmount 
        : scrollPosition + scrollAmount;
      
      container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  // Display categories (either first 8 or all)
  const displayCategories = showAllCategories ? categories : categories.slice(0, 8);

  return (
    <div className="mb-6">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
            <Tag className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Browse Categories</h2>
          <Badge variant="outline" className="ml-1 text-xs bg-gray-50">
            {categories.length} categories
          </Badge>
        </div>
        
        {categories.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            {showAllCategories ? 'Show Less' : 'See All'}
            <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showAllCategories ? 'rotate-90' : ''}`} />
          </Button>
        )}
      </div>

      {/* Categories carousel */}
      <div className="relative group">
        {/* Scroll buttons (only show if not showing all) */}
        {!showAllCategories && categories.length > 8 && (
          <>
            <button
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200 hover:bg-gray-50 -ml-3"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200 hover:bg-gray-50 -mr-3"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </>
        )}

        {/* Categories container */}
        <div 
          ref={containerRef}
          className={`flex gap-3 overflow-x-auto scrollbar-hide pb-2 ${!showAllCategories ? 'snap-x' : 'flex-wrap'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* "All Categories" option */}
          <div
            onClick={() => setSelectedCategory('')}
            className={`flex-shrink-0 w-auto min-w-[70px] text-center cursor-pointer transition-all duration-200 ${
              !showAllCategories ? 'snap-start' : ''
            }`}
          >
            <div className={`
              relative w-16 h-16 mx-auto rounded-2xl mb-1.5 flex items-center justify-center
              transition-all duration-300 transform hover:scale-105 hover:shadow-md
              ${selectedCategory === '' 
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
              }
            `}>
              <ShoppingBag className="h-6 w-6" />
              {selectedCategory === '' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <span className={`
              text-xs font-medium block whitespace-normal break-words max-w-[70px] leading-tight
              ${selectedCategory === '' ? 'text-indigo-700' : 'text-gray-600'}
            `}>
              All
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              {productCount} items
            </span>
          </div>

          {/* Category items */}
          {displayCategories.map((cat: Category, index: number) => {
            const active = selectedCategory === cat.id;
            const colors = getCategoryColor(index);
            
            // Count products in this category (you can add actual count if available)
            const catProductCount = 0;

            return (
              <div 
                key={cat.id}
                onClick={() => setSelectedCategory(active ? '' : cat.id)}
                className={`flex-shrink-0 w-auto min-w-[70px] text-center cursor-pointer transition-all duration-200 ${
                  !showAllCategories ? 'snap-start' : ''
                }`}
              >
                <div className={`
                  relative w-16 h-16 mx-auto rounded-2xl mb-1.5 flex items-center justify-center
                  transition-all duration-300 transform hover:scale-105 hover:shadow-md
                  ${active 
                    ? `bg-gradient-to-br ${colors.bg} text-white shadow-lg` 
                    : `${colors.light} text-gray-700 hover:bg-opacity-80`
                  }
                `}>
                  <span className="text-xl font-bold">
                    {cat.name.charAt(0).toUpperCase()}
                  </span>
                  {active && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <span className={`
                  text-xs font-medium block whitespace-normal break-words max-w-[70px] leading-tight
                  ${active ? colors.text : 'text-gray-600'}
                `}>
                  {cat.name}
                </span>
                {catProductCount > 0 && (
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {catProductCount} items
                  </span>
                )}
              </div>
            )
          })}

          {/* Show more indicator when not showing all */}
          {!showAllCategories && categories.length > 8 && (
            <div className="flex-shrink-0 w-16 flex items-center justify-center">
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllCategories(true)}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 p-0"
                >
                  <span className="text-lg font-bold text-gray-600">+</span>
                </Button>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {categories.length - 8} more
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active category indicator */}
      {selectedCategory && (
        <div className="mt-3 flex items-center gap-2">
          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-0">
            Active filter: {categories.find(c => c.id === selectedCategory)?.name}
          </Badge>
          <button
            onClick={() => setSelectedCategory('')}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

// ----------------------------
// Loader
// ----------------------------
export async function loader({ request, context }: Route.LoaderArgs) {
  const { fetchUserRole } = await import("~/middleware/role.server")
  const { requireRole } = await import("~/middleware/role-require.server");

  // Get user from context or fetch
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context })
  }

  // Only allow customers
  await requireRole(request, context, ["isCustomer"])

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get('userId');

  console.log('User ID:', userId);

  try {
    // Fetch products
    const productsResponse = await AxiosInstance.get('/public-products/', {
      headers: {
        'X-User-Id': userId,
        'Content-Type': 'application/json',
      },
    });

    let products: Product[] = [];
    if (productsResponse.status === 200) {
      const productsData = productsResponse.data;
      
      if (Array.isArray(productsData)) {
        products = productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price ? parseFloat(p.price) : undefined,
          price_display: p.price_display,
          price_range: p.price_range,
          total_stock: p.total_stock,
          media_files: p.media_files,
          primary_image: p.primary_image,
          shop: p.shop,
          condition: p.condition,
          created_at: p.created_at,
          updated_at: p.updated_at,
          used_for: p.used_for,
          status: p.status,
          upload_status: p.upload_status,
          customer: p.customer,
          category_admin: p.category_admin,
          category: p.category,
          variants: p.variants,
          discount: 0,
          compare_price: p.compare_price ? parseFloat(p.compare_price) : undefined,
          open_for_swap: p.open_for_swap || false,
        }));
      } else if (productsData.products && Array.isArray(productsData.products)) {
        products = productsData.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price ? parseFloat(p.price) : undefined,
          price_display: p.price_display,
          price_range: p.price_range,
          total_stock: p.total_stock,
          media_files: p.media_files,
          primary_image: p.primary_image,
          shop: p.shop,
          condition: p.condition,
          created_at: p.created_at,
          updated_at: p.updated_at,
          used_for: p.used_for,
          status: p.status,
          upload_status: p.upload_status,
          customer: p.customer,
          category_admin: p.category_admin,
          category: p.category,
          variants: p.variants,
          discount: 0,
          compare_price: p.compare_price ? parseFloat(p.compare_price) : undefined,
          open_for_swap: p.open_for_swap || false,
        }));
      }
      
      console.log(`Loaded ${products.length} products`);
    }

    // Fetch categories
    const categoriesResponse = await AxiosInstance.get('/customer-products/global-categories/');
    let categories: Category[] = [];
    
    if (categoriesResponse.status === 200) {
      const categoriesData = categoriesResponse.data;
      categories = categoriesData.categories || [];
      console.log(`Loaded ${categories.length} categories`);
    }

    // Prepare containers for applied gift info
    let hiddenGiftIds: string[] = [];
    let giftDetails: Record<string, any> = {};

    // Fetch active applied gift product IDs
    try {
      const giftsResp = await AxiosInstance.get('/customer-gift/active-applied-gift-product-ids/');
      hiddenGiftIds = (giftsResp.data && giftsResp.data.gift_product_ids) || [];
      giftDetails = (giftsResp.data && giftsResp.data.gift_details) || {};
      console.log('Active applied gift ids (from server):', hiddenGiftIds, giftDetails);

      if (hiddenGiftIds.length > 0) {
        products = products.filter(p => {
          const isGift = Number(p.price || 0) === 0;
          const pid = String(p.id);
          if (isGift && hiddenGiftIds.map(String).includes(pid)) {
            console.log('Hiding applied gift product', pid, p.name);
            return false;
          }
          return true;
        });
        console.log(`Filtered out ${hiddenGiftIds.length} gift products that are applied to promotions`);
      }
    } catch (err) {
      console.warn('Failed to fetch active applied gift product ids, skipping gift filtering:', err);
    }

    return {
      user,
      userId,
      products,
      categories,
      appliedGiftIds: hiddenGiftIds || [],
      giftDetails: giftDetails || {},
    };
  } catch (error) {
    console.error('Error in loader:', error);
    return {
      user,
      userId: null,
      products: [],
      categories: [],
    };
  }
}

// ----------------------------
// Home Component
// ----------------------------
export default function Home({ loaderData }: any) {
  const { user, userId, products, categories, appliedGiftIds = [], giftDetails = {} } = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'gifts'>('all');
  
  // State for Hot Items modal
  const [showHotItemsModal, setShowHotItemsModal] = useState(false);
  const [hotItems, setHotItems] = useState<HotItem[]>([]);
  const [loadingHotItems, setLoadingHotItems] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch favorites
  const fetchFavorites = async () => {
    if (!user?.user_id) return;
    try {
      const res = await AxiosInstance.get('/customer-favorites/', {
        headers: { 'X-User-Id': user.user_id }
      });
      const favIds = (res.data.favorites || []).map((f: any) => 
        typeof f.product === 'string' ? f.product : f.product?.id
      ).filter(Boolean);
      setFavoriteIds(favIds);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  };

  // Fetch hot items (boosted products from other users)
  const fetchHotItems = async () => {
    if (!userId) return false;
    
    try {
      setLoadingHotItems(true);
      const response = await AxiosInstance.get(`/home-boosts/other_users/?user_id=${userId}`);
      
      if (response.data.success) {
        setHotItems(response.data.products || []);
        return response.data.products && response.data.products.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error fetching hot items:', error);
      return false;
    } finally {
      setLoadingHotItems(false);
    }
  };

  // Handle manual trigger of hot items (from "Show Hot Items" button)
  const handleManualShowHotItems = async () => {
    if (!userId || manualTriggerLoading) return;
    
    try {
      setManualTriggerLoading(true);
      const hasHotItems = await fetchHotItems();
      
      if (hasHotItems) {
        setShowHotItemsModal(true);
      } else {
        setShowHotItemsModal(true);
      }
    } finally {
      setManualTriggerLoading(false);
    }
  };

  // Check and show hot items modal on component mount
  useEffect(() => {
    const checkAndShowHotItems = async () => {
      const dontShow = localStorage.getItem('dontShowHotItems');
      
      if (!dontShow && userId) {
        const hasHotItems = await fetchHotItems();
        if (hasHotItems) {
          setShowHotItemsModal(true);
        }
      }
      
      if (dontShow) {
        setDontShowAgain(true);
      }
    };

    const timer = setTimeout(() => {
      checkAndShowHotItems();
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId]);

  // Handle "Don't show again" button click
  const handleDontShowAgain = () => {
    localStorage.setItem('dontShowHotItems', 'true');
    setDontShowAgain(true);
    setShowHotItemsModal(false);
  };

  // Handle "Show again" if user changes their mind
  const handleShowAgain = () => {
    localStorage.removeItem('dontShowHotItems');
    setDontShowAgain(false);
  };

  // Log applied gift ids for debugging
  useEffect(() => {
    console.log('Home appliedGiftIds:', appliedGiftIds, giftDetails);
  }, [appliedGiftIds, giftDetails]);

  useEffect(() => {
    fetchFavorites();
  }, [user?.user_id]);

  // Condition options
  const conditionOptions = Array.from(
    new Set(products.map((p: Product) => p.condition).filter(Boolean))
  ) as string[];

  // Filter products
  const filteredProducts: Product[] = products.filter((product: Product) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q === '' || 
      product.name.toLowerCase().includes(q) || 
      product.description.toLowerCase().includes(q);

    // Handle price filtering with price_range
    let productMinPrice = 0;
    let productMaxPrice = Infinity;
    
    if (product.price_range) {
      productMinPrice = product.price_range.min;
      productMaxPrice = product.price_range.max;
    } else if (product.price !== undefined) {
      productMinPrice = product.price;
      productMaxPrice = product.price;
    }

    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    const matchesMin = min === null || productMaxPrice >= min;
    const matchesMax = max === null || productMinPrice <= max;

    const matchesCondition = selectedCondition === '' || 
      (product.condition && product.condition === selectedCondition);

    let prodCatId;
    if (typeof product.category === 'string') {
      prodCatId = product.category;
    } else if (product.category && typeof product.category === 'object') {
      prodCatId = (product.category as any).id;
    } else {
      prodCatId = product.category_admin?.id;
    }
    
    const matchesCategory = selectedCategory === '' || 
      (prodCatId && prodCatId === selectedCategory);

    const isGift = product.price === 0 || getProductPrice(product) === "FREE GIFT";
    const appliedSet = appliedGiftIds.map(String);
    if (isGift && appliedSet.includes(String(product.id))) return false;

    const matchesView = viewMode === 'gifts' ? isGift : true;

    return matchesSearch && matchesMin && matchesMax && matchesCondition && matchesCategory && matchesView;
  });

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        {/* Attractive "Show Hot Items" button */}
        {dontShowAgain && (
          <div className="mb-4">
            <Button
              onClick={handleManualShowHotItems}
              disabled={manualTriggerLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {manualTriggerLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Loading Hot Items...</span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Flame className="h-5 w-5 animate-pulse" />
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-400 rounded-full animate-ping"></div>
                  </div>
                  <span className="font-semibold">🔥 Show Hot Items</span>
                </>
              )}
            </Button>
          </div>
        )}

        <section className="w-full p-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="w-full md:w-auto">
              <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Price</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-20 h-8 px-2 border rounded text-sm"
                />
                <span className="text-sm text-gray-400">—</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-20 h-8 px-2 border rounded text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Condition</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="h-8 px-2 border rounded text-sm"
                >
                  <option value="">All</option>
                  {conditionOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1 text-xs rounded ${viewMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setViewMode('gifts')}
                  className={`px-3 py-1 text-xs rounded ${viewMode === 'gifts' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Gifts
                </button>
              </div>

              <button
                onClick={() => { 
                  setMinPrice(''); 
                  setMaxPrice(''); 
                  setSelectedCondition('');
                  setSelectedCategory('');
                  setSearchTerm('');
                }}
                className="px-3 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Enhanced Categories Section with NO ellipsis */}
          <CategoriesSection 
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            productCount={filteredProducts.length}
          />

          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {searchTerm ? `Results for "${searchTerm}"` : "Suggested For You"}
            <span className="ml-1 text-xs text-gray-500">
              ({filteredProducts.length})
            </span>
          </h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <CompactProductCard 
                  key={product.id} 
                  product={product} 
                  user={user}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={async (productId: string, nowFavorite: boolean) => {
                    setFavoriteIds(prev => {
                      const set = new Set(prev);
                      if (nowFavorite) set.add(productId); else set.delete(productId);
                      return Array.from(set);
                    });
                    await fetchFavorites();
                  }}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-6">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  {searchTerm ? `No results for "${searchTerm}"` : "No products available"}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Attractive Hot Items Modal */}
        <Dialog open={showHotItemsModal} onOpenChange={setShowHotItemsModal}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto border-0 shadow-2xl">
            {/* Gradient header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-lg">
              <DialogHeader className="text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold">Hot Items 🔥</DialogTitle>
                      <DialogDescription className="text-orange-100">
                        Boosted by other sellers
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-6">
              {loadingHotItems ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700">Finding hot items...</p>
                  <p className="text-sm text-gray-500 mt-2">Discovering boosted products just for you</p>
                </div>
              ) : hotItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                    <Package className="h-10 w-10 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Hot Items Yet</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No boosted products available at the moment. Check back later for trending items!
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {hotItems.map((item, index) => (
                      <div 
                        key={index} 
                        className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-orange-300 transition-all duration-300 cursor-pointer"
                        onClick={() => {
                          navigate(`/product/${item.product_id}`);
                          setShowHotItemsModal(false);
                        }}
                      >
                        {/* Hot badge */}
                        <div className="absolute -top-2 -left-2">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg px-3 py-1">
                            <Zap className="h-3 w-3 mr-1" />
                            BOOSTED
                          </Badge>
                        </div>
                        
                        {/* Days remaining indicator */}
                        <div className="absolute -top-2 -right-2">
                          <div className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full border border-blue-200">
                            {item.days_remaining} days left
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          {/* Product info */}
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                              {item.product_name}
                            </h4>
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-sm text-gray-600">
                                by <span className="font-medium">{item.seller_username}</span>
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                {item.boost_plan}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-2xl font-bold text-gray-900">
                                {formatCurrency(item.product_price)}
                              </span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                              >
                                <ShoppingBasket className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Showing <span className="font-bold text-orange-600">{hotItems.length}</span> boosted products</p>
                        <p className="text-xs text-gray-500">From various sellers</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">Boosted with:</p>
                        <p className="text-xs text-gray-600">Premium visibility</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Want to boost your own products?</span>
                  <Button
                    variant="link"
                    className="text-orange-600 hover:text-orange-700 p-0 h-auto"
                    onClick={() => {
                      navigate('/seller/seller-boosts');
                      setShowHotItemsModal(false);
                    }}
                  >
                    Try Boost Plans →
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDontShowAgain}
                    className="border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    Don't show again
                  </Button>
                  <Button 
                    onClick={() => setShowHotItemsModal(false)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
                  >
                    Got it!
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarLayout>
    </UserProvider>
  )
}