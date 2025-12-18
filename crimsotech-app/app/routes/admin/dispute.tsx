// app/routes/admin/disputes.tsx
import type { Route } from './+types/dispute';
import SidebarLayout from '~/components/layouts/sidebar';
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
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  HelpCircle,
  FileText,
  User,
  ShoppingBag,
  DollarSign,
  Calendar,
  MessageSquare,
  Upload,
  Download,
  Eye,
  Filter,
  Search,
  ChevronRight,
  MoreVertical,
  ArrowUpDown,
  Shield,
  Award,
  FileCheck,
  Ban,
  Check,
  X,
  AlertTriangle,
  Package,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Edit
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '~/lib/utils';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Dispute Management | Admin",
    },
  ];
}

type DisputeStatus = 'filed' | 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
type DisputeOutcome = 'buyer_wins' | 'seller_wins' | 'partial_refund' | 'dismissed' | 'withdrawn' | null;

interface Dispute {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  orderTotal: number;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string | null;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    shopName: string;
  };
  reason: string;
  reasonDisplay: string;
  description: string;
  status: DisputeStatus;
  outcome: DisputeOutcome;
  awardedAmount: number | null;
  adminNote: string | null;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  refund: {
    id: string | null;
    status: string | null;
    amount: number | null;
  } | null;

  filed_by_name?: string | null;
  filed_by_entity?: 'buyer' | 'seller' | null;
}

interface DisputeStats {
  total: number;
  filed: number;
  under_review: number;
  approved: number;
  processing: number;
  completed: number;
  rejected: number;
  cancelled: number;
  averageResolutionTime: string;
  buyerWinRate: string;
}

interface LoaderData {
  user: any;
  initialDisputes: Dispute[];
  initialStats: DisputeStats;
}

// Helper function to fetch disputes from Django API
async function fetchDisputesFromAPI() {
  try {
    // Assuming your Django API is running on localhost:8000
    // Adjust the URL as needed
    const response = await fetch('http://localhost:8000/api/disputes/', {
      headers: {
        'X-User-Id': '1', // Replace with actual user ID from session
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return [];
  }
}

// Helper function to fetch stats from Django API
async function fetchStatsFromAPI() {
  try {
    const response = await fetch('http://localhost:8000/api/disputes/stats/', {
      headers: {
        'X-User-Id': '1', // Replace with actual user ID from session
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      total: 0,
      filed: 0,
      under_review: 0,
      approved: 0,
      processing: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      averageResolutionTime: '0 days',
      buyerWinRate: '0%',
    };
  }
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  // Fetch data from Django API on server side
  const [initialDisputes, initialStats] = await Promise.all([
    fetchDisputesFromAPI(),
    fetchStatsFromAPI(),
  ]);

  return { 
    user, 
    initialDisputes: initialDisputes.results || initialDisputes || [],
    initialStats 
  };
}

// Status badge component
const StatusBadge = ({ status }: { status: DisputeStatus }) => {
  const variants: Record<DisputeStatus, { label: string; color: string }> = {
    filed: { label: 'Filed', color: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800 hover:bg-green-100' },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
    completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 hover:bg-red-100' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  };

  return (
    <Badge className={cn("font-medium", variants[status].color)}>
      {variants[status].label}
    </Badge>
  );
};

// Outcome badge component
const OutcomeBadge = ({ outcome }: { outcome: DisputeOutcome }) => {
  if (!outcome) return null;

  const variants: Record<NonNullable<DisputeOutcome>, { label: string; color: string }> = {
    buyer_wins: { label: 'Buyer Wins', color: 'bg-green-100 text-green-800 hover:bg-green-100' },
    seller_wins: { label: 'Seller Wins', color: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    partial_refund: { label: 'Partial Refund', color: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
    dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    withdrawn: { label: 'Withdrawn', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  };

  return (
    <Badge className={cn("font-medium", variants[outcome].color)}>
      {variants[outcome].label}
    </Badge>
  );
};

// Reason display component
const ReasonDisplay = ({ reason }: { reason: string }) => {
  const reasonMap: Record<string, string> = {
    'item_not_received': 'Item Not Received',
    'item_damaged': 'Item Damaged',
    'wrong_item': 'Wrong Item Received',
    'not_as_described': 'Not As Described',
    'seller_unresponsive': 'Seller Unresponsive',
    'other': 'Other',
  };

  const iconMap: Record<string, React.ReactNode> = {
    'item_not_received': <Package className="h-4 w-4" />,
    'item_damaged': <AlertTriangle className="h-4 w-4" />,
    'wrong_item': <Ban className="h-4 w-4" />,
    'not_as_described': <FileText className="h-4 w-4" />,
    'seller_unresponsive': <MessageSquare className="h-4 w-4" />,
    'other': <HelpCircle className="h-4 w-4" />,
  };

  return (
    <div className="flex items-center gap-2">
      {iconMap[reason]}
      <span>{reasonMap[reason]}</span>
    </div>
  );
};

// Columns for data table
const columns: ColumnDef<Dispute>[] = [
  {
    accessorKey: "id",
    header: "Dispute ID",
    cell: ({ row }: any) => (
      <div className="font-mono text-sm">{row.original.id?.substring(0, 8)}...</div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => <ReasonDisplay reason={row.original.reason} />,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="text-sm max-w-xs truncate">{row.original.description || "N/A"}</div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Filed At",
    cell: ({ row }: any) => {
      const value = row.original.created_at ?? row.original.createdAt;
      return <div className="text-sm">{value ? new Date(value).toLocaleString() : "N/A"}</div>;
    },
  },
  {
    accessorKey: "filed_by_name",
    header: "Filed By",
    cell: ({ row }: any) => (
      <div className="font-medium">{row.original.filed_by_name ?? row.original.filedByName ?? "Unknown"}</div>
    ),
  },
 
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }: any) => {
      const dispute = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = `/admin/dispute/${dispute.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={async () => {
                const refundId = dispute?.refund || dispute?.refund_id || dispute?.refundId;
                if (!refundId) {
                  alert("No refund id found on this dispute.");
                  return;
                }
                const admin_response = window.prompt("Admin response (required):", "Approved in favor of buyer");
                if (!admin_response) return;
                await fetch(`http://localhost:8000/api/return-refund/${encodeURIComponent(refundId)}/resolve_dispute/`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-User-Id": "1",
                  },
                  body: JSON.stringify({ admin_decision: "approved", admin_response }),
                });
                window.location.reload();
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={async () => {
                const refundId = dispute?.refund || dispute?.refund_id || dispute?.refundId;
                if (!refundId) {
                  alert("No refund id found on this dispute.");
                  return;
                }
                const admin_response = window.prompt("Admin response (required):", "Rejected in favor of seller");
                if (!admin_response) return;
                await fetch(`http://localhost:8000/api/return-refund/${encodeURIComponent(refundId)}/resolve_dispute/`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-User-Id": "1",
                  },
                  body: JSON.stringify({ admin_decision: "rejected", admin_response }),
                });
                window.location.reload();
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Stats card component
const StatsCard = ({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color: string;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-2xl font-bold mt-2">{value}</h3>
          {trend && (
            <p className={`text-sm mt-1 ${color}`}>{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('text-', '')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Dispute detail dialog component
const DisputeDetailDialog = ({ dispute, open, onOpenChange }: {
  dispute: Dispute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [adminNote, setAdminNote] = useState(dispute.adminNote || '');
  const [status, setStatus] = useState<DisputeStatus>(dispute.status);
  const [outcome, setOutcome] = useState<string>(dispute.outcome || '');
  const [awardedAmount, setAwardedAmount] = useState(dispute.awardedAmount?.toString() || '');

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/disputes/${dispute.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': '1', // Replace with actual user ID
        },
        body: JSON.stringify({
          status,
          outcome: outcome || null,
          awarded_amount: awardedAmount ? parseFloat(awardedAmount) : null,
          admin_note: adminNote,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dispute');
      }

      onOpenChange(false);
      // You might want to refresh the data here
      window.location.reload(); // Simple refresh
    } catch (error) {
      console.error('Failed to update dispute:', error);
      alert('Failed to update dispute. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispute Details</DialogTitle>
          <DialogDescription>
            Review and manage dispute #{dispute.id.substring(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parties">Parties</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispute Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Reason</Label>
                    <div className="mt-1">
                      <ReasonDisplay reason={dispute.reason} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="mt-1 text-sm">{dispute.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Filed Date</Label>
                    <p className="mt-1 text-sm">
                      {format(new Date(dispute.createdAt), 'PPpp')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Order Number</Label>
                    <p className="mt-1 font-medium">{dispute.orderNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Order Date</Label>
                    <p className="mt-1 text-sm">
                      {format(new Date(dispute.orderDate), 'PP')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Order Total</Label>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                      ${dispute.orderTotal.toFixed(2)}
                    </p>
                  </div>
                  {dispute.refund && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Refund</Label>
                      <p className="mt-1 text-lg font-medium text-red-600">
                        ${dispute.refund.amount?.toFixed(2)} ({dispute.refund.status})
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="outcome">Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer_wins">Buyer Wins</SelectItem>
                        <SelectItem value="seller_wins">Seller Wins</SelectItem>
                        <SelectItem value="partial_refund">Partial Refund</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="awardedAmount">Awarded Amount</Label>
                    <Input
                      id="awardedAmount"
                      type="number"
                      value={awardedAmount}
                      onChange={(e) => setAwardedAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={status} 
                      onValueChange={(value: string) => setStatus(value as DisputeStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filed">Filed</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="adminNote">Admin Notes</Label>
                  <Textarea
                    id="adminNote"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add notes about this dispute..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parties">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{dispute.customer.name}</h4>
                      <p className="text-sm text-gray-600">Customer</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      <span>{dispute.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{dispute.customer.phone}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Customer Profile
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Seller
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{dispute.seller.shopName}</h4>
                      <p className="text-sm text-gray-600">{dispute.seller.name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      <span>{dispute.seller.email}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Seller Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Evidence ({dispute.evidenceCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dispute.evidenceCount > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Customer Evidence</h4>
                          <p className="text-sm text-gray-600">Submitted {format(new Date(dispute.createdAt), 'PP')}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download All
                        </Button>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="aspect-square rounded-lg border bg-gray-50 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium">Seller Response</h4>
                      <p className="text-sm text-gray-600 mt-2">Awaiting response...</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="mt-4 text-lg font-semibold">No Evidence Submitted</h3>
                    <p className="text-gray-600 mt-2">No files have been uploaded for this dispute yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto py-4">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Contact Buyer</div>
                      <div className="text-sm text-gray-600">Send message to customer</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-4">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Contact Seller</div>
                      <div className="text-sm text-gray-600">Send message to seller</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-4">
                    <FileCheck className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Approve Refund</div>
                      <div className="text-sm text-gray-600">Process refund immediately</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-4">
                    <Ban className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Reject Dispute</div>
                      <div className="text-sm text-gray-600">Dismiss this dispute</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Simple DateRangeFilter wrapper to handle missing props
const SimpleDateRangeFilter = () => {
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  
  return (
    <div className="relative">
      <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
        <Calendar className="mr-2 h-4 w-4" />
        {dateRange?.from ? (
          dateRange.to ? (
            <>
              {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
            </>
          ) : (
            format(dateRange.from, "LLL dd, y")
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </Button>
    </div>
  );
};

// Custom DataTable with row click handler
const CustomDataTable = ({ 
  columns, 
  data, 
  onRowClick 
}: { 
  columns: ColumnDef<Dispute>[];
  data: Dispute[];
  onRowClick: (row: Dispute) => void;
}) => {
  return (
    <div className="rounded-md border" onClick={(e) => {
      const row = (e.target as HTMLElement).closest('tr');
      if (row && !row.querySelector('button')) {
        const disputeId = row.getAttribute('data-dispute-id');
        const dispute = data.find(d => d.id === disputeId);
        if (dispute) onRowClick(dispute);
      }
    }}>
      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
};

// Main component
export default function DisputePage({ loaderData }: { loaderData: LoaderData }) {
  const [disputes, setDisputes] = useState<Dispute[]>(loaderData.initialDisputes);
  const [stats, setStats] = useState<DisputeStats>(loaderData.initialStats);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/disputes/', {
        headers: {
          'X-User-Id': '1', // Replace with actual user ID from session
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      setDisputes(data.results || data || []);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/disputes/stats/', {
        headers: {
          'X-User-Id': '1', // Replace with actual user ID from session
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleViewDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setIsDetailOpen(true);
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.id.toLowerCase().includes(search.toLowerCase()) ||
      dispute.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      dispute.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      dispute.customer.email.toLowerCase().includes(search.toLowerCase()) ||
      dispute.seller.shopName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading && disputes.length === 0) {
    return (
      <UserProvider user={loaderData.user}>
        <SidebarLayout>
          <div className="p-6 space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={loaderData.user}>
      <SidebarLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dispute Management</h1>
              <p className="text-gray-600 mt-2">
                Review and manage customer disputes and refund requests
              </p>
            </div>
            <Button onClick={fetchDisputes}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Disputes"
              value={stats.total}
              icon={AlertCircle}
              color="text-blue-600"
            />
            <StatsCard
              title="Under Review"
              value={stats.under_review}
              icon={Clock}
              color="text-yellow-600"
            />
            <StatsCard
              title="Avg. Resolution"
              value={stats.averageResolutionTime}
              icon={CheckCircle}
              color="text-green-600"
            />
            <StatsCard
              title="Buyer Win Rate"
              value={stats.buyerWinRate}
              icon={Award}
              color="text-purple-600"
            />
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search disputes by ID, order #, customer, or shop..."
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="filed">Filed</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <SimpleDateRangeFilter />
                  <Button variant="outline" onClick={() => {
                    // Export functionality
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + filteredDisputes.map(d => 
                        `${d.id},${d.orderNumber},${d.customer.name},${d.customer.email},${d.seller.shopName},${d.reason},${d.status},${d.orderTotal}`
                      ).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "disputes.csv");
                    document.body.appendChild(link);
                    link.click();
                  }}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="mt-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({stats.total})
                  </Button>
                  <Button 
                    variant={statusFilter === 'under_review' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('under_review')}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Review ({stats.under_review})
                  </Button>
                  <Button 
                    variant={statusFilter === 'approved' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('approved')}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approved ({stats.approved})
                  </Button>
                  <Button 
                    variant={statusFilter === 'processing' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('processing')}
                  >
                    Processing ({stats.processing})
                  </Button>
                  <Button 
                    variant={statusFilter === 'completed' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('completed')}
                  >
                    Completed ({stats.completed})
                  </Button>
                  <Button 
                    variant={statusFilter === 'rejected' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('rejected')}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejected ({stats.rejected})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disputes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Disputes</CardTitle>
              <CardDescription>
                {filteredDisputes.length} dispute{filteredDisputes.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDisputes.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-4 text-lg font-semibold">No disputes found</h3>
                  <p className="text-gray-600 mt-2">
                    {search || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria.' 
                      : 'No disputes have been filed yet.'}
                  </p>
                </div>
              ) : (
                <CustomDataTable
                  columns={columns}
                  data={filteredDisputes}
                  onRowClick={handleViewDetails}
                />
              )}
            </CardContent>
          </Card>

          {/* Dispute Detail Dialog */}
          {selectedDispute && (
            <DisputeDetailDialog
              dispute={selectedDispute}
              open={isDetailOpen}
              onOpenChange={setIsDetailOpen}
            />
          )}
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}