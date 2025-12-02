import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Heart } from "lucide-react";

export function FavoriteProductCard() {
  return (
    <Card className="relative w-64 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md p-0 pb-3 transition-transform duration-200 hover:scale-[1.02]">

      {/* Heart icon — favorite */}
      <button className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-md z-20">
        <Heart className="h-5 w-5 text-red-600 fill-red-600" />
      </button>

      {/* Entire clickable part */}
      <Link to="/product/1" className="block group">

        {/* Product image */}
        <div className="relative w-full overflow-hidden rounded-t-lg h-40">
          <img
            src="/power_supply.jpg"
            alt="product image"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />

          {/* Discount badge */}
          <span className="absolute top-2 left-2 rounded-full bg-black px-2 text-xs font-medium text-white">
            39% OFF
          </span>
        </div>

        {/* Product name & desc */}
        <CardHeader className="px-3 pt-2 pb-1">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Nike Air MX Super 2500 - Red
          </CardTitle>
          <CardDescription className="text-gray-500 text-xs mt-1">
            Comfortable and stylish sneakers
          </CardDescription>
        </CardHeader>

        {/* Price & Rating */}
        <CardContent className="px-3 pt-0 pb-2">
          <div className="flex items-center justify-between">
            <p>
              <span className="text-base font-bold text-slate-900">₱449</span>{" "}
              <span className="text-xs text-slate-400 line-through">₱699</span>
            </p>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  aria-hidden="true"
                  className="h-3 w-3 text-yellow-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              ))}
              <span className="ml-1 rounded bg-yellow-200 px-1 py-0.5 text-xs font-semibold">
                5.0
              </span>
            </div>
          </div>
        </CardContent>

      </Link>

      {/* "Find Similar" button inside card */}
      <div className="px-3">
        <Button
          variant="outline"
          className="w-full mt-2 text-sm font-medium"
        >
          Find Similar
        </Button>
      </div>

    </Card>
  );
}
