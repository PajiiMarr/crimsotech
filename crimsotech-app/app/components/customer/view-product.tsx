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
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
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
  quantity?: number;
  price?: number;
  compare_price?: number;
  image_url?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  discount?: number;
  category?: { name: string };
  shop?: {
    shop_picture?: string;
    name?: string;
    address?: string;
    avg_rating?: number;
  };
  media_files?: { file_url: string }[];
  sold?: number;
  reviews_count?: number;
  rating?: number;
  variants?: VariantGroup[];
  open_for_swap?: boolean;
  swap_type?: string;
  minimum_additional_payment?: number;
  maximum_additional_payment?: number;
  swap_description?: string;
  accepted_categories?: { id: string; name: string }[];
  compare_price?: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
}

// ----------------------
// Loader: Fetch product & session
// ----------------------
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

// ----------------------
// Component
// ----------------------
export default function ViewProduct({ loaderData }: Route.ComponentProps) {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(loaderData?.product || null);
  const [loading, setLoading] = useState(!loaderData?.product);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantGroup, setSelectedVariantGroup] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const user = loaderData?.user;

  // If loader did not provide product, fetch it. Also ensure we select defaults when product becomes available.
  useEffect(() => {
    if (!product && id) {
      const fetchProduct = async () => {
        try {
          const response = await AxiosInstance.get(`/public-products/${id}/`);
          setProduct(response.data);

          // default select first variant group and first option (if available)
          if (response.data.variants?.length) {
            const firstGroup = response.data.variants[0];
            setSelectedVariantGroup(firstGroup.id);
            const firstOption = firstGroup.options && firstGroup.options[0];
            if (firstOption) setSelectedOption(firstOption.id);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }

    // If product was provided by the loader or fetched and we don't have selection yet, set defaults
    if (product && !selectedVariantGroup && product.variants?.length) {
      const firstGroup = product.variants[0];
      setSelectedVariantGroup(firstGroup.id);
      const firstOption = firstGroup.options && firstGroup.options[0];
      if (firstOption) setSelectedOption(firstOption.id);
    }
  }, [id, product, selectedVariantGroup]);

  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user?.id) {
      setCartError("Please login to add items to cart");
      return;
    }
    // If product has variants, ensure an option is selected
    if (product.variants && product.variants.length > 0 && !selectedOption) {
      setCartError("Please select a variant option.");
      return;
    }

    setAddingToCart(true);
    setCartError(null);

    try {
      const payload: any = {
        user_id: user.id,
        product_id: product.id,
        quantity,
      };

      // Include selected variant group / option for future backend support
      if (selectedVariantGroup) payload.variant_group_id = selectedVariantGroup;
      if (selectedOption) payload.variant_option_id = selectedOption;

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

  const productImages = product.media_files || [];
  const hasDiscount = product.discount && product.discount > 0;


  // Find selected option object
  const selectedVariantObj = product.variants?.find(g => g.id === selectedVariantGroup) || null;
  const selectedOptionObj: VariantOption | null = selectedVariantObj ? (selectedVariantObj.options?.find(o => o.id === selectedOption) || null) : null;

  // Price display: prefer selected option price if present
  const displayPrice = selectedOptionObj?.price !== undefined ? selectedOptionObj.price : product.price;
  const displayComparePrice = selectedOptionObj?.compare_price !== undefined ? selectedOptionObj.compare_price : (product.compare_price !== undefined ? product.compare_price : product.original_price);

  // Build thumbnail list: include product images first (default cover), then all variant option images (deduped)
  const thumbnailUrls: { url: string; type: 'product' | 'variant'; id?: string }[] = [];
  const seen = new Set<string>();

  // Add product-level images first (these will be the default cover images)
  productImages.forEach((img) => {
    const full = img.file_url && img.file_url.startsWith('http') ? img.file_url : `${MEDIA_URL}${img.file_url}`;
    if (!seen.has(full)) {
      thumbnailUrls.push({ url: full, type: 'product' });
      seen.add(full);
    }
  });

  // Then append all variant option images (deduped) so users can select them
  (product.variants || []).forEach((g) => {
    (g.options || []).forEach((opt) => {
      if (opt.image_url) {
        const full = opt.image_url.startsWith('http') ? opt.image_url : `${MEDIA_URL}${opt.image_url}`;
        if (!seen.has(full)) {
          thumbnailUrls.push({ url: full, type: 'variant', id: opt.id });
          seen.add(full);
        }
      }
    });
  });

  // Determine main display image: prefer the currently active thumbnail (default 0 -> product cover)
  const displayImageUrl = thumbnailUrls[activeImage]?.url || (product.shop?.shop_picture ? `${MEDIA_URL}${product.shop.shop_picture}` : "/public/default.jpg");

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">
      {/* Compact Breadcrumbs */}
      <div className="mb-3 text-xs text-gray-500">
        <Breadcrumbs />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Left: Images - Vertical thumbnails on md+, horizontal strip on small screens */}
        <div className="flex flex-col md:flex-row gap-2 items-start">
          {/* Thumbnails column (left on md+) */}
          {thumbnailUrls.length > 0 && (
            <div className="flex md:flex-col gap-1 md:w-24 md:max-h-[520px] md:overflow-y-auto overflow-x-auto pb-1 md:-mr-1">
              {thumbnailUrls.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveImage(idx);
                    // if this thumbnail corresponds to a variant option, set selection
                    if (t.type === 'variant' && t.id) {
                      setSelectedOption(t.id);
                      // find group containing this option
                      const g = product.variants?.find(g => g.options?.some(o => o.id === t.id));
                      if (g) setSelectedVariantGroup(g.id);
                    }
                  }}
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

          {/* Main Image */}
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

            {product.discount && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                {product.discount}% OFF
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Details - Compact */}
        <div className="space-y-4">
          {/* Product Header - Compact */}
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

            {/* Rating & Stats - Compact */}
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

          {/* Short Description (moved below product name) */}
          {product.description && (
            <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          )}
          </div>

          {/* Variants - Detailed */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Variants</Label>
              <div className="space-y-3">
                {/* Variant price & stock (separate display above the groups) */}
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold">₱{displayPrice}</div>
                  {displayComparePrice && displayComparePrice > displayPrice && (
                    <div className="text-sm text-gray-500 line-through">₱{displayComparePrice}</div>
                  )}
                  <div className="text-sm text-gray-600">Stock: {selectedOptionObj?.quantity ?? 'N/A'}</div>
                </div>
                {product.variants.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="text-sm font-medium">{group.title}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariantGroup(group.id);
                              setSelectedOption(opt.id);
                              // set active thumbnail to this option's image if it exists in the thumbnail list
                              const idx = thumbnailUrls.findIndex(t => t.type === 'variant' && t.id === opt.id);
                              if (idx >= 0) setActiveImage(idx);
                            }}
                            className={`flex items-center gap-3 p-2 border rounded-md text-left ${selectedOption === opt.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}
                          >
                            <div className="text-xs">
                              <div className="font-medium">{opt.title}</div>



                              {/* Stock */}
                              <div className="text-xs text-gray-500 mt-1">{opt.quantity !== undefined ? `${opt.quantity} pcs` : ''}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity - Compact */}
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
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="space-y-2 pt-2">
            <Button
              size="sm"
              className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm font-semibold"
              onClick={() => {
                // Buy Now functionality
                handleAddToCart();
              }}
            >
              Buy Now
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full border-orange-600 text-orange-600 hover:bg-orange-50 h-9 text-sm"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              <ShoppingBagIcon className="h-4 w-4 mr-1.5" />
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
            
            {cartError && (
              <div className="text-xs text-red-500 bg-red-50 p-1.5 rounded">
                {cartError}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Shop Information (moved from right column) */}
      {product.shop ? (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Shop Information</h2>
          <div className="text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <img
                src={product.shop.shop_picture ? `${MEDIA_URL}${product.shop.shop_picture}` : "https://placehold.co/40x40?text=Shop"}
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
              <Link to={`/shop/${product.shop.name}`}>
                <Button size="sm" className="h-7 text-xs px-3 bg-gray-800 hover:bg-gray-900">
                  Visit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Product Description</h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}

      {/* Selected Variant Details */}
      {selectedOptionObj && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Selected Variant</h2>
          <div className="flex gap-4 items-start">
            <div className="h-28 w-28 rounded overflow-hidden bg-gray-100 border">
              <img src={selectedOptionObj.image_url ? (selectedOptionObj.image_url.startsWith('http') ? selectedOptionObj.image_url : `${MEDIA_URL}${selectedOptionObj.image_url}`) : '/public/default.jpg'} alt={selectedOptionObj.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">{selectedOptionObj.title}</div>
              <div className="text-sm text-orange-600 font-semibold">₱{selectedOptionObj.price ?? product.price}</div>
              {selectedOptionObj.compare_price && (
                <div className="text-xs text-gray-500 line-through">₱{selectedOptionObj.compare_price}</div>
              )}

              <div className="mt-2 text-xs text-gray-600">Stock: {selectedOptionObj.quantity ?? 'N/A'}</div>

              <div className="mt-2 text-xs text-gray-600">
                Dimensions: {((selectedOptionObj.length ?? product.length) || 'N/A')} x {((selectedOptionObj.width ?? product.width) || 'N/A')} x {((selectedOptionObj.height ?? product.height) || 'N/A')} cm
              </div>
              <div className="text-xs text-gray-600">Weight: {((selectedOptionObj.weight ?? product.weight) || 'N/A')} {((selectedOptionObj.weight_unit ?? product.weight_unit) || '')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Swap Options */}
      {product.open_for_swap && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Swap Options</h2>
          <div className="text-sm text-gray-700">
            <div>Type: <strong>{product.swap_type}</strong></div>
            <div>Min Additional Payment: ₱{product.minimum_additional_payment ?? 0}</div>
            <div>Max Additional Payment: ₱{product.maximum_additional_payment ?? 0}</div>
            {product.swap_description && <div className="mt-2">{product.swap_description}</div>}
            {product.accepted_categories && product.accepted_categories.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">Accepted categories: {product.accepted_categories.map((c:any) => c.name).join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {/* Stats Row - Bottom */}
      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="border rounded p-2">
          <div className="font-semibold">{product.sold || 0}</div>
          <div className="text-gray-500">Sold</div>
        </div>
        <div className="border rounded p-2">
          <div className="font-semibold">{product.reviews_count || 0}</div>
          <div className="text-gray-500">Reviews</div>
        </div>
        <div className="border rounded p-2">
          <div className="font-semibold">
            {product.discount ? `${product.discount}% OFF` : "No Discount"}
          </div>
          <div className="text-gray-500">Discount</div>
        </div>
      </div>
    </div>
  );
}