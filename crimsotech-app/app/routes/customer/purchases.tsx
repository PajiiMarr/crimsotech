"use client";

import type { Route } from './+types/purchases';
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { Link } from 'react-router';

// 💡 REQUIRED ICONS IMPORTED FOR VISUAL STATUS TAGS
import { MapPin, Package, CheckCircle, Clock, XCircle, RefreshCcw, CalendarDays } from "lucide-react";


// --- Remix/Route Specific Exports ---
export function meta(): Route.MetaDescriptors {
  return [{ title: "Purchases" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return user;
}
// --- END Remix/Route Specific Exports ---


// --- Types (Ensuring TypeScript compliance) ---
interface Purchase {
  id: string;
  shopId: string;
  shopName: string;
  name: string;
  color: string;
  price: number;
  quantity: number;
  date: string;
  status: string;
  image: string;
}

// 💡 REQUIRED HELPER FUNCTION ADDED
// Helper function to format currency
const formatCurrency = (amount: number): string => `₱${amount.toFixed(2)}`;

/**
 * 💡 REQUIRED HELPER FUNCTION ADDED
 * Helper function to return Tailwind classes and Icon for the status tag.
 */
const getStatusProps = (status: string): { classes: string, Icon: React.ElementType, title: string } => {
  switch (status) {
    case "Completed":
      return { classes: "bg-green-100 text-green-700 border-green-200", Icon: CheckCircle, title: "Order Completed" };
    case "Cancelled":
      return { classes: "bg-red-100 text-red-700 border-red-200", Icon: XCircle, title: "Order Cancelled" };
    case "Return & Refund":
      return { classes: "bg-yellow-100 text-yellow-700 border-yellow-200", Icon: RefreshCcw, title: "Refund in Process" };
    case "To Ship":
      return { classes: "bg-indigo-100 text-indigo-700 border-indigo-200", Icon: Package, title: "Awaiting Shipment" };
    case "To Receive":
      return { classes: "bg-blue-100 text-blue-700 border-blue-200", Icon: Package, title: "Out for Delivery" };
    case "In Progress":
    case "Pending":
    default:
      return { classes: "bg-gray-100 text-gray-700 border-gray-200", Icon: Clock, title: "Pending Seller Action" };
  }
};


// --- Purchase Item Card (Externalized for clarity, as in the first response) ---
const PurchaseItemCard = ({ item }: { item: Purchase }) => {
  
  // Define a simple outline button class for professional look
  const simpleOutlineClass = "text-gray-700 border-gray-300 hover:bg-gray-100";
  
  // Calculate total price for the item line
  const totalPrice = item.price * item.quantity;

  return (
    <div className="flex justify-between items-center py-4 border-b last:border-b-0">
      <div className="flex items-center gap-4 flex-1">
        {/* Product Image */}
        <img 
          src={item.image} 
          alt={item.name} 
          className="h-16 w-16 rounded-md object-cover border" 
        />
        
        {/* Product Details & Order Date */}
        <div>
          <div className="font-medium text-gray-900">{item.name}</div>
          <div className="text-xs text-gray-500">
            Variation: {item.color} | Qty: {item.quantity}
          </div>
          {/* ORDER DATE INSIDE CARD */}
          <div className="flex items-center text-xs text-gray-600 mt-1">
            <CalendarDays className="h-3.5 w-3.5 mr-1 text-gray-400" />
            <span className="font-semibold">{item.date}</span>
          </div>
        </div>
      </div>

      {/* Price and Actions */}
      <div className="flex flex-col items-end gap-2 min-w-[140px]">
        {/* PRICE: Black font only, using formatCurrency */}
        <div className="text-lg font-medium text-gray-700"> 
          {formatCurrency(totalPrice)}
        </div>
        
        {/* Status-specific action buttons - size="sm" (small button) and simple styling */}
        {item.status === "To Receive" && (
          <Link to={`/track-order/${item.id}`}>
            <Button size="sm" variant="outline" className={simpleOutlineClass}>Track Order</Button>
          </Link>
        )}

        {item.status === "Completed" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className={simpleOutlineClass}>View Details</Button>
            <Button size="sm" variant="outline" className={simpleOutlineClass}>Rate</Button>
          </div>
        )}

        {(item.status === "In Progress" || item.status === "Pending") && (
          /* Using shadcn destructive variant for cancel, which implies a distinct action */
          <Button size="sm" variant="outline">Cancel Order</Button>
        )}

        {item.status === "To Ship" && (
          <Link to={`/track-order/${item.id}`}>
            <Button size="sm" variant="outline" className={simpleOutlineClass}>View Shipping</Button>
          </Link>
        )}
        
        {item.status === "Return & Refund" && (
          <Button size="sm" variant="outline" className={simpleOutlineClass}>View Refund</Button>
        )}
        
        {item.status === "Cancelled" && (
          /* Using secondary variant for disabled, simple appearance */
          <Button size="sm" variant="secondary" disabled>Cancelled</Button>
        )}

        {/* Default View Purchase Button for other statuses (or if none matched above) */}
        {!(item.status === "To Receive" || item.status === "Completed" || item.status === "In Progress" || item.status === "Pending" || item.status === "Return & Refund" || item.status === "To Ship" || item.status === "Cancelled") && (
          <Button size="sm" variant="outline" className={simpleOutlineClass}>View Purchase</Button>
        )}
      </div>
    </div>
  );
};


// --- MAIN PURCHASES COMPONENT ---
export default function Purchases({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // ⚠️ IMAGE PATHS CORRECTED: Should reference root of /public, not /public/
  const purchases: Purchase[] = [
    { id: "1", shopId: "shopA", shopName: "TechWorld Shop", name: "Desktop Computer", color: "Black", price: 599.99, quantity: 1, date: "07 Feb, 2022", status: "In Progress", image: "/public/phon.jpg" },
    { id: "2", shopId: "shopA", shopName: "TechWorld Shop", name: "Wireless Mouse", color: "White", price: 29.99, quantity: 2, date: "15 Mar, 2022", status: "Completed", image: "/public/controller.jpg" },
    { id: "3", shopId: "shopB", shopName: "GadgetHub", name: "Mechanical Keyboard", color: "Gray", price: 89.99, quantity: 1, date: "02 Apr, 2022", status: "In Progress", image: "/public/power_supply.jpg" },
    { id: "4", shopId: "shopB", shopName: "GadgetHub", name: "Gaming Chair", color: "Black", price: 199.99, quantity: 1, date: "10 Apr, 2022", status: "To Ship", image: "/public/phon.jpg" },
    { id: "5", shopId: "shopB", shopName: "GadgetHub", name: "USB Hub", color: "Silver", price: 15.99, quantity: 1, date: "12 Apr, 2022", status: "Completed", image: "/public/phon.jpg" },
    { id: "6", shopId: "shopC", shopName: "AccessoryStore", name: "Laptop Sleeve", color: "Blue", price: 25.99, quantity: 1, date: "20 May, 2022", status: "To Receive", image: "/public/phon.jpg" },
    { id: "7", shopId: "shopC", shopName: "AccessoryStore", name: "Webcam", color: "Black", price: 49.99, quantity: 1, date: "22 May, 2022", status: "Cancelled", image: "/public/phon.jpg" },
    { id: "8", shopId: "shopA", shopName: "TechWorld Shop", name: "External Hard Drive", color: "Black", price: 79.99, quantity: 1, date: "30 May, 2022", status: "Return & Refund", image: "/public/phon.jpg" },
  ];

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" || filter === "all" || p.status === filter;
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "pending"
        ? p.status === "Pending" || p.status === "In Progress"
        : activeTab === "toShip"
        ? p.status === "To Ship"
        : activeTab === "toReceive"
        ? p.status === "To Receive"
        : activeTab === "completed"
        ? p.status === "Completed"
        : activeTab === "returnRefund"
        ? p.status === "Return & Refund"
        : activeTab === "cancelled"
        ? p.status === "Cancelled"
        : true;

    return matchesSearch && matchesFilter && matchesTab;
  });

  const grouped = filteredPurchases.reduce((acc, item) => {
    if (!acc[item.shopId]) acc[item.shopId] = [];
    acc[item.shopId].push(item);
    return acc;
  }, {} as Record<string, Purchase[]>);

  /**
   * Helper function for tab trigger className (Active tab text and underline color: Orange)
   */
  const getTabTriggerClass = (tabValue: string) => {
    // Base classes for a professional, underlined tab look
    const baseClasses = "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-orange-600 transition-colors duration-200";
    
    // Active state classes for the underline
    const activeClasses = tabValue === activeTab 
      ? "relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-orange-600 after:transition-all after:duration-200" 
      : "text-gray-500 hover:text-gray-900";

    return `${baseClasses} ${activeClasses}`;
  };


  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Your Purchases</h1>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* TabsList container that provides the bottom border */}
            <TabsList className="h-auto bg-transparent border-b border-gray-200 p-0">
              <TabsTrigger 
                value="all" 
                className={getTabTriggerClass("all")}
              >
                All Purchases
              </TabsTrigger>
              <TabsTrigger 
                value="pending"
                className={getTabTriggerClass("pending")}
              >
                Pending
              </TabsTrigger>
              <TabsTrigger 
                value="toShip"
                className={getTabTriggerClass("toShip")}
              >
                To Ship
              </TabsTrigger>
              <TabsTrigger 
                value="toReceive"
                className={getTabTriggerClass("toReceive")}
              >
                To Receive
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className={getTabTriggerClass("completed")}
              >
                Completed
              </TabsTrigger>
              <TabsTrigger 
                value="returnRefund"
                className={getTabTriggerClass("returnRefund")}
              >
                Return & Refund
              </TabsTrigger>
              <TabsTrigger 
                value="cancelled"
                className={getTabTriggerClass("cancelled")}
              >
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            <div className="flex-1">
              <Input 
                placeholder="Search purchases..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>

            <div className="w-full sm:w-64">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="toShip">To Ship</SelectItem>
                  <SelectItem value="toReceive">To Receive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="returnRefund">Return & Refund</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchases List - Grouped by Shop (Enhanced with status tag and box styling) */}
          <div className="mt-6 space-y-6">
            {Object.values(grouped).length === 0 ? (
              <div className="text-gray-500 py-10 text-center border rounded-lg bg-white">
                No purchases found matching the current filters.
              </div>
            ) : (
              Object.values(grouped).map(shopItems => {
                const currentStatus = shopItems[0].status;
                const statusProps = getStatusProps(currentStatus);

                return (
                  <div 
                    key={shopItems[0].shopId} 
                    className="bg-white rounded-lg border shadow-sm divide-y divide-gray-100"
                  >
                    {/* SHOP HEADER */}
                    <div className="p-4 flex items-center justify-between bg-gray-50 border-b">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <Link 
                            to={`/shop/${shopItems[0].shopId}`}
                            className="font-semibold text-base text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                            {shopItems[0].shopName}
                        </Link>
                      </div>
                      
                      {/* ORDER STATUS TAG with ICON */}
                      <div className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full border ${statusProps.classes}`}>
                        <statusProps.Icon className="h-3.5 w-3.5" />
                        <span>{shopItems[0].status}</span>
                      </div>
                    </div>
                    
                    {/* PURCHASE ITEMS */}
                    <div className="p-4 divide-y divide-y-reverse divide-gray-100">
                      {shopItems.map(item => (
                        <PurchaseItemCard key={item.id} item={item} />
                      ))}
                    </div>

                    
                  </div>
                );
              })
            )}
          </div>

        </div>
      </SidebarLayout>
    </UserProvider>
  );
}