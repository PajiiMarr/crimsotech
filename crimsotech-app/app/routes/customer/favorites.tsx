import type { Route } from './+types/favorites'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { FavoriteProductCard } from '~/components/customer/favorite-products'
import { ProductCategory } from '~/components/customer/product-category'
import { TopProductCard } from '~/components/customer/top-product'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Search, X, Heart } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useState, useEffect } from "react"
import AxiosInstance from "~/components/axios/Axios"
import { useNavigate } from 'react-router'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Favorites",
    },
  ];
}

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

// Product type
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
  discount?: number
}

// ----------------------------
// Compact Search Bar Component - LEFT ALIGNED
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
  )
}

// Get image URL helper
const getImageUrl = (url: string | null | undefined): string => {
  const baseUrl = import.meta.env.VITE_MEDIA_URL || 'http://127.0.0.1:8000';
  
  if (!url) {
    return '/default-product.jpg';
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

// Get product image helper
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
  
  return '/default-product.jpg';
}

// ----------------------------
// Compact Favorite Product Card
// ----------------------------
const CompactFavoriteCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleRemoveFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to product page
    console.log("Remove from favorites:", product.id);
    // Add API call to remove from favorites
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative"
    >
      {/* Remove from favorites button */}
      <button
        onClick={handleRemoveFavorite}
        className="absolute top-1 right-1 z-10 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Remove from favorites"
      >
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
      </button>
      
      {/* Discount badge */}
      {product.discount && (
        <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
          -{product.discount}%
        </div>
      )}
      
      {/* Image - Compact */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content - Minimal */}
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {product.name}
        </h3>
        
        {product.shop?.name && (
          <p className="text-[10px] text-gray-500 truncate mb-1">
            {product.shop.name}
          </p>
        )}
        
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// Categories (Static for now)
// ----------------------------
const categories = [
  { id: '1', title: 'Wires', image: '/wire.jpg' },
  { id: '2', title: 'Appliances', image: '/appliances.jpg' },
  { id: '3', title: 'Smartphones', image: '/phon.jpg' },
  { id: '4', title: 'Accessories', image: '/controller.jpg' },
  { id: '5', title: 'Watches', image: '/watch.jpg' },
];

// ----------------------------
// Favorites Component
// ----------------------------
export default function Favorites({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Premium Wireless Headphones',
      description: 'Noise cancelling wireless headphones',
      price: 299.99,
      discount: 15,
      shop: {
        id: 'shop1',
        name: 'AudioTech Store',
        shop_picture: null,
        address: '123 Audio St',
        avg_rating: 4.5
      }
    },
    {
      id: '2',
      name: 'Smart Fitness Watch',
      description: 'Track your fitness and health metrics',
      price: 199.99,
      discount: 0,
      shop: {
        id: 'shop2',
        name: 'TechGadgets',
        shop_picture: null,
        address: '456 Tech Ave',
        avg_rating: 4.7
      }
    },
    {
      id: '3',
      name: 'Mechanical Keyboard RGB',
      description: 'Customizable mechanical keyboard',
      price: 129.99,
      discount: 20,
      shop: {
        id: 'shop3',
        name: 'Gaming Gear',
        shop_picture: null,
        address: '789 Gaming Rd',
        avg_rating: 4.8
      }
    },
    {
      id: '4',
      name: 'Portable Power Bank 20000mAh',
      description: 'Fast charging portable battery',
      price: 49.99,
      discount: 10,
      shop: {
        id: 'shop4',
        name: 'Power Solutions',
        shop_picture: null,
        address: '101 Power St',
        avg_rating: 4.4
      }
    },
    {
      id: '5',
      name: '4K Action Camera',
      description: 'Waterproof action camera with stabilizer',
      price: 349.99,
      discount: 0,
      shop: {
        id: 'shop5',
        name: 'Action Gear',
        shop_picture: null,
        address: '202 Adventure Ln',
        avg_rating: 4.6
      }
    },
    {
      id: '6',
      name: 'Bluetooth Speaker',
      description: '360° sound portable speaker',
      price: 79.99,
      discount: 25,
      shop: {
        id: 'shop6',
        name: 'Sound Masters',
        shop_picture: null,
        address: '303 Sound Ave',
        avg_rating: 4.5
      }
    },
  ]);

  // Filter favorites based on search
  const filteredFavorites = favoriteProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.shop?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-3">
          {/* Compact Search bar - LEFT ALIGNED */}
          <div className="mb-4">
            <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>

          {/* Page Header */}
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
            
            <button className="text-xs text-red-600 hover:text-red-700 font-medium">
              Clear All
            </button>
          </div>

          {/* Categories - Compact */}
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Browse Categories</h2>
          <div className="flex gap-2 overflow-x-auto py-1 mb-6">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => console.log(`Navigate to category ${cat.id}`)}
                className="flex-shrink-0 w-16 text-center cursor-pointer hover:opacity-80"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center mb-1">
                  <span className="text-xs font-medium text-red-600">
                    {cat.title.charAt(0)}
                  </span>
                </div>
                <span className="text-xs text-gray-600 truncate block">
                  {cat.title}
                </span>
              </div>
            ))}
          </div>

          {/* Favorites Grid - Dense Layout */}
          {filteredFavorites.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">
                  {searchTerm ? `Search results for "${searchTerm}"` : "Your Favorite Items"}
                </h2>
                <span className="text-xs text-gray-500">
                  {filteredFavorites.length} items
                </span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                {filteredFavorites.map(product => (
                  <CompactFavoriteCard 
                    key={product.id} 
                    product={product} 
                  />
                ))}
              </div>
            </>
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
                  : "Items you add to favorites will appear here"}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              ) : (
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Start Shopping
                </button>
              )}
            </div>
          )}
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}