import type { Route } from './+types/favorites'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Search, X, Heart, Handshake, Gift } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from 'react-router'
import AxiosInstance from "~/components/axios/Axios"

export function meta(): Route.MetaDescriptors {
  return [{ title: "Favorites" }]
}

// ----------------------------
// Loader
// ----------------------------
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server")
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any)

  const { fetchUserRole } = await import("~/middleware/role.server")
  const { requireRole } = await import("~/middleware/role-require.server")

  let user = (context as any).user
  if (!user) {
    user = await fetchUserRole({ request, context })
  }

  await requireRole(request, context, ["isCustomer"])

  return user
}

// ----------------------------
// Types — exactly matching the API response
// ----------------------------
interface Variant {
  id: string
  title: string
  price: number
  compare_price: number | null
  quantity: number
  image: string | null
  is_refundable: boolean
  refund_days: number
  allow_swap: boolean
  swap_type: 'direct_swap' | 'swap_plus_payment'
  usage_period?: number | null
  usage_unit?: 'weeks' | 'months' | 'years' | null
  option_title?: string
  option_ids: string[]
  option_map: Record<string, string>
}

interface ProductMedia {
  id: string
  file_data: string
  file_type: string
}

interface Product {
  id: string
  name: string
  description: string
  condition: string
  shop_name?: string
  shop_id?: string
  total_variants: number
  min_price: number
  max_price: number
  total_stock: number
  variants: Variant[]
  media: ProductMedia[]
  is_refundable: boolean
  refund_days: number
  upload_status: string
  open_for_swap?: boolean
  // home.tsx-style fields (in case backend adds them later)
  primary_image?: {
    id: string
    url: string
    file_type: string
  } | null
  media_files?: Array<{
    id: string
    file_data: string
    file_type: string
    product: string
  }>
}

// ----------------------------
// URL Conversion Utility (same as home.tsx)
// ----------------------------
const convertS3ToPublicUrl = (s3Url: string | null | undefined): string | null => {
  if (!s3Url) return null

  try {
    const match = s3Url.match(
      /https:\/\/([^\.]+)\.storage\.supabase\.co\/storage\/v1\/s3\/([^\/]+)\/(.+)/
    )

    if (match) {
      const projectRef = match[1]
      const bucketName = match[2]
      const filePath = match[3]
      return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`
    }

    if (s3Url.includes("/s3/")) {
      let publicUrl = s3Url.replace("/s3/", "/object/public/")
      publicUrl = publicUrl.replace(".storage.supabase.co", ".supabase.co")
      return publicUrl
    }
  } catch (error) {
    console.error('Error converting URL:', error, s3Url)
  }

  return s3Url
}

// ----------------------------
// Get product image (same pattern as home.tsx)
// Priority: primary_image → media_files → media (favorites-specific) → variants[].image
// ----------------------------
const getProductImage = (product: Product): string => {
  // primary_image (home.tsx pattern)
  if (product.primary_image?.url) {
    const publicUrl = convertS3ToPublicUrl(product.primary_image.url)
    if (publicUrl) return publicUrl
  }

  // media_files (home.tsx pattern)
  if (product.media_files && product.media_files.length > 0) {
    const url = convertS3ToPublicUrl(product.media_files[0]?.file_data)
    if (url) return url
  }

  // media[].file_data (favorites API field)
  if (product.media && product.media.length > 0) {
    const url = convertS3ToPublicUrl(product.media[0]?.file_data)
    if (url) return url
  }

  // variants[].image (favorites API field)
  if (product.variants && product.variants.length > 0) {
    const v = product.variants.find(v => v.image)
    if (v?.image) {
      const url = convertS3ToPublicUrl(v.image)
      if (url) return url
    }
  }

  return '/Crimsotech.png'
}

// ----------------------------
// Format price
// ----------------------------
const formatPrice = (price: number): string =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(price)

const getProductCondition = (product: Product): string => {
  if (product.condition) return product.condition
  const v = product.variants?.[0]
  if (v?.usage_period && v?.usage_unit) return `Used - ${v.usage_period} ${v.usage_unit}`
  return 'Unknown'
}

// ----------------------------
// Search Bar
// ----------------------------
const CompactSearchBar = ({
  searchTerm,
  setSearchTerm,
}: {
  searchTerm: string
  setSearchTerm: (t: string) => void
}) => (
  <div className="relative w-full max-w-sm">
    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
    <Input
      placeholder="Search favorites..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-8 pr-8 py-1.5 h-8 text-sm border-gray-300 rounded-md"
    />
    {searchTerm && (
      <button
        onClick={() => setSearchTerm("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
)

// ----------------------------
// Price Range
// ----------------------------
const PriceRange = ({ min, max }: { min: number; max: number }) => {
  if (min === max) {
    return <span className="text-sm font-bold text-gray-900">{formatPrice(min)}</span>
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">from</span>
      <span className="text-sm font-bold text-gray-900">{formatPrice(min)}</span>
    </div>
  )
}

// ----------------------------
// Product Card — same image handling as home.tsx CompactProductCard
// ----------------------------
const CompactProductCard = ({
  product,
  user,
  favoriteIds = [],
  onToggleFavorite,
}: {
  product: Product
  user?: any
  favoriteIds?: string[]
  onToggleFavorite?: (productId: string, nowFavorite: boolean) => void
}) => {
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(favoriteIds.includes(product.id))
  const [loadingFav, setLoadingFav] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('/Crimsotech.png')

  useEffect(() => {
    setIsFavorite(favoriteIds.includes(product.id))
  }, [favoriteIds, product.id])

  // Load image the same way home.tsx does
  useEffect(() => {
    setImageUrl(getProductImage(product))
  }, [product])

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.user_id) return

    setLoadingFav(true)
    try {
      if (!isFavorite) {
        await AxiosInstance.post(
          "/customer-favorites/",
          { product: product.id, customer: user.user_id },
          { headers: { "X-User-Id": user.user_id } }
        )
        setIsFavorite(true)
        onToggleFavorite?.(product.id, true)
      } else {
        await AxiosInstance.delete("/customer-favorites/", {
          data: { product: product.id, customer: user.user_id },
          headers: { "X-User-Id": user.user_id },
        })
        setIsFavorite(false)
        onToggleFavorite?.(product.id, false)
      }
    } catch (err) {
      console.error("Failed to update favorite:", err)
    } finally {
      setLoadingFav(false)
    }
  }

  const hasSwap = product.variants?.some(v => v.allow_swap) || product.open_for_swap
  const hasRefund = product.variants?.some(v => v.is_refundable)
  const isGift = product.min_price === 0

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative"
    >
      {/* Badges — same style as home.tsx */}
      {isGift ? (
        <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full flex items-center gap-1">
          <Gift className="h-3.5 w-3.5 text-orange-600" />
          <span className="text-xs text-orange-700 font-medium">FREE GIFT</span>
        </div>
      ) : hasSwap ? (
        <div className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full flex items-center gap-1">
          <Handshake className="h-3.5 w-3.5 text-orange-600" />
          <span className="text-xs text-orange-700 font-medium">Open for Swap</span>
        </div>
      ) : null}

      {/* Heart button — same style as home.tsx */}
      <button
        onClick={handleFavoriteClick}
        disabled={loadingFav}
        className="absolute top-1 right-1 z-10 p-1 bg-white rounded-full shadow-sm hover:bg-orange-50 transition-colors"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            isFavorite ? 'fill-orange-500 text-orange-500' : 'text-gray-400'
          }`}
        />
      </button>

      {/* Image — exact same pattern as home.tsx */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement
            el.onerror = null
            el.src = '/Crimsotech.png'
          }}
        />
      </div>

      {/* Stock badges */}
      {product.total_stock === 0 && (
        <div className="absolute bottom-[40%] left-2 bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full">
          Out of Stock
        </div>
      )}
      {product.total_stock > 0 && product.total_stock <= 5 && (
        <div className="absolute bottom-[40%] left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
          Low Stock
        </div>
      )}

      {/* Card body */}
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {product.name}
        </h3>

        <p className="text-[10px] text-orange-600 font-medium truncate mb-1">
          {getProductCondition(product)}
        </p>

        {product.shop_name && (
          <p className="text-[10px] text-gray-500 truncate mb-1">{product.shop_name}</p>
        )}

        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between">
            {isGift ? (
              <span className="text-sm font-bold text-orange-600">FREE GIFT</span>
            ) : (
              <PriceRange min={product.min_price} max={product.max_price} />
            )}
            {hasRefund && (
              <span className="text-[10px] text-green-600 font-medium">Refundable</span>
            )}
          </div>
          {product.total_variants === 1 && product.total_stock > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{product.total_stock} in stock</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------
// Favorites Page
// ----------------------------
export default function Favorites({ loaderData }: Route.ComponentProps) {
  const user = loaderData
  const [searchTerm, setSearchTerm] = useState("")
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const favoriteIds = favoriteProducts.map(p => p.id)

  const fetchFavorites = useCallback(async () => {
    if (!user?.user_id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await AxiosInstance.get('/customer-favorites/', {
        headers: { 'X-User-Id': user.user_id },
      })

      if (res.data.success && Array.isArray(res.data.favorites)) {
        const products: Product[] = res.data.favorites
          .map((fav: any) => fav.product_details)
          .filter(Boolean)

        setFavoriteProducts(products)
      } else {
        setFavoriteProducts([])
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
      setError('Failed to load favorites. Please try again.')
      setFavoriteProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.user_id])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const handleToggleFavorite = (productId: string, nowFavorite: boolean) => {
    if (!nowFavorite) {
      setFavoriteProducts(prev => prev.filter(p => p.id !== productId))
    }
  }

  const filteredFavorites = favoriteProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalVariants = favoriteProducts.reduce((sum, p) => sum + (p.total_variants || 1), 0)
  const swapEligible = favoriteProducts.filter(
    p => p.variants?.some(v => v.allow_swap) || p.open_for_swap
  ).length

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            <div className="flex items-center gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Items</p>
                <p className="text-sm font-semibold text-gray-900">{favoriteProducts.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Variants</p>
                <p className="text-sm font-semibold text-gray-900">{totalVariants}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Swap Ready</p>
                <p className="text-sm font-semibold text-gray-900">{swapEligible}</p>
              </div>
            </div>
          </div>

          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {searchTerm ? `Results for "${searchTerm}"` : "Your Favorites"}
            <span className="ml-1 text-xs text-gray-500">({filteredFavorites.length})</span>
          </h2>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <X className="w-10 h-10 text-red-400" />
              <p className="text-gray-600 text-sm">{error}</p>
              <button
                onClick={fetchFavorites}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : filteredFavorites.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {filteredFavorites.map(product => (
                <CompactProductCard
                  key={product.id}
                  product={product}
                  user={user}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {searchTerm ? `No results for "${searchTerm}"` : "Your favorites list is empty"}
              </p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                {searchTerm
                  ? `No favorites matching "${searchTerm}"`
                  : 'Items you add to favorites will appear here'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => (window.location.href = '/')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                >
                  Browse Products
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-1 text-xs text-orange-600 hover:text-orange-700"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}