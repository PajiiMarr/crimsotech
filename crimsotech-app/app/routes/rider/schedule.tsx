import type { Route } from "./+types/schedule"
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
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Bike,
  ArrowUpDown,
  CalendarDays,
  CalendarClock,
  CalendarOff,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  Mail,
  Phone,
  MapPin,
  User,
  Coffee,
  Power,
  Settings,
  Filter,
  Download,
  Printer,
  Sun,
  Moon,
  Star,
  Navigation,
  Package,
  DollarSign,
  BarChart,
  PieChart,
  Target,
  Award,
  Clock3,
  Clock4,
  Clock8,
  Timer,
  Zap,
  Shield,
  Truck,
  Home,
  Briefcase,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Progress } from "~/components/ui/progress";
import { Slider } from "~/components/ui/slider";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, parseISO, differenceInMinutes, addMinutes, setHours, setMinutes, isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '~/lib/utils';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Schedule | Rider Dashboard",
        },
        {
            name: "description",
            content: "Manage your delivery schedule, availability, and view upcoming deliveries"
        }
    ]
}

// Interface definitions based on Django models
interface RiderAvailabilityData {
  id: string;
  rider_id: string;
  availability_status: 'offline' | 'available' | 'busy' | 'break' | 'unavailable';
  is_accepting_deliveries: boolean;
  last_status_update: string;
  custom_schedule?: {
    monday?: { start: string; end: string; available: boolean };
    tuesday?: { start: string; end: string; available: boolean };
    wednesday?: { start: string; end: string; available: boolean };
    thursday?: { start: string; end: string; available: boolean };
    friday?: { start: string; end: string; available: boolean };
    saturday?: { start: string; end: string; available: boolean };
    sunday?: { start: string; end: string; available: boolean };
  };
  created_at: string;
  updated_at: string;
}

interface ScheduledDelivery {
  id: string;
  order: string;
  order_number: string;
  status: 'scheduled' | 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'cancelled';
  scheduled_pickup_time: string | null;
  scheduled_delivery_time: string | null;
  is_scheduled: boolean;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  distance_km: number | null;
  delivery_rating: number | null;
  notes: string | null;
  
  // Order details
  order_details?: {
    order: string;
    user: {
      username: string;
      email: string;
      contact_number: string;
    };
    shipping_address?: {
      recipient_name: string;
      street: string;
      barangay: string;
      city: string;
      province: string;
      zip_code: string;
      recipient_phone: string;
    };
    total_amount: string;
    payment_method: string;
    delivery_method: string;
  };
  
  // Customer info
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  
  // Shop info
  shop_name: string | null;
  shop_contact: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  picked_at: string | null;
  delivered_at: string | null;
}

interface CustomSchedule {
  id?: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  has_custom_schedule: boolean;
}

interface ScheduleMetrics {
  total_deliveries: number;
  upcoming_deliveries: number;
  in_progress_deliveries: number;
  completed_deliveries: number;
  avg_delivery_time: number;
  total_distance_km: number;
  average_rating: number;
  today_deliveries: number;
  peak_day: string;
  availability_percentage: number;
  avg_deliveries_per_day: number;
  has_data: boolean;
}

interface WeeklyViewData {
  date: string;
  day_of_week: number;
  day_name: string;
  is_today: boolean;
  is_available: boolean;
  start_time: string;
  end_time: string;
  deliveries_count: number;
  deliveries_preview: Array<{
    id: string;
    order_number: string;
    scheduled_time: string;
    status: string;
    customer_name: string;
  }>;
}

interface WeeklyViewResponse {
  success: boolean;
  week_start: string;
  week_end: string;
  week_offset: number;
  weekly_data: WeeklyViewData[];
  total_deliveries: number;
}

interface ScheduleDataResponse {
  success: boolean;
  rider: RiderAvailabilityData;
  schedule: CustomSchedule[];
  deliveries: ScheduledDelivery[];
  metrics: ScheduleMetrics;
}

interface LoaderData {
    user: any;
    error?: string;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isRider"]);

    return { user };
}

export default function RiderSchedule({ loaderData }: { loaderData: LoaderData }) {
    const { user } = loaderData;
    
    // State for data
    const [scheduleData, setScheduleData] = useState<ScheduleDataResponse | null>(null);
    const [weeklyView, setWeeklyView] = useState<WeeklyViewResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [weekOffset, setWeekOffset] = useState(0);
    
    // Modal states
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showDayDetailModal, setShowDayDetailModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<WeeklyViewData | null>(null);
    const [editingDay, setEditingDay] = useState<CustomSchedule | null>(null);
    
    // Form states
    const [availabilityForm, setAvailabilityForm] = useState({
        availability_status: 'available' as RiderAvailabilityData['availability_status'],
        is_accepting_deliveries: true
    });
    
    const [scheduleForm, setScheduleForm] = useState<Partial<CustomSchedule>>({
        day_of_week: 0,
        day_name: 'Monday',
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
    });

    // Schedule state for the UI
    const [schedule, setSchedule] = useState<Array<{
      value: number;
      label: string;
      is_available: boolean;
      start_time: string;
      end_time: string;
      id?: string;
    }>>([]);

    const [online, setOnline] = useState(true);

    // Get user ID from context
    const userId = user?.user_id || user?.id;

    // Update online status based on rider data
    useEffect(() => {
        if (scheduleData?.rider) {
            setOnline(scheduleData.rider.availability_status === 'available');
        }
    }, [scheduleData]);

    // Initialize schedule from API data
    useEffect(() => {
        if (scheduleData?.schedule) {
            const mappedSchedule = scheduleData.schedule.map(day => ({
                value: day.day_of_week,
                label: day.day_name,
                is_available: day.is_available,
                start_time: day.start_time,
                end_time: day.end_time,
                id: day.id
            }));
            setSchedule(mappedSchedule);
        }
    }, [scheduleData]);

    // Fetch all data
    const fetchAllData = useCallback(async (showToast = false) => {
        try {
            setIsRefreshing(true);
            
            // Fetch main schedule data
            const scheduleResponse = await AxiosInstance.get('/rider-schedule/get_schedule_data/', {
                headers: { 'X-User-Id': userId }
            });
            
            if (scheduleResponse.data.success) {
                setScheduleData(scheduleResponse.data);
                
                // Initialize availability form with current data
                setAvailabilityForm({
                    availability_status: scheduleResponse.data.rider.availability_status,
                    is_accepting_deliveries: scheduleResponse.data.rider.is_accepting_deliveries
                });
            }
            
            // Fetch weekly view
            const weeklyResponse = await AxiosInstance.get(`/rider-schedule/get_weekly_view/?week_offset=${weekOffset}`, {
                headers: { 'X-User-Id': userId }
            });
            
            if (weeklyResponse.data.success) {
                setWeeklyView(weeklyResponse.data);
            }
            
            if (showToast) {
                toast.success('Schedule data refreshed');
            }
        } catch (error: any) {
            console.error('Error fetching schedule data:', error);
            toast.error('Failed to load schedule data', {
                description: error.response?.data?.error || 'Please try again'
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [userId, weekOffset]);

    // Initial load
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Handle week changes
    useEffect(() => {
        if (!isLoading) {
            fetchWeeklyView(weekOffset);
        }
    }, [weekOffset]);

    // Fetch weekly view only
    const fetchWeeklyView = async (offset: number) => {
        try {
            const response = await AxiosInstance.get(`/rider-schedule/get_weekly_view/?week_offset=${offset}`, {
                headers: { 'X-User-Id': userId }
            });
            
            if (response.data.success) {
                setWeeklyView(response.data);
            }
        } catch (error) {
            console.error('Error fetching weekly view:', error);
        }
    };

    // Handle toggle day availability (auto-save)
    const handleToggle = (index: number) => {
        const updated = [...schedule];
        updated[index].is_available = !updated[index].is_available;
        setSchedule(updated);
        // auto-save the updated schedule
        saveSchedulePayload(updated);
    };

    // Handle time change (auto-save)
    const handleTimeChange = (index: number, field: 'start_time' | 'end_time', value: string) => {
        const updated = [...schedule];
        // @ts-ignore - dynamic field
        updated[index][field] = value;
        setSchedule(updated);
        // auto-save the updated schedule
        saveSchedulePayload(updated);
    };

    // Common save helper used for auto-save and manual save
    const saveSchedulePayload = async (scheduleArray: typeof schedule) => {
        try {
            setIsLoading(true);

            const schedulePayload = scheduleArray.map(day => ({
                day_of_week: day.value,
                start_time: day.start_time,
                end_time: day.end_time,
                is_available: day.is_available
            }));

            const response = await AxiosInstance.post('/rider-schedule/update_schedule/',
                { schedule: schedulePayload },
                { headers: { 'X-User-Id': userId } }
            );

            if (response.data.success) {
                // refresh data to keep everything in sync
                await fetchAllData(false);
                toast.success('Schedule updated');
            }
        } catch (error: any) {
            console.error('Error saving schedule (auto):', error);
            toast.error('Failed to update schedule');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle save schedule (kept for backward-compatibility/misc uses)
    const handleSave = async () => {
        await saveSchedulePayload(schedule);
    };

    // Handle updating availability
    const handleUpdateAvailability = async () => {
        try {
            setIsLoading(true);
            
            const response = await AxiosInstance.post('/rider-schedule/update_availability/', 
                availabilityForm,
                { headers: { 'X-User-Id': userId } }
            );

            if (response.data.success) {
                await fetchAllData(false);
                setShowAvailabilityModal(false);
                toast.success('Availability updated successfully');
            }
        } catch (error: any) {
            console.error('Error updating availability:', error);
            toast.error('Failed to update availability', {
                description: error.response?.data?.error || 'Please try again'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle updating a single day's schedule (from modal)
    const handleSaveDaySchedule = async () => {
        try {
            setIsLoading(true);
            
            if (!scheduleForm.day_of_week) return;
            
            // Update the local schedule
            const updatedSchedule = [...schedule];
            const index = updatedSchedule.findIndex(d => d.value === scheduleForm.day_of_week);
            
            if (index !== -1) {
                updatedSchedule[index] = {
                    ...updatedSchedule[index],
                    start_time: scheduleForm.start_time || '09:00',
                    end_time: scheduleForm.end_time || '17:00',
                    is_available: scheduleForm.is_available || false
                };
                setSchedule(updatedSchedule);
            }
            
            // Save to API
            const schedulePayload = updatedSchedule.map(day => ({
                day_of_week: day.value,
                start_time: day.start_time,
                end_time: day.end_time,
                is_available: day.is_available
            }));
            
            const response = await AxiosInstance.post('/rider-schedule/update_schedule/', 
                { schedule: schedulePayload },
                { headers: { 'X-User-Id': userId } }
            );

            if (response.data.success) {
                await fetchAllData(false);
                setShowScheduleModal(false);
                setEditingDay(null);
                setScheduleForm({
                    day_of_week: 0,
                    day_name: 'Monday',
                    start_time: '09:00',
                    end_time: '17:00',
                    is_available: true
                });
                toast.success('Schedule updated successfully');
            }
        } catch (error: any) {
            console.error('Error saving schedule:', error);
            toast.error('Failed to save schedule', {
                description: error.response?.data?.error || 'Please try again'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle editing a day's schedule
    const handleEditDay = (day: CustomSchedule) => {
        setEditingDay(day);
        setScheduleForm({
            day_of_week: day.day_of_week,
            day_name: day.day_name,
            start_time: day.start_time,
            end_time: day.end_time,
            is_available: day.is_available
        });
        setShowScheduleModal(true);
    };

    // Handle deleting a day's schedule
    const handleDeleteDay = async (dayOfWeek: number) => {
        try {
            setIsLoading(true);
            
            // Reset to default values
            const updatedSchedule = [...schedule];
            const index = updatedSchedule.findIndex(d => d.value === dayOfWeek);
            
            if (index !== -1) {
                updatedSchedule[index] = {
                    ...updatedSchedule[index],
                    start_time: '09:00',
                    end_time: '17:00',
                    is_available: dayOfWeek < 5 // Mon-Fri default
                };
                setSchedule(updatedSchedule);
            }
            
            // Try to delete from API if it exists
            try {
                await AxiosInstance.delete(`/rider-schedule/delete_schedule/?day_of_week=${dayOfWeek}`, {
                    headers: { 'X-User-Id': userId }
                });
            } catch (error) {
                // If delete fails, just update
                console.log('Delete failed, will update instead');
            }
            
            // Save the updated schedule
            const schedulePayload = updatedSchedule.map(day => ({
                day_of_week: day.value,
                start_time: day.start_time,
                end_time: day.end_time,
                is_available: day.is_available
            }));
            
            await AxiosInstance.post('/rider-schedule/update_schedule/', 
                { schedule: schedulePayload },
                { headers: { 'X-User-Id': userId } }
            );
            
            await fetchAllData(false);
            toast.success('Schedule reset to default');
        } catch (error: any) {
            console.error('Error resetting schedule:', error);
            toast.error('Failed to reset schedule', {
                description: error.response?.data?.error || 'Please try again'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle online status toggle
    const handleOnlineToggle = async (checked: boolean) => {
        setOnline(checked);
        
        // Update availability status
        try {
            const newStatus = checked ? 'available' : 'offline';
            await AxiosInstance.post('/rider-schedule/update_availability/', 
                {
                    availability_status: newStatus,
                    is_accepting_deliveries: checked
                },
                { headers: { 'X-User-Id': userId } }
            );
            
            await fetchAllData(false);
            toast.success(`You are now ${checked ? 'online' : 'offline'}`);
        } catch (error) {
            console.error('Error updating online status:', error);
            setOnline(!checked); // Revert on error
        }
    };

    // Format time
    const formatTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get status badge configuration
    const getStatusConfig = (status: string) => {
        const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", text: string, icon: any }> = {
            offline: { variant: 'outline', text: 'Offline', icon: WifiOff },
            available: { variant: 'default', text: 'Available', icon: Wifi },
            busy: { variant: 'secondary', text: 'Busy', icon: Bike },
            break: { variant: 'outline', text: 'On Break', icon: Coffee },
            unavailable: { variant: 'destructive', text: 'Unavailable', icon: XCircle },
            scheduled: { variant: 'secondary', text: 'Scheduled', icon: Calendar },
            pending: { variant: 'outline', text: 'Pending', icon: Clock },
            picked_up: { variant: 'default', text: 'Picked Up', icon: Package },
            in_progress: { variant: 'default', text: 'In Progress', icon: Truck },
            delivered: { variant: 'default', text: 'Delivered', icon: CheckCircle },
            cancelled: { variant: 'destructive', text: 'Cancelled', icon: XCircle }
        };
        return configs[status] || configs.offline;
    };

    // Get deliveries for a specific day
    const getDeliveriesForDay = (date: Date) => {
        return scheduleData?.deliveries?.filter(delivery => {
            if (!delivery.scheduled_pickup_time) return false;
            const deliveryDate = new Date(delivery.scheduled_pickup_time);
            return isSameDay(deliveryDate, date);
        }) || [];
    };

    // Columns for scheduled deliveries table
    const deliveryColumns: ColumnDef<ScheduledDelivery>[] = [
        {
            accessorKey: "order_number",
            header: "Order ID",
            cell: ({ row }) => (
                <div className="font-mono text-sm font-medium">
                    #{row.getValue("order_number")}
                </div>
            )
        },
        {
            accessorKey: "customer_name",
            header: "Customer",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarFallback>
                            {row.getValue<string>("customer_name").charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span>{row.getValue("customer_name")}</span>
                </div>
            )
        },
        {
            accessorKey: "scheduled_pickup_time",
            header: "Pickup Time",
            cell: ({ row }) => {
                const pickupTime = row.getValue("scheduled_pickup_time");
                return pickupTime ? (
                    <div>
                        <div className="text-sm">{format(new Date(pickupTime as string), 'MMM dd')}</div>
                        <div className="text-xs text-muted-foreground">
                            {format(new Date(pickupTime as string), 'h:mm a')}
                        </div>
                    </div>
                ) : (
                    <span className="text-muted-foreground text-sm">Not scheduled</span>
                );
            }
        },
        {
            accessorKey: "shop_name",
            header: "Shop",
            cell: ({ row }) => (
                <div className="max-w-[150px] truncate" title={row.getValue("shop_name")}>
                    {row.getValue("shop_name") || 'N/A'}
                </div>
            )
        },
        {
            accessorKey: "distance_km",
            header: "Distance",
            cell: ({ row }) => {
                const distance = row.getValue("distance_km");
                return distance ? `${distance} km` : '-';
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const config = getStatusConfig(status);
                const Icon = config.icon;
                
                return (
                    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                        <Icon className="w-3 h-3" />
                        {config.text}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "estimated_minutes",
            header: "Est. Time",
            cell: ({ row }) => {
                const minutes = row.getValue("estimated_minutes");
                return minutes ? (
                    <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{String(minutes)} min</span>
                    </div>
                ) : '-';
            }
        }
    ];

    // Loading skeleton
    const MetricCardSkeleton = () => (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="w-12 h-12 rounded-full" />
                </div>
            </CardContent>
        </Card>
    );

    if (isLoading && !scheduleData) {
        return (
            <UserProvider user={user}>
                <SidebarLayout>
                    <div className="space-y-6 p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-4 w-64 mt-2" />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-24" />
                                <Skeleton className="h-10 w-32" />
                            </div>
                        </div>
                        
                        <Skeleton className="h-32 w-full" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                        </div>
                        
                        <Skeleton className="h-96 w-full" />
                    </div>
                </SidebarLayout>
            </UserProvider>
        );
    }

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold">Weekly Schedule</h1>
                            <p className="text-muted-foreground text-xs">Set your availability and working hours</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Badge variant={online ? 'default' : 'secondary'} className="px-4 py-1 text-sm">
                                {online ? 'Online' : 'Offline'}
                            </Badge>
                            <div className="flex items-center gap-2">
                                <Power className="w-4 h-4" />
                                <Switch checked={online} onCheckedChange={handleOnlineToggle} />
                            </div>
                        </div>
                    </div>

                    {/* Quick stats */}
                    {scheduleData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Today's Deliveries</p>
                                            <p className="text-xl font-bold mt-1">{scheduleData.metrics.today_deliveries}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{scheduleData.metrics.upcoming_deliveries} upcoming</p>
                                        </div>
                                        <div className="p-2 bg-blue-100 rounded-full">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Average Rating</p>
                                            <p className="text-xl font-bold mt-1">{scheduleData.metrics.average_rating}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{scheduleData.metrics.completed_deliveries} completed</p>
                                        </div>
                                        <div className="p-2 bg-yellow-100 rounded-full">
                                            <Star className="w-5 h-5 text-yellow-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Availability</p>
                                            <p className="text-xl font-bold mt-1">{scheduleData.metrics.availability_percentage}%</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{scheduleData.metrics.avg_deliveries_per_day.toFixed(1)} avg/day</p>
                                        </div>
                                        <div className="p-2 bg-green-100 rounded-full">
                                            <TrendingUp className="w-5 h-5 text-green-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Peak Day</p>
                                            <p className="text-xl font-bold mt-1">{scheduleData.metrics.peak_day}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{scheduleData.metrics.total_distance_km} km total</p>
                                        </div>
                                        <div className="p-2 bg-purple-100 rounded-full">
                                            <Award className="w-5 h-5 text-purple-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <Separator />

                    {/* Schedule Card */}
                    <Card className="rounded-lg shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Working Hours
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Toggle availability and set your preferred working time.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-2">
                            {schedule.map((day, index) => (
                                <div key={day.value} className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 p-2 border rounded-md">
                                    <div className="font-medium text-sm">{day.label}</div>

                                    <div className="flex items-center gap-2">
                                        <Switch 
                                            checked={day.is_available} 
                                            onCheckedChange={() => handleToggle(index)} 
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {day.is_available ? 'Available' : 'Unavailable'}
                                        </span>
                                    </div>

                                    <Input 
                                        className="h-8 text-sm" 
                                        type="time" 
                                        value={day.start_time} 
                                        disabled={!day.is_available} 
                                        onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)} 
                                    />

                                    <Input 
                                        className="h-8 text-sm" 
                                        type="time" 
                                        value={day.end_time} 
                                        disabled={!day.is_available} 
                                        onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)} 
                                    />
                                </div>
                            ))}
                        </CardContent>

                        
                    </Card>



                    {/* Deliveries Table */}
                    {scheduleData && scheduleData.deliveries && scheduleData.deliveries.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            <Card>
                                <CardHeader>
                                    <CardTitle>Scheduled Deliveries</CardTitle>
                                    <CardDescription>
                                        Upcoming deliveries for the next 7 days
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <DataTable 
                                        columns={deliveryColumns} 
                                        data={scheduleData.deliveries} 
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Update Availability Dialog */}
                <Dialog open={showAvailabilityModal} onOpenChange={setShowAvailabilityModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Update Availability Status</DialogTitle>
                            <DialogDescription>
                                Set your current availability status for deliveries.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select 
                                    value={availabilityForm.availability_status} 
                                    onValueChange={(value: RiderAvailabilityData['availability_status']) => 
                                        setAvailabilityForm({...availabilityForm, availability_status: value})
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">
                                            <div className="flex items-center gap-2">
                                                <Wifi className="w-4 h-4 text-green-600" />
                                                <span>Available - Ready for deliveries</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="busy">
                                            <div className="flex items-center gap-2">
                                                <Bike className="w-4 h-4 text-yellow-600" />
                                                <span>Busy - Currently on delivery</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="break">
                                            <div className="flex items-center gap-2">
                                                <Coffee className="w-4 h-4 text-blue-600" />
                                                <span>On Break - Taking a short break</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="unavailable">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-red-600" />
                                                <span>Unavailable - Temporarily unavailable</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="offline">
                                            <div className="flex items-center gap-2">
                                                <WifiOff className="w-4 h-4 text-gray-600" />
                                                <span>Offline - Not accepting deliveries</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label htmlFor="accepting">Accept new deliveries</Label>
                                <Switch
                                    id="accepting"
                                    checked={availabilityForm.is_accepting_deliveries}
                                    onCheckedChange={(checked) => 
                                        setAvailabilityForm({...availabilityForm, is_accepting_deliveries: checked})
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAvailabilityModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateAvailability} disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Update Status
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Custom Schedule Dialog */}
                <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingDay ? 'Edit Schedule' : 'Add Schedule'}
                            </DialogTitle>
                            <DialogDescription>
                                Set your working hours and availability for a specific day.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Day</Label>
                                <Select 
                                    value={scheduleForm.day_of_week?.toString()} 
                                    onValueChange={(value) => {
                                        const dayNum = parseInt(value);
                                        setScheduleForm({
                                            ...scheduleForm, 
                                            day_of_week: dayNum,
                                            day_name: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayNum]
                                        });
                                    }}
                                    disabled={!!editingDay}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                                            <SelectItem key={index} value={index.toString()}>
                                                {day}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="time"
                                    value={scheduleForm.start_time}
                                    onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    value={scheduleForm.end_time}
                                    onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label htmlFor="available">Available for deliveries</Label>
                                <Switch
                                    id="available"
                                    checked={scheduleForm.is_available}
                                    onCheckedChange={(checked) => 
                                        setScheduleForm({...scheduleForm, is_available: checked})
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setShowScheduleModal(false);
                                setEditingDay(null);
                                setScheduleForm({
                                    day_of_week: 0,
                                    day_name: 'Monday',
                                    start_time: '09:00',
                                    end_time: '17:00',
                                    is_available: true
                                });
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveDaySchedule} disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Schedule
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Day Detail Dialog */}
                <Dialog open={showDayDetailModal} onOpenChange={setShowDayDetailModal}>
                    <DialogContent className="sm:max-w-[600px]">
                        {selectedDay && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>
                                        {selectedDay.day_name}, {format(new Date(selectedDay.date), 'MMMM d, yyyy')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {selectedDay.is_today && '(Today)'}
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                    {/* Schedule Info */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedDay.is_available ? (
                                                <div className="flex items-center gap-4">
                                                    <Badge variant="default">Working</Badge>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{formatTime(selectedDay.start_time)} - {formatTime(selectedDay.end_time)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="destructive">Day Off</Badge>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Deliveries */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">
                                                Deliveries ({selectedDay.deliveries_count})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedDay.deliveries_count > 0 ? (
                                                <div className="space-y-2">
                                                    {getDeliveriesForDay(new Date(selectedDay.date)).map((delivery, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                                            <div>
                                                                <div className="font-medium">#{delivery.order_number}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {delivery.customer_name}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm">
                                                                    {delivery.scheduled_pickup_time 
                                                                        ? format(new Date(delivery.scheduled_pickup_time), 'h:mm a')
                                                                        : 'Not scheduled'}
                                                                </div>
                                                                <Badge variant={getStatusConfig(delivery.status).variant}>
                                                                    {delivery.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-muted-foreground">
                                                    No deliveries scheduled for this day
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </SidebarLayout>
        </UserProvider>
    );
}