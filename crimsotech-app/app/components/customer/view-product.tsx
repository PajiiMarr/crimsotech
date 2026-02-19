import {
  Star,
  Share2,
  Minus,
  Plus,
  Flag,
  ChevronLeft,
  ChevronRight,
  ShoppingBagIcon,
  MapPin,
  Store,
  RefreshCw,
  ShieldCheck,
  ShieldOff
} from "lucide-react";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import Breadcrumbs from "~/components/ui/breadcrumbs";
import AxiosInstance from "~/components/axios/Axios";
import { toast } from "sonner";

import type { Route } from './+types/view-product';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8000/";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Product Details" }];
}

interface Variant {
  id: string;
  product: string;
  shop: string;
  title: string;
  option_title: string;
  option_created_at: string;
  option_ids: string[];
  option_map: Record<string, string>;
  sku_code: string;
  price: string;
  compare_price: string | null;
  quantity: number;
  weight: string;
  weight_unit: string;
  critical_trigger: number;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price: string;
  usage_period: number;
  usage_unit: string;
  depreciation_rate: number;
  minimum_additional_payment: string;
  maximum_additional_payment: string;
  swap_description: string;
  image: string | null;
  image_url: string | null;
  critical_stock: number | null;
  created_at: string;
  updated_at: string;
}

interface MediaFile {
  id: string;
  file_data: string;
  file_type: string;
  file_url: string;
}

interface PrimaryImage {
  id: string;
  url: string;
  file_type: string;
}

interface PriceRange {
  min: number;
  max: number;
  is_range: boolean;
}

interface Shop {
  id: string;
  address: string;
  avg_rating: number | null;
  shop_picture: string | null;
  description: string;
  name: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: string;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  customer: string;
}

interface Category {
  id: string;
  name: string;
  shop: string | null;
  user: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  status: string;
  upload_status: string;
  condition: string;
  is_refundable: boolean;
  refund_days: number;
  created_at: string;
  updated_at: string;
  shop: Shop | null;
  category: Category | null;
  category_admin: Category | null;
  variants: Variant[];
  media_files: MediaFile[];
  primary_image: PrimaryImage | null;
  total_stock: number;
  price_display: string;
  price_range: PriceRange;
  variant_count: number;
  default_variant: Variant | null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const userId = session.get("userId");
  const productId = new URL(request.url).searchParams.get("id");
  let product = null;

  if (productId) {
    try {
      const response = await AxiosInstance.get(`/public-products/${productId}/`);
      product = response.data;
      console.log("Product loaded:", product);
    } catch (err) {
      console.error("Error fetching product in loader:", err);
    }
  }

  return {
    user: { id: userId },
    product,
    headers: { "Set-Cookie": await commitSession(session) },
  };
}

function resolveImageUrl(img: any): string | null {
  if (!img) return null;
  
  if (typeof img === 'string') {
    return img.startsWith('http') ? img : `${MEDIA_URL}${img}`;
  }
  
  if (img && typeof img === 'object') {
    if (img.url && typeof img.url === 'string') {
      return img.url.startsWith('http') ? img.url : `${MEDIA_URL}${img.url}`;
    }

    if (typeof img.file_url === 'string') {
      return img.file_url.startsWith('http') ? img.file_url : `${MEDIA_URL}${img.file_url}`;
    }

    if (typeof img.file_data === 'string') {
      return img.file_data.startsWith('http') ? img.file_data : `${MEDIA_URL}${img.file_data}`;
    }
    if (img.file_data && typeof img.file_data === 'object' && typeof img.file_data.url === 'string') {
      return img.file_data.url.startsWith('http') ? img.file_data.url : `${MEDIA_URL}${img.file_data.url}`;
    }

    if (typeof img.file === 'string') {
      return img.file.startsWith('http') ? img.file : `${MEDIA_URL}${img.file}`;
    }
    if (typeof img.thumbnail === 'string') {
      return img.thumbnail.startsWith('http') ? img.thumbnail : `${MEDIA_URL}${img.thumbnail}`;
    }
  }
  
  return null;
}

function safeToNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function getAvailableOptionIdsForGroup(
  variants: Variant[],
  selectedOptions: Record<string, string>,
  groupId: string
): Set<string> {
  if (!variants || variants.length === 0) return new Set<string>();
  
  const otherSelected = Object.entries(selectedOptions)
    .filter(([g, optId]) => g !== groupId && !!optId)
    .map(([, optId]) => String(optId));

  if (otherSelected.length === 0) {
    return new Set<string>(variants.flatMap((v) => (v.option_ids || []).map(String)));
  }

  const matchingVariants = variants.filter((variant) => {
    const variantOptionIds = (variant.option_ids || []).map(String);
    return otherSelected.every((id) => variantOptionIds.includes(id));
  });

  return new Set<string>(matchingVariants.flatMap((v) => (v.option_ids || []).map(String)));
}

function extractVariantGroups(product: Product): { groups: any[], optionTitles: Record<string, Record<string, string>> } {
  const groups: any[] = [];
  const optionTitles: Record<string, Record<string, string>> = {};
  
  if (!product.variants || product.variants.length === 0) {
    return { groups, optionTitles };
  }

  // For now, since option_ids are empty in this product, we'll create a simple structure
  // If you have actual option data structure, you'd parse it here
  
  // Since this product has no option_ids, we'll treat it as a simple product with one variant
  // You might want to enhance this based on your actual option structure
  
  return { groups, optionTitles };
}

export default function ViewProduct({ loaderData }: Route.ComponentProps) {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(loaderData?.product || null);
  const [loading, setLoading] = useState(!loaderData?.product);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);
  const [startingSwap, setStartingSwap] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [variantGroups, setVariantGroups] = useState<any[]>([]);
  const [optionTitles, setOptionTitles] = useState<Record<string, Record<string, string>>>({});
  const [cartItemCount, setCartItemCount] = useState(0);

  const user = loaderData?.user;

  // Safely determine if product has variants
  const hasVariants = !!(product?.variants && Array.isArray(product.variants) && product.variants.length > 0);

  // Extract variant groups from variants data
  useEffect(() => {
    if (product) {
      const { groups, optionTitles: titles } = extractVariantGroups(product);
      setVariantGroups(groups);
      setOptionTitles(titles);
    }
  }, [product]);

  // Use default variant if available
  useEffect(() => {
    if (product?.default_variant && !currentVariant) {
      setCurrentVariant(product.default_variant);
    }
  }, [product?.default_variant]);

  // Fetch cart count
  useEffect(() => {
    const fetchCartCount = async () => {
      if (user?.id) {
        try {
          const response = await AxiosInstance.get("/cart/count/", {
            params: { user_id: user.id }
          });
          // Check the response structure
          if (response.data && typeof response.data.count === 'number') {
            setCartItemCount(response.data.count);
          } else if (response.data && typeof response.data === 'number') {
            setCartItemCount(response.data);
          }
        } catch (err) {
          console.error("Error fetching cart count:", err);
        }
      }
    };

    fetchCartCount();
  }, [user]);

  // Refund policy
  const isRefundable = !!(currentVariant?.is_refundable || product?.is_refundable);
  const refundDays = currentVariant?.is_refundable 
    ? (currentVariant.refund_days ?? product?.refund_days ?? 0) 
    : (product?.is_refundable ? (product.refund_days ?? 0) : 0);
  const refundText = `refundable (${refundDays} day${refundDays === 1 ? '' : 's'})`;
  const refundAriaLabel = refundDays ? `Refundable for ${refundDays} day${refundDays === 1 ? '' : 's'}` : 'Refundable';

  const isExplicitlyNonRefundable = (currentVariant?.is_refundable === false) || (product?.is_refundable === false);

  const isAvailableForSwap = hasVariants
    ? (currentVariant && currentVariant.allow_swap)
    : false;

  // Initialize product
  useEffect(() => {
    const initializeProduct = async () => {
      if (!product && id) {
        try {
          const response = await AxiosInstance.get(`/public-products/${id}/`);
          setProduct(response.data);
          
          // Set current variant to default if available
          if (response.data.default_variant) {
            setCurrentVariant(response.data.default_variant);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeProduct();
  }, [id, product]);

  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));

  const handleSelectOption = (groupId: string, optionId: string) => {
    setSelectedOptions({ ...selectedOptions, [groupId]: optionId });
  };

  // Get display values from current variant or product defaults
  const displayPrice = currentVariant
    ? safeToNumber(currentVariant.price, 0)
    : (product?.price_range?.min || 0);
  
  const displayComparePrice = currentVariant?.compare_price 
    ? safeToNumber(currentVariant.compare_price) 
    : undefined;

  const displayStock = currentVariant
    ? safeToNumber(currentVariant.quantity, 0)
    : safeToNumber(product?.total_stock || 0, 0);

  const maxQuantity = displayStock;

  // Build thumbnail list with safety checks
  const thumbnailUrls: { url: string; type: 'product' | 'variant'; id?: string }[] = [];
  const seen = new Set<string>();

  // Add product images first
  if (product?.media_files && Array.isArray(product.media_files)) {
    product.media_files.forEach((img) => {
      const full = resolveImageUrl(img.file_data || img.file_url);
      if (full && !seen.has(full)) {
        thumbnailUrls.push({ url: full, type: 'product' });
        seen.add(full);
      }
    });
  }

  // Add variant images
  if (product?.variants && Array.isArray(product.variants)) {
    product.variants.forEach((variant) => {
      if (variant.image || variant.image_url) {
        const full = resolveImageUrl(variant.image || variant.image_url);
        if (full && !seen.has(full)) {
          thumbnailUrls.push({ url: full, type: 'variant', id: variant.id });
          seen.add(full);
        }
      }
    });
  }

  // Add primary image if not already added
  if (product?.primary_image?.url) {
    const full = resolveImageUrl(product.primary_image.url);
    if (full && !seen.has(full)) {
      thumbnailUrls.unshift({ url: full, type: 'product' }); // Add to front
      seen.add(full);
    }
  }

  // Ensure activeImage is within bounds
  useEffect(() => {
    if (activeImage >= thumbnailUrls.length) {
      setActiveImage(0);
    }
  }, [thumbnailUrls.length, activeImage]);

  const mainImageFromVariant = currentVariant?.image || currentVariant?.image_url ? resolveImageUrl(currentVariant.image || currentVariant.image_url) : null;
  const displayImageUrl = (mainImageFromVariant ?? (thumbnailUrls.length > 0 ? thumbnailUrls[activeImage]?.url : null)) ?? '/Crimsotech.png';

  const handleAddToCart = async () => {
    if (!product || !user?.id) {
      toast.error("Please login to add items to cart");
      return;
    }

    // Make sure we have a variant selected
    if (!currentVariant) {
      toast.error("Please select a variant");
      return;
    }

    setAddingToCart(true);
    setCartError(null);

    try {
      const payload = {
        user_id: user.id,
        product_id: product.id,
        variant_id: currentVariant.id,
        quantity,
      };

      const response = await AxiosInstance.post("/cart/add/", payload);

      if (response.data.success) {
        // Show different messages based on what happened
        switch (response.data.action) {
          case 'updated':
            toast.success(`Cart updated! Quantity is now ${response.data.new_quantity}`);
            break;
          case 'recycled':
            toast.info("Item added to cart from previous order");
            break;
          case 'created':
          default:
            toast.success("Product added to cart!");
            break;
        }
        
        // Update cart count after adding
        try {
          const countResponse = await AxiosInstance.get("/cart/count/", {
            params: { user_id: user.id }
          });
          if (countResponse.data && typeof countResponse.data.count === 'number') {
            setCartItemCount(countResponse.data.count);
          }
        } catch (err) {
          console.error("Error fetching cart count:", err);
        }
      } else {
        const errorMsg = response.data.error || "Failed to add to cart";
        setCartError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      // Check if the error response contains a message
      let errorMsg = "An error occurred while adding to cart";
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.details) {
        errorMsg = err.response.data.details;
      }
      setCartError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleStartSwap = async () => {
    if (!product || !user?.id) {
      toast.error("Please login to start a swap");
      return;
    }

    if (!currentVariant || !currentVariant.allow_swap) {
      toast.error("This variant is not available for swap");
      return;
    }

    setStartingSwap(true);
    setSwapError(null);

    try {
      const payload: any = {
        user_id: user.id,
        product_id: product.id,
        variant_id: currentVariant.id,
        quantity,
        swap_type: currentVariant.swap_type,
        minimum_additional_payment: currentVariant.minimum_additional_payment,
        maximum_additional_payment: currentVariant.maximum_additional_payment,
      };

      toast.info("Swap functionality coming soon! You will be redirected to select items to trade with this product.");

    } catch (err: any) {
      console.error(err);
      const errorMsg = "An error occurred while initiating swap: " + (err.message || "Unknown error");
      setSwapError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setStartingSwap(false);
    }
  };

  if (loading) return (
    <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
  );
  
  if (!product) return (
    <div className="p-4 text-center text-sm text-red-500">Product not found</div>
  );

  const shopPic = product.shop?.shop_picture ? 
    `${MEDIA_URL}${product.shop.shop_picture}` : 
    '/appliances.jpg';

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">
      {/* Fixed Header with Cart Icon */}
      <div className="sticky top-0 z-10 bg-white border-b mb-4 -mt-3 -mx-3 md:-mt-4 md:-mx-4 px-3 md:px-4 py-2 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          <Breadcrumbs />
        </div>
        <Link to="/cart" className="relative">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingBagIcon className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Left: Images */}
        <div className="flex flex-col md:flex-row gap-2 items-start">
          {thumbnailUrls.length > 0 && (
            <div className="flex md:flex-col gap-1 md:w-24 md:max-h-[520px] md:overflow-y-auto overflow-x-auto pb-1 md:-mr-1">
              {thumbnailUrls.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`flex-shrink-0 h-16 w-16 md:h-20 md:w-20 rounded border overflow-hidden ${
                    activeImage === idx ? 'border-orange-500 border-2' : 'border-gray-300'
                  }`}
                >
                  <img
                    src={t.url}
                    alt={`Thumb ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="relative aspect-square overflow-hidden rounded-lg border bg-gray-50 flex-1">
            <img
              src={displayImageUrl}
              alt={product.name}
              className="h-full w-full object-contain"
            />

            {thumbnailUrls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 hover:bg-white"
                  onClick={() => setActiveImage(prev => prev === 0 ? thumbnailUrls.length - 1 : prev - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 hover:bg-white"
                  onClick={() => setActiveImage(prev => prev === thumbnailUrls.length - 1 ? 0 : prev + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right: Product Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                {product.name}
              </h1>
              <div className="flex gap-1">
                <button className="p-1.5 rounded hover:bg-gray-100">
                  <Share2 className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-1.5 rounded hover:bg-red-50">
                  <Flag className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-sm">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-3.5 w-3.5 ${
                      idx < (product.shop?.avg_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="ml-1 font-medium">{product.shop?.avg_rating?.toFixed(1) || 0}</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">{product.condition}</span>

              {isRefundable ? (
                <>
                  <span className="text-gray-300">•</span>
                  <Link
                    to="#"
                    aria-label={refundAriaLabel}
                    title={refundAriaLabel}
                    className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-100 hover:bg-emerald-100"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-700" />
                    <span>{refundText}</span>
                  </Link>
                </>
              ) : (isExplicitlyNonRefundable && (
                <>
                  <span className="text-gray-300">•</span>
                  <span
                    role="status"
                    aria-label="Non-refundable"
                    title="Non-refundable"
                    className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100"
                  >
                    <ShieldOff className="h-3 w-3 text-rose-600" />
                    <span>Non-refundable</span>
                  </span>
                </>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-orange-600">
                {product.price_display}
              </div>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <div className="text-lg text-gray-500 line-through">
                  ₱{displayComparePrice.toFixed(2)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>Stock: {displayStock} {displayStock <= 0 ? "(Out of Stock)" : ""}</div>
              {product.price_range.is_range && (
                <div className="text-sm text-gray-700 ml-4">
                  <span className="font-medium">Price range: </span>
                  ₱{product.price_range.min.toFixed(2)} - ₱{product.price_range.max.toFixed(2)}
                </div>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>

          {/* Show variant info if multiple variants exist */}
          {product.variant_count > 1 && (
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                This product has {product.variant_count} variants available. Please select your preferred variant.
              </p>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Quantity</Label>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={decreaseQuantity}
                className="h-7 w-7 border-gray-300 hover:bg-gray-50"
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex h-7 w-10 items-center justify-center rounded border bg-gray-50 text-sm font-medium">
                {quantity}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={increaseQuantity}
                className="h-7 w-7 border-gray-300 hover:bg-gray-50"
                disabled={quantity >= maxQuantity}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              size="sm"
              className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm font-semibold"
              onClick={handleAddToCart}
              disabled={displayStock <= 0}
            >
              {displayStock <= 0 ? "Out of Stock" : "Buy Now"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full border-orange-600 text-orange-600 hover:bg-orange-50 h-9 text-sm"
              onClick={handleAddToCart}
              disabled={addingToCart || displayStock <= 0}
            >
              <ShoppingBagIcon className="h-4 w-4 mr-1.5" />
              {addingToCart ? "Adding..." : displayStock <= 0 ? "Out of Stock" : "Add to Cart"}
            </Button>

            {isAvailableForSwap && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-600 text-green-600 hover:bg-green-50 h-9 text-sm"
                onClick={handleStartSwap}
                disabled={startingSwap || displayStock <= 0}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {startingSwap ? "Starting Swap..." : "Swap This Item"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Shop Information */}
      {product.shop && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Shop Information</h2>
          <div className="text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <img
                src={shopPic}
                alt="Shop"
                className="h-10 w-10 rounded-full object-cover border"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900 truncate">
                  {product.shop.name || "Unknown Shop"}
                </h3>
                {product.shop.address && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500 truncate">{product.shop.address}</p>
                  </div>
                )}
                {product.shop.avg_rating !== undefined && product.shop.avg_rating !== null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-3 w-3 ${idx < Math.floor(product.shop?.avg_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 ml-1">
                      {product.shop.avg_rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                )}
              </div>
              <Link to={`/shop/${product.shop.id}`}>
                <Button size="sm" className="h-7 text-xs px-3 bg-gray-800 hover:bg-gray-900">
                  Visit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Variant Details */}
      {currentVariant && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Product Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-medium">SKU Code:</div>
                <div className="text-sm text-gray-600">
                  {currentVariant.sku_code || "No SKU Code"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-medium">Price:</div>
                <div className="text-lg font-semibold text-orange-600">₱{safeToNumber(currentVariant.price).toFixed(2)}</div>
              </div>
              {currentVariant.compare_price && (
                <div className="flex items-center gap-2">
                  <div className="font-medium">Compare Price:</div>
                  <div className="text-sm text-gray-500 line-through">₱{safeToNumber(currentVariant.compare_price).toFixed(2)}</div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="font-medium">Stock:</div>
                <div className="text-sm text-gray-600">{currentVariant.quantity} units</div>
              </div>
              {currentVariant.original_price && (
                <div className="flex items-center gap-2">
                  <div className="font-medium">Original Price:</div>
                  <div className="text-sm text-gray-600">₱{safeToNumber(currentVariant.original_price).toFixed(2)}</div>
                </div>
              )}
            </div>
            
            {(currentVariant.usage_period || currentVariant.depreciation_rate || currentVariant.weight) && (
              <div className="space-y-2">
                <div className="font-medium mb-2">Item Details:</div>
                {currentVariant.usage_period && currentVariant.usage_unit && (
                  <div className="text-sm text-gray-600">
                    Usage: {currentVariant.usage_period} {currentVariant.usage_unit}
                  </div>
                )}
                {currentVariant.depreciation_rate && (
                  <div className="text-sm text-gray-600">
                    Depreciation Rate: {currentVariant.depreciation_rate}%
                  </div>
                )}
                {currentVariant.weight && (
                  <div className="text-sm text-gray-600">
                    Weight: {currentVariant.weight} {currentVariant.weight_unit || 'g'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Swap Options */}
      {currentVariant && currentVariant.allow_swap && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Swap Options</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div>
              <span className="font-medium">Type:</span>{" "}
              <span className="capitalize">
                {currentVariant.swap_type?.replace('_', ' ') || 'direct swap'}
              </span>
            </div>
            {currentVariant.minimum_additional_payment && safeToNumber(currentVariant.minimum_additional_payment) > 0 && (
              <div>
                <span className="font-medium">Minimum Additional Payment:</span>{" "}
                ₱{safeToNumber(currentVariant.minimum_additional_payment).toFixed(2)}
              </div>
            )}
            {currentVariant.maximum_additional_payment && safeToNumber(currentVariant.maximum_additional_payment) > 0 && (
              <div>
                <span className="font-medium">Maximum Additional Payment:</span>{" "}
                ₱{safeToNumber(currentVariant.maximum_additional_payment).toFixed(2)}
              </div>
            )}
            {currentVariant.swap_description && (
              <div className="mt-2 p-3 bg-gray-50 rounded">
                {currentVariant.swap_description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}