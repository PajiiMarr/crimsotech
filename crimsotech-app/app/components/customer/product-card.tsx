import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Link } from "react-router";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  image?: string;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`} className="block group">
      <Card className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm p-2 pb-3 transition-transform duration-200 group-hover:scale-[1.03] cursor-pointer">
        <div className="relative w-full overflow-hidden rounded-t-lg h-40">
          <img
            src={product.image || "/default.jpg"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {product.discount && (
            <span className="absolute top-2 left-2 rounded-full bg-black px-2 text-xs font-medium text-white">
              {product.discount}% OFF
            </span>
          )}
        </div>

        <CardHeader className="px-3 pt-1 pb-1">
          <CardTitle className="text-sm font-semibold text-slate-900">{product.name}</CardTitle>
          <CardDescription className="text-gray-500 text-xs mt-1">{product.description}</CardDescription>
        </CardHeader>

        <CardContent className="px-3 pt-0 pb-1">
          <div className="flex items-center justify-between">
            <p>
              <span className="text-base font-bold text-slate-900">₱{product.price}</span>{" "}
              {product.original_price && (
                <span className="text-xs text-slate-400 line-through">₱{product.original_price}</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
