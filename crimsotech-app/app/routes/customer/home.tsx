// app/routes/home.tsx
import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { useState, useEffect } from "react"
import { Search, X, Heart, Handshake } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useNavigate } from 'react-router'
import AxiosInstance from '~/components/axios/Axios'

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
  price: number
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
  quantity?: number
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
// Get image URL helper
// ----------------------------
const getImageUrl = (url: string | null | undefined): string => {
  const baseUrl = import.meta.env.VITE_MEDIA_URL || 'http://127.0.0.1:8000';
  
  if (!url) {
    return '/phon.jpg';
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/media/')) {
    return `${baseUrl}${url}`;
  }
  
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  return `${baseUrl}/media/${url}`;
}

// ----------------------------
// Get product image helper
// ----------------------------
const getProductImage = (product: Product): string => {
  if (product.primary_image?.url) {
    return getImageUrl(product.primary_image.url);
  }
  
  if (product.media_files && product.media_files.length > 0) {
    return getImageUrl(product.media_files[0].file_data);
  }
  
  if (product.shop?.shop_picture) {
    return getImageUrl(product.shop.shop_picture);
  }
  
  return '/phon.jpg';
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

  useEffect(() => {
    setIsFavorite(favoriteIds.includes(product.id));
  }, [favoriteIds, product.id]);

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

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative"
    >
      {product.open_for_swap && (
        <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-2">
          <Handshake className="h-4 w-4 text-indigo-600" />
          <span className="text-xs text-indigo-700 font-medium">Open for Swap</span>
        </div>
      )}

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
          src={getProductImage(product)}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.onerror = null;
            el.src = '/crimsonity.png';
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
            <span className="text-sm font-bold text-gray-900">
              ₱{product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// Loader
// ----------------------------
export async function loader({ request, context }: Route.LoaderArgs) {
  const { fetchUserRole } = await import("~/middleware/role.server")
  const { requireRole } = await import("~/middleware/role-require.server");
  const { userContext } = await import("~/contexts/user-role")

  // Get user from context or fetch
  let user = context.get(userContext)
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
      
      // FIX: Check if the response is an array or has a different structure
      if (Array.isArray(productsData)) {
        products = productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: parseFloat(p.price),
          media_files: p.media_files,
          primary_image: p.primary_image,
          shop: p.shop,
          condition: p.condition,
          created_at: p.created_at,
          updated_at: p.updated_at,
          quantity: p.quantity,
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
        // If response has a 'products' field
        products = productsData.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: parseFloat(p.price),
          media_files: p.media_files,
          primary_image: p.primary_image,
          shop: p.shop,
          condition: p.condition,
          created_at: p.created_at,
          updated_at: p.updated_at,
          quantity: p.quantity,
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
      console.log('Products with open_for_swap:', products.filter(p => p.open_for_swap).length);
    }

    // Fetch categories
    const categoriesResponse = await AxiosInstance.get('/customer-products/global-categories/');
    let categories: Category[] = [];
    
    if (categoriesResponse.status === 200) {
      const categoriesData = categoriesResponse.data;
      categories = categoriesData.categories || [];
      console.log(`Loaded ${categories.length} categories`);
    }

    return {
      user,
      products,
      categories,
    };
  } catch (error) {
    console.error('Error in loader:', error);
    return {
      user,
      products: [],
      categories: [],
    };
  }
}

// ----------------------------
// Home Component
// ----------------------------
export default function Home({ loaderData }: any) {
  const { user, products, categories } = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

    // Price filter
    const p = Number(product.price || 0);
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    const matchesMin = min === null || (!isNaN(min) && p >= min);
    const matchesMax = max === null || (!isNaN(max) && p <= max);

    // Condition filter
    const matchesCondition = selectedCondition === '' || 
      (product.condition && product.condition === selectedCondition);

    // Category filter
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

    return matchesSearch && matchesMin && matchesMax && matchesCondition && matchesCategory;
  });

  return (
    <UserProvider user={user}>
      <SidebarLayout>
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

          <h2 className="mb-2 text-sm font-semibold text-gray-700">Categories</h2>
          <div className="flex gap-2 overflow-x-auto py-1 mb-4">
            <div
              key="all"
              onClick={() => setSelectedCategory('')}
              className={`flex-shrink-0 w-16 text-center cursor-pointer`}
            >
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-1 ${selectedCategory === '' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                <span className="text-xs font-medium">All</span>
              </div>
              <span className={`text-xs truncate block ${selectedCategory === '' ? 'text-indigo-700' : 'text-gray-600'}`}>All</span>
            </div>

            {categories.map((cat: Category) => {
              const active = selectedCategory === cat.id;
              return (
                <div 
                  key={cat.id}
                  onClick={() => setSelectedCategory(active ? '' : cat.id)}
                  className="flex-shrink-0 w-16 text-center cursor-pointer"
                >
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-1 ${active ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                    <span className="text-xs font-medium">
                      {cat.name.charAt(0)}
                    </span>
                  </div>
                  <span className={`text-xs truncate block ${active ? 'text-indigo-700' : 'text-gray-600'}`}>
                    {cat.name}
                  </span>
                </div>
              )
            })}
          </div>

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
      </SidebarLayout>
    </UserProvider>
  )
}