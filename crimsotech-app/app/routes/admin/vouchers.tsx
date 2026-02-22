// app/routes/admin/vouchers.tsx
import type { Route } from './+types/vouchers';
import SidebarLayout from '~/components/layouts/sidebar';
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
import { 
  Plus,
  Download,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Tag,
  User,
  Percent,
  Copy,
  Store,
  PhilippinePeso,
  CalendarIcon,
  AlertCircle
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { useIsMobile } from '~/hooks/use-mobile';
import { Calendar as CalendarComponent } from '~/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import { Switch } from '~/components/ui/switch';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { ScrollArea } from '~/components/ui/scroll-area';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Vouchers | Admin",
    },
  ];
}

// Interface to match Django Voucher model
interface Voucher {
  id: string;
  name: string;
  code: string;
  shop: {
    id: string;
    name: string;
  } | null;
  discount_type: string;
  value: number;
  valid_until: string;
  added_at: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  is_active: boolean;
  status?: string;
  shopName?: string;
  minimum_spend: number;
  maximum_usage: number;
}

interface LoaderData {
  user: any;
  voucherMetrics: {
    total_vouchers: number;
    active_vouchers: number;
    expired_vouchers: number;
    total_usage: number;
    total_discount: number;
  };
  vouchers: Voucher[];
  dateRange: {
    start: string;
    end: string;
    rangeType: string;
  };
  shops: { id: string; name: string }[];
  userId: string | null;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") || null;

  // Parse URL search params for date range
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const rangeTypeParam = url.searchParams.get('rangeType');

  // Set default date range (last 7 days)
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date();
  
  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;
  const rangeType = rangeTypeParam || 'weekly';

  // Validate dates
  const validStart = !isNaN(startDate.getTime()) ? startDate : defaultStart;
  const validEnd = !isNaN(endDate.getTime()) ? endDate : defaultEnd;

  // Initialize empty data structures
  let voucherMetrics = {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  let vouchersList: Voucher[] = [];
  let shopsList: { id: string; name: string }[] = [];

  // Create headers conditionally
  const headers = userId ? { "X-User-Id": userId } : {};

  try {
    // Fetch real data from API with date range parameters
    const metricsResponse = await AxiosInstance.get('/admin-vouchers/get_metrics/', {
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString()
      },
      headers
    });

    if (metricsResponse.data.success) {
      voucherMetrics = metricsResponse.data.metrics || voucherMetrics;
    }

    // Fetch vouchers list from API with date range parameters
    const vouchersResponse = await AxiosInstance.get('/admin-vouchers/vouchers_list/', {
      headers,
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString(),
        page: 1,
        page_size: 50
      }
    });

    if (vouchersResponse.data.success) {
      vouchersList = vouchersResponse.data.vouchers || [];
    }

    // Fetch shops for dropdown
    const shopsResponse = await AxiosInstance.get('/shops/', {
      headers,
      params: {
        page_size: 100
      }
    });

    if (shopsResponse.data && shopsResponse.data.results) {
      shopsList = shopsResponse.data.results.map((shop: any) => ({
        id: shop.id,
        name: shop.name
      }));
    }
  } catch (error) {
    console.log('API fetch failed - no data available');
  }

  return { 
    user, 
    voucherMetrics,
    vouchers: vouchersList,
    shops: shopsList,
    dateRange: {
      start: validStart.toISOString(),
      end: validEnd.toISOString(),
      rangeType
    },
    userId
  };
}

// Empty state components
const EmptyTable = ({ onAddClick }: { onAddClick: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 py-8">
    <div className="text-center text-muted-foreground">
      <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">No vouchers found</h3>
      <p className="text-sm mb-4">Get started by creating your first voucher code.</p>
      <Button onClick={onAddClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4" />
        Create Voucher
      </Button>
    </div>
  </div>
);

// Generate random voucher code
const generateVoucherCode = () => {
  const prefix = 'VOUCH';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
};

// Add Voucher Modal/Drawer Component
interface AddVoucherFormData {
  name: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  value: number | '';
  minimum_spend: number | '';
  maximum_usage: number | '';
  valid_until: Date | undefined;
  shop_id: string | null;
  is_active: boolean;
}

interface AddVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shops: { id: string; name: string }[];
  userId: string | null;
}

const AddVoucherModal = ({ open, onOpenChange, onSuccess, shops, userId }: AddVoucherModalProps) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<AddVoucherFormData>({
    name: '',
    code: generateVoucherCode(),
    description: '',
    discount_type: 'percentage',
    value: '',
    minimum_spend: '',
    maximum_usage: '',
    valid_until: undefined,
    shop_id: null,
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      code: generateVoucherCode(),
      description: '',
      discount_type: 'percentage',
      value: '',
      minimum_spend: '',
      maximum_usage: '',
      valid_until: undefined,
      shop_id: null,
      is_active: true
    });
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      // Allow empty string or valid number
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setFormData(prev => ({
            ...prev,
            [name]: numValue
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      valid_until: date
    }));
  };

  const generateNewCode = () => {
    setFormData(prev => ({
      ...prev,
      code: generateVoucherCode()
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Voucher name is required');
      return false;
    }
    if (!formData.code.trim()) {
      setError('Voucher code is required');
      return false;
    }
    if (formData.value === '' || formData.value <= 0) {
      setError('Discount value must be greater than 0');
      return false;
    }
    if (!formData.valid_until) {
      setError('Valid until date is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Format data for API
      const payload = {
        name: formData.name,
        code: formData.code,
        discount_type: formData.discount_type,
        value: formData.value,
        minimum_spend: formData.minimum_spend === '' ? 0 : formData.minimum_spend,
        maximum_usage: formData.maximum_usage === '' ? 0 : formData.maximum_usage,
        valid_until: formData.valid_until?.toISOString().split('T')[0],
        shop: formData.shop_id === 'global' ? null : formData.shop_id,
        is_active: formData.is_active
      };

      // Create headers conditionally
      const headers = userId ? { "X-User-Id": userId } : {};
      
      await AxiosInstance.post('/admin-vouchers/create/', payload, {
        headers
      });

      handleOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create voucher. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="grid gap-4 py-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="name">Voucher Name *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Summer Sale 2024"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="code">Voucher Code *</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            placeholder="VOUCHER123"
            disabled={isSubmitting}
            className="uppercase"
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={generateNewCode}
            disabled={isSubmitting}
          >
            Generate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Customers will enter this code at checkout</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Brief description of the voucher"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <Label>Discount Type *</Label>
        <RadioGroup
          value={formData.discount_type}
          onValueChange={(value) => handleSelectChange('discount_type', value as 'percentage' | 'fixed')}
          className="flex gap-4"
          disabled={isSubmitting}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentage" id="percentage" />
            <Label htmlFor="percentage" className="cursor-pointer">Percentage (%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="fixed" />
            <Label htmlFor="fixed" className="cursor-pointer">Fixed Amount (₱)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="value">
          {formData.discount_type === 'percentage' ? 'Discount Percentage *' : 'Discount Amount *'}
        </Label>
        <div className="relative">
          {formData.discount_type === 'fixed' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
          )}
          <Input
            id="value"
            name="value"
            type="number"
            min="0"
            step={formData.discount_type === 'percentage' ? "1" : "0.01"}
            value={formData.value}
            onChange={handleInputChange}
            placeholder={formData.discount_type === 'percentage' ? "20" : "100"}
            disabled={isSubmitting}
            className={formData.discount_type === 'fixed' ? "pl-8" : ""}
          />
          {formData.discount_type === 'percentage' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="minimum_spend">Minimum Spend (Optional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
            <Input
              id="minimum_spend"
              name="minimum_spend"
              type="number"
              min="0"
              step="0.01"
              value={formData.minimum_spend}
              onChange={handleInputChange}
              placeholder="0"
              disabled={isSubmitting}
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">0 = No minimum</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maximum_usage">Max Usage (Optional)</Label>
          <Input
            id="maximum_usage"
            name="maximum_usage"
            type="number"
            min="0"
            step="1"
            value={formData.maximum_usage}
            onChange={handleInputChange}
            placeholder="0"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">0 = Unlimited</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Valid Until *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.valid_until && "text-muted-foreground"
              )}
              disabled={isSubmitting}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.valid_until ? format(formData.valid_until, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={formData.valid_until}
              onSelect={handleDateChange}
              initialFocus
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="shop_id">Shop (Optional)</Label>
        <Select
          value={formData.shop_id || 'global'}
          onValueChange={(value) => handleSelectChange('shop_id', value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global Voucher (All Shops)</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Leave empty to make this a global voucher</p>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={handleSwitchChange}
          disabled={isSubmitting}
        />
        <Label htmlFor="is_active">Active immediately</Label>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">Create New Voucher</DialogTitle>
            <DialogDescription>
              Create a new voucher code for your customers. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] px-6">
            {formContent}
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? 'Creating...' : 'Create Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="h-[95vh] flex flex-col">
        <DrawerHeader className="text-left border-b px-4 py-3 flex-shrink-0">
          <DrawerTitle className="text-xl">Create New Voucher</DrawerTitle>
          <DrawerDescription>
            Create a new voucher code for your customers. Fill in the details below.
          </DrawerDescription>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 px-4 py-2">
          {formContent}
        </ScrollArea>
        
        <DrawerFooter className="border-t pt-3 pb-4 px-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 w-full">
              {isSubmitting ? 'Creating...' : 'Create Voucher'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isSubmitting} className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default function Vouchers() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, voucherMetrics, vouchers, dateRange, shops, userId } = loaderData;

  // State management for date range
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    rangeType: dateRange.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);

  // Handle date range change - update URL search params
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setIsLoading(true);
    
    // Update URL search params
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('start', range.start.toISOString());
    newSearchParams.set('end', range.end.toISOString());
    newSearchParams.set('rangeType', range.rangeType);
    
    // Navigate to update the URL, which will trigger a new loader call
    navigate(`?${newSearchParams.toString()}`, { replace: true });
    
    setCurrentDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  // Reset loading state when loader data changes
  useEffect(() => {
    setIsLoading(false);
  }, [loaderData]);

  // Handle successful voucher creation
  const handleVoucherCreated = () => {
    // Refresh the page to show new voucher
    navigate('.', { replace: true });
  };

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading vouchers...</div>
      </div>
    );
  }

  const safeVouchers = vouchers || [];
  const safeMetrics = voucherMetrics || {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  const hasVouchers = safeVouchers.length > 0;

  // Calculate status based on is_active and valid_until date
  const getVoucherStatus = (voucher: Voucher) => {
    const now = new Date();
    const validUntil = new Date(voucher.valid_until);
    
    if (!voucher.is_active) {
      if (validUntil > now) return 'scheduled';
      return 'expired';
    }
    
    if (validUntil < now) return 'expired';
    return 'active';
  };

  // Add status field to vouchers for filtering
  const vouchersWithStatus = safeVouchers.map(voucher => ({
    ...voucher,
    status: voucher.status || getVoucherStatus(voucher),
    shopName: voucher.shopName || voucher.shop?.name || 'Global'
  }));

  // Get unique filter options from actual data
  const discountTypes = [...new Set(safeVouchers.map(voucher => voucher.discount_type).filter(Boolean))] as string[];
  const shopNames = [...new Set(vouchersWithStatus.map(voucher => voucher.shopName).filter(Boolean))];

  const voucherFilterConfig = {
    status: {
      accessorKey: "status",
      options: ['active', 'scheduled', 'expired'],
      placeholder: 'Status'
    },
    discount_type: {
      accessorKey: "discount_type",
      options: discountTypes.length > 0 ? discountTypes : ['percentage', 'fixed'],
      placeholder: 'Discount Type'
    },
    shop: {
      accessorKey: "shopName",
      options: shopNames.length > 0 ? shopNames : ['Global'],
      placeholder: 'Shop'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Vouchers</h1>
            </div>
            <Button 
              onClick={() => setIsAddVoucherOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Voucher
            </Button>
          </div>

          {/* Add Voucher Modal/Drawer */}
          <AddVoucherModal 
            open={isAddVoucherOpen}
            onOpenChange={setIsAddVoucherOpen}
            onSuccess={handleVoucherCreated}
            shops={shops}
            userId={userId}
          />

          {/* Date Range Filter */}
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vouchers</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_vouchers}</p>
                    <p className="text-xs text-muted-foreground mt-2">{safeMetrics.active_vouchers} active</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <Tag className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Usage</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_usage}</p>
                    <p className="text-xs text-muted-foreground mt-2">Times used</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Discount</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.total_discount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Amount saved</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expired</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.expired_vouchers}</p>
                    <p className="text-xs text-muted-foreground mt-2">No longer valid</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vouchers Table */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">All Vouchers</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading vouchers...' : `Showing ${vouchersWithStatus.length} vouchers`}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : hasVouchers ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={vouchersWithStatus}
                    filterConfig={voucherFilterConfig}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search by voucher name..."
                    }}
                    isLoading={isLoading}
                  />
                </div>
              ) : (
                <EmptyTable onAddClick={() => setIsAddVoucherOpen(true)} />
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }: { row: any}) => (
      <div className="font-medium text-xs sm:text-sm">
        <div>{row.getValue("name")}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {row.original.shop ? `Shop: ${row.original.shop.name}` : 'Global Voucher'}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }: { row: any}) => {
      const code = row.getValue("code") as string;
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {code}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100"
            onClick={() => navigator.clipboard.writeText(code)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: "created_by",
    header: "Added By",
    cell: ({ row }: { row: any}) => {
      const createdBy = row.original.created_by;
      if (!createdBy) return <div className="text-muted-foreground text-xs">System</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <User className="w-3 h-3 text-muted-foreground" />
          <span>{createdBy.first_name} {createdBy.last_name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "shopName",
    header: "Shop",
    cell: ({ row }: { row: any}) => {
      const shop = row.original.shop;
      if (!shop) return <div className="text-muted-foreground text-xs">Global</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Store className="w-3 h-3 text-muted-foreground" />
          <span>{shop.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "value",
    header: "Amount",
    cell: ({ row }: { row: any}) => {
      const type = row.original.discount_type;
      const value = row.getValue("value");
      
      if (type === 'percentage') {
        return <span className="text-xs sm:text-sm font-medium">{value}%</span>;
      }
      return <span className="text-xs sm:text-sm font-medium">₱{value}</span>;
    },
  },
  {
    accessorKey: "minimum_spend",
    header: "Min Spend",
    cell: ({ row }: { row: any}) => {
      const minSpend = row.original.minimum_spend;
      if (!minSpend || minSpend === 0) {
        return <span className="text-xs text-muted-foreground">No min</span>;
      }
      return <span className="text-xs sm:text-sm">₱{minSpend}</span>;
    },
  },
  {
    accessorKey: "valid_until",
    header: "Valid Until",
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("valid_until"));
      if (isNaN(date.getTime())) return <div className="text-muted-foreground">N/A</div>;
      
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const isExpired = new Date() > date;
      
      return (
        <div className={`flex items-center gap-1 text-xs sm:text-sm ${isExpired ? 'text-red-600' : ''}`}>
          <Calendar className="w-3 h-3" />
          {formattedDate}
          {isExpired && <span className="text-xs">(Expired)</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "added_at",
    header: "Added At",
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("added_at"));
      if (isNaN(date.getTime())) return <div className="text-muted-foreground">N/A</div>;
      
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      return (
        <div className="text-xs sm:text-sm">
          {formattedDate}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      const getColor = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'active': return '#10b981';
          case 'scheduled': return '#3b82f6';
          case 'expired': return '#ef4444';
          default: return '#6b7280';
        }
      };
      const color = getColor(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: any}) => {
      const voucher = row.original;
      
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      );
    },
  },
];