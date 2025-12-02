import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Link } from "react-router"; // or "@remix-run/react"
import { Button } from "~/components/ui/button";
import { Gift } from "lucide-react";

export function GiftProductCard() {
  return (
    <Card className="relative w-64 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md p-0 pb-2 transition-transform duration-200 group-hover:scale-[1.02]">
      
      {/* Gift badge */}
      <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-pink-600 px-2 py-0.5 text-xs font-semibold text-white shadow-md z-20">
        <Gift className="h-3 w-3" />
        Gift
      </span>

      {/* Product image */}
      <div className="relative w-full overflow-hidden rounded-t-lg h-40">
        <img
          src="/power_supply.jpg"
          alt="gift product"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* Product title & description */}
      <CardHeader className="px-3 pt-1 pb-1">
        <CardTitle className="text-sm font-semibold text-slate-900">
          Samsung Fast Charger — White
        </CardTitle>
        <CardDescription className="text-gray-500 text-xs mt-1">
          Perfect as a gift for any occasion!
        </CardDescription>
      </CardHeader>

      {/* Free mark and Claim button */}
      <CardContent className="px-3 pt-0 pb-3 flex flex-col gap-2">
        <span className="text-sm font-semibold text-green-600">Free</span>
        <Link to="/orders">
          <Button variant="default" className="w-full text-sm font-medium">
            Claim
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
