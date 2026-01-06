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
import { useToast } from '~/hooks/use-toast';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Dispute Management | Admin",
    },
  ];
}

type DisputeStatus = 'filed' | 'under_review' | 'approved' | 'rejected' | 'resolved';

interface DisputeEvidenceItem {
  id: string;
  file_type?: string | null;
  file_data?: string | null;
  uploaded_by?: any;
  created_at?: string | null;
}

interface Dispute {
  id: string;
  refund_id?: string | null;
  requested_by?: { id?: string; username?: string; email?: string } | string | null;
  requested_by_name?: string | null; // convenience
  processed_by?: { id?: string; username?: string; email?: string } | string | null;
  reason: string;
  status: DisputeStatus;
  admin_notes?: string | null;
  evidences?: DisputeEvidenceItem[];
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  // optional: linked refund summary
  refund?: {
    id?: string | null;
    status?: string | null;
    amount?: number | null;
  } | null;
}

interface DisputeStats {
  total: number;
  filed: number;
  under_review: number;
  approved: number;
  rejected: number;
  resolved: number;
  averageResolutionTime: string;
  buyerWinRate: string;
}

interface LoaderData {
  user: any;
  initialDisputes: Dispute[];
  initialStats: DisputeStats;
}

// Helper function to fetch disputes from Django API
async function fetchDisputesFromAPI(userId?: string) {
  try {
    // Assuming your Django API is running on localhost:8000
    // Adjust the URL as needed
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-Id'] = String(userId);
    const response = await fetch('http://localhost:8000/api/disputes/', {
      headers,
    });
    
    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      throw new Error(txt || `API request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const txt = await response.text().catch(() => '');
      throw new Error(txt || 'Unexpected response content type');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return [];
  }
}

// Helper function to fetch stats from Django API
async function fetchStatsFromAPI(userId?: string) {
  try {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-Id'] = String(userId);
    const response = await fetch('http://localhost:8000/api/disputes/stats/', {
      headers,
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      throw new Error(txt || `API request failed with status ${response.status}`);
    }

    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const txt = await response.text().catch(() => '');
      throw new Error(txt || 'Unexpected response content type');
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
      rejected: 0,
      resolved: 0,
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
  const userIdForApi = user?.id || user?.username || user?.email;
  const [initialDisputes, initialStats] = await Promise.all([
    fetchDisputesFromAPI(userIdForApi),
    fetchStatsFromAPI(userIdForApi),
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
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 hover:bg-red-100' },
    resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  };

  return (
    <Badge className={cn("font-medium", variants[status].color)}>
      {variants[status].label}
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

  const label = reasonMap[reason] ?? reason ?? 'Other';
  const icon = iconMap[reason] ?? <FileText className="h-4 w-4" />;

  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
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
    accessorKey: "refund_id",
    header: "Refund ID",
    cell: ({ row }: any) => {
      const r = row.original.refund_id || row.original.refund || row.original.refundId || (row.original.refund && (row.original.refund.id || row.original.refund.refund_id));
      const val = typeof r === 'object' ? (r.refund_id || r.id) : r;
      return <div className="font-mono text-sm">{val ? String(val).substring(0, 8) + '...' : 'N/A'}</div>;
    }
  },
  {
    accessorKey: "requested_by",
    header: "Requested By",
    cell: ({ row }: any) => {
      const r = row.original.requested_by || row.original.requested_by_name || row.original.filed_by_name || row.original.filedByName;
      if (!r) return <div>Unknown</div>;
      if (typeof r === 'string') return <div className="font-medium">{r}</div>;
      const name = (r.first_name && r.last_name) ? `${r.first_name} ${r.last_name}` : (r.username || r.email || r.id);
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Filed At",
    cell: ({ row }: any) => {
      const value = row.original.created_at ?? row.original.createdAt ?? row.original.requested_at ?? row.original.requestedAt;
      return <div className="text-sm">{value ? new Date(value).toLocaleString() : "N/A"}</div>;
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => <ReasonDisplay reason={row.original.reason} />,
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
                try {
                  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                  const safeUserId = (window as any).__currentUserId || '';
                  if (safeUserId) headers['X-User-Id'] = String(safeUserId);

                  const res = await fetch(`http://localhost:8000/api/disputes/${dispute.id}/start_review/`, {
                    method: 'POST',
                    headers,
                  });

                  if (!res.ok) {
                    let msg = `Failed to start review (status ${res.status})`;
                    try {
                      const j = await res.json();
                      msg = j?.error || j?.detail || msg;
                    } catch (_) {}
                    throw new Error(msg);
                  }

                  // success toast + navigate to details so admin can continue review
                  if ((window as any).toast) {
                    (window as any).toast({ title: 'Review started', description: 'Dispute marked as under review', variant: 'success' });
                  }
                  // Navigate to the dispute details view to continue the review
                  window.location.href = `/admin/dispute/${dispute.id}`;
                } catch (err) {
                  console.error('Start review failed', err);
                  if ((window as any).toast) {
                    (window as any).toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Failed to start review', variant: 'destructive' });
                  } else {
                    alert('Failed to start review.');
                  }
                }
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Review
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
  const [adminNote, setAdminNote] = useState(dispute.admin_notes || '');
  const [status, setStatus] = useState<DisputeStatus>(dispute.status);

  const handleSave = async () => {
    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if ((window as any).__currentUserId) headers['X-User-Id'] = String((window as any).__currentUserId);
      const response = await fetch(`http://localhost:8000/api/disputes/${dispute.id}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          admin_notes: adminNote || null,
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
                    <Label className="text-sm font-medium text-gray-600">Filed Date</Label>
                    <p className="mt-1 text-sm">
                      {format(new Date(dispute.created_at || ''), 'PPpp')}
                    </p>
                  </div>
                  {dispute.processed_by && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Processed By</Label>
                      <p className="mt-1 text-sm">{typeof dispute.processed_by === 'string' ? dispute.processed_by : (dispute.processed_by.username || dispute.processed_by.id)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Refund / Reference</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Refund ID</Label>
                    <p className="mt-1 font-medium">{dispute.refund_id || 'N/A'}</p>
                  </div>
                  {dispute.refund && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Refund Summary</Label>
                      <p className="mt-1 text-lg font-medium text-red-600">
                        {dispute.refund.amount ? `$${dispute.refund.amount.toFixed(2)}` : 'N/A'} {dispute.refund.status ? `(${dispute.refund.status})` : ''}
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
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
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
                    Filed By
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{typeof dispute.requested_by === 'string' ? dispute.requested_by : (dispute.requested_by?.username || dispute.requested_by_name || dispute.requested_by?.id || 'User')}</h4>
                      <p className="text-sm text-gray-600">Requester</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      <span>{typeof dispute.requested_by === 'object' ? (dispute.requested_by?.email || '') : ''}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>


            </div>
          </TabsContent>

          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Evidence ({(dispute.evidences || []).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(dispute.evidences || []).length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Evidence</h4>
                          <p className="text-sm text-gray-600">Submitted {format(new Date(dispute.created_at || ''), 'PP')}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => window.alert('Download all not implemented')}>
                          <Download className="mr-2 h-4 w-4" />
                          Download All
                        </Button>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {(dispute.evidences || []).map((ev) => (
                          <div key={ev.id} className="aspect-square rounded-lg border bg-gray-50 p-2 flex items-center justify-center">
                            {ev.file_data ? (
                              <a href={ev.file_data} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a>
                            ) : (
                              <FileText className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
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
  const { toast } = useToast();

  // Helper: determine if an id looks like a UUID
  const isLikelyUUID = (id?: string | number) => {
    if (!id) return false;
    const s = String(id);
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
  };

  const getSafeUserId = (user: any) => {
    if (!user) return '';
    // Prefer a real UUID id if present
    if (user.id && isLikelyUUID(user.id)) return user.id;
    // Fallback to username or email if available
    if (user.username) return user.username;
    if (user.email) return user.email;
    // Otherwise return id (may be numeric) — higher risk
    return user.id || '';
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      const safeUserId = getSafeUserId(loaderData?.user);
      if (safeUserId) headers['X-User-Id'] = String(safeUserId);

      const response = await fetch('/api/disputes/', { headers });

      const ct = response.headers.get('content-type') || '';
      // Prefer extracting JSON error details when possible, but avoid surfacing raw HTML
      if (!response.ok) {
        let msg = `API request failed with status ${response.status}`;
        try {
          const j = await response.json();
          msg = j?.error || j?.detail || msg;
        } catch (_) {
          // non-json response — keep generic message
        }
        throw new Error(msg);
      }
      if (!ct.includes('application/json')) {
        throw new Error('Unexpected non-JSON response from server');
      }

      const data = await response.json();
      setDisputes(data.results || data || []);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
      if ((window as any).toast) (window as any).toast({ title: 'Failed to load disputes', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }; 

  const fetchStats = async () => {
    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      const safeUserId = getSafeUserId(loaderData?.user);
      if (safeUserId) headers['X-User-Id'] = String(safeUserId);

      const response = await fetch('/api/disputes/stats/', { headers });

      const ct = response.headers.get('content-type') || '';
      if (!response.ok) {
        let msg = `API request failed with status ${response.status}`;
        try {
          const j = await response.json();
          msg = j?.error || j?.detail || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      if (!ct.includes('application/json')) {
        throw new Error('Unexpected non-JSON response from server');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }; 

  // expose refresh helper and current user so action handlers in column cells can refresh the list and send correct headers
  useEffect(() => {
    (window as any).refreshDisputes = fetchDisputes;
    (window as any).toast = toast;
    (window as any).__currentUserId = getSafeUserId(loaderData?.user);
    return () => { delete (window as any).refreshDisputes; delete (window as any).toast; delete (window as any).__currentUserId; };
  }, [toast, loaderData]);

  const handleViewDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setIsDetailOpen(true);
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.id.toLowerCase().includes(search.toLowerCase()) ||
      String(dispute.id || '').toLowerCase().includes(search.toLowerCase()) ||
      String(dispute.refund_id || '').toLowerCase().includes(search.toLowerCase()) ||
      String(dispute.reason || '').toLowerCase().includes(search.toLowerCase()) ||
      String((typeof dispute.requested_by === 'string' ? dispute.requested_by : (dispute.requested_by?.username || dispute.requested_by_name || ''))).toLowerCase().includes(search.toLowerCase());
    
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
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <SimpleDateRangeFilter />
                  <Button variant="outline" onClick={() => {
                    // Export functionality
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + filteredDisputes.map(d => 
                        `${d.id},${d.refund_id || ''},${d.requested_by_name || d.requested_by || ''},${d.reason},${d.status || ''},${d.created_at || ''}`
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
                    variant={statusFilter === 'filed' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('filed')}
                    className="flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Filed ({stats.filed})
                  </Button>
                  <Button 
                    variant={statusFilter === 'resolved' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('resolved')}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Resolved ({stats.resolved})
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