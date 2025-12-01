// app/routes/view-product.tsx
import {
  Star,
  Share2,
  Minus,
  Plus,
  Flag,
  ChevronLeft,
  ChevronRight,
  ShoppingBagIcon
} from "lucide-react";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import Breadcrumbs from "~/components/ui/breadcrumbs";
import AxiosInstance from "~/components/axios/Axios";

import type { Route } from './+types/view-product'

export function meta(): Route.MetaDescriptors {
  return [{ title: "Product Details" }];
}

// ----------------------------
// Product type
// ----------------------------
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  discount?: number;
  category?: { name: string };
  shop?: { shop_picture?: string, name?: string };
  media_files?: { file_url: string }[];
  sold?: number;
  reviews_count?: number;
  rating?: number;
}

export default function ViewProduct() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const response = await AxiosInstance.get(`/public-products/${id}/`);
        setProduct(response.data);
      } catch (err) {
        console.error("Error fetching product:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading product...</div>;
  if (!product) return <div className="p-6 text-center text-red-500">Product not found</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      <Separator />

      {/* Category Name */}
      <div className="text-sm text-gray-500">
        Category: {product.category?.name || "Uncategorized"}
      </div>

      <div className="grid items-start gap-8 md:grid-cols-2 lg:gap-12">
        {/* Image Gallery */}
        <div className="grid gap-4 md:grid-cols-[100px_1fr] lg:grid-cols-[120px_1fr]">
          <div className="hidden flex-col gap-4 md:flex">
            {(product.media_files || []).map((file, idx) => (
              <button key={idx} className="overflow-hidden rounded-lg border transition-colors hover:border-gray-900">
                <img
                  src={file.file_url || "/public/default.jpg"}
                  alt={`Thumbnail ${idx + 1}`}
                  className="aspect-4/3 object-cover"
                />
                <span className="sr-only">View Image {idx + 1}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <img
              src={product.media_files?.[0]?.file_url || product.shop?.shop_picture || "/public/default.jpg"}
              alt={product.name}
              className="aspect-4/3 h-[410px] w-full rounded-lg border object-cover"
            />
            {product.discount && (
              <div className="absolute top-4 left-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                {product.discount}% OFF
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Previous image</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white">
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Next image</span>
            </Button>
          </div>
        </div>

        {/* Product Details */}
        <div className="grid gap-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-extrabold text-gray-900">{product.name}</h1>
            <div className="flex gap-1.5">
              <button className="p-1.5 rounded-full hover:bg-gray-100 transition">
                <Share2 className="h-4 w-4 text-gray-700" />
              </button>
              <button className="p-1.5 rounded-full hover:bg-red-100 transition">
                <Flag className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={`h-4 w-4 ${idx < (product.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
                />
              ))}
            </div>
            <span className="font-semibold text-gray-900">{product.rating?.toFixed(1) || 0}</span>
            <span className="text-gray-400">•</span>
            <Link to="#" className="hover:underline cursor-pointer text-gray-600">
              {product.reviews_count || 0} reviews
            </Link>
            <span className="text-gray-400">•</span>
            <span>{product.sold || 0} sold</span>
          </div>

          <Separator />

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-orange-600">₱{product.price}</span>
            {product.original_price && (
              <span className="text-xl text-gray-500 line-through">₱{product.original_price}</span>
            )}
            {product.discount && <span className="text-sm text-red-600 font-medium ml-2">({product.discount}% OFF)</span>}
          </div>

          <div className="text-sm text-gray-500">{product.sold || 0} products sold out</div>

          <Separator />

          <div className="grid gap-4">
            {/* Size selector etc... */}
            {/* You can dynamically load sizes if your API supports it */}
          </div>
        </div>
      </div>

      <Separator />

      {/* Shop Info */}
      <div className="flex items-start justify-between p-4 border rounded-xl bg-gray-50 shadow-sm">
        <div className="flex gap-4">
          <img
            src={product.shop?.shop_picture || "https://placehold.co/80x80?text=Shop"}
            alt="Shop Profile"
            className="w-16 h-16 rounded-full object-cover border"
          />
          <div className="grid gap-1">
            <h1 className="text-xl font-bold text-gray-900">{product.shop?.name || "Unknown Shop"}</h1>
          </div>
        </div>
        <Button className="rounded-md px-5 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white">
          Visit Shop
        </Button>
      </div>

      <Separator />

      {/* Product Description */}
      <div className="grid gap-2">
        <h2 className="text-xl font-bold text-gray-900">Product Description</h2>
        <p className="text-gray-700 text-sm leading-relaxed">{product.description}</p>
      </div>
    </div>
  );
}
