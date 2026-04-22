// app/routes/admin/boosting.tsx
import { toast } from 'sonner';
import type { Route } from './+types/boosting'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Progress } from '~/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "~/components/ui/drawer";
import { 
  Zap,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Store,
  User,
  Package,
  Calendar,
  Plus,
  Edit,
  Archive,
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  PhilippinePeso,
  Tag,
  Wallet,
  Save,
  X,
  TrendingDown
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { Link } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useState, useEffect } from 'react';
import { useIsMobile } from '~/hooks/use-mobile';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Boosts | Admin",
    },
  ];
}

interface Boost {
  id: string;
  shopName: string;
  shopOwner: string;
  shop_id?: string;
  productName: string;
  product_id?: string;
  boostType: string;
  boost_plan_id?: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled' | 'suspended' | 'completed';
  startDate: string;
  endDate: string;
  duration: number;
  cost: number;
  clicks: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customer_id?: string;
  is_removed?: boolean;
}

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  timeUnit: 'hours' | 'days' | 'weeks' | 'months';
  status: 'active' | 'inactive' | 'archived' | 'draft' | 'removed';
  description: string;
  features: string[];
  usageCount: number;
  revenue: number;
  createdBy: string;
  createdBy_id?: string;
  createdAt: string;
  updatedAt: string;
  is_removed?: boolean;
}

interface BoostMetrics {
  total_boosts: number;
  active_boosts: number;
  total_revenue: number;
  most_popular_boost: string;
  growth_metrics?: {
    boost_growth?: number;
    revenue_growth?: number;
    previous_period_total?: number;
    previous_period_revenue?: number;
    period_days?: number;
  };
}

interface PlansSummary {
  total_plans: number;
  active_plans: number;
  inactive_plans: number;
  archived_plans: number;
}

interface LoaderData {
  user: any;
}

// ── Interactive Number Card Component ─────────────────────────────────────────

interface InteractiveNumberCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  breakdown: {
    label: string;
    value: number;
    percentage?: number;
    color?: string;
  }[];
  totalLabel?: string;
  onViewDetails?: () => void;
  suffix?: string;
  growth?: number;
  periodDays?: number;
  subtitle?: string;
}

function InteractiveNumberCard({
  title,
  value,
  icon,
  color,
  breakdown,
  totalLabel = "Total",
  onViewDetails,
  suffix = "",
  growth,
  periodDays = 7,
  subtitle,
}: InteractiveNumberCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    setIsDialogOpen(true);
    if (onViewDetails) onViewDetails();
  };

  const totalBreakdownValue = breakdown.reduce((sum, item) => sum + (item.value || 0), 0);
  const formatValue = (val: number) => {
    if (val === undefined || val === null) return "0";
    return val.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return null;
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <>
      <Card
        className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
        onClick={handleClick}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">
                {formatValue(value)}{suffix}
              </p>
              {growth !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{formatPercentage(growth)}</span>
                  <span className="text-xs text-muted-foreground">
                    vs previous {periodDays} days
                  </span>
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Click for breakdown</p>
            </div>
            <div className={`p-2 sm:p-3 ${color} rounded-full`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 ${color} rounded-full`}>
                {icon}
              </div>
              {title} Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of {title.toLowerCase()} - Total: {formatValue(value)}{suffix}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall {title}</p>
                  <p className="text-3xl font-bold">{formatValue(value)}{suffix}</p>
                  {growth !== undefined && (
                    <div className={`flex items-center gap-1 mt-1 text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{formatPercentage(growth)}</span>
                      <span className="text-xs text-muted-foreground">vs previous period</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{totalLabel}</p>
                  <p className="text-sm font-medium">{formatValue(totalBreakdownValue)} accounted</p>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Breakdown</h4>
              {breakdown.filter(item => item.value > 0 || item.label.includes("──")).map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {item.color && item.color !== "bg-transparent" && (
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      )}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{formatValue(item.value)}</span>
                      {item.percentage !== undefined && (
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {item.percentage !== undefined && item.value > 0 && (
                    <Progress value={item.percentage} className="h-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Chart Visualization */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-lg mb-3">Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {breakdown.filter(item => item.value > 0 && !item.label.includes("──")).map((item, index) => {
                  const percentage = item.percentage || (totalBreakdownValue > 0 ? (item.value / totalBreakdownValue) * 100 : 0);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50"
                    >
                      {item.color && item.color !== "bg-transparent" && (
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      )}
                      <span className="text-xs">{item.label}</span>
                      <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
              {onViewDetails && (
                <Button onClick={() => {
                  setIsDialogOpen(false);
                  onViewDetails();
                }}>
                  View All {title}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── New Plan Form Data Interface ──────────────────────────────────────────────

interface NewPlanData {
  name: string;
  price: string;
  duration: string;
  timeUnit: string;
  description: string;
  features: string[];
}

// Helper function to safely get features as string array
const getFeaturesAsArray = (features: any): string[] => {
  if (!features) return [];
  if (Array.isArray(features)) {
    return features.map(f => typeof f === 'string' ? f : String(f));
  }
  if (typeof features === 'string') {
    return features.split(',').map(f => f.trim()).filter(f => f);
  }
  if (typeof features === 'object') {
    try {
      return Object.values(features).map(v => String(v));
    } catch {
      return [String(features)];
    }
  }
  return [String(features)];
};

// ── New Plan Modal/Drawer Component ──────────────────────────────────────────

interface NewPlanModalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  userId?: string;
}

function NewPlanModalDrawer({ open, onOpenChange, onSuccess, userId }: NewPlanModalDrawerProps) {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<NewPlanData>({
    name: "",
    price: "",
    duration: "",
    timeUnit: "days",
    description: "",
    features: [],
  });
  const [featureInput, setFeatureInput] = useState("");

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }));
      setFeatureInput("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      toast.error("Valid duration is required");
      return;
    }
    if (!userId) {
      toast.error("User authentication required. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        time_unit: formData.timeUnit,
        description: formData.description || generateDescriptionForPlan(formData.name, parseFloat(formData.price), parseInt(formData.duration), formData.timeUnit),
        features: formData.features.length > 0 ? formData.features : generateFeaturesForPlan(formData.name, parseInt(formData.duration), formData.timeUnit),
        user_id: userId,
        status: "active"
      };

      const response = await AxiosInstance.post("/admin-boosting/create_boost_plan/", payload, {
        headers: { "X-User-Id": userId },
      });

      if (response.data.success) {
        toast.success(response.data.message || "Boost plan created successfully!");
        setFormData({
          name: "",
          price: "",
          duration: "",
          timeUnit: "days",
          description: "",
          features: [],
        });
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.data.message || "Failed to create boost plan");
      }
    } catch (error: any) {
      console.error('Error creating boost plan:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to create boost plan");
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plan-name" className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Plan Name *
        </Label>
        <Input
          id="plan-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Basic Boost, Premium Boost, Ultimate Boost"
          required
          maxLength={50}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Maximum 50 characters. {50 - formData.name.length} remaining.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Price (₱) *
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            placeholder="0.00"
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Duration *
          </Label>
          <div className="flex gap-2">
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="1"
              required
              className="flex-1"
              disabled={isLoading}
            />
            <Select
              value={formData.timeUnit}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timeUnit: value }))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this boost plan offers..."
          rows={3}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for auto-generated description based on plan name.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Features (Optional)</Label>
        <div className="flex gap-2">
          <Input
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            placeholder="Add a feature (e.g., 'Top search placement')"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="button" onClick={handleAddFeature} disabled={isLoading || !featureInput.trim()}>
            Add
          </Button>
        </div>
        
        {formData.features.length > 0 && (
          <div className="mt-3 space-y-2">
            {formData.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-sm">{feature}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFeature(index)}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Add custom features for this plan. Leave empty for auto-generated features based on plan name.
        </p>
      </div>
    </form>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Create New Boost Plan
            </DialogTitle>
            <DialogDescription>
              Create a new boost plan for products. Set pricing, duration, and features.
            </DialogDescription>
          </DialogHeader>
          
          {formContent}
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Plan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Create New Boost Plan
          </DrawerTitle>
          <DrawerDescription>
            Create a new boost plan for products. Set pricing, duration, and features.
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 overflow-y-auto flex-1">
          {formContent}
        </div>
        
        <DrawerFooter className="flex-row justify-end gap-3">
          <DrawerClose asChild>
            <Button variant="outline" disabled={isLoading}>Cancel</Button>
          </DrawerClose>
          <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Plan
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Helper function to normalize status
const normalizeBoostStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'suspended':
      return 'Suspended';
    case 'completed':
      return 'Completed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

const normalizePlanStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'archived':
      return 'Archived';
    case 'draft':
      return 'Draft';
    case 'removed':
    case 'is_removed':
      return 'Removed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

const getBoostStatusConfig = (status: string) => {
  const normalizedStatus = normalizeBoostStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: PlayCircle,
        iconClassName: 'text-green-600'
      };
    case 'Pending':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
        icon: Clock,
        iconClassName: 'text-yellow-600'
      };
    case 'Expired':
      return {
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Calendar,
        iconClassName: 'text-gray-600'
      };
    case 'Cancelled':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        icon: XCircle,
        iconClassName: 'text-red-600'
      };
    case 'Suspended':
      return {
        variant: 'destructive' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        icon: PauseCircle,
        iconClassName: 'text-amber-600'
      };
    case 'Completed':
      return {
        variant: 'default' as const,
        className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        icon: CheckCircle,
        iconClassName: 'text-blue-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Clock,
        iconClassName: 'text-gray-600'
      };
  }
};

const getPlanStatusConfig = (status: string) => {
  const normalizedStatus = normalizePlanStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: PlayCircle,
        iconClassName: 'text-green-600'
      };
    case 'Inactive':
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: PauseCircle,
        iconClassName: 'text-gray-600'
      };
    case 'Archived':
      return {
        variant: 'outline' as const,
        className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        icon: Archive,
        iconClassName: 'text-purple-600'
      };
    case 'Removed':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        icon: Trash2,
        iconClassName: 'text-rose-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Clock,
        iconClassName: 'text-gray-600'
      };
  }
};

function BoostStatusBadge({ status }: { status: string }) {
  const config = getBoostStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizeBoostStatus(status)}
    </Badge>
  );
}

function PlanStatusBadge({ status }: { status: string }) {
  const config = getPlanStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizePlanStatus(status)}
    </Badge>
  );
}

function generateFeaturesForPlan(name: string, duration: number, timeUnit: string): string[] {
  const baseFeatures = [
    'Featured placement in category',
    'Priority in search results',
    'Basic performance analytics'
  ];
  
  const premiumFeatures = [
    'Homepage featured section',
    'Advanced analytics dashboard',
    'Email campaign inclusion',
    'Social media promotion'
  ];
  
  const ultimateFeatures = [
    'Top homepage banner',
    'Personalized recommendations',
    'Dedicated support',
    'Competitor analysis',
    'Custom reporting'
  ];
  
  const timeDisplay = `${duration} ${timeUnit}`;
  
  if (name.toLowerCase().includes('starter') || name.toLowerCase().includes('basic')) {
    return [...baseFeatures, `${timeDisplay} duration`, 'Perfect for new products'];
  } else if (name.toLowerCase().includes('premium')) {
    return [...baseFeatures, ...premiumFeatures.slice(0, 2), `${timeDisplay} duration`, 'Increased visibility'];
  } else if (name.toLowerCase().includes('ultimate') || name.toLowerCase().includes('pro')) {
    return [...baseFeatures, ...premiumFeatures, ...ultimateFeatures.slice(0, 2), `${timeDisplay} duration`, 'Maximum exposure'];
  }
  
  return [...baseFeatures, `${timeDisplay} duration`, 'Boost product visibility'];
}

function generateDescriptionForPlan(name: string, price: number, duration: number, timeUnit: string): string {
  const timeDisplay = `${duration} ${timeUnit}`;
  
  if (name.toLowerCase().includes('starter')) {
    return `Affordable ${timeDisplay} boost perfect for testing new products.`;
  } else if (name.toLowerCase().includes('basic')) {
    return `Essential ${timeDisplay} boost to get your products noticed.`;
  } else if (name.toLowerCase().includes('premium')) {
    return `Enhanced ${timeDisplay} boost with better positioning and analytics.`;
  } else if (name.toLowerCase().includes('ultimate')) {
    return `Maximum ${timeDisplay} exposure with premium features and support.`;
  } else if (name.toLowerCase().includes('pro')) {
    return `Professional ${timeDisplay} boost for serious sellers.`;
  }
  
  return `Boost your product visibility for ${timeDisplay}.`;
}

function calculateRevenueForPlan(price: number, usageCount: number): number {
  return price * usageCount;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  return { user };
}

export default function Boosts({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;

  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [boostPlans, setBoostPlans] = useState<BoostPlan[]>([]);
  const [boostMetrics, setBoostMetrics] = useState<BoostMetrics>({
    total_boosts: 0,
    active_boosts: 0,
    total_revenue: 0,
    most_popular_boost: "No boosts"
  });
  const [plansSummary, setPlansSummary] = useState<PlansSummary>({
    total_plans: 0,
    active_plans: 0,
    inactive_plans: 0,
    archived_plans: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const fetchBoostData = async (start: Date, end: Date, rangeType: string = 'weekly') => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      const [metricsResponse, boostsResponse, plansResponse] = await Promise.all([
        AxiosInstance.get(`/admin-boosting/get_metrics/?${params.toString()}`),
        AxiosInstance.get(`/admin-boosting/get_active_boosts/?${params.toString()}`),
        AxiosInstance.get(`/admin-boosting/get_boost_plans/?${params.toString()}`)
      ]);

      if (metricsResponse.data.success) {
        setBoostMetrics(metricsResponse.data.metrics);
      }

      if (boostsResponse.data.success) {
        const transformedBoosts = boostsResponse.data.boosts.map((boost: any) => {
          const startDate = new Date(boost.start_date);
          const endDate = new Date(boost.end_date);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: boost.boost_id,
            shopName: boost.shop_name,
            shopOwner: boost.customer_name,
            shop_id: boost.shop_id,
            productName: boost.product_name,
            product_id: boost.product_id,
            boostType: boost.boost_plan_name,
            boost_plan_id: boost.boost_plan_id,
            status: boost.status,
            startDate: boost.start_date,
            endDate: boost.end_date,
            duration: duration,
            cost: boost.amount,
            clicks: Math.floor(Math.random() * 500) + 50,
            createdAt: boost.created_at,
            customerName: boost.customer_name,
            customerEmail: boost.customer_email,
            customer_id: boost.customer_id,
            is_removed: boost.is_removed || false
          };
        });
        setBoosts(transformedBoosts);
      }

      if (plansResponse.data.success && plansResponse.data.boost_plans) {
        const transformedPlans = plansResponse.data.boost_plans.map((plan: any) => ({
          id: plan.boost_plan_id,
          name: plan.name,
          price: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
          duration: plan.duration,
          timeUnit: (plan.time_unit as 'hours' | 'days' | 'weeks' | 'months') || 'days',
          status: plan.status,
          description: plan.description || generateDescriptionForPlan(plan.name, plan.price, plan.duration, plan.time_unit),
          features: getFeaturesAsArray(plan.features || generateFeaturesForPlan(plan.name, plan.duration, plan.time_unit)),
          usageCount: plan.usage_count || 0,
          revenue: calculateRevenueForPlan(plan.price, plan.usage_count),
          createdBy: plan.user_name || 'Admin',
          createdBy_id: plan.user_id,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
          is_removed: plan.is_removed || false
        }));
        setBoostPlans(transformedPlans);

        const normalizedPlans = transformedPlans.map((plan: BoostPlan) => ({
          ...plan,
          normalizedStatus: normalizePlanStatus(plan.status)
        }));
        
        const activePlans = normalizedPlans.filter((p: any) => p.normalizedStatus === 'Active').length;
        const inactivePlans = normalizedPlans.filter((p: any) => p.normalizedStatus === 'Inactive').length;
        const archivedPlans = normalizedPlans.filter((p: any) => p.normalizedStatus === 'Archived').length;
        
        setPlansSummary({
          total_plans: transformedPlans.length,
          active_plans: activePlans,
          inactive_plans: inactivePlans,
          archived_plans: archivedPlans
        });
      }
    } catch (error) {
      console.error('Error fetching boost data:', error);
      setBoostMetrics({
        total_boosts: 0,
        active_boosts: 0,
        total_revenue: 0,
        most_popular_boost: "No boosts"
      });
      setBoosts([]);
      setBoostPlans([]);
      setPlansSummary({
        total_plans: 0,
        active_plans: 0,
        inactive_plans: 0,
        archived_plans: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType);
  }, []);

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchBoostData(range.start, range.end, range.rangeType);
  };

  const updateBoostStatus = async (boostId: string, actionType: string, reason?: string) => {
    setIsLoading(true);
    try {
      const payload = {
        boost_id: boostId,
        action_type: actionType,
        user_id: user?.id,
        ...(reason && { reason })
      };

      const response = await AxiosInstance.put('/admin-boosting/update_boost_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Boost status updated successfully');
        await fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update boost status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating boost status:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update boost status');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBoostPlanStatus = async (planId: string, actionType: string) => {
    setIsLoading(true);
    try {
      const payload = {
        boost_plan_id: planId,
        action_type: actionType,
        user_id: user?.id
      };

      const response = await AxiosInstance.put('/admin-boosting/update_boost_plan_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Boost plan status updated successfully');
        await fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update boost plan status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating boost plan status:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update boost plan status');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const growthMetrics = boostMetrics.growth_metrics || {};

  // Calculate breakdowns for metrics
  const calculateTotalBoostsBreakdown = () => {
    const statusBreakdown: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};

    boosts.forEach((boost) => {
      const status = normalizeBoostStatus(boost.status);
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      
      const type = boost.boostType;
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    const totalBoosts = boostMetrics.total_boosts || boosts.length;

    return {
      byStatus: Object.entries(statusBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: totalBoosts > 0 ? (value / totalBoosts) * 100 : 0,
        color: 
          label === "Active" ? "bg-green-500" :
          label === "Pending" ? "bg-yellow-500" :
          label === "Expired" ? "bg-gray-500" :
          label === "Cancelled" ? "bg-red-500" :
          label === "Suspended" ? "bg-amber-500" :
          label === "Completed" ? "bg-blue-500" : "bg-gray-500",
      })),
      byType: Object.entries(typeBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: totalBoosts > 0 ? (value / totalBoosts) * 100 : 0,
        color:
          label === "Starter Boost" ? "bg-emerald-500" :
          label === "Basic Boost" ? "bg-blue-500" :
          label === "Premium Boost" ? "bg-purple-500" :
          label === "Ultimate Boost" ? "bg-orange-500" :
          label === "Pro Boost" ? "bg-red-500" : "bg-gray-500",
      })),
    };
  };

  const calculateRevenueBreakdown = () => {
    const revenueByStatus: Record<string, number> = {};
    const revenueByType: Record<string, number> = {};

    boosts.forEach((boost) => {
      const status = normalizeBoostStatus(boost.status);
      revenueByStatus[status] = (revenueByStatus[status] || 0) + boost.cost;
      
      const type = boost.boostType;
      revenueByType[type] = (revenueByType[type] || 0) + boost.cost;
    });

    const totalRevenue = boostMetrics.total_revenue || boosts.reduce((sum, b) => sum + b.cost, 0);

    return {
      byStatus: Object.entries(revenueByStatus).map(([label, value]) => ({
        label,
        value,
        percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
        color: 
          label === "Active" ? "bg-green-500" :
          label === "Pending" ? "bg-yellow-500" :
          label === "Expired" ? "bg-gray-500" :
          label === "Cancelled" ? "bg-red-500" :
          label === "Suspended" ? "bg-amber-500" :
          label === "Completed" ? "bg-blue-500" : "bg-gray-500",
      })),
      byType: Object.entries(revenueByType).map(([label, value]) => ({
        label,
        value,
        percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
        color:
          label === "Starter Boost" ? "bg-emerald-500" :
          label === "Basic Boost" ? "bg-blue-500" :
          label === "Premium Boost" ? "bg-purple-500" :
          label === "Ultimate Boost" ? "bg-orange-500" :
          label === "Pro Boost" ? "bg-red-500" : "bg-gray-500",
      })),
    };
  };

  const calculateActivePlansBreakdown = () => {
    const statusBreakdown: Record<string, number> = {};
    
    boostPlans.forEach((plan) => {
      const status = normalizePlanStatus(plan.status);
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    const totalPlans = boostPlans.length;

    return {
      byStatus: Object.entries(statusBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: totalPlans > 0 ? (value / totalPlans) * 100 : 0,
        color:
          label === "Active" ? "bg-green-500" :
          label === "Inactive" ? "bg-gray-500" :
          label === "Archived" ? "bg-purple-500" :
          label === "Removed" ? "bg-rose-500" : "bg-gray-500",
      })),
    };
  };

  const calculatePlanRevenueBreakdown = () => {
    const revenueByPlan: Record<string, number> = {};
    
    boostPlans.forEach((plan) => {
      revenueByPlan[plan.name] = (revenueByPlan[plan.name] || 0) + plan.revenue;
    });

    const totalPlanRevenue = boostPlans.reduce((sum, p) => sum + p.revenue, 0);
    const sortedPlans = Object.entries(revenueByPlan)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      byPlan: sortedPlans.map(([label, value]) => ({
        label,
        value,
        percentage: totalPlanRevenue > 0 ? (value / totalPlanRevenue) * 100 : 0,
        color: "bg-yellow-500",
      })),
    };
  };

  const totalBoostsBreakdown = calculateTotalBoostsBreakdown();
  const revenueBreakdown = calculateRevenueBreakdown();
  const activePlansBreakdown = calculateActivePlansBreakdown();
  const planRevenueBreakdown = calculatePlanRevenueBreakdown();

  const boostFilterConfig = {
    status: {
      options: [...new Set(boosts.map(boost => boost.status))],
      placeholder: 'Status'
    },
    boostType: {
      options: [...new Set(boosts.map(boost => boost.boostType))],
      placeholder: 'Boost Type'
    },
    shopOwner: {
      options: [...new Set(boosts.map(boost => boost.shopOwner))],
      placeholder: 'Shop Owner'
    }
  };

  const getTimeUnitDisplay = (unit: string, duration: number) => {
    const plural = duration > 1 ? 's' : '';
    switch(unit) {
      case 'hours': return `Hour${plural}`;
      case 'days': return `Day${plural}`;
      case 'weeks': return `Week${plural}`;
      case 'months': return `Month${plural}`;
      default: return unit;
    }
  };

  const totalPlansRevenue = boostPlans.reduce((sum, plan) => sum + plan.revenue, 0);

  const MetricCardSkeleton = () => (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mt-1" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  if (!isLoading && boostPlans.length === 0) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold">Boosts Management</h1>
              <Button onClick={() => setIsNewPlanOpen(true)} className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Create First Boost Plan
              </Button>
            </div>

            <DateRangeFilter 
              onDateRangeChange={handleDateRangeChange}
              isLoading={isLoading}
            />

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Boost Plans Found</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                  You haven't created any boost plans yet. Boost plans help sellers increase their product visibility.
                </p>
                <Button onClick={() => setIsNewPlanOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Boost Plan
                </Button>
              </CardContent>
            </Card>
          </div>

          <NewPlanModalDrawer
            open={isNewPlanOpen}
            onOpenChange={setIsNewPlanOpen}
            onSuccess={() => fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType)}
            userId={user?.id || user?.user_id}
          />
        </SidebarLayout>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Boosts Management</h1>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <InteractiveNumberCard
                  title="Total Boosts"
                  value={boostMetrics.total_boosts || boosts.length}
                  icon={<Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-blue-600"
                  growth={growthMetrics.boost_growth}
                  periodDays={growthMetrics.period_days}
                  subtitle={`${boostMetrics.active_boosts} active boosts`}
                  breakdown={[
                    { label: "By Status", value: boostMetrics.total_boosts || boosts.length, color: "bg-blue-500" },
                    ...totalBoostsBreakdown.byStatus,
                    { label: "──────────", value: 0, color: "bg-transparent" },
                    { label: "By Type", value: boostMetrics.total_boosts || boosts.length, color: "bg-blue-500" },
                    ...totalBoostsBreakdown.byType,
                  ]}
                  totalLabel="Total Boosts"
                />

                <InteractiveNumberCard
                  title="Total Revenue"
                  value={boostMetrics.total_revenue || boosts.reduce((sum, b) => sum + b.cost, 0)}
                  icon={<PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-green-600"
                  suffix=""
                  growth={growthMetrics.revenue_growth}
                  periodDays={growthMetrics.period_days}
                  subtitle="From all boosts"
                  breakdown={[
                    { label: "By Status", value: boostMetrics.total_revenue || boosts.reduce((sum, b) => sum + b.cost, 0), color: "bg-green-500" },
                    ...revenueBreakdown.byStatus,
                    { label: "──────────", value: 0, color: "bg-transparent" },
                    { label: "By Type", value: boostMetrics.total_revenue || boosts.reduce((sum, b) => sum + b.cost, 0), color: "bg-green-500" },
                    ...revenueBreakdown.byType,
                  ]}
                  totalLabel="Total Revenue"
                />

                <InteractiveNumberCard
                  title="Active Plans"
                  value={plansSummary.active_plans}
                  icon={<Package className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-purple-600"
                  subtitle={`${plansSummary.inactive_plans} inactive, ${plansSummary.archived_plans} archived`}
                  breakdown={[
                    { label: "By Status", value: boostPlans.length, color: "bg-purple-500" },
                    ...activePlansBreakdown.byStatus,
                  ]}
                  totalLabel="Total Plans"
                />

                <InteractiveNumberCard
                  title="Plan Revenue"
                  value={totalPlansRevenue}
                  icon={<TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-yellow-600"
                  suffix=""
                  subtitle="Total from all plans"
                  breakdown={[
                    { label: "Top Plans by Revenue", value: totalPlansRevenue, color: "bg-yellow-500" },
                    ...planRevenueBreakdown.byPlan.slice(0, 5),
                  ]}
                  totalLabel="Total Plan Revenue"
                />
              </>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className='flex gap-3'>
                <h2 className="text-xl font-semibold">Boost Plans</h2>
                <Badge variant="secondary" className="text-xs">
                  {boostPlans.length} total
                </Badge>
              </div>
              <Button onClick={() => setIsNewPlanOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boostPlans.map((plan) => {
                  const normalizedStatus = normalizePlanStatus(plan.status);
                  const safeFeatures = getFeaturesAsArray(plan.features);
                  
                  return (
                  <Card key={plan.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            <PlanStatusBadge status={plan.status} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {plan.description}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => console.log('Edit plan:', plan.id)}>
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                const actionType = normalizedStatus === 'Active' ? 'deactivate' : 'activate';
                                await updateBoostPlanStatus(plan.id, actionType);
                              }}
                            >
                              {normalizedStatus === 'Active' ? (
                                <>
                                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-3.5 w-3.5" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {normalizedStatus !== 'Archived' && (
                              <DropdownMenuItem 
                                onClick={async () => await updateBoostPlanStatus(plan.id, 'archive')}
                              >
                                <Archive className="mr-2 h-3.5 w-3.5" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            {normalizedStatus === 'Archived' && (
                              <DropdownMenuItem 
                                onClick={async () => await updateBoostPlanStatus(plan.id, 'restore')}
                              >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                Restore
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold">₱{plan.price.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">/plan</span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                            {plan.duration} {getTimeUnitDisplay(plan.timeUnit, plan.duration)}
                          </div>
                        </div>

                        {safeFeatures && safeFeatures.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">Includes:</span>
                              <span className="text-xs text-blue-600">
                                {safeFeatures.length} features
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {safeFeatures.slice(0, 3).map((feature, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700"
                                >
                                  {typeof feature === 'string' ? (feature.split(' ')[0] || feature.substring(0, 15)) : String(feature).substring(0, 15)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Usage</p>
                            <p className="text-sm font-semibold">{plan.usageCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-sm font-semibold">₱{plan.revenue.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-xs font-medium truncate">
                              {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="pt-2 border-t">
                      <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">By: {plan.createdBy}</span>
                        <span className="whitespace-nowrap">
                          Updated: {new Date(plan.updatedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Boosts</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading boosts...' : `Showing ${boosts.length} boosts`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable 
                columns={columns} 
                data={boosts}
                filterConfig={boostFilterConfig}
                searchConfig={{
                  column: "shopName",
                  placeholder: "Search by shop name..."
                }}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>

        <NewPlanModalDrawer
          open={isNewPlanOpen}
          onOpenChange={setIsNewPlanOpen}
          onSuccess={() => fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType)}
          userId={user?.id || user?.user_id}
        />
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<Boost>[] = [
  {
    accessorKey: "shopName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Shop
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
        <Store className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <div className="font-medium text-xs sm:text-sm truncate">
          <Link 
            to={`/admin/shops/${row.original.shop_id}`}
            className="hover:underline"
          >
            {row.getValue("shopName")}
          </Link>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "shopOwner",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Owner
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{row.getValue("shopOwner")}</span>
      </div>
    ),
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => (
      <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm truncate">
        <Link 
          to={`/admin/products/${row.original.product_id}`}
          className="hover:underline flex items-center gap-1"
        >
          <Package className="w-3 h-3 text-muted-foreground" />
          {row.getValue("productName")}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "boostType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("boostType") as string;
      const getColor = (boostType: string) => {
        switch(boostType) {
          case 'Starter Boost': return '#10b981';
          case 'Basic Boost': return '#3b82f6';
          case 'Premium Boost': return '#8b5cf6';
          case 'Ultimate Boost': return '#f59e0b';
          case 'Pro Boost': return '#ef4444';
          default: return '#6b7280';
        }
      };
      const color = getColor(type);
      
      return (
        <Badge 
          variant="secondary" 
          className="text-xs px-2"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <BoostStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Start Date
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined
      });
      
      return (
        <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        End Date
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("endDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined
      });
      
      return (
        <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Duration
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <span>{row.getValue("duration")}d</span>
      </div>
    ),
  },
  {
    accessorKey: "cost",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Cost
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
        ₱{parseFloat(row.getValue("cost")).toLocaleString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const boost = row.original;
      
      const handleAction = async (actionType: string) => {
        let reason = '';

        if (actionType === 'suspend' || actionType === 'cancel') {
          reason = prompt(`Enter reason for ${actionType}:`) || '';
          if (!reason) {
            toast.error('Reason is required');
            return;
          }
        }

        try {
          const sessionUserId = localStorage.getItem('userId') || 
                               (window as any).user?.id || 
                               '';
          
          const payload = {
            boost_id: boost.id,
            action_type: actionType,
            user_id: sessionUserId,
            ...(reason && { reason })
          };

          const response = await AxiosInstance.put('/admin-boosting/update_boost_status/', payload);
          
          if (response.data.success || response.data.message) {
            toast.success(response.data.message || 'Boost status updated successfully');
            window.location.reload();
          } else {
            toast.error(response.data.error || 'Failed to update boost status');
          }
        } catch (error: any) {
          console.error('Error updating boost status:', error);
          toast.error(error.response?.data?.error || 'Failed to update boost status');
        }
      };

      const getAvailableActions = () => {
        const actions = [];
        const normalizedStatus = normalizeBoostStatus(boost.status);
        
        if (normalizedStatus === 'Active') {
          actions.push({ label: 'Suspend Boost', action: 'suspend', variant: 'destructive' as const });
          actions.push({ label: 'Cancel Boost', action: 'cancel', variant: 'destructive' as const });
        }
        
        if (normalizedStatus === 'Pending') {
          actions.push({ label: 'Approve Boost', action: 'approve', variant: 'default' as const });
          actions.push({ label: 'Reject Boost', action: 'reject', variant: 'destructive' as const });
        }
        
        if (normalizedStatus === 'Suspended') {
          actions.push({ label: 'Resume Boost', action: 'resume', variant: 'default' as const });
          actions.push({ label: 'Cancel Boost', action: 'cancel', variant: 'destructive' as const });
        }
        
        if (normalizedStatus === 'Expired') {
          actions.push({ label: 'Renew Boost', action: 'renew', variant: 'default' as const });
        }
        
        if (normalizedStatus === 'Cancelled') {
          actions.push({ label: 'Restore Boost', action: 'restore', variant: 'default' as const });
        }
        
        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
          <Link 
            to={`/admin/boosting/${boost.id}`}
            className="text-primary hover:text-primary/80 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          
          {actions.length > 0 && (
            <Select onValueChange={(value) => handleAction(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.action} value={action.action}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    },
  },
];