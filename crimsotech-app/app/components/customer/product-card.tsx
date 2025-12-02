// ~/components/customer/product-card.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Link } from "react-router";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  discount?: number;
  // Add image property here
  image?: string;
  media_files?: Array<{
    id: string;
    file_data: string;
    file_type: string;
    product: string;
  }>;
  primary_image?: {
    id: string;
    url: string;
    file_type: string;
  } | null;
}

interface ProductCardProps {
  product: Product;
}

// Helper function to get the product image URL
// In product-card.tsx, update the getProductImage function:

const getProductImage = (product: Product): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  
  // Priority 1: Use the image property if it exists
  if (product.image) {
    const url = product.image;
    // Handle different URL formats
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
  
  // Priority 2: Use primary_image if available
  if (product.primary_image?.url) {
    const url = product.primary_image.url;
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
  
  // Priority 3: Use first media file if available
  if (product.media_files && product.media_files.length > 0) {
    const media = product.media_files[0];
    const url = media.file_data;
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
  
  // Fallback to default image
  return "/default-product.jpg";
};

export function ProductCard({ product }: ProductCardProps) {
  const productImage = getProductImage(product);
  
  return (
    <Link to={`/product/${product.id}`} className="block group">
      <Card className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm p-2 pb-3 transition-transform duration-200 group-hover:scale-[1.03] cursor-pointer">
        <div className="relative w-full overflow-hidden rounded-t-lg h-40">
          <img
            src={productImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            // onError={(e) => {
            //   e.currentTarget.src = "/default.jpg";
            // }}
          />
          {product.discount && (
            <span className="absolute top-2 left-2 rounded-full bg-black px-2 text-xs font-medium text-white">
              {product.discount}% OFF
            </span>
          )}
        </div>

        <CardHeader className="px-3 pt-1 pb-1">
          <CardTitle className="text-sm font-semibold text-slate-900 truncate">
            {product.name}
          </CardTitle>
          <CardDescription className="text-gray-500 text-xs mt-1 line-clamp-2">
            {product.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-3 pt-0 pb-1">
          <div className="flex items-center justify-between">
            <p>
              <span className="text-base font-bold text-slate-900">
                ₱{parseFloat(product.price.toString()).toFixed(2)}
              </span>
              {product.original_price && (
                <span className="text-xs text-slate-400 line-through ml-2">
                  ₱{parseFloat(product.original_price.toString()).toFixed(2)}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}