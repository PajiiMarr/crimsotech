// app/routes/seller/vouchers.tsx
import type { Route } from './+types/seller-vouchers';
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
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
import { useState, useEffect, useRef } from 'react';
import { 
  Calendar,
  PhilippinePeso,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Copy,
  Edit,
  Trash2,
  Tag,
  Percent,
  Ticket,
  List,
  Plus,
  Store,
  Package,
  AlertCircle,
  CalendarIcon,
  Loader2,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Calendar as CalendarComponent } from '~/components/ui/calendar';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import { Switch } from '~/components/ui/switch';
import { Alert, AlertDescription } from '~/components/ui/alert';
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
import { useNavigate, useSearchParams, Link } from 'react-router';
import { data } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "My Vouchers",
    },
  ];
}

// Interface for vouchers matching backend response
interface Voucher {
  id: string;
  name: string;
  code: string;
  voucher_type: 'shop' | 'product';
  discount_type: 'percentage' | 'fixed';
  value: number;
  minimum_spend: number;
  maximum_usage: number;
  current_usage: number;
  total_discount_given: number;
  start_date: string;
  end_date: string;
  added_at: string;
  created_by: {
    id: string;
    name: string;
  } | null;
  is_active: boolean;
  status: 'active' | 'expired' | 'scheduled' | 'inactive';
  shop: {
    id: string;
    name: string;
  };
}

interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

interface FilterOptions {
  voucher_types: string[];
  discount_types: string[];
  statuses: string[];
}

interface ApiResponse {
  success: boolean;
  vouchers: Voucher[];
  pagination: Pagination;
  filter_options: FilterOptions;
  error?: string;
}

// Loader function - exactly like seller dashboard
export async function loader({ request, context }: Route.LoaderArgs) {
  const { requireRole } = await import('~/middleware/role-require.server')
  const { fetchUserRole } = await import('~/middleware/role.server')

  let user = (context as any).user
  if (!user) {
    user = await fetchUserRole({ request, context })
  }

  // IMPORTANT: Use the same role as dashboard - 'isCustomer' for sellers
  await requireRole(request, context, ['isCustomer'])

  const { getSession } = await import('~/sessions.server')
  const session = await getSession(request.headers.get('Cookie'))
  const shopId = session.get('shopId')
  const userId = session.get('userId')
  
  // Default pagination
  const page = 1
  const pageSize = 10
  
  let vouchersData = null
  let vouchersError = null

  if (shopId) {
    try {
      const params = new URLSearchParams()
      params.append('shop_id', shopId)
      params.append('page', page.toString())
      params.append('page_size', pageSize.toString())

      const response = await AxiosInstance.get(`/seller-vouchers/list_vouchers/?${params.toString()}`, {
        headers: {
          'X-User-Id': userId || '',
        }
      })

      if (response.data.success) {
        vouchersData = response.data
      } else {
        vouchersError = response.data.error || 'Failed to load vouchers'
        console.error('API returned success:false', response.data)
      }
    } catch (error) {
      console.error('Error fetching vouchers data in loader:', error)
      vouchersError = 'Error loading vouchers'
    }
  }

  return data({
    user,
    shopId,
    userId,
    vouchersData: vouchersData && vouchersData.success ? vouchersData : null,
    vouchersError,
  })
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading vouchers...</p>
      </div>
    </div>
  )
}

// Generate random voucher code
const generateVoucherCode = () => {
  const prefix = 'VOUCH';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
};

// Create/Edit Voucher Modal
interface VoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
  shopId: string;
  voucher?: Voucher | null;
  mode: 'create' | 'edit';
  defaultType?: 'shop' | 'product';
}

const VoucherModal = ({ open, onOpenChange, onSuccess, userId, shopId, voucher, mode, defaultType = 'shop' }: VoucherModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    voucher_type: defaultType,
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    minimum_spend: '',
    maximum_usage: '',
    start_date: new Date() as Date | undefined,
    end_date: undefined as Date | undefined,
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load voucher data when editing
  useEffect(() => {
    if (voucher && mode === 'edit') {
      setFormData({
        name: voucher.name,
        code: voucher.code,
        description: '',
        voucher_type: voucher.voucher_type,
        discount_type: voucher.discount_type,
        value: voucher.value.toString(),
        minimum_spend: voucher.minimum_spend.toString(),
        maximum_usage: voucher.maximum_usage.toString(),
        start_date: new Date(voucher.start_date),
        end_date: new Date(voucher.end_date),
        is_active: voucher.is_active
      });
    } else {
      resetForm();
    }
  }, [voucher, mode]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: generateVoucherCode(),
      description: '',
      voucher_type: defaultType,
      discount_type: 'percentage',
      value: '',
      minimum_spend: '',
      maximum_usage: '',
      start_date: new Date() as Date | undefined,
      end_date: undefined,
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
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setFormData(prev => ({ ...prev, [name]: numValue }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, start_date: date }));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, end_date: date }));
  };

  const generateNewCode = () => {
    setFormData(prev => ({ ...prev, code: generateVoucherCode() }));
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
    if (formData.value === '' || Number(formData.value) <= 0) {
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
    if (!shopId) {
      setError('Shop ID not found');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        voucher_type: formData.voucher_type,
        discount_type: formData.discount_type,
        value: Number(formData.value),
        minimum_spend: formData.minimum_spend === '' ? 0 : Number(formData.minimum_spend),
        maximum_usage: formData.maximum_usage === '' ? 0 : Number(formData.maximum_usage),
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        is_active: formData.is_active,
        shop_id: shopId  // Include shop_id in the payload
      };

      let response;
      if (mode === 'create') {
        response = await AxiosInstance.post('/seller-vouchers/create_voucher/', payload, {
          headers: { 'X-User-Id': userId }
        });
      } else {
        response = await AxiosInstance.put(`/seller-vouchers/${voucher?.id}/update_voucher/`, payload, {
          headers: { 'X-User-Id': userId }
        });
      }

      if (response.data.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(response.data.error || response.data.message || `Failed to ${mode} voucher`);
      }
    } catch (err: any) {
      console.error(`Error ${mode}ing voucher:`, err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message ||
                          `Failed to ${mode} voucher`;
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'create' ? `Create ${defaultType === 'shop' ? 'Shop' : 'Product'} Voucher` : 'Edit Voucher'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new voucher for your customers.' : 'Update your voucher details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
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

          {mode === 'create' && (
            <div className="grid gap-2">
              <Label>Voucher Type</Label>
              <Select
                value={formData.voucher_type}
                onValueChange={(value) => handleSelectChange('voucher_type', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voucher type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Shop Voucher</SelectItem>
                  <SelectItem value="product">Product Voucher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Discount Type *</Label>
            <RadioGroup
              value={formData.discount_type}
              onValueChange={(value) => handleSelectChange('discount_type', value)}
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

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={handleSwitchChange}
              disabled={isSubmitting}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Voucher' : 'Update Voucher')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
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
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-red-600 bg-red-50';
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

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
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Name:</div>
            <div className="col-span-2">{voucher.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Code:</div>
            <div className="col-span-2">
              <Badge variant="secondary" className="font-mono">
                {voucher.code}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Type:</div>
            <div className="col-span-2">
              <Badge className={voucher.voucher_type === 'shop' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                {voucher.voucher_type === 'shop' ? 'Shop Voucher' : 'Product Voucher'}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Discount:</div>
            <div className="col-span-2">
              {voucher.discount_type === 'percentage' ? `${voucher.value}%` : formatCurrency(voucher.value)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Minimum Spend:</div>
            <div className="col-span-2">{voucher.minimum_spend > 0 ? formatCurrency(voucher.minimum_spend) : 'No minimum'}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Usage:</div>
            <div className="col-span-2">
              {voucher.current_usage} / {voucher.maximum_usage > 0 ? voucher.maximum_usage : 'Unlimited'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Total Discount Given:</div>
            <div className="col-span-2">{formatCurrency(voucher.total_discount_given)}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Valid Period:</div>
            <div className="col-span-2">
              {formatDate(voucher.start_date)} - {formatDate(voucher.end_date)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Added:</div>
            <div className="col-span-2">{formatDate(voucher.added_at)}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Created By:</div>
            <div className="col-span-2">{voucher.created_by?.name || 'System'}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-semibold text-gray-700">Status:</div>
            <div className="col-span-2">
              <Badge className={`${getStatusColor(voucher.status)} capitalize`}>
                {voucher.status}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Empty state component
const EmptyTable = ({ message = "No vouchers found", onAddClick }: { message?: string; onAddClick?: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64">
    <div className="text-center">
      <Ticket className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto mb-4">
        Create your first voucher to attract more customers and boost sales.
      </p>
      {onAddClick && (
        <Button onClick={onAddClick} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Voucher
        </Button>
      )}
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

function VouchersContent({ user, shopId, userId, vouchersData: initialVouchersData, vouchersError: initialError }: { 
  user: any; 
  shopId: string; 
  userId: string;
  vouchersData: any;
  vouchersError: string | null;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchersData?.vouchers || []);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>(
    initialVouchersData?.pagination || {
      page: 1,
      page_size: 10,
      total_count: 0,
      total_pages: 0
    }
  );
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(
    initialVouchersData?.filter_options || {
      voucher_types: [],
      discount_types: [],
      statuses: ['active', 'expired', 'scheduled', 'inactive']
    }
  );
  const [error, setError] = useState<string | null>(initialError);
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [createVoucherType, setCreateVoucherType] = useState<'shop' | 'product'>('shop');

  // Filters from URL
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));

  // Track if this is the first call from URL params
  const isFirstCall = useRef(true)

  // Fetch vouchers - exactly like dashboard's fetchDashboardData
  const fetchVouchers = async (pageNum: number, tab: string, search: string) => {
    if (!shopId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append('shop_id', shopId)
      params.append('page', pageNum.toString())
      params.append('page_size', '10')
      if (search) params.append('search', search)
      if (tab !== 'all') params.append('status', tab)

      const response = await AxiosInstance.get(`/seller-vouchers/list_vouchers/?${params.toString()}`, {
        headers: { 'X-User-Id': userId }
      })

      if (response.data.success) {
        setVouchers(response.data.vouchers)
        setPagination(response.data.pagination)
        setFilterOptions(prev => ({
          ...prev,
          ...response.data.filter_options
        }))
      } else {
        console.error('Failed to fetch vouchers')
        setError(response.data.error || 'Failed to load vouchers')
        setVouchers([])
      }
    } catch (error: any) {
      console.error('Error fetching vouchers:', error)
      setError(error.response?.data?.error || 'Error loading vouchers')
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }

  // Handle filter changes - like dashboard's handleDateRangeChange
  const handleFilterChange = (pageNum: number, tab: string, search: string) => {
    // Skip the first call from URL params on mount
    if (isFirstCall.current) {
      console.log('⏭️ Skipping first filter call - using loader data')
      isFirstCall.current = false
      return
    }
    
    console.log('🔍 Filter changed, fetching new data:', { page: pageNum, tab, search })
    fetchVouchers(pageNum, tab, search)
  }

  // Update URL and fetch when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('tab', activeTab)
    if (searchTerm) params.set('search', searchTerm)
    if (currentPage > 1) params.set('page', currentPage.toString())
    
    setSearchParams(params, { replace: true })
    
    // Fetch data when filters change (except first mount)
    if (!isFirstCall.current) {
      fetchVouchers(currentPage, activeTab, searchTerm)
    }
  }, [activeTab, searchTerm, currentPage])

  // Handlers
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    handleFilterChange(1, tabId, searchTerm);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    handleFilterChange(1, activeTab, e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    handleFilterChange(newPage, activeTab, searchTerm);
  };

  const handleCreateShopVoucher = () => {
    setCreateVoucherType('shop');
    setCreateModalOpen(true);
  };

  const handleCreateProductVoucher = () => {
    setCreateVoucherType('product');
    setCreateModalOpen(true);
  };

  const handleView = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setViewDialogOpen(true);
  };

  const handleEdit = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setEditModalOpen(true);
  };

  const handleDelete = async (voucher: Voucher) => {
    if (!shopId) return;
    
    try {
      const params = new URLSearchParams()
      params.append('shop_id', shopId)

      const response = await AxiosInstance.delete(`/seller-vouchers/${voucher.id}/delete_voucher/?${params.toString()}`, {
        headers: { 'X-User-Id': userId }
      });

      if (response.data.success) {
        // Refresh data after delete
        fetchVouchers(currentPage, activeTab, searchTerm);
        if (response.data.deactivated) {
          // You might want to show a toast here
          console.log('Voucher deactivated (had usage)');
        }
      } else {
        setError(response.data.error || 'Failed to delete voucher');
      }
    } catch (error: any) {
      console.error('Error deleting voucher:', error);
      setError(error.response?.data?.error || 'Failed to delete voucher');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedVoucher) return;
    await handleDelete(selectedVoucher);
    setDeleteDialogOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to use a toast notification here
    alert(`Copied: ${text}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
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
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDiscountDisplay = (voucher: Voucher) => {
    switch(voucher.discount_type) {
      case 'percentage':
        return `${voucher.value}%`;
      case 'fixed':
        return formatCurrency(voucher.value);
      default:
        return 'Unknown';
    }
  };

  const getStatusBadge = (voucher: Voucher) => {
    const status = voucher.status;
    switch(status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Calendar className="w-3 h-3 mr-1" />Scheduled</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
  };

  // Show no shop message
  if (!shopId) {
    return (
      <section className="w-full p-6">
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 font-medium">No shop selected. Please select a shop first to manage vouchers.</p>
          <Button asChild className="mt-2">
            <Link to="/seller/shops">Select a Shop</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Vouchers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your discount vouchers and promotions
            </p>
          </div>
        </div>

        {/* Create Voucher Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors cursor-pointer hover:bg-blue-50" 
            onClick={handleCreateShopVoucher}
          >
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

          <Card 
            className="border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors cursor-pointer hover:bg-green-50" 
            onClick={handleCreateProductVoucher}
          >
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

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers by name or code..."
                value={searchTerm}
                onChange={handleSearch}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs Navigation */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tab.id === 'all' ? pagination.total_count :
                          tab.id === 'shop' ? vouchers.filter(v => v.voucher_type === 'shop').length :
                          tab.id === 'product' ? vouchers.filter(v => v.voucher_type === 'product').length :
                          tab.id === 'active' ? vouchers.filter(v => v.status === 'active').length :
                          tab.id === 'expired' ? vouchers.filter(v => v.status === 'expired').length : 0;

              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-3 ${
                    isActive ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent hover:border-gray-300'
                  }`}
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

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Vouchers Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {activeTab === 'all' && 'All Vouchers'}
              {activeTab === 'shop' && 'Shop Vouchers'}
              {activeTab === 'product' && 'Product Vouchers'}
              {activeTab === 'active' && 'Active Vouchers'}
              {activeTab === 'expired' && 'Expired Vouchers'}
            </CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${vouchers.length} of ${pagination.total_count} voucher(s) found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : vouchers.length === 0 ? (
              <EmptyTable 
                message={
                  activeTab === 'shop' ? 'No shop vouchers found' :
                  activeTab === 'product' ? 'No product vouchers found' :
                  activeTab === 'active' ? 'No active vouchers found' :
                  activeTab === 'expired' ? 'No expired vouchers found' :
                  'No vouchers found'
                }
                onAddClick={() => {
                  setCreateVoucherType(activeTab === 'product' ? 'product' : 'shop');
                  setCreateModalOpen(true);
                }}
              />
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Voucher</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Code</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Type</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Discount</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Usage</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Valid Until</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {vouchers.map((voucher) => (
                        <tr key={voucher.id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            <div className="font-medium">{voucher.name}</div>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="font-mono font-bold bg-gray-100 px-2 py-1 rounded text-xs">
                                {voucher.code}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(voucher.code)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <Badge 
                              variant="secondary"
                              className={`text-xs ${
                                voucher.voucher_type === 'shop' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {voucher.voucher_type === 'shop' ? 'Shop' : 'Product'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">{getDiscountDisplay(voucher)}</div>
                            {voucher.minimum_spend > 0 && (
                              <div className="text-xs text-gray-500">
                                Min: {formatCurrency(voucher.minimum_spend)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <div>
                              {voucher.current_usage} / {voucher.maximum_usage > 0 ? voucher.maximum_usage : '∞'}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className={voucher.status === 'expired' ? 'text-red-600' : ''}>
                                {formatDate(voucher.end_date)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {getStatusBadge(voucher)}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleView(voucher)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(voucher)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedVoucher(voucher);
                                  setDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.total_pages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === pagination.total_pages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <VoucherModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => fetchVouchers(currentPage, activeTab, searchTerm)}
        userId={userId}
        shopId={shopId}
        mode="create"
        defaultType={createVoucherType}
      />

      <VoucherModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => fetchVouchers(currentPage, activeTab, searchTerm)}
        userId={userId}
        shopId={shopId}
        voucher={selectedVoucher}
        mode="edit"
      />

      <ViewVoucherDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        voucher={selectedVoucher}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the voucher
              "{selectedVoucher?.name}" (Code: {selectedVoucher?.code}).
              {selectedVoucher?.current_usage && selectedVoucher.current_usage > 0 && (
                <span className="block mt-2 text-yellow-600">
                  Note: This voucher has been used {selectedVoucher.current_usage} times. 
                  It will be deactivated instead of deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export default function SellerVouchers({ loaderData }: Route.ComponentProps) {
  return (
    <UserProvider user={loaderData.user}>
      <SellerSidebarLayout>
        <VouchersContent 
          user={loaderData.user}
          shopId={loaderData.shopId || ''}
          userId={loaderData.userId || ''}
          vouchersData={loaderData.vouchersData}
          vouchersError={loaderData.vouchersError}
        />
      </SellerSidebarLayout>
    </UserProvider>
  );
}