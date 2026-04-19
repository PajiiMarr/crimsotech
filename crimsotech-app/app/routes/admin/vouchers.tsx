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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Vouchers | Admin",
    },
  ];
}

// Interface to match Django Voucher model - REMOVED valid_until
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
  start_date: string;
  end_date: string | null;
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
  usage_count?: number;
}

interface LoaderData {
  user: any;
  voucherMetrics: {
    total_vouchers: number;
    active_vouchers: number;
    expired_vouchers: number;
    scheduled_vouchers: number;
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
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
  filterOptions: {
    discount_types: string[];
    shops: string[];
    statuses: string[];
  };
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
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

  // Parse URL search params for date range and filters
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const rangeTypeParam = url.searchParams.get('rangeType');
  const pageParam = url.searchParams.get('page');
  const pageSizeParam = url.searchParams.get('page_size');
  const searchParam = url.searchParams.get('search');
  const statusParam = url.searchParams.get('status');
  const discountTypeParam = url.searchParams.get('discount_type');
  const shopParam = url.searchParams.get('shop');

  // Set default date range (last 30 days)
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date();
  
  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;
  const rangeType = rangeTypeParam || 'monthly';

  // Validate dates
  const validStart = !isNaN(startDate.getTime()) ? startDate : defaultStart;
  const validEnd = !isNaN(endDate.getTime()) ? endDate : defaultEnd;

  // Pagination params
  const page = pageParam ? parseInt(pageParam) : 1;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 10;

  // Initialize empty data structures
  let voucherMetrics = {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    scheduled_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  let vouchersList: Voucher[] = [];
  let shopsList: { id: string; name: string }[] = [];
  let pagination = {
    page: 1,
    page_size: 10,
    total_count: 0,
    total_pages: 0
  };
  let filterOptions = {
    discount_types: [] as string[],
    shops: [] as string[],
    statuses: ['active', 'expired', 'scheduled', 'inactive']
  };

  // Create headers conditionally
  const headers = userId ? { "X-User-Id": userId } : {};

  try {
    // Fetch real data from API with date range parameters
    const metricsResponse = await AxiosInstance.get('/admin-vouchers/get_metrics/', {
      params: {
        start_date: validStart.toISOString().split('T')[0],
        end_date: validEnd.toISOString().split('T')[0]
      },
      headers
    });

    if (metricsResponse.data.success) {
      voucherMetrics = metricsResponse.data.metrics || voucherMetrics;
    }

    // Fetch vouchers list from API with all filters
    const vouchersResponse = await AxiosInstance.get('/admin-vouchers/vouchers_list/', {
      headers,
      params: {
        start_date: validStart.toISOString().split('T')[0],
        end_date: validEnd.toISOString().split('T')[0],
        page: page,
        page_size: pageSize,
        search: searchParam || '',
        status: statusParam || '',
        discount_type: discountTypeParam || '',
        shop: shopParam || ''
      }
    });

    if (vouchersResponse.data.success) {
      vouchersList = vouchersResponse.data.vouchers || [];
      pagination = vouchersResponse.data.pagination || pagination;
      filterOptions = {
        ...filterOptions,
        discount_types: vouchersResponse.data.filter_options?.discount_types || [],
        shops: vouchersResponse.data.filter_options?.shops || []
      };
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
    userId,
    pagination,
    filterOptions
  };
}

// Empty state components
const EmptyTable = ({ onAddClick }: { onAddClick: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 py-8">
    <div className="text-center text-muted-foreground">
      <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">No vouchers found</h3>
      <p className="text-sm mb-4">Get started by creating your first voucher code.</p>
      <Button onClick={onAddClick} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
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
  start_date: Date | undefined;
  end_date: Date | undefined;
  shop: string | null;
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
    start_date: new Date(),
    end_date: undefined,
    shop: null,
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
      start_date: new Date(),
      end_date: undefined,
      shop: null,
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
    if (name === 'shop') {
      setFormData(prev => ({
        ...prev,
        [name]: value === 'global' ? null : value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      start_date: date
    }));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      end_date: date
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
    if (!formData.end_date) {
      setError('End date is required');
      return false;
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      setError('End date must be after start date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Format data for API - match the Voucher model exactly
      const payload: any = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        value: Number(formData.value),
        minimum_spend: formData.minimum_spend === '' ? 0 : Number(formData.minimum_spend),
        maximum_usage: formData.maximum_usage === '' ? 0 : Number(formData.maximum_usage),
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        is_active: formData.is_active
      };

      // Handle shop field - send as null for global, or the actual shop ID
      payload.shop = formData.shop;

      // Create headers conditionally
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      console.log('Submitting voucher payload:', payload);
      
      const response = await AxiosInstance.post('/admin-vouchers/add_voucher/', payload, {
        headers
      });

      console.log('Voucher creation response:', response.data);

      if (response.data.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(response.data.error || response.data.message || 'Failed to create voucher. Please try again.');
      }
    } catch (err: any) {
      console.error('Error creating voucher:', err);
      console.error('Error response:', err.response?.data);
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.response?.data?.detail ||
                          err.message ||
                          'Failed to create voucher. Please try again.';
      setError(errorMessage);
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

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.start_date && "text-muted-foreground"
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.start_date}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.end_date && "text-muted-foreground"
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? format(formData.end_date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.end_date}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) => formData.start_date ? date < formData.start_date : date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="shop">Shop (Optional)</Label>
        <Select
          value={formData.shop === null ? 'global' : formData.shop || ''}
          onValueChange={(value) => handleSelectChange('shop', value)}
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
        <p className="text-xs text-muted-foreground">Select a shop or choose Global for all shops</p>
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
          <ScrollArea className="max-h-[60vh] p-6">
            {formContent}
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {isSubmitting ? 'Creating...' : 'Create Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex flex-col max-h-[95vh]">
        <DrawerHeader className="text-left border-b px-4 py-3 flex-shrink-0">
          <DrawerTitle className="text-xl">Create New Voucher</DrawerTitle>
          <DrawerDescription>
            Create a new voucher code for your customers. Fill in the details below.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4 p-2">
          {formContent}
        </div>

        <DrawerFooter className="border-t pt-3 pb-4 px-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 w-full">
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

// Edit Voucher Modal Component
interface EditVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  voucher: Voucher | null;
  shops: { id: string; name: string }[];
  userId: string | null;
}

const EditVoucherModal = ({ open, onOpenChange, onSuccess, voucher, shops, userId }: EditVoucherModalProps) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<AddVoucherFormData>({
    name: '',
    code: '',
    description: '',
    discount_type: 'percentage',
    value: '',
    minimum_spend: '',
    maximum_usage: '',
    start_date: undefined,
    end_date: undefined,
    shop: null,
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (voucher) {
      setFormData({
        name: voucher.name || '',
        code: voucher.code || '',
        description: '',
        discount_type: (voucher.discount_type as 'percentage' | 'fixed') || 'percentage',
        value: voucher.value || '',
        minimum_spend: voucher.minimum_spend || '',
        maximum_usage: voucher.maximum_usage || '',
        start_date: voucher.start_date ? new Date(voucher.start_date) : undefined,
        end_date: voucher.end_date ? new Date(voucher.end_date) : undefined,
        shop: voucher.shop?.id || null,
        is_active: voucher.is_active
      });
    }
  }, [voucher]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      discount_type: 'percentage',
      value: '',
      minimum_spend: '',
      maximum_usage: '',
      start_date: undefined,
      end_date: undefined,
      shop: null,
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
    if (name === 'shop') {
      setFormData(prev => ({
        ...prev,
        [name]: value === 'global' ? null : value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      start_date: date
    }));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      end_date: date
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
    if (!formData.end_date) {
      setError('End date is required');
      return false;
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      setError('End date must be after start date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !voucher) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        value: Number(formData.value),
        minimum_spend: formData.minimum_spend === '' ? 0 : Number(formData.minimum_spend),
        maximum_usage: formData.maximum_usage === '' ? 0 : Number(formData.maximum_usage),
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        is_active: formData.is_active
      };

      payload.shop = formData.shop;

      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      const response = await AxiosInstance.put(`/admin-vouchers/update_voucher/${voucher.id}/`, payload, {
        headers
      });

      if (response.data.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(response.data.error || response.data.message || 'Failed to update voucher.');
      }
    } catch (err: any) {
      console.error('Error updating voucher:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message ||
                          'Failed to update voucher.';
      setError(errorMessage);
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
            <RadioGroupItem value="percentage" id="edit-percentage" />
            <Label htmlFor="edit-percentage" className="cursor-pointer">Percentage (%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="edit-fixed" />
            <Label htmlFor="edit-fixed" className="cursor-pointer">Fixed Amount (₱)</Label>
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
          <Label htmlFor="minimum_spend">Minimum Spend</Label>
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
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maximum_usage">Max Usage</Label>
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.start_date && "text-muted-foreground"
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.start_date}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.end_date && "text-muted-foreground"
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? format(formData.end_date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.end_date}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) => formData.start_date ? date < formData.start_date : date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="shop">Shop</Label>
        <Select
          value={formData.shop === null ? 'global' : formData.shop || ''}
          onValueChange={(value) => handleSelectChange('shop', value)}
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
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="edit-is_active"
          checked={formData.is_active}
          onCheckedChange={handleSwitchChange}
          disabled={isSubmitting}
        />
        <Label htmlFor="edit-is_active">Active</Label>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">Edit Voucher</DialogTitle>
            <DialogDescription>
              Update the voucher details below.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-6">
            {formContent}
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {isSubmitting ? 'Updating...' : 'Update Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex flex-col max-h-[95vh]">
        <DrawerHeader className="text-left border-b px-4 py-3 flex-shrink-0">
          <DrawerTitle className="text-xl">Edit Voucher</DrawerTitle>
          <DrawerDescription>
            Update the voucher details below.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4 p-2">
          {formContent}
        </div>

        <DrawerFooter className="border-t pt-3 pb-4 px-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 w-full">
              {isSubmitting ? 'Updating...' : 'Update Voucher'}
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

// Delete Confirmation Dialog
interface DeleteVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  voucher: Voucher | null;
  userId: string | null;
}

const DeleteVoucherDialog = ({ open, onOpenChange, onSuccess, voucher, userId }: DeleteVoucherDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!voucher) return;

    setIsDeleting(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      const response = await AxiosInstance.delete(`/admin-vouchers/delete_voucher/${voucher.id}/`, {
        headers
      });

      if (response.data.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(response.data.error || response.data.message || 'Failed to delete voucher.');
      }
    } catch (err: any) {
      console.error('Error deleting voucher:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete voucher.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the voucher
            "{voucher?.name}" (Code: {voucher?.code}).
            {voucher?.usage_count && voucher.usage_count > 0 && (
              <span className="block mt-2 text-orange-600">
                Note: This voucher has been used {voucher.usage_count} times. It will be deactivated instead of deleted.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// View Voucher Details Dialog
interface ViewVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: Voucher | null;
}

const ViewVoucherDialog = ({ open, onOpenChange, voucher }: ViewVoucherDialogProps) => {
  if (!voucher) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Voucher Details</DialogTitle>
          <DialogDescription>
            Detailed information about this voucher.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Name:</div>
            <div className="col-span-2">{voucher.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Code:</div>
            <div className="col-span-2">
              <Badge variant="secondary" className="font-mono">
                {voucher.code}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Shop:</div>
            <div className="col-span-2">{voucher.shop?.name || 'Global'}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Discount Type:</div>
            <div className="col-span-2 capitalize">{voucher.discount_type}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Value:</div>
            <div className="col-span-2">
              {voucher.discount_type === 'percentage' ? `${voucher.value}%` : `₱${voucher.value}`}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Minimum Spend:</div>
            <div className="col-span-2">₱{voucher.minimum_spend || 0}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Maximum Usage:</div>
            <div className="col-span-2">{voucher.maximum_usage || 'Unlimited'}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Usage Count:</div>
            <div className="col-span-2">{voucher.usage_count || 0}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Start Date:</div>
            <div className="col-span-2">
              {voucher.start_date ? new Date(voucher.start_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">End Date:</div>
            <div className="col-span-2">
              {voucher.end_date ? new Date(voucher.end_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Added At:</div>
            <div className="col-span-2">
              {voucher.added_at ? new Date(voucher.added_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Created By:</div>
            <div className="col-span-2">
              {voucher.created_by ? `${voucher.created_by.first_name} ${voucher.created_by.last_name}` : 'System'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Status:</div>
            <div className="col-span-2">
              <Badge 
                variant="secondary"
                className="capitalize"
                style={{ 
                  backgroundColor: voucher.status === 'active' ? '#f9731620' : 
                                 voucher.status === 'scheduled' ? '#f9731620' : 
                                 voucher.status === 'expired' ? '#ef444420' : '#6b728020',
                  color: voucher.status === 'active' ? '#f97316' : 
                        voucher.status === 'scheduled' ? '#f97316' : 
                        voucher.status === 'expired' ? '#ef4444' : '#6b7280'
                }}
              >
                {voucher.status}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="font-semibold">Active:</div>
            <div className="col-span-2">{voucher.is_active ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Vouchers() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, voucherMetrics, vouchers, dateRange, shops, userId, pagination, filterOptions } = loaderData;

  // State management
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    rangeType: dateRange.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);
  const [isEditVoucherOpen, setIsEditVoucherOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  // Handle date range change
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setIsLoading(true);
    
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('start', range.start.toISOString());
    newSearchParams.set('end', range.end.toISOString());
    newSearchParams.set('rangeType', range.rangeType);
    newSearchParams.set('page', '1'); // Reset to first page
    
    navigate(`?${newSearchParams.toString()}`, { replace: true });
    
    setCurrentDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setIsLoading(true);
    
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(key, value);
    } else {
      newSearchParams.delete(key);
    }
    newSearchParams.set('page', '1'); // Reset to first page
    
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setIsLoading(true);
    
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', newPage.toString());
    
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  // Reset loading state
  useEffect(() => {
    setIsLoading(false);
  }, [loaderData]);

  // Handle successful voucher creation/update/deletion
  const handleVoucherChanged = () => {
    // Refresh the page
    navigate('.', { replace: true });
  };

  // Action handlers
  const handleView = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setIsEditVoucherOpen(true);
  };

  const handleDelete = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setIsDeleteDialogOpen(true);
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
    scheduled_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  const hasVouchers = safeVouchers.length > 0;

  // Get status based on voucher data
  const getVoucherStatus = (voucher: Voucher) => {
    const now = new Date();
    const startDate = voucher.start_date ? new Date(voucher.start_date) : null;
    const endDate = voucher.end_date ? new Date(voucher.end_date) : null;
    
    if (!voucher.is_active) {
      if (endDate && endDate < now) return 'expired';
      if (startDate && startDate > now) return 'scheduled';
      return 'inactive';
    }
    
    if (endDate && endDate < now) return 'expired';
    if (startDate && startDate > now) return 'scheduled';
    return 'active';
  };

  // Add status field to vouchers
  const vouchersWithStatus = safeVouchers.map(voucher => ({
    ...voucher,
    status: voucher.status || getVoucherStatus(voucher),
    shopName: voucher.shopName || voucher.shop?.name || 'Global'
  }));

  // Filter config from API data
  const voucherFilterConfig = {
    status: {
      accessorKey: "status",
      options: filterOptions.statuses,
      placeholder: 'Status'
    },
    discount_type: {
      accessorKey: "discount_type",
      options: filterOptions.discount_types.length > 0 ? filterOptions.discount_types : ['percentage', 'fixed'],
      placeholder: 'Discount Type'
    },
    shop: {
      accessorKey: "shopName",
      options: filterOptions.shops.length > 0 ? filterOptions.shops : ['Global'],
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
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
              Add Voucher
            </Button>
          </div>

          {/* Modals/Drawers */}
          <AddVoucherModal 
            open={isAddVoucherOpen}
            onOpenChange={setIsAddVoucherOpen}
            onSuccess={handleVoucherChanged}
            shops={shops}
            userId={userId}
          />

          <EditVoucherModal 
            open={isEditVoucherOpen}
            onOpenChange={setIsEditVoucherOpen}
            onSuccess={handleVoucherChanged}
            voucher={selectedVoucher}
            shops={shops}
            userId={userId}
          />

          <DeleteVoucherDialog 
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onSuccess={handleVoucherChanged}
            voucher={selectedVoucher}
            userId={userId}
          />

          <ViewVoucherDialog 
            open={isViewDialogOpen}
            onOpenChange={setIsViewDialogOpen}
            voucher={selectedVoucher}
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
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                    <Tag className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
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
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                    <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
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
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                    <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
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
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
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
                  {isLoading ? 'Loading vouchers...' : `Showing ${vouchersWithStatus.length} of ${pagination.total_count} vouchers`}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  // Handle export
                  const params = new URLSearchParams(searchParams);
                  window.open(`/api/admin-vouchers/export/?${params.toString()}`, '_blank');
                }}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : hasVouchers ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns(handleView, handleEdit, handleDelete)} 
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

// Update columns to accept handlers
const columns = (
  onView: (voucher: Voucher) => void,
  onEdit: (voucher: Voucher) => void,
  onDelete: (voucher: Voucher) => void
): ColumnDef<any>[] => [
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
    accessorKey: "usage_count",
    header: "Usage",
    cell: ({ row }: { row: any}) => {
      const usage = row.original.usage_count || 0;
      const maxUsage = row.original.maximum_usage;
      
      return (
        <div className="text-xs sm:text-sm">
          {usage}
          {maxUsage > 0 && <span className="text-muted-foreground">/{maxUsage}</span>}
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
    accessorKey: "end_date",
    header: "Valid Until",
    cell: ({ row }: { row: any}) => {
      const dateStr = row.original.end_date;
      if (!dateStr) return <div className="text-muted-foreground">No end date</div>;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return <div className="text-muted-foreground">Invalid date</div>;
      
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
          case 'active': return '#f97316';
          case 'scheduled': return '#f97316';
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
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => onView(voucher)}
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => onEdit(voucher)}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(voucher)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      );
    },
  },
];