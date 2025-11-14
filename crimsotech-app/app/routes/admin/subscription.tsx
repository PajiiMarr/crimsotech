// app/routes/admin/subscription.tsx
import type { Route } from './+types/subscription'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { 
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Eye,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useState } from 'react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Subscription | Admin",
    },
  ];
}

// Define proper types
interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  interval: string;
  subscribers: number;
  revenue: number;
  features: string[];
  status: string;
}

interface Subscription {
  id: number;
  customerName: string;
  customerEmail: string;
  plan: string;
  status: string;
  startDate: string;
  nextBillingDate: string;
  amount: number;
  paymentMethod: string;
}

interface LoaderData {
  user: any;
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
  
  return { user };
}

// Mock data
const mockPlans: SubscriptionPlan[] = [
  {
    id: 1,
    name: "Basic",
    price: 299,
    interval: "monthly",
    subscribers: 145,
    revenue: 43355,
    features: ["5 product listings", "Basic analytics", "Email support"],
    status: "Active"
  },
  {
    id: 2,
    name: "Pro",
    price: 599,
    interval: "monthly",
    subscribers: 89,
    revenue: 53311,
    features: ["20 product listings", "Advanced analytics", "Priority support", "Boost products"],
    status: "Active"
  },
  {
    id: 3,
    name: "Premium",
    price: 1299,
    interval: "monthly",
    subscribers: 34,
    revenue: 44166,
    features: ["Unlimited listings", "Full analytics suite", "24/7 support", "Premium boost", "API access"],
    status: "Active"
  },
  {
    id: 4,
    name: "Enterprise",
    price: 2999,
    interval: "monthly",
    subscribers: 12,
    revenue: 35988,
    features: ["Everything in Premium", "Custom integrations", "Dedicated account manager", "White-label options"],
    status: "Active"
  },
  {
    id: 5,
    name: "Starter (Legacy)",
    price: 149,
    interval: "monthly",
    subscribers: 8,
    revenue: 1192,
    features: ["3 product listings", "Basic support"],
    status: "Inactive"
  }
];

const mockSubscriptions: Subscription[] = [
  {
    id: 1,
    customerName: "John Doe",
    customerEmail: "john@example.com",
    plan: "Premium",
    status: "Active",
    startDate: "2023-06-15",
    nextBillingDate: "2024-12-15",
    amount: 1299,
    paymentMethod: "Credit Card"
  },
  {
    id: 2,
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    plan: "Pro",
    status: "Active",
    startDate: "2023-08-20",
    nextBillingDate: "2024-12-20",
    amount: 599,
    paymentMethod: "PayPal"
  },
  {
    id: 3,
    customerName: "Mike Johnson",
    customerEmail: "mike@example.com",
    plan: "Basic",
    status: "Active",
    startDate: "2023-09-10",
    nextBillingDate: "2024-12-10",
    amount: 299,
    paymentMethod: "Credit Card"
  },
  {
    id: 4,
    customerName: "Sarah Lee",
    customerEmail: "sarah@example.com",
    plan: "Enterprise",
    status: "Active",
    startDate: "2023-05-01",
    nextBillingDate: "2024-12-01",
    amount: 2999,
    paymentMethod: "Bank Transfer"
  },
  {
    id: 5,
    customerName: "David Wong",
    customerEmail: "david@example.com",
    plan: "Pro",
    status: "Cancelled",
    startDate: "2023-03-15",
    nextBillingDate: "2024-11-15",
    amount: 599,
    paymentMethod: "Credit Card"
  },
  {
    id: 6,
    customerName: "Maria Garcia",
    customerEmail: "maria@example.com",
    plan: "Basic",
    status: "Past Due",
    startDate: "2023-07-22",
    nextBillingDate: "2024-11-22",
    amount: 299,
    paymentMethod: "Credit Card"
  },
  {
    id: 7,
    customerName: "Chris Taylor",
    customerEmail: "chris@example.com",
    plan: "Premium",
    status: "Active",
    startDate: "2023-04-10",
    nextBillingDate: "2024-12-10",
    amount: 1299,
    paymentMethod: "PayPal"
  },
  {
    id: 8,
    customerName: "Amy Chen",
    customerEmail: "amy@example.com",
    plan: "Basic",
    status: "Trial",
    startDate: "2023-11-01",
    nextBillingDate: "2024-12-01",
    amount: 299,
    paymentMethod: "Not set"
  }
];

// Top plans by subscriber count
const topPlansBySubscribers = [
  { name: 'Basic', subscribers: 145, revenue: 43355 },
  { name: 'Pro', subscribers: 89, revenue: 53311 },
  { name: 'Premium', subscribers: 34, revenue: 44166 },
  { name: 'Enterprise', subscribers: 12, revenue: 35988 },
  { name: 'Starter', subscribers: 8, revenue: 1192 },
];

// Plan revenue contribution
const planRevenueData = [
  { name: 'Basic', value: 43355, percentage: 24.4 },
  { name: 'Pro', value: 53311, percentage: 30.0 },
  { name: 'Premium', value: 44166, percentage: 24.9 },
  { name: 'Enterprise', value: 35988, percentage: 20.3 },
  { name: 'Starter', value: 1192, percentage: 0.7 },
];

// New subscriptions trend (last 6 months)
const subscriptionTrendData = [
  { month: 'Jun', newSubs: 32, cancelled: 8 },
  { month: 'Jul', newSubs: 45, cancelled: 12 },
  { month: 'Aug', newSubs: 38, cancelled: 10 },
  { month: 'Sep', newSubs: 52, cancelled: 15 },
  { month: 'Oct', newSubs: 48, cancelled: 9 },
  { month: 'Nov', newSubs: 61, cancelled: 11 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Subscription({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading subscriptions...</div>
      </div>
    );
  }

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.plan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || sub.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'Active').length;
  const totalMRR = mockPlans.reduce((acc, plan) => acc + plan.revenue, 0);
  const totalSubscribers = mockPlans.reduce((acc, plan) => acc + plan.subscribers, 0);
  
  // Calculate churn rate (cancelled / total active in period)
  const cancelledThisMonth = subscriptionTrendData[subscriptionTrendData.length - 1].cancelled;
  const churnRate = ((cancelledThisMonth / (activeSubscriptions + cancelledThisMonth)) * 100).toFixed(1);

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Subscriptions</h1>
              <p className="text-muted-foreground mt-1">Manage subscription plans and billing</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                    <p className="text-2xl font-bold mt-1">{activeSubscriptions}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +12% from last month
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                    <p className="text-2xl font-bold mt-1">₱{totalMRR.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +8.5% from last month
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Churn Rate</p>
                    <p className="text-2xl font-bold mt-1">{churnRate}%</p>
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      This month
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Plans</p>
                    <p className="text-2xl font-bold mt-1">{mockPlans.length}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {mockPlans.filter(p => p.status === 'Active').length} active
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Plans by Subscriber Count */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Plans by Subscribers</CardTitle>
                <CardDescription>Most popular subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPlansBySubscribers}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="subscribers" fill="#3b82f6" name="Subscribers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Plan Revenue Contribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Revenue contribution per plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planRevenueData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(d: any) => `${d.name} (${d.percentage}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₱${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Trends</CardTitle>
              <CardDescription>New subscriptions vs cancellations (Last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={subscriptionTrendData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="newSubs" 
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981" 
                    name="New Subscriptions"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cancelled" 
                    stackId="2"
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    name="Cancelled"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscription Plans List */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>
                All available subscription plans and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockPlans.map((plan) => (
                  <Card key={plan.id} className={plan.status === 'Inactive' ? 'opacity-60' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          <Badge variant={plan.status === 'Active' ? 'default' : 'secondary'} className="mt-2">
                            {plan.status}
                          </Badge>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedPlan(plan)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <PlanDetailsDialog plan={selectedPlan} />
                        </Dialog>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-3xl font-bold">₱{plan.price}</p>
                          <p className="text-sm text-muted-foreground">per {plan.interval}</p>
                        </div>
                        
                        <div className="pt-3 border-t space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Subscribers</span>
                            <span className="font-semibold flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {plan.subscribers}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Revenue</span>
                            <span className="font-semibold text-green-600">
                              ₱{plan.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Features:</p>
                          <ul className="text-xs space-y-1">
                            {plan.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                {feature}
                              </li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-muted-foreground">
                                +{plan.features.length - 3} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subscription History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription History</CardTitle>
              <CardDescription>
                All subscription records with status and billing information
              </CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer, email, or plan..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Trial">Trial</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Past Due">Past Due</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.customerName}</div>
                          <div className="text-xs text-muted-foreground">{sub.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            sub.status === 'Active' ? 'default' : 
                            sub.status === 'Trial' ? 'secondary' :
                            sub.status === 'Past Due' ? 'destructive' :
                            'outline'
                          }
                          className="flex items-center gap-1 w-fit"
                        >
                          {sub.status === 'Active' && <CheckCircle className="w-3 h-3" />}
                          {sub.status === 'Trial' && <Clock className="w-3 h-3" />}
                          {sub.status === 'Cancelled' && <XCircle className="w-3 h-3" />}
                          {sub.status === 'Past Due' && <AlertCircle className="w-3 h-3" />}
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(sub.startDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(sub.nextBillingDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₱{sub.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{sub.paymentMethod}</span>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

// Plan Details Dialog Component
interface PlanDetailsDialogProps {
  plan: SubscriptionPlan | null;
}

function PlanDetailsDialog({ plan }: PlanDetailsDialogProps) {
  if (!plan) return null;

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {plan.name} Plan
          <Badge variant={plan.status === 'Active' ? 'default' : 'secondary'}>
            {plan.status}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Complete plan details and statistics
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Pricing */}
        <div>
          <h4 className="font-semibold mb-3">Pricing</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">₱{plan.price}</span>
            <span className="text-muted-foreground">per {plan.interval}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
            <p className="text-2xl font-bold mt-1">{plan.subscribers}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              ₱{plan.revenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Features */}
        <div>
          <h4 className="font-semibold mb-3">Features Included</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Billing Interval</p>
              <p className="font-medium capitalize">{plan.interval}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan Status</p>
              <p className="font-medium">{plan.status}</p>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}