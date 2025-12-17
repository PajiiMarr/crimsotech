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
  Store
} from "lucide-react";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import Breadcrumbs from "~/components/ui/breadcrumbs";
import AxiosInstance from "~/components/axios/Axios";

import type { Route } from './+types/view-product';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8000/";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Product Details" }];
}

interface VariantOption {
  id: string;
  title: string;
  image?: string | null;
  price?: string;
  quantity?: number;
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface SKU {
  id: string;
  option_ids: string[];
  option_map: Record<string, string>;
  sku_code?: string;
  price: number;
  compare_price?: number;
  quantity: number;
  image?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  weight_unit?: string;
  allow_swap?: boolean;
  swap_type?: string;
  minimum_additional_payment?: number;
  maximum_additional_payment?: number;
  swap_description?: string;
  accepted_categories?: { id: string; name: string }[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  quantity: number; // Product-level quantity
  price: number; // Product-level price
  compare_price?: number; // Product-level compare price
  category?: { name: string };
  shop?: {
    id?: string;
    shop_picture?: string;
    name?: string;
    address?: string;
    avg_rating?: number;
  };
  media_files?: { file_url: string }[];
  sold?: number;
  reviews_count?: number;
  rating?: number;
  variants?: VariantGroup[]; // If exists, product has variants
  skus?: SKU[]; // SKUs for variants
  open_for_swap?: boolean;
  swap_type?: string;
  minimum_additional_payment?: number;
  maximum_additional_payment?: number;
  swap_description?: string;
  accepted_categories?: { id: string; name: string }[];
  length?: number | null; // Product-level dimensions
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
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
  }
  
  return null;
}

function safeToNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function getAvailableOptionIdsForGroup(
  skus: SKU[],
  selectedOptions: Record<string, string>,
  groupId: string
): Set<string> {
  const otherSelected = Object.entries(selectedOptions)
    .filter(([g, optId]) => g !== groupId && !!optId)
    .map(([, optId]) => String(optId));

  // If nothing else is selected, everything is possible for this group.
  if (otherSelected.length === 0) {
    return new Set<string>(skus.flatMap((s) => (s.option_ids || []).map(String)));
  }

  const matchingSkus = skus.filter((sku) => {
    const skuOptionIds = (sku.option_ids || []).map(String);
    return otherSelected.every((id) => skuOptionIds.includes(id));
  });

  return new Set<string>(matchingSkus.flatMap((s) => (s.option_ids || []).map(String)));
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
  const [currentSKU, setCurrentSKU] = useState<SKU | null>(null);

  const user = loaderData?.user;

  // Check if product has variants
  const hasVariants = product?.variants && product.variants.length > 0;

  // Find matching SKU when selections change (only if product has variants)
  useEffect(() => {
    if (!hasVariants || !product?.skus || Object.keys(selectedOptions).length === 0) {
      setCurrentSKU(null);
      return;
    }

    const selectedOptionIds = Object.values(selectedOptions);
    
    // Find SKU with exact match of selected option_ids
    const matchingSKU = product.skus.find(sku => {
      const skuOptionIds = (sku.option_ids || []).map(String);
      const selectedIds = selectedOptionIds.map(String);
      if (skuOptionIds.length !== selectedOptionIds.length) return false;
      
      // Check if all selected options match SKU options
      return selectedIds.every(id => skuOptionIds.includes(id));
    });

    setCurrentSKU(matchingSKU || null);
  }, [selectedOptions, product?.skus, hasVariants]);

  // Initialize product
  useEffect(() => {
    const initializeProduct = async () => {
      if (!product && id) {
        try {
          const response = await AxiosInstance.get(`/public-products/${id}/`);
          setProduct(response.data);
          
          // Set default selections only if product has variants
          if (response.data.variants?.length) {
            const initial: Record<string, string> = {};
            response.data.variants.forEach((g: VariantGroup) => {
              const firstOption = g.options && g.options[0];
              if (firstOption) initial[g.id] = firstOption.id;
            });
            setSelectedOptions(initial);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else if (product && hasVariants && Object.keys(selectedOptions).length === 0) {
        // If product was loaded from loader data and has variants
        const initial: Record<string, string> = {};
        product.variants!.forEach((g: VariantGroup) => {
          const firstOption = g.options && g.options[0];
          if (firstOption) initial[g.id] = firstOption.id;
        });
        setSelectedOptions(initial);
      }
    };

    initializeProduct();
  }, [id, product, hasVariants]);

  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));

  // Handle option selection (only if product has variants)
  const handleSelectOption = (groupId: string, optionId: string) => {
    const variants = product?.variants || [];
    const groupIndex = variants.findIndex((g) => g.id === groupId);

    const newSelectedOptions: Record<string, string> = { ...selectedOptions, [groupId]: optionId };

    // If the user changes an earlier variant, clear later selections.
    if (groupIndex >= 0) {
      for (let i = groupIndex + 1; i < variants.length; i++) {
        delete newSelectedOptions[variants[i].id];
      }
    }

    setSelectedOptions(newSelectedOptions);
  };

  // Calculate display price and stock based on whether product has variants
  const displayPrice = hasVariants 
    ? safeToNumber(currentSKU?.price ?? product?.price, 0)
    : safeToNumber(product?.price, 0);
  
  const displayComparePrice = hasVariants
    ? (currentSKU?.compare_price !== undefined 
        ? safeToNumber(currentSKU.compare_price) 
        : (product?.compare_price !== undefined ? safeToNumber(product.compare_price) : undefined))
    : (product?.compare_price !== undefined ? safeToNumber(product.compare_price) : undefined);

  const totalSkuStock = safeToNumber(
    product?.skus?.reduce((sum, sku) => sum + safeToNumber(sku.quantity, 0), 0),
    0
  );

  // Stock is always based on ProductSKU.quantity for variant products.
  // If a specific SKU is selected, show that SKU's quantity, else show total across SKUs.
  const displayStock = hasVariants
    ? (currentSKU ? safeToNumber(currentSKU.quantity, 0) : totalSkuStock)
    : safeToNumber(product?.quantity, 0);

  // Calculate max quantity based on stock
  const maxQuantity = hasVariants
    ? (currentSKU ? currentSKU.quantity : totalSkuStock)
    : (product ? product.quantity : 0);

  const selectedChoicesText = hasVariants && product?.variants
    ? product.variants
        .map((group) => {
          const selectedId = selectedOptions[group.id];
          if (!selectedId) return null;
          const opt = group.options.find((o) => o.id === selectedId);
          return opt ? opt.title : null;
        })
        .filter(Boolean)
        .join(' x ')
    : '';

  // Build thumbnail list
  const thumbnailUrls: { url: string; type: 'product' | 'variant' | 'sku'; id?: string }[] = [];
  const seen = new Set<string>();

  // Add product images first
  if (product?.media_files) {
    product.media_files.forEach((img) => {
      const full = resolveImageUrl(img.file_url);
      if (full && !seen.has(full)) {
        thumbnailUrls.push({ url: full, type: 'product' });
        seen.add(full);
      }
    });
  }

  // Add SKU images (for variant products)
  if (product?.skus) {
    product.skus.forEach((sku) => {
      if (sku.image) {
        const full = resolveImageUrl(sku.image);
        if (full && !seen.has(full)) {
          thumbnailUrls.push({ url: full, type: 'sku', id: sku.id });
          seen.add(full);
        }
      }
    });
  }

  // Add variant option images (from SKUs via backend)
  if (product?.variants) {
    product.variants.forEach((group) => {
      group.options.forEach((option) => {
        if (option.image) {
          const full = resolveImageUrl(option.image);
          if (full && !seen.has(full)) {
            thumbnailUrls.push({ url: full, type: 'variant', id: option.id });
            seen.add(full);
          }
        }
      });
    });
  }

  // Determine main display image
  const mainImageFromSKU = currentSKU?.image ? resolveImageUrl(currentSKU.image) : null;
  const displayImageUrl = mainImageFromSKU || 
                         thumbnailUrls[activeImage]?.url || 
                         '/appliances.jpg';

  const handleAddToCart = async () => {
    if (!product || !user?.id) {
      setCartError("Please login to add items to cart");
      return;
    }

    // For variant products, validate all options are selected
    if (hasVariants) {
      const allSelected = product.variants!.every(g => selectedOptions[g.id]);
      if (!allSelected) {
        setCartError("Please select all variant options");
        return;
      }

      if (!currentSKU) {
        setCartError("Please select valid variant options");
        return;
      }
    }

    setAddingToCart(true);
    setCartError(null);

    try {
      const payload: any = {
        user_id: user.id,
        product_id: product.id,
        quantity,
      };

      // Include SKU ID if product has variants
      if (hasVariants && currentSKU) {
        payload.sku_id = currentSKU.id;
      }

      // Include variant selections if product has variants
      if (hasVariants && Object.keys(selectedOptions).length > 0) {
        payload.variant_selection = selectedOptions;
      }

      const response = await AxiosInstance.post("/cart/add/", payload);

      if (response.data.success) {
        alert("Product added to cart!");
      } else {
        setCartError(response.data.error || "Failed to add to cart");
      }
    } catch (err) {
      console.error(err);
      setCartError("An error occurred while adding to cart");
    } finally {
      setAddingToCart(false);
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

  // Get dimensions and weight (use SKU if available, otherwise product level)
  const displayLength = hasVariants
    ? (currentSKU?.length ?? product.length)
    : product.length;
  
  const displayWidth = hasVariants
    ? (currentSKU?.width ?? product.width)
    : product.width;
  
  const displayHeight = hasVariants
    ? (currentSKU?.height ?? product.height)
    : product.height;
  
  const displayWeight = hasVariants
    ? (currentSKU?.weight ?? product.weight)
    : product.weight;
  
  const displayWeightUnit = hasVariants
    ? (currentSKU?.weight_unit ?? product.weight_unit)
    : product.weight_unit;

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">
      <div className="mb-3 text-xs text-gray-500">
        <Breadcrumbs />
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
                      idx < (product.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="ml-1 font-medium">{product.rating?.toFixed(1) || 0}</span>
              </div>
              <span className="text-gray-300">•</span>
              <Link to="#" className="text-blue-600 hover:underline text-sm">
                {product.reviews_count || 0} reviews
              </Link>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">{product.sold || 0} sold</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-orange-600">
                ₱{displayPrice.toFixed(2)}
              </div>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <div className="text-lg text-gray-500 line-through">
                  ₱{displayComparePrice.toFixed(2)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>Stock: {displayStock} {displayStock <= 0 ? "(Out of Stock)" : ""}</div>
              {selectedChoicesText ? (
                <div className="text-sm text-gray-700 ml-4 truncate text-right"><span className="font-medium">Selected variant: </span>{selectedChoicesText}</div>
              ) : null}
            </div>

            <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>

          {/* Variants Section (only show if product has variants) */}
          {hasVariants && product.variants && (
            <div className="space-y-4">
              {product.variants.map((group, groupIndex) => (
                <div key={group.id} className="space-y-2">
                  <Label className="text-sm font-semibold">{group.title}</Label>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedOptions[group.id] === opt.id;

                      // Require previous variants selected (Variant 2 depends on Variant 1, etc.)
                      const previousSelected = product.variants!
                        .slice(0, groupIndex)
                        .every((g) => !!selectedOptions[g.id]);

                      const availableSet = product.skus
                        ? getAvailableOptionIdsForGroup(product.skus, selectedOptions, group.id)
                        : new Set<string>();

                      const isAvailable = previousSelected && availableSet.has(String(opt.id));
                      
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(group.id, opt.id)}
                          disabled={!isAvailable}
                          className={`flex items-center gap-2 p-3 border rounded-md ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50' 
                              : isAvailable
                                ? 'border-gray-200 hover:bg-gray-50'
                                : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium">{opt.title}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
            
            {cartError && (
              <div className="text-xs text-red-500 bg-red-50 p-1.5 rounded">
                {cartError}
              </div>
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
                {product.shop.avg_rating !== undefined && (
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

      {/* Product/SKU Details */}
      <div className="mt-6 border-t pt-4">
        <h2 className="text-lg font-semibold mb-3">Product Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="font-medium">SKU Code:</div>
              <div className="text-sm text-gray-600">
                {hasVariants 
                  ? (currentSKU?.sku_code || "No SKU Code") 
                  : "Standard Product (No SKU)"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="font-medium">Price:</div>
              <div className="text-lg font-semibold text-orange-600">₱{displayPrice.toFixed(2)}</div>
            </div>
            {displayComparePrice && (
              <div className="flex items-center gap-2">
                <div className="font-medium">Compare Price:</div>
                <div className="text-sm text-gray-500 line-through">₱{displayComparePrice.toFixed(2)}</div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="font-medium">Stock:</div>
              <div className="text-sm text-gray-600">{displayStock} units</div>
            </div>
          </div>
          
          {/* Physical Dimensions */}
          {(displayLength || displayWidth || displayHeight || displayWeight) && (
            <div className="space-y-2">
              <div className="font-medium mb-2">Physical Properties:</div>
              {displayLength && displayWidth && displayHeight && (
                <div className="text-sm text-gray-600">
                  Dimensions: {displayLength} × {displayWidth} × {displayHeight} cm
                </div>
              )}
              {displayWeight && (
                <div className="text-sm text-gray-600">
                  Weight: {displayWeight} {displayWeightUnit || 'kg'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Swap Options */}
      {(hasVariants 
        ? (currentSKU && currentSKU.allow_swap)
        : (product.open_for_swap)
      ) && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Swap Options</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div>
              <span className="font-medium">Type:</span>{" "}
              <span className="capitalize">
                {hasVariants 
                  ? currentSKU?.swap_type?.replace('_', ' ') 
                  : product.swap_type?.replace('_', ' ')}
              </span>
            </div>
            {hasVariants ? (
              <>
                {currentSKU?.minimum_additional_payment && currentSKU.minimum_additional_payment > 0 && (
                  <div>
                    <span className="font-medium">Minimum Additional Payment:</span>{" "}
                    ₱{safeToNumber(currentSKU.minimum_additional_payment).toFixed(2)}
                  </div>
                )}
                {currentSKU?.maximum_additional_payment && currentSKU.maximum_additional_payment > 0 && (
                  <div>
                    <span className="font-medium">Maximum Additional Payment:</span>{" "}
                    ₱{safeToNumber(currentSKU.maximum_additional_payment).toFixed(2)}
                  </div>
                )}
                {currentSKU?.swap_description && (
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    {currentSKU.swap_description}
                  </div>
                )}
              </>
            ) : (
              <>
                {product.minimum_additional_payment && product.minimum_additional_payment > 0 && (
                  <div>
                    <span className="font-medium">Minimum Additional Payment:</span>{" "}
                    ₱{safeToNumber(product.minimum_additional_payment).toFixed(2)}
                  </div>
                )}
                {product.maximum_additional_payment && product.maximum_additional_payment > 0 && (
                  <div>
                    <span className="font-medium">Maximum Additional Payment:</span>{" "}
                    ₱{safeToNumber(product.maximum_additional_payment).toFixed(2)}
                  </div>
                )}
                {product.swap_description && (
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    {product.swap_description}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}