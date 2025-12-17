import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Star,
  Heart,
  Search,
  AlertCircle,
  Home,
  ShieldOff,
  Package,
  ShoppingCart,
  Repeat,
  UserCheck,
  ShoppingBag,
  Handshake
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Link, useParams, useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';

import { Skeleton } from '~/components/ui/skeleton';
import AxiosInstance from '~/components/axios/Axios';

export default function ViewShop() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'not_found' | 'suspended' | 'server' | 'other'>('other');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string|null>(null);
  const [categories, setCategories] = useState<Array<{id: string; name: string}>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');

  // Format numbers like 3200 -> 3.2k
  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return '—';
    const n = Number(value);
    if (isNaN(n)) return String(value);
    if (n >= 1000) {
      const val = n / 1000;
      return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
    }
    return String(n);
  };

  useEffect(() => {
    if (!shopId) {
      setError('Shop ID is required');
      setLoading(false);
      return;
    }

    const fetchShopData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await AxiosInstance.get(`/shops/${shopId}/`);
        
        if (response.data.is_suspended) {
          setErrorType('suspended');
          setError(`This shop is currently suspended. Reason: ${response.data.suspension_reason || 'Not specified'}`);
          setShopInfo(response.data);
          setIsFollowing(!!response.data.is_following);
          setFollowersCount(response.data.total_followers || 0);
          return;
        }
        
        setShopInfo(response.data);
        const prods = response.data.products || [];
        setProducts(prods);
        setIsFollowing(!!response.data.is_following);
        setFollowersCount(response.data.total_followers || 0);

        // Use categories returned by API if available and non-empty; otherwise derive from products
        try {
          const rawCats = response.data.categories || [];
          if (Array.isArray(rawCats) && rawCats.length > 0) {
            const normalized = rawCats.map((c: any) => ({ id: String(c.id || c.uuid || c.name), name: c.name || String(c.id || c.uuid || c.name) }));
            setCategories(normalized);
            console.debug('Shop categories (from API):', normalized);
          } else {
            const map = new Map<string, string>();
            prods.forEach((p: any) => {
              const candidates = [p.category, p.category_admin];
              for (const cat of candidates) {
                if (!cat) continue;
                if (typeof cat === 'string') {
                  map.set(cat, cat);
                } else if (typeof cat === 'object') {
                  const id = cat.id || cat.uuid || cat.name || JSON.stringify(cat);
                  const name = cat.name || String(id);
                  map.set(String(id), name);
                }
              }
            });
            const derived = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
            setCategories(derived);
            console.debug('Shop categories (derived):', derived);
          }
        } catch (e) {
          console.warn('Failed to obtain categories for shop', e);
        }
        
      } catch (err: any) {
        let errorMessage = 'Failed to load shop data';
        let type: 'not_found' | 'suspended' | 'server' | 'other' = 'other';
        
        if (err.response) {
          const { status, data } = err.response;
          
          switch (status) {
            case 404:
              type = 'not_found';
              errorMessage = `Shop not found. The shop with ID "${shopId}" doesn't exist.`;
              break;
            case 403:
              type = 'suspended';
              errorMessage = `Shop is suspended. ${data?.suspension_reason ? `Reason: ${data.suspension_reason}` : ''}`;
              setShopInfo(data);
              break;
            case 500:
              type = 'server';
              errorMessage = 'Server error. Please try again later.';
              break;
            default:
              errorMessage = `API Error (${status}): ${data?.detail || data?.error || 'Unknown error'}`;
          }
        } else if (err.request) {
          type = 'server';
          errorMessage = 'No response from server.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
        
        setErrorType(type);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [shopId]);

  // Fetch shop reviews when Reviews tab becomes active
  useEffect(() => {
    const fetchReviews = async () => {
      if (!shopId) return;
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await AxiosInstance.get(`/shops/${shopId}/reviews/`);
        const data = res.data.reviews || res.data || [];
        setReviews(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e.response && e.response.status === 404) {
          // endpoint might not exist - treat as no reviews
          setReviews([]);
        } else {
          setReviewsError('Failed to load reviews');
        }
      } finally {
        setReviewsLoading(false);
      }
    };

    if (activeTab === 'reviews') fetchReviews();
  }, [activeTab, shopId]);

  const conditionOptions = Array.from(new Set(products.map((p: any) => p.condition).filter(Boolean))) as string[];

  const filteredProducts = products.filter(product => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (product.name || '').toLowerCase().includes(q) || (product.description || '').toLowerCase().includes(q);

    // Price filter
    const p = Number(product.price || 0);
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    const matchesMin = min === null || (!isNaN(min) && p >= min);
    const matchesMax = max === null || (!isNaN(max) && p <= max);

    // Condition filter
    const matchesCondition = selectedCondition === '' || (product.condition && product.condition === selectedCondition);

    // Category
    const catMatch = (cat: any) => {
      if (!cat) return false;
      if (typeof cat === 'string') return cat === selectedCategory;
      if (typeof cat === 'object') return String(cat.id) === selectedCategory || String(cat.uuid) === selectedCategory || String(cat.name) === selectedCategory;
      return false;
    };

    const matchesCategory = !selectedCategory || catMatch(product.category) || catMatch(product.category_admin);

    return matchesSearch && matchesMin && matchesMax && matchesCondition && matchesCategory;
  });

  // Helpers copied from Favorites compact card to ensure consistent UI
  const getImageUrl = (url?: string | null) => {
    const baseUrl = import.meta.env.VITE_MEDIA_URL || '';
    if (!url) return '/images/placeholder-product.jpg';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return `${baseUrl}/media/${url}`;
  };

  const getProductImage = (product: any) => {
    if (product?.primary_image?.url) return getImageUrl(product.primary_image.url);
    if (product?.media_files && product.media_files.length > 0) return getImageUrl(product.media_files[0].file_data);
    if (product?.image) return getImageUrl(product.image);
    if (product?.shop?.shop_picture) return getImageUrl(product.shop.shop_picture);
    return '/images/placeholder-product.jpg';
  };

  const CompactProductCard = ({ product }: { product: any }) => {
    return (
      <div onClick={() => navigate(`/product/${product.id}`)} className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative">
        {product.open_for_swap && (
          <div className="absolute top-1 left-1 z-10 px-2 py-0.5 bg-white rounded-full shadow-sm flex items-center gap-1">
            <Handshake className="h-4 w-4 text-indigo-600" />
            <span className="text-xs text-indigo-700 font-medium">Open for Swap</span>
          </div>
        )}

        <div className="aspect-square w-full overflow-hidden bg-gray-100">
          <img src={getProductImage(product)} alt={product.name} className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.onerror = null; el.src = '/public/phon.jpg'; }} />
        </div>

        <div className="p-2 flex flex-col flex-1">
          <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">{product.name}</h3>

          {product.category?.name && (
            <p className="text-[10px] text-blue-600 font-medium truncate mb-1">{product.category.name}</p>
          )}

          {product.shop?.name && (
            <p className="text-[10px] text-gray-500 truncate mb-1">{product.shop.name}</p>
          )}

          <div className="mt-auto pt-1">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {product.compare_price && product.compare_price > product.price ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 line-through">₱{Number(product.compare_price).toFixed(2)}</span>
                      <span className="text-sm font-bold text-gray-900">₱{Number(product.price).toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-gray-900">₱{Number(product.price).toFixed(2)}</span>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (errorType === 'suspended' && shopInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldOff className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Shop Suspended</h3>
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 md:flex items-center gap-6">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage src={shopInfo.shop_picture || '/images/shop-placeholder.jpg' || '/images/shop-placeholder.jpg'} alt={shopInfo.name} />
              <AvatarFallback>{shopInfo.name?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 mt-4 md:mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold truncate">{shopInfo.name}</h1>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Suspended
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{shopInfo.description}</p>
              {shopInfo.address && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Home className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{shopInfo.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">This shop is currently unavailable due to suspension.</p>
          <Button asChild className="mt-4">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Browse Other Shops
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error && !shopInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          {errorType === 'not_found' ? (
            <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          ) : errorType === 'suspended' ? (
            <ShieldOff className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto text-gray-500 mb-4" />
          )}
          
          <h2 className="text-2xl font-bold text-center mb-2">
            {errorType === 'not_found' ? 'Shop Not Found' : 
             errorType === 'suspended' ? 'Shop Suspended' : 
             'Unable to Load Shop'}
          </h2>
          
          <p className="text-gray-600 text-center mb-6">{error}</p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Shop ID:</p>
              <code className="bg-gray-100 px-3 py-2 rounded text-sm block break-all font-mono">
                {shopId}
              </code>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate(-1)} variant="outline">
                ← Go Back
              </Button>
              <Button asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shop Header with 2x2 Stats Grid in Center */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-8">
            {/* Left: Shop Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white shadow-sm">
                  <AvatarImage src={shopInfo.shop_picture} alt={shopInfo.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-800">
                    {shopInfo.name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold truncate">{shopInfo.name}</h1>
                    <Button
                      size="sm"
                      variant={isFollowing ? 'outline' : 'ghost'}
                      className="h-7 px-2 text-xs min-w-[64px] flex items-center gap-2"
                      onClick={async () => {
                        if (followLoading) return;
                        setFollowLoading(true);
                        try {
                          if (!isFollowing) {
                            await AxiosInstance.post(`/shops/${shopId}/follow/`);
                            setIsFollowing(true);
                            setFollowersCount(prev => prev + 1);
                          } else {
                            await AxiosInstance.delete(`/shops/${shopId}/unfollow/`);
                            setIsFollowing(false);
                            setFollowersCount(prev => Math.max(prev - 1, 0));
                          }
                        } catch (e) {
                          console.error('Follow action failed', e);
                        } finally {
                          setFollowLoading(false);
                        }
                      }}
                      aria-pressed={isFollowing}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isFollowing ? 'text-red-600 fill-current' : 'text-gray-500'}`} />
                      <span className="hidden sm:inline">{followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {shopInfo.description}
                  </p>
                  {shopInfo.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Home className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{shopInfo.address}</span>
                    </div>
                  )}
                  {/* Small follower and rating info */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium">{followersCount}</span>
                      <span className="text-xs text-gray-500">followers</span>
                    </div>
                    {shopInfo.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs font-medium">{shopInfo.rating}</span>
                        <span className="text-xs text-gray-500">({shopInfo.rating_count || 0})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Center: 2x2 Stats Grid */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-[200px]">
              <div className="text-center px-3 py-2">
                <div className="flex items-center justify-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">
                    {formatNumber(shopInfo.total_products)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">All Products</p>
              </div>
              
              <div className="text-center px-3 py-2">
                <div className="flex items-center justify-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">
                    {formatNumber(shopInfo.product_sold)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">Total Sold</p>
              </div>
              
              <div className="text-center px-3 py-2">
                <div className="flex items-center justify-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-800">
                    {formatNumber(shopInfo.total_customers)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">All Customers</p>
              </div>
              
              <div className="text-center px-3 py-2">
                <div className="flex items-center justify-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800">
                    {formatNumber(shopInfo.repeated_customers)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">Repeat Customers</p>
              </div>
            </div>
            
            {/* Right: Additional space if needed */}
            <div className="hidden md:block w-0 md:w-20"></div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-9 w-auto items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
            <TabsTrigger value="products" className="text-xs sm:text-sm py-2 px-2">Products</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm py-2 px-2">Shop Details</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm py-2 px-2">Reviews</TabsTrigger>
          </TabsList>

          {/* Products tab content */}
          <TabsContent value="products" className="mt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
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

                <div>
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice(''); setSelectedCondition(''); }}
                    className="px-3 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </div>

            {/* Categories (derived from products) */}
            <h2 className="mb-2 text-sm font-semibold text-gray-700 mt-4">Categories</h2>
            <div className="flex gap-2 overflow-x-auto py-1 mb-4">
              <div key="all" onClick={() => setSelectedCategory('')} className={`flex-shrink-0 w-16 text-center cursor-pointer`}>
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-1 ${selectedCategory === '' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                  <span className="text-xs font-medium">All</span>
                </div>
                <span className={`text-xs truncate block ${selectedCategory === '' ? 'text-indigo-700' : 'text-gray-600'}`}>All</span>
              </div>

              {categories.map((cat) => {
                const name = cat?.name || String(cat?.id || '');
                const active = selectedCategory === String(cat?.id);
                return (
                  <div key={String(cat?.id || name)} onClick={() => setSelectedCategory(active ? '' : String(cat?.id))} className={`flex-shrink-0 w-16 text-center cursor-pointer`}>
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-1 ${active ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                      <span className="text-xs font-medium">{name.charAt(0)}</span>
                    </div>
                    <span className={`text-xs truncate block ${active ? 'text-indigo-700' : 'text-gray-600'}`}>{name}</span>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <CompactProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
                  <p className="text-gray-500 mt-1">
                    {searchQuery ? 'Try a different search term' : 'This shop has no products yet'}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Shop Details tab content */}
          <TabsContent value="details" className="mt-4">
            <div className="bg-white p-4 rounded-md border">
              <h3 className="text-lg font-semibold mb-2">About this shop</h3>
              <p className="text-sm text-gray-700 mb-3">{shopInfo.description}</p>
              {shopInfo.address && <p className="text-sm text-gray-500 mb-2"><strong>Address:</strong> {shopInfo.address}</p>}
              {shopInfo.contact_number && <p className="text-sm text-gray-500 mb-2"><strong>Contact:</strong> {shopInfo.contact_number}</p>}
              <div className="flex items-center gap-4 mt-3">
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Followers</div>
                  <div className="font-semibold">{formatNumber(followersCount)}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Rating</div>
                  <div className="font-semibold">{shopInfo.rating ? `${shopInfo.rating} / 5` : '—'}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Products</div>
                  <div className="font-semibold">{formatNumber(shopInfo.total_products)}</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Reviews tab content */}
          <TabsContent value="reviews" className="mt-4">
            <div className="bg-white p-4 rounded-md border">
              <h3 className="text-lg font-semibold mb-2">Customer Reviews</h3>
              <p className="text-sm text-gray-500 mb-3">{shopInfo.rating ? `${shopInfo.rating} average • ${shopInfo.rating_count || 0} reviews` : 'No ratings yet'}</p>
              <div>
                {reviewsLoading ? (
                  <div className="text-sm text-gray-500">Loading reviews...</div>
                ) : reviewsError ? (
                  <div className="text-sm text-red-500">{reviewsError}</div>
                ) : reviews.length === 0 ? (
                  <div className="text-sm text-gray-500">No reviews available.</div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="border-b py-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{r.customer_name || r.customer || 'Anonymous'}</div>
                        <div className="text-xs text-gray-500">{r.rating} / 5</div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {filteredProducts.length > 0 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Products ({filteredProducts.length})
              </h3>
              <p className="text-sm text-gray-500">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <CompactProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery ? 'Try a different search term' : 'This shop has no products yet'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'This shop has no products yet'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Suspended Banner */}
      {shopInfo?.is_suspended && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <ShieldOff className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Shop Suspended • {shopInfo.suspension_reason || 'No reason provided'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}