import type { Route } from './+types/shop-list';
import { useFetcher } from "react-router";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { useNavigate, Link, data } from "react-router";

import AxiosInstance from '~/components/axios/Axios';
import { 
  AlertCircle, 
  Plus, 
  Store, 
  Calendar, 
  ArrowRight, 
  RefreshCw,
  ShoppingBag
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

// ================================
// Meta function - page title
// ================================
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shops",
    },
  ];
}

// ================================
// Loader function
// ================================
export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  // Apply the middleware
  const middlewareResult = await registrationMiddleware({ 
    request, 
    context, 
    params: {}, 
    unstable_pattern: undefined 
  } as any);

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  // Clear shop_id from session when loading shop-list
  session.unset("shopId");

  // Fetch shops from the API in the loader
  let shops = [];
  try {
    const response = await AxiosInstance.get('/customer-shops/', {
      params: { customer_id: user.user_id }
    });
    if (response.data.success) {
      shops = response.data.shops || [];
    }
  } catch (error) {
    console.error("Error fetching shops in loader:", error);
    shops = [];
  }

  return data({ user, shops }, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();
  const shopId = formData.get("shopId") as string;
  const intent = formData.get("intent") as string;

  if (intent === "selectShop" && shopId) {
    session.set("shopId", shopId);
    
    // Use redirect instead of returning data
    return new Response(null, {
      status: 302,
      headers: {
        "Set-Cookie": await commitSession(session),
        "Location": "/seller/dashboard",
      },
    });
  }

  return data({ success: false }, { status: 400 });
}

// ================================
// Shop type interface
// ================================
interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture: string;
  is_active?: boolean;
  created_at?: string;
}

// ================================
// ShopsContent Component
// ================================
function ShopsContent({ user, shops: initialShops }: { user: any, shops?: Shop[] }) {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>(initialShops || []);
  const [loading, setLoading] = useState(!initialShops);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingShop, setSelectingShop] = useState<string | null>(null);
  
  const fetcher = useFetcher();

  console.log("User object:", user);

  // Function to set shop ID in session and navigate to dashboard
  const handleManageShop = async (shopId: string) => {
    try {
      setSelectingShop(shopId);
      
      // Use fetcher to submit the form
      fetcher.submit(
        { shopId, intent: "selectShop" },
        { method: "POST" }
      );
      
      // The action will handle the redirect automatically
    } catch (error) {
      console.error("Error setting shop session:", error);
      navigate('/seller/dashboard');
    } finally {
      setSelectingShop(null);
    }
  };

  // Function to handle card click
  const handleShopCardClick = async (shopId: string) => {
    await handleManageShop(shopId);
  };

  // Fetch shops
  const fetchShops = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await AxiosInstance.get('/customer-shops/',
        { params: { customer_id: user.user_id } }
      );
      if (response.data.success) {
        setShops(response.data.shops || []);
      } else {
        setShops([]);
        setError("Failed to load shops");
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      setShops([]);
      setError("Error loading shops. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Only fetch if shops weren't provided by loader
  useEffect(() => {
    if (!initialShops || initialShops.length === 0) {
      fetchShops();
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Loading shops...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Shops</h1>
          <p className="text-gray-600 mt-1">
            Manage your shops and start selling your products
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={refreshing}
            className="flex items-center gap-2"
            size="default"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            asChild 
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            size="default"
          >
            <Link to="/create-shop">
              <Plus className="w-4 h-4" />
              Create New Shop
            </Link>
          </Button>
        </div>
      </div>

      {/* Shops list */}
      <div className="space-y-4">
        {shops.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4 max-w-md mx-auto">
                <div className="p-3 bg-muted rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No shops yet
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Create your first shop to start selling products and reach customers.
                  </p>
                </div>
                <Button 
                  asChild 
                  className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                  size="lg"
                >
                  <Link to="/create-shop">
                    <Plus className="w-4 h-4" />
                    Create Your First Shop
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          shops.map(shop => (
            <Card
              key={shop.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleShopCardClick(shop.id)}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-lg truncate">
                      {shop.name}
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {shop.description}
                    </div>
                    {shop.created_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        Created: {new Date(shop.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageShop(shop.id);
                  }}
                  disabled={selectingShop === shop.id}
                  className="flex-shrink-0"
                >
                  {selectingShop === shop.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Selecting...
                    </>
                  ) : (
                    "Manage Shop"
                  )}
                </Button>
              </div>
              {shop.is_active === false && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-700 text-sm">
                    This shop is currently inactive
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      {shops.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total shops: <span className="font-semibold">{shops.length}</span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ================================
// Default component
// ================================
export default function Shops({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;
  const shops = loaderData.shops || [];
  
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <ShopsContent user={user} shops={shops} />
      </SidebarLayout>
    </UserProvider>
  );
}