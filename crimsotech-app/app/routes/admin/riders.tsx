// app/routes/admin/riders.tsx
import { toast } from 'sonner';
import type { Route } from './+types/riders';
import SidebarLayout from '~/components/layouts/sidebar'
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
import { Skeleton } from '~/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Progress } from "~/components/ui/progress"
import { useIsMobile } from "~/hooks/use-mobile"
import { 
  Users,
  TrendingUp,
  Clock,
  ArrowUpDown,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Star,
  Package,
  Phone,
  Mail,
  Car,
  FileText,
  Shield,
  Eye,
  RefreshCw,
  Ban,
  Circle,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, useSearchParams, Link } from 'react-router';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Riders | Admin",
    },
  ];
}

// Interface that matches EXACT Django Rider model structure
interface Rider {
  rider: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    contact_number: string;
    created_at: string;
    is_rider: boolean;
  };
  vehicle_type: string;
  plate_number: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_image: string | null;
  license_number: string;
  license_image: string | null;
  verified: boolean;
  approved_by: {
    id: string;
    username: string;
  } | null;
  approval_date: string | null;
  total_deliveries?: number;
  completed_deliveries?: number;
  average_rating?: number;
  total_earnings?: number;
  rider_status?: 'pending' | 'approved' | 'rejected' | 'suspended';
}

interface RiderMetrics {
  total_riders: number;
  pending_riders: number;
  approved_riders: number;
  active_riders: number;
  total_deliveries: number;
  completed_deliveries: number;
  success_rate: number;
  average_rating: number;
  total_earnings: number;
  all_time_total_riders?: number;
  all_time_total_deliveries?: number;
  all_time_completed_deliveries?: number;
}

interface RiderAnalytics {
  rider_registrations: Array<{ date: string; count: number }>;
  status_distribution: Array<{ name: string; value: number }>;
  vehicle_type_distribution: Array<{ name: string; value: number }>;
  performance_trends: Array<{ month: string; deliveries: number; earnings: number; rating: number }>;
  period_type: string;
}

interface LoaderData {
  user: any;
  riderMetrics: RiderMetrics;
  riders: Rider[];
  analytics: RiderAnalytics;
  dateRange: {
    start: string;
    end: string;
    rangeType: string;
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

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const rangeTypeParam = url.searchParams.get('rangeType');

  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date();
  
  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;
  const rangeType = rangeTypeParam || 'weekly';

  const validStart = !isNaN(startDate.getTime()) ? startDate : defaultStart;
  const validEnd = !isNaN(endDate.getTime()) ? endDate : defaultEnd;

  let riderMetrics: RiderMetrics = {
    total_riders: 0,
    pending_riders: 0,
    approved_riders: 0,
    active_riders: 0,
    total_deliveries: 0,
    completed_deliveries: 0,
    success_rate: 0,
    average_rating: 0,
    total_earnings: 0,
  };

  let ridersList: Rider[] = [];
  let analyticsData: RiderAnalytics = {
    rider_registrations: [],
    status_distribution: [],
    vehicle_type_distribution: [],
    performance_trends: [],
    period_type: 'daily'
  };

  try {
    const response = await AxiosInstance.get('/admin-riders/get_metrics/', {
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString()
      },
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (response.data.success) {
      riderMetrics = response.data.metrics || riderMetrics;
      ridersList = response.data.riders || [];
      analyticsData = response.data.analytics || analyticsData;
    }
  } catch (error) {
    console.log('API fetch failed - no data available');
  }

  return { 
    user, 
    riderMetrics,
    riders: ridersList,
    analytics: analyticsData,
    dateRange: {
      start: validStart.toISOString(),
      end: validEnd.toISOString(),
      rangeType
    }
  };
}

// Status Badge Component for riders
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'approved':
        return {
          className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
          icon: CheckCircle,
          iconClassName: 'text-green-600'
        };
      case 'pending':
        return {
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
          icon: Clock,
          iconClassName: 'text-yellow-600'
        };
      case 'rejected':
        return {
          className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
          icon: XCircle,
          iconClassName: 'text-red-600'
        };
      case 'suspended':
        return {
          className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
          icon: Ban,
          iconClassName: 'text-gray-600'
        };
      default:
        return {
          className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
          icon: Circle,
          iconClassName: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary" 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </Badge>
  );
}

// Helper function to compute rider status based on model fields
const getRiderStatus = (rider: Rider): 'pending' | 'approved' | 'rejected' | 'suspended' => {
  if (rider.verified && rider.approval_date) {
    return 'approved';
  } else if (!rider.verified && !rider.approval_date) {
    return 'pending';
  } else if (!rider.verified && rider.approval_date) {
    return 'rejected';
  }
  return 'pending';
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

// MetricCardSkeleton for loading state
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

// Interactive Number Card Component
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
              <p className="text-xs text-muted-foreground mt-2">Click for breakdown</p>
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
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall {title}</p>
                  <p className="text-3xl font-bold">{formatValue(value)}{suffix}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{totalLabel}</p>
                  <p className="text-sm font-medium">{formatValue(totalBreakdownValue)} accounted</p>
                </div>
              </div>
            </div>

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

// Empty table component
const EmptyTable = () => (
  <div className="flex items-center justify-center h-32">
    <div className="text-center text-muted-foreground">
      <p>No riders found</p>
    </div>
  </div>
);

// Responsive Action Dialog Component
function ResponsiveActionDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title, 
  description,
  actionType,
  riderName
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: (reason?: string, days?: number) => Promise<void>;
  title: string;
  description: string;
  actionType: string;
  riderName: string;
}) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (actionType === 'suspend') {
        await onConfirm(reason, parseInt(days) || 7);
      } else if (actionType === 'reject') {
        await onConfirm(reason);
      } else {
        await onConfirm();
      }
      onOpenChange(false);
      setReason('');
      setDays('7');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setDays('7');
    onOpenChange(false);
  };

  const ActionForm = () => (
    <>
      <div className="space-y-4 py-4">
        <div className="text-sm">
          <span className="font-medium">Rider: </span>
          <span className="text-foreground">{riderName || 'Unknown Rider'}</span>
        </div>
        
        {(actionType === 'suspend' || actionType === 'reject') && (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason {actionType === 'reject' && <span className="text-red-500">*</span>}</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter reason for ${actionType}...`}
              required={actionType === 'reject'}
            />
          </div>
        )}
        
        {actionType === 'suspend' && (
          <div className="space-y-2">
            <Label htmlFor="days">Suspension Duration (days)</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Rider will be automatically unsuspended after {days} days.
            </p>
          </div>
        )}

        {(actionType === 'suspend' || actionType === 'reject' || actionType === 'delete') && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 mt-4">
            <p className="text-sm font-medium text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Warning: This action will affect the rider's account
            </p>
          </div>
        )}
      </div>
      
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={isLoading || (actionType === 'reject' && !reason.trim())}
          variant={actionType === 'suspend' || actionType === 'reject' ? 'destructive' : 'default'}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </div>
    </>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ActionForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <ActionForm />
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}

// Columns factory function
const columns = ({ 
  onAction, 
  navigate 
}: { 
  onAction: (riderId: string, riderName: string, actionType: string) => void;
  navigate: (path: string) => void;
}): ColumnDef<any>[] => [
  {
    accessorKey: "riderName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Rider
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const rider = row.original.rider;
      if (!rider) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium">{rider.first_name} {rider.last_name}</div>
            <div className="text-xs text-muted-foreground">@{rider.username}</div>
            <div className="text-xs text-muted-foreground">
              Joined: {formatDate(rider.created_at)}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }: { row: any}) => {
      const rider = row.original.rider;
      if (!rider) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 text-muted-foreground" />
            {rider.contact_number || 'N/A'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{rider.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "vehicle_type",
    header: "Vehicle",
    cell: ({ row }: { row: any}) => {
      const vehicle = row.original;
      if (!vehicle.vehicle_type) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Car className="w-3 h-3 text-muted-foreground" />
          <div>
            <div className="font-medium">{vehicle.vehicle_type}</div>
            <div className="text-xs text-muted-foreground">
              {vehicle.vehicle_brand} {vehicle.vehicle_model}
            </div>
            <div className="text-xs text-muted-foreground">{vehicle.plate_number}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "license",
    header: "License",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <FileText className="w-3 h-3 text-muted-foreground" />
        <span>{row.original.license_number || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: "verified",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Verified
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const verified = row.original.verified;
      
      return (
        <Badge 
          variant="secondary"
          className={`text-xs capitalize flex items-center gap-1 ${
            verified 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
          }`}
        >
          <Shield className="w-3 h-3" />
          {verified ? 'Verified' : 'Pending'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "rider_status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Status
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("rider_status") as string;
      return <StatusBadge status={status} />;
    },
  },
  {
    accessorKey: "approval_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Approved Date
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = row.original.approval_date;
      if (!date) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {formatDate(date)}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: any}) => {
      const rider = row.original;
      const riderId = rider.rider?.id;
      const riderName = rider.riderName;
      const status = rider.rider_status;
      
      const getAvailableActions = () => {
        const actions = [];
        
        if (status === 'pending') {
          actions.push(
            { label: 'Approve', action: 'approve', variant: 'default' as const },
            { label: 'Reject', action: 'reject', variant: 'destructive' as const }
          );
        } else if (status === 'approved') {
          actions.push(
            { label: 'Suspend', action: 'suspend', variant: 'destructive' as const },
            { label: 'Reject', action: 'reject', variant: 'destructive' as const }
          );
        } else if (status === 'suspended') {
          actions.push(
            { label: 'Unsuspend', action: 'unsuspend', variant: 'default' as const }
          );
        } else if (status === 'rejected') {
          actions.push(
            { label: 'Approve', action: 'approve', variant: 'default' as const }
          );
        }
        
        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => navigate(`/admin/riders/${riderId}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          {actions.length > 0 && (
            <Select onValueChange={(value) => onAction(riderId, riderName, value)}>
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

export default function Riders() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, riderMetrics, riders, analytics, dateRange } = loaderData;

  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    rangeType: dateRange.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    riderId: string;
    riderName: string;
    actionType: string;
  }>({
    open: false,
    riderId: '',
    riderName: '',
    actionType: ''
  });

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setIsLoading(true);
    
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('start', range.start.toISOString());
    newSearchParams.set('end', range.end.toISOString());
    newSearchParams.set('rangeType', range.rangeType);
    
    navigate(`?${newSearchParams.toString()}`, { replace: true });
    
    setCurrentDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  const handleRiderAction = async (riderId: string, actionType: string, reason?: string, days?: number) => {
    setIsLoading(true);
    try {
      const payload: any = {
        rider_id: riderId,
        action: actionType,
      };

      if (reason) payload.reason = reason;
      if (days) payload.suspension_days = days;

      const response = await AxiosInstance.post('/admin-riders/update_rider_status/', payload, {
        headers: {
          "X-User-Id": user?.user_id
        }
      });

      if (response.data.success) {
        toast.success(response.data.message || `Rider ${actionType}ed successfully`);
        window.location.reload();
      } else {
        toast.error(response.data.error || `Failed to ${actionType} rider`);
      }
    } catch (error: any) {
      console.error(`Error ${actionType}ing rider:`, error);
      toast.error(error.response?.data?.error || error.response?.data?.message || `Failed to ${actionType} rider`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(false);
  }, [loaderData]);

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading riders...</div>
      </div>
    );
  }

  const safeRiders = riders || [];
  const safeMetrics = riderMetrics || {
    total_riders: 0,
    pending_riders: 0,
    approved_riders: 0,
    active_riders: 0,
    total_deliveries: 0,
    completed_deliveries: 0,
    success_rate: 0,
    average_rating: 0,
    total_earnings: 0,
  };

  const hasRiders = safeRiders.length > 0;

  const ridersWithComputedStatus = safeRiders.map(rider => ({
    ...rider,
    rider_status: getRiderStatus(rider),
    riderName: `${rider.rider.first_name} ${rider.rider.last_name}`.trim() || rider.rider.username
  }));

  // Use analytics data for vehicle breakdown if available
  const getVehicleBreakdown = () => {
    if (analytics.vehicle_type_distribution && analytics.vehicle_type_distribution.length > 0) {
      return analytics.vehicle_type_distribution.map(item => ({
        label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
        value: item.value,
        percentage: (item.value / safeRiders.length) * 100,
        color: "bg-blue-500",
      }));
    }
    
    const vehicleTypes: Record<string, number> = {};
    ridersWithComputedStatus.forEach((rider) => {
      const vehicle = rider.vehicle_type || 'Unknown';
      vehicleTypes[vehicle] = (vehicleTypes[vehicle] || 0) + 1;
    });
    const totalRiders = safeRiders.length || 1;
    return Object.entries(vehicleTypes).map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
      percentage: (value / totalRiders) * 100,
      color: "bg-blue-500",
    }));
  };

  // Use analytics data for status breakdown
  const getStatusBreakdown = () => {
    if (analytics.status_distribution && analytics.status_distribution.length > 0) {
      return analytics.status_distribution.map(item => ({
        label: item.name,
        value: item.value,
        percentage: (item.value / safeMetrics.total_riders) * 100,
        color: 
          item.name === "Approved" ? "bg-green-500" :
          item.name === "Pending" ? "bg-yellow-500" :
          item.name === "Rejected" ? "bg-red-500" : "bg-gray-500",
      }));
    }
    
    const statusBreakdown: Record<string, number> = {
      'Approved': 0,
      'Pending': 0,
      'Rejected': 0,
      'Suspended': 0,
    };
    ridersWithComputedStatus.forEach((rider) => {
      const status = rider.rider_status;
      if (status === 'approved') statusBreakdown['Approved']++;
      else if (status === 'pending') statusBreakdown['Pending']++;
      else if (status === 'rejected') statusBreakdown['Rejected']++;
      else if (status === 'suspended') statusBreakdown['Suspended']++;
    });
    const totalRiders = safeMetrics.total_riders || 0;
    return Object.entries(statusBreakdown).map(([label, value]) => ({
      label,
      value,
      percentage: totalRiders > 0 ? (value / totalRiders) * 100 : 0,
      color: 
        label === "Approved" ? "bg-green-500" :
        label === "Pending" ? "bg-yellow-500" :
        label === "Rejected" ? "bg-red-500" :
        label === "Suspended" ? "bg-gray-500" : "bg-gray-500",
    }));
  };

  // Use analytics data for rating breakdown
  const getRatingBreakdown = () => {
    if (analytics.performance_trends && analytics.performance_trends.length > 0) {
      const avgRating = safeMetrics.average_rating || 0;
      return [
        { label: "4.5-5★", value: avgRating >= 4.5 ? safeRiders.length : 0, percentage: avgRating >= 4.5 ? 100 : 0, color: "bg-yellow-500" },
        { label: "4-4.4★", value: avgRating >= 4 && avgRating < 4.5 ? safeRiders.length : 0, percentage: avgRating >= 4 && avgRating < 4.5 ? 100 : 0, color: "bg-lime-500" },
        { label: "3-3.9★", value: avgRating >= 3 && avgRating < 4 ? safeRiders.length : 0, percentage: avgRating >= 3 && avgRating < 4 ? 100 : 0, color: "bg-blue-500" },
        { label: "No Rating", value: avgRating === 0 ? safeRiders.length : 0, percentage: avgRating === 0 ? 100 : 0, color: "bg-gray-500" },
      ].filter(item => item.value > 0);
    }
    
    const ratingRanges = {
      "4.5-5★": 0,
      "4-4.4★": 0,
      "3-3.9★": 0,
      "2-2.9★": 0,
      "1-1.9★": 0,
      "No Rating": 0,
    };
    ridersWithComputedStatus.forEach((rider) => {
      const rating = rider.average_rating || 0;
      if (rating >= 4.5) ratingRanges["4.5-5★"]++;
      else if (rating >= 4) ratingRanges["4-4.4★"]++;
      else if (rating >= 3) ratingRanges["3-3.9★"]++;
      else if (rating >= 2) ratingRanges["2-2.9★"]++;
      else if (rating >= 1) ratingRanges["1-1.9★"]++;
      else ratingRanges["No Rating"]++;
    });
    const totalRiders = safeRiders.length || 1;
    return Object.entries(ratingRanges).map(([label, value]) => ({
      label,
      value,
      percentage: (value / totalRiders) * 100,
      color:
        label === "4.5-5★" ? "bg-yellow-500" :
        label === "4-4.4★" ? "bg-lime-500" :
        label === "3-3.9★" ? "bg-blue-500" :
        label === "2-2.9★" ? "bg-orange-500" :
        label === "1-1.9★" ? "bg-red-500" : "bg-gray-500",
    }));
  };

  const totalRidersBreakdown = {
    byStatus: getStatusBreakdown()
  };
  const vehicleBreakdown = {
    byVehicle: getVehicleBreakdown()
  };
  const ratingBreakdown = {
    byRating: getRatingBreakdown()
  };

  const riderFilterConfig = {
    rider_status: {
      options: [...new Set(ridersWithComputedStatus.map(rider => rider.rider_status))].filter(Boolean),
      placeholder: 'Status'
    },
    vehicle_type: {
      options: [...new Set(ridersWithComputedStatus.map(rider => rider.vehicle_type))].filter(Boolean),
      placeholder: 'Vehicle Type'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Riders Management</h1>
            </div>            
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
                  title="Total Riders"
                  value={safeMetrics.total_riders || 0}
                  icon={<Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-blue-600"
                  breakdown={[
                    { label: "By Status", value: safeMetrics.total_riders || 0, color: "bg-blue-500" },
                    ...totalRidersBreakdown.byStatus,
                  ]}
                  totalLabel="Total Riders"
                />

                <InteractiveNumberCard
                  title="Total Deliveries"
                  value={safeMetrics.total_deliveries || 0}
                  icon={<Package className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-green-600"
                  breakdown={[
                    { label: "Delivery Statistics", value: safeMetrics.total_deliveries || 0, color: "bg-green-500" },
                    { label: "Completed", value: safeMetrics.completed_deliveries || 0, percentage: safeMetrics.success_rate || 0, color: "bg-green-600" },
                    { label: "Pending/Failed", value: (safeMetrics.total_deliveries || 0) - (safeMetrics.completed_deliveries || 0), percentage: 100 - (safeMetrics.success_rate || 0), color: "bg-red-500" },
                  ]}
                  totalLabel="Total Deliveries"
                />

                <InteractiveNumberCard
                  title="Success Rate"
                  value={safeMetrics.success_rate || 0}
                  icon={<TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-purple-600"
                  suffix="%"
                  breakdown={[
                    { label: "Success Rate Breakdown", value: 100, color: "bg-purple-500" },
                    { label: "Completed Deliveries", value: safeMetrics.completed_deliveries || 0, percentage: safeMetrics.success_rate || 0, color: "bg-green-500" },
                    { label: "Failed Deliveries", value: (safeMetrics.total_deliveries || 0) - (safeMetrics.completed_deliveries || 0), percentage: 100 - (safeMetrics.success_rate || 0), color: "bg-red-500" },
                  ]}
                  totalLabel="Total Deliveries"
                />

                <InteractiveNumberCard
                  title="Avg Rating"
                  value={safeMetrics.average_rating > 0 ? parseFloat(safeMetrics.average_rating.toFixed(1)) : 0}
                  icon={<Star className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-yellow-500"
                  suffix="★"
                  breakdown={[
                    { label: "Rating Distribution", value: safeRiders.length || 0, color: "bg-yellow-500" },
                    ...ratingBreakdown.byRating,
                  ]}
                  totalLabel="Total Riders"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Approved</p>
                        <p className="text-lg font-bold mt-1 text-green-600">{safeMetrics.approved_riders}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-lg font-bold mt-1 text-yellow-600">{safeMetrics.pending_riders}</p>
                      </div>
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-lg font-bold mt-1 text-blue-600">{safeMetrics.active_riders}</p>
                      </div>
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                        <p className="text-lg font-bold mt-1 text-purple-600">₱{safeMetrics.total_earnings.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Vehicle Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of riders by vehicle type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {vehicleBreakdown.byVehicle.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                    <span className="text-xs text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Riders</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading riders...' : `Showing ${ridersWithComputedStatus.length} riders`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : hasRiders ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns({
                      onAction: (riderId, riderName, actionType) => 
                        setActionDialog({ open: true, riderId, riderName, actionType }),
                      navigate: navigate
                    })} 
                    data={ridersWithComputedStatus}
                    filterConfig={riderFilterConfig}
                    searchConfig={{
                      column: "riderName",
                      placeholder: "Search by rider name..."
                    }}
                    isLoading={isLoading}
                  />
                </div>
              ) : (
                <EmptyTable />
              )}
            </CardContent>
          </Card>
        </div>

        <ResponsiveActionDialog
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
          onConfirm={(reason, days) => handleRiderAction(
            actionDialog.riderId, 
            actionDialog.actionType, 
            reason, 
            days
          )}
          title={`${actionDialog.actionType?.charAt(0).toUpperCase() + actionDialog.actionType?.slice(1)} Rider`}
          description={`Are you sure you want to ${actionDialog.actionType} this rider?`}
          actionType={actionDialog.actionType}
          riderName={actionDialog.riderName}
        />
      </SidebarLayout>
    </UserProvider>
  );
}