import type { Route } from './+types/favorites'
import SidebarLayout from '~/components/layouts/sidebar'

import { UserProvider } from '~/components/providers/user-role-provider'
import { Search, X, Heart, Handshake } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useState, useEffect } from "react"
import { useNavigate } from 'react-router'
import AxiosInstance from "~/components/axios/Axios"


export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Favorites",
    },
  ];
}

// ----------------------------
// Loader
// ----------------------------
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return user;
}

// ----------------------------
// Product type
// ----------------------------
interface Product {
  id: string
  name: string
  description: string
  price: number
  discount?: number
  compare_price?: number
  image?: string
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
  shop?: { id: string; name: string; shop_picture: string | null } | null
  category?: any
  category_admin?: any
  open_for_swap?: boolean
}

// ----------------------------
// Helpers
// ----------------------------
const getImageUrl = (url: string | null | undefined): string => {
  const baseUrl = import.meta.env.VITE_MEDIA_URL;
  if (!url) return '/default-product.jpg';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/media/${url}`;
};

const getProductImage = (product: Product): string => {
  if (product.primary_image?.url) return getImageUrl(product.primary_image.url);
  if (product.media_files && product.media_files.length > 0) return getImageUrl(product.media_files[0].file_data);
  if (product.shop?.shop_picture) return getImageUrl(product.shop.shop_picture);
  return '/../../../public/phon.jpg';
};

// ----------------------------
// Compact Search Bar Component
// ----------------------------
const CompactSearchBar = ({ searchTerm, setSearchTerm }: { searchTerm: string; setSearchTerm: (term: string) => void }) => (
  <div className="mb-4">
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      <Input
        type="text"
        placeholder="Search favorites..."
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
);

// ----------------------------
// Compact Product Card (inlined from Home) — matches Home UI/size
// ----------------------------
const CompactProductCard = ({ product, user, favoriteIds = [], onToggleFavorite }: { product: Product, user?: any, favoriteIds?: string[], onToggleFavorite?: (productId: string, nowFavorite: boolean) => void }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(favoriteIds.includes(product.id));
  const [loadingFav, setLoadingFav] = useState(false);

  const handleClick = () => navigate(`/product/${product.id}`);

  useEffect(() => {
    setIsFavorite(favoriteIds.includes(product.id));
  }, [favoriteIds, product.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.user_id) {
      console.error("No user_id available");
      return;
    }

    setLoadingFav(true);
    try {
      if (!isFavorite) {
        // Add to favorites
        await AxiosInstance.post("/customer-favorites/", {
          product: product.id,
          customer: user.user_id,
        }, {
          headers: { "X-User-Id": user.user_id }
        });
        setIsFavorite(true);
        // Optimistic store for Favorites page to read and display immediately
        try {
          const raw = localStorage.getItem('optimistic_favorites');
          const existing = raw ? JSON.parse(raw) : [];
          existing.push({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            discount: product.discount || 0,
            primary_image: (product as any).primary_image || null,
            media_files: product.media_files || [],
            shop: product.shop || null,
          });
          localStorage.setItem('optimistic_favorites', JSON.stringify(existing));
        } catch (e) {
          console.warn('Failed to set optimistic favorites', e);
        }
        onToggleFavorite && onToggleFavorite(product.id, true);
      } else {
        // Remove from favorites
        await AxiosInstance.delete("/customer-favorites/", {
          data: { 
            product: product.id, 
            customer: user.user_id 
          },
          headers: { "X-User-Id": user.user_id }
        });
        setIsFavorite(false);
        // Remove from optimistic storage if present
        try {
          const raw = localStorage.getItem('optimistic_favorites');
          if (raw) {
            const existing = JSON.parse(raw).filter((p: any) => p.id !== product.id);
            if (existing.length) localStorage.setItem('optimistic_favorites', JSON.stringify(existing));
            else localStorage.removeItem('optimistic_favorites');
          }
        } catch (e) {
          console.warn('Failed to remove optimistic favorite', e);
        }
        onToggleFavorite && onToggleFavorite(product.id, false);
      }
    } catch (err) {
      console.error("Failed to update favorite:", err);
    } finally {
      setLoadingFav(false);
    }
  };


  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative"
    >
      {/* Open for Swap tag (left) */}
      {product.open_for_swap && (
        <div className="absolute top-1 left-1 z-10 px-2 py-0.5 bg-white rounded-full shadow-sm flex items-center gap-1">
          <Handshake className="h-4 w-4 text-indigo-600" />
          <span className="text-xs text-indigo-700 font-medium">Open for Swap</span>
        </div>
      )}

      {/* Heart Button */}
      <button
        onClick={handleFavoriteClick}
        disabled={loadingFav}
        className="absolute top-1 right-1 z-10 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>

      {/* Image - Compact */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={getProductImage(product)}
          alt={product.name}
          onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.onerror = null; el.src = '/public/controller.jpg'; }}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content - Minimal */}
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {product.name}
        </h3>
        
        {(() => {
          const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || product.category_admin?.name;
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
              <div className="text-sm font-medium">
                {product.compare_price && product.compare_price > product.price ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-500 line-through">₱{product.compare_price?.toFixed(2)}</span>
                    <span className="text-sm font-bold text-gray-900">₱{product.price.toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-gray-900">₱{product.price.toFixed(2)}</span>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// Favorites Page
// ----------------------------
export default function Favorites({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch favorites from API
  const fetchFavorites = async () => {
    if (!user?.user_id) return;
    setIsLoading(true);

    // Load optimistic favorites from localStorage first
    try {
      const rawOpt = localStorage.getItem('optimistic_favorites');
      if (rawOpt) {
        const optimistic = JSON.parse(rawOpt) as Product[];
        if (optimistic && optimistic.length > 0) {
          setFavoriteProducts(prev => {
            // merge optimistic with existing without duplicates
            const map = new Map(prev.map(p => [p.id, p]));
            optimistic.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load optimistic favorites', e);
    }

    try {
      const res = await AxiosInstance.get('/customer-favorites/', {
        headers: { 'X-User-Id': user.user_id }
      });
      console.log('Favorites API response:', res.data);
      
      if (res.data.success) {
        const favoritesWithProduct = res.data.favorites.filter((f: any) => f.product);
        console.log('Favorites with products:', favoritesWithProduct);
        
        const products: Product[] = await Promise.all(
          favoritesWithProduct.map(async (fav: any) => {
            try {
              // fav.product might be an object or ID, handle both cases
              const productId = typeof fav.product === 'string' ? fav.product : fav.product?.id;
              if (!productId) {
                console.warn('No product ID found:', fav);
                return null;
              }
              
              const productRes = await AxiosInstance.get(`/public-products/${productId}/`);
              console.log(`Product ${productId} response:`, productRes.data);
              
              const data = productRes.data.data || productRes.data;
              return {
                id: data.id,
                name: data.name || 'No Name',
                description: data.description || '',
                price: Number(data.price) || 0,
                discount: data.discount || 0,
                compare_price: data.compare_price ? Number(data.compare_price) : undefined,
                primary_image: data.primary_image || null,
                media_files: data.media_files || [],
                shop: data.shop || null,
                open_for_swap: data.open_for_swap || false,
              };
            } catch (err) {
              const productId = typeof fav.product === 'string' ? fav.product : fav.product?.id;
              console.error('Failed to fetch product', productId, err);
              return null;
            }
          })
        );
        const validProducts = products.filter(p => p !== null) as Product[];
        console.log('Final products array:', validProducts);
        console.log('Loaded favorite products with open_for_swap count:', validProducts.filter(p => p.open_for_swap).length);

        // Merge server results with optimistic list, server wins
        setFavoriteProducts(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          validProducts.forEach(p => map.set(p.id, p));
          return Array.from(map.values());
        });

        // Clear optimistic entries which are now on server
        try {
          const rawOpt2 = localStorage.getItem('optimistic_favorites');
          if (rawOpt2) {
            const optimistic = JSON.parse(rawOpt2) as Product[];
            const remaining = optimistic.filter(o => !validProducts.find(v => v.id === o.id));
            if (remaining.length > 0) localStorage.setItem('optimistic_favorites', JSON.stringify(remaining));
            else localStorage.removeItem('optimistic_favorites');
          }
        } catch (e) {
          console.warn('Failed to clear optimistic favorites', e);
        }
      } else {
        console.warn('API returned success: false');
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user?.user_id]);

  const filteredFavorites = favoriteProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.shop?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-3">
          <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 rounded-md">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">My Favorites</h1>
                <p className="text-xs text-gray-500">
                  {filteredFavorites.length} {filteredFavorites.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading favorites...</div>
          ) : filteredFavorites.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {filteredFavorites.map(product => (
                <CompactProductCard key={product.id} product={product} user={user} favoriteIds={[product.id]} onToggleFavorite={(id: string, nowFavorite: boolean) => {
                  if (!nowFavorite) {
                    setFavoriteProducts(prev => prev.filter(p => p.id !== id));
                    try {
                      const raw = localStorage.getItem('optimistic_favorites');
                      if (raw) {
                        const existing = JSON.parse(raw).filter((p: any) => p.id !== id);
                        if (existing.length) localStorage.setItem('optimistic_favorites', JSON.stringify(existing));
                        else localStorage.removeItem('optimistic_favorites');
                      }
                    } catch (e) {
                      console.warn('Failed to remove optimistic favorite', e);
                    }
                  }
                }} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                <Heart className="h-10 w-10 text-red-400 fill-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching favorites found' : 'Your favorites list is empty'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
                {searchTerm
                  ? `No favorites matching "${searchTerm}"`
                  : 'Items you add to favorites will appear here'}
              </p>
            </div>
          )}
        </section>
      </SidebarLayout>
    </UserProvider>
  );
}
