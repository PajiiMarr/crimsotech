import type { Route } from './+types/seller-vouchers';
import SidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { useState } from 'react';
import { 
  Calendar,
  PhilippinePeso,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Copy,
  Edit,
  Tag,
  Percent,
  Ticket,
  List,
  Plus,
  Store,
  Package
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "My Vouchers",
    },
  ];
}

// Interface for vouchers
interface Voucher {
  id: string;
  shop: {
    id: string;
    name: string;
  };
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minimum_spend: number;
  maximum_usage: number;
  current_usage: number;
  valid_until: string;
  added_at: string;
  created_by: {
    id: string;
    name: string;
  };
  is_active: boolean;
  description?: string;
  applicable_categories?: string[];
  usage_count?: number;
  total_discount_given?: number;
  voucher_type: 'shop' | 'product'; // Added voucher type
}

// Loader function for UI demo
export async function loader({ request, context }: Route.LoaderArgs) {
  const vouchers: Voucher[] = [
    {
      id: "voucher-001",
      shop: {
        id: "shop-001",
        name: "TechGadgets Store"
      },
      name: "Welcome Discount",
      code: "WELCOME10",
      discount_type: "percentage",
      value: 10,
      minimum_spend: 500,
      maximum_usage: 1000,
      current_usage: 245,
      valid_until: "2024-12-31",
      added_at: "2024-01-01",
      created_by: {
        id: "seller-001",
        name: "Jane Seller"
      },
      is_active: true,
      voucher_type: "shop",
      description: "Welcome discount for new customers"
    },
    {
      id: "voucher-002",
      shop: {
        id: "shop-001",
        name: "TechGadgets Store"
      },
      name: "Flash Sale",
      code: "FLASH50",
      discount_type: "fixed",
      value: 50,
      minimum_spend: 1000,
      maximum_usage: 500,
      current_usage: 500,
      valid_until: "2024-01-31",
      added_at: "2024-01-15",
      created_by: {
        id: "seller-001",
        name: "Jane Seller"
      },
      is_active: true,
      voucher_type: "product",
      description: "Limited time flash sale discount"
    },
    {
      id: "voucher-003",
      shop: {
        id: "shop-001",
        name: "TechGadgets Store"
      },
      name: "Free Shipping",
      code: "FREESHIP",
      discount_type: "free_shipping",
      value: 0,
      minimum_spend: 1500,
      maximum_usage: 0,
      current_usage: 189,
      valid_until: "2024-03-31",
      added_at: "2024-01-10",
      created_by: {
        id: "seller-001",
        name: "Jane Seller"
      },
      is_active: true,
      voucher_type: "shop",
      description: "Free shipping for orders above ₱1500"
    },
    {
      id: "voucher-004",
      shop: {
        id: "shop-001",
        name: "TechGadgets Store"
      },
      name: "Summer Sale",
      code: "SUMMER20",
      discount_type: "percentage",
      value: 20,
      minimum_spend: 2000,
      maximum_usage: 200,
      current_usage: 200,
      valid_until: "2024-02-15",
      added_at: "2024-01-05",
      created_by: {
        id: "seller-001",
        name: "Jane Seller"
      },
      is_active: false,
      voucher_type: "product",
      description: "Summer sale discount"
    },
    {
      id: "voucher-005",
      shop: {
        id: "shop-001",
        name: "TechGadgets Store"
      },
      name: "New Year Special",
      code: "NY2024",
      discount_type: "fixed",
      value: 100,
      minimum_spend: 2000,
      maximum_usage: 300,
      current_usage: 300,
      valid_until: "2024-01-10",
      added_at: "2023-12-20",
      created_by: {
        id: "seller-001",
        name: "Jane Seller"
      },
      is_active: false,
      voucher_type: "shop",
      description: "New Year special discount"
    },
    {
      id: "voucher-006",
      shop: {
        id: "shop-001",
        name: "TechGadgets Store"
      },
      name: "Mobile Discount",
      code: "MOBILE15",
      discount_type: "percentage",
      value: 15,
      minimum_spend: 3000,
      maximum_usage: 150,
      current_usage: 67,
      valid_until: "2024-06-30",
      added_at: "2024-01-20",
      created_by: {
        id: "seller-001",
        name: "Jane Seller"
      },
      is_active: true,
      voucher_type: "product",
      description: "Discount on mobile devices"
    }
  ];

  return {
    user: {
      id: "demo-seller-123",
      name: "Jane Seller",
      email: "seller@example.com",
      isCustomer: false,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: true,
      username: "jane_seller",
    },
    vouchers
  };
}

// Empty state components
const EmptyTable = ({ message = "No vouchers found" }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <Ticket className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        Create your first voucher to attract more customers and boost sales.
      </p>
    </div>
  </div>
);

// Tabs configuration
const TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'shop', label: 'Shop Vouchers', icon: Store },
  { id: 'product', label: 'Product Vouchers', icon: Package },
  { id: 'active', label: 'Active', icon: CheckCircle },
  { id: 'expired', label: 'Expired', icon: XCircle }
];

export default function SellerVouchers({ loaderData }: Route.ComponentProps) {
  const { user, vouchers } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Filter vouchers based on active tab and search
  const getFilteredVouchers = () => {
    // First filter by search term
    let filtered = vouchers.filter(voucher => {
      const searchLower = searchTerm.toLowerCase();
      return (
        voucher.name?.toLowerCase().includes(searchLower) ||
        voucher.code?.toLowerCase().includes(searchLower) ||
        voucher.description?.toLowerCase().includes(searchLower)
      );
    });

    // Then filter by active tab
    if (activeTab !== 'all') {
      if (activeTab === 'shop') {
        filtered = filtered.filter(voucher => voucher.voucher_type === 'shop');
      } else if (activeTab === 'product') {
        filtered = filtered.filter(voucher => voucher.voucher_type === 'product');
      } else if (activeTab === 'active') {
        filtered = filtered.filter(voucher => voucher.is_active && new Date(voucher.valid_until) > new Date());
      } else if (activeTab === 'expired') {
        filtered = filtered.filter(voucher => new Date(voucher.valid_until) < new Date());
      }
    }

    return filtered;
  };

  const filteredVouchers = getFilteredVouchers();

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount).replace('PHP', '₱');
  };

  const getDiscountDisplay = (voucher: Voucher) => {
    switch(voucher.discount_type) {
      case 'percentage':
        return `${voucher.value}%`;
      case 'fixed':
        return formatCurrency(voucher.value);
      case 'free_shipping':
        return 'Free Shipping';
      default:
        return 'Unknown';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  const viewVoucherDetails = (voucherId: string) => {
    alert(`Viewing details for voucher ${voucherId}`);
    // In real app: navigate(`/seller/vouchers/${voucherId}`);
  };

  const createShopVoucher = () => {
    alert('Creating shop voucher');
    // In real app: navigate('/seller/vouchers/create/shop');
  };

  const createProductVoucher = () => {
    alert('Creating product voucher');
    // In real app: navigate('/seller/vouchers/create/product');
  };

  const isVoucherExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Vouchers</h1>
              <p className="text-gray-600 mt-1">Manage your discount vouchers and promotions</p>
            </div>
          </div>

          {/* Create Voucher Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors cursor-pointer hover:bg-blue-50" onClick={createShopVoucher}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-blue-100 rounded-full mb-4">
                    <Store className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Shop Voucher</h3>
                  <p className="text-gray-600 mb-4">
                    Create a voucher that applies to your entire shop
                  </p>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Shop Voucher
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors cursor-pointer hover:bg-green-50" onClick={createProductVoucher}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-green-100 rounded-full mb-4">
                    <Package className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Product Voucher</h3>
                  <p className="text-gray-600 mb-4">
                    Create a voucher for specific products or categories
                  </p>
                  <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4" />
                    Create Product Voucher
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs Navigation */}
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tab.id === 'all' ? vouchers.length :
                            tab.id === 'shop' ? vouchers.filter(v => v.voucher_type === 'shop').length :
                            tab.id === 'product' ? vouchers.filter(v => v.voucher_type === 'product').length :
                            tab.id === 'active' ? vouchers.filter(v => v.is_active && new Date(v.valid_until) > new Date()).length :
                            tab.id === 'expired' ? vouchers.filter(v => new Date(v.valid_until) < new Date()).length : 0;

                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-3 ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Search Bar */}
          {/* <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search vouchers by name, code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card> */}

          {/* Vouchers Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                {activeTab === 'all' && 'All Vouchers'}
                {activeTab === 'shop' && 'Shop Vouchers'}
                {activeTab === 'product' && 'Product Vouchers'}
                {activeTab === 'active' && 'Active Vouchers'}
                {activeTab === 'expired' && 'Expired Vouchers'}
              </CardTitle>
              <CardDescription>
                {filteredVouchers.length} voucher{filteredVouchers.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVouchers.length === 0 ? (
                <EmptyTable 
                  message={
                    activeTab === 'shop' ? 'No shop vouchers found' :
                    activeTab === 'product' ? 'No product vouchers found' :
                    activeTab === 'active' ? 'No active vouchers found' :
                    activeTab === 'expired' ? 'No expired vouchers found' :
                    'No vouchers found'
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Voucher</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Code</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Discount</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Valid Until</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredVouchers.map((voucher) => {
                          const isExpired = isVoucherExpired(voucher.valid_until);
                          
                          return (
                            <tr key={voucher.id} className="hover:bg-gray-50">
                              <td className="p-3 text-sm">
                                <div className="font-medium">{voucher.name}</div>
                                {voucher.description && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {voucher.description}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">
                                    {voucher.code}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(voucher.code)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                <Badge 
                                  variant="secondary"
                                  className={`text-xs ${voucher.voucher_type === 'shop' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                                >
                                  {voucher.voucher_type === 'shop' ? 'Shop' : 'Product'}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="font-medium">{getDiscountDisplay(voucher)}</div>
                                {voucher.minimum_spend > 0 && (
                                  <div className="text-xs text-gray-500">
                                    Min. spend: ₱{voucher.minimum_spend}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span className={isExpired ? 'text-red-600' : ''}>
                                    {formatDate(voucher.valid_until)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                {voucher.is_active && !isExpired ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Expired
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => viewVoucherDetails(voucher.id)}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}