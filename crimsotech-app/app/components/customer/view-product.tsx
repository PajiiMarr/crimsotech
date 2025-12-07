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

export function meta(): Route.MetaDescriptors {
  return [{ title: "Product Details" }];
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
  variants?: { id: string; name: string }[];
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
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const user = loaderData?.user;

  useEffect(() => {
    if (!product && id) {
      const fetchProduct = async () => {
        try {
          const response = await AxiosInstance.get(`/public-products/${id}/`);
          setProduct(response.data);
          if (response.data.variants?.length) setSelectedVariant(response.data.variants[0].id);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, product]);

  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user?.id) {
      setCartError("Please login to add items to cart");
      return;
    }
    if (!selectedVariant && product.variants?.length) {
      setCartError("Please select a variant.");
      return;
    }

    setAddingToCart(true);
    setCartError(null);

    try {
      const payload = {
        user_id: user.id,
        product_id: product.id,
        quantity,
        variant_id: selectedVariant || null,
      };

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

  const images = product.media_files || [];
  const hasDiscount = product.discount && product.discount > 0;

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">
      {/* Compact Breadcrumbs */}
      <div className="mb-3 text-xs text-gray-500">
        <Breadcrumbs />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Left: Images - Compact Version */}
        <div className="space-y-3">
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-gray-50">
            <img
              src={images[activeImage]?.file_url || product.shop?.shop_picture || "/public/default.jpg"}
              alt={product.name}
              className="h-full w-full object-contain"
            />
            
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 hover:bg-white"
                  onClick={() => setActiveImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 hover:bg-white"
                  onClick={() => setActiveImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
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

          {/* Thumbnail Strip - Horizontal */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`flex-shrink-0 h-16 w-16 overflow-hidden rounded border ${
                    activeImage === idx ? "border-orange-500 border-2" : "border-gray-300"
                  }`}
                >
                  <img
                    src={img.file_url}
                    alt={`Thumb ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
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
          </div>

          <Separator className="my-2" />

          {/* Price - Compact */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-600">₱{product.price}</span>
              {hasDiscount && product.original_price && (
                <>
                  <span className="text-lg text-gray-500 line-through">
                    ₱{product.original_price}
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    Save {product.discount}%
                  </span>
                </>
              )}
            </div>
            {product.category?.name && (
              <div className="text-xs text-gray-500">
                Category: {product.category.name}
              </div>
            )}
          </div>

          {/* Variants - Compact */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Variants</Label>
              <RadioGroup 
                value={selectedVariant || ""} 
                onValueChange={setSelectedVariant}
                className="flex flex-wrap gap-1.5"
              >
                {product.variants.map((variant) => (
                  <div key={variant.id} className="flex items-center space-x-1">
                    <RadioGroupItem value={variant.id} id={variant.id} className="h-3.5 w-3.5" />
                    <Label htmlFor={variant.id} className="text-xs cursor-pointer">
                      {variant.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
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

          {/* Shop Info - Compact */}
          {product.shop && (
            <div className="border rounded p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold">Shop Information</span>
              </div>
              <div className="flex items-start gap-3">
                <img
                  src={product.shop.shop_picture || "https://placehold.co/40x40?text=Shop"}
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
                            className={`h-3 w-3 ${
                              idx < Math.floor(product.shop?.avg_rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
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
          )}
        </div>
      </div>

      {/* Description - Compact */}
      <div className="mt-6 border-t pt-4">
        <h2 className="text-lg font-semibold mb-3">Product Description</h2>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {product.description}
        </div>
      </div>

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