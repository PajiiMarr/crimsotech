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
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Schedule | Rider",
        }
    ]
}

// CORRECTED Interface definitions based on ACTUAL Django models
interface RiderAvailabilityData {
  id: string;
  rider_id: string;
  availability_status: 'offline' | 'available' | 'busy' | 'break' | 'unavailable';
  is_accepting_deliveries: boolean;
  last_status_update: string;
  custom_schedule?: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  created_at: string;
  updated_at: string;
}

// Using existing Delivery model instead of TimeOffRequest
interface ScheduledDelivery {
  id: string;
  order: string;
  status: 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'cancelled';
  scheduled_pickup_time: string | null;
  scheduled_delivery_time: string | null;
  is_scheduled: boolean;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  distance_km: number | null;
  delivery_rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Order details (from related Order model)
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
}

// Custom schedule interface (since RiderSchedule model doesn't exist)
interface CustomSchedule {
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ScheduleMetrics {
  total_deliveries: number;
  upcoming_deliveries: number;
  completed_deliveries: number;
  availability_percentage: number;
  average_rating: number;
  total_distance_km: number;
  avg_deliveries_per_day: number;
  peak_day: string;
}

interface LoaderData {
    user: any;
    scheduleData?: {
      rider: RiderAvailabilityData;
      schedule: CustomSchedule[];
      deliveries: ScheduledDelivery[];
      metrics: ScheduleMetrics;
    };
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

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    // IMPORTANT: MAKE THE API CALL INSIDE THE LOADER
    try {
        // Import server-side HTTP client
        const { default: serverAxios } = await import('axios');
        
        // Fetch schedule data using the NEW /rider-schedule/ endpoint
        const response = await serverAxios.get(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/rider-schedule/get_schedule_data/`, {
            headers: { 
                'X-User-Id': user.user_id || user.id,
                'Cookie': request.headers.get("Cookie") || ''
            }
        });

        if (response.data.success) {
            return { 
                user, 
                scheduleData: response.data 
            };
        } else {
            return { 
                user, 
                error: response.data.error || 'Failed to load schedule data' 
            };
        }
        
    } catch (error: any) {
        console.error('Error fetching schedule data in loader:', error);
        return { 
            user, 
            error: error.message || 'Failed to load schedule data' 
        };
    }
}

export default function RiderSchedule({ loaderData}: { loaderData: LoaderData }){
    const { user, scheduleData, error } = loaderData;
    
    // State for UI interactions
    const [isLoading, setIsLoading] = useState(!scheduleData);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [showCustomSchedule, setShowCustomSchedule] = useState(false);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [editingDay, setEditingDay] = useState<number | null>(null);
    
    // Form states
    const [scheduleForm, setScheduleForm] = useState<CustomSchedule>({
      day_of_week: 0,
      day_name: 'Monday',
      start_time: '09:00',
      end_time: '17:00',
      is_available: true
    });
    
    const [availabilityForm, setAvailabilityForm] = useState({
      availability_status: 'available' as RiderAvailabilityData['availability_status'],
      is_accepting_deliveries: true
    });

    // Initialize form with loaded data
    useEffect(() => {
      if (scheduleData) {
        setAvailabilityForm({
          availability_status: scheduleData.rider.availability_status,
          is_accepting_deliveries: scheduleData.rider.is_accepting_deliveries
        });
        setIsLoading(false);
      }
    }, [scheduleData]);

    // Fetch data function (client-side refresh)
    const fetchScheduleData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch schedule data using the NEW /rider-schedule/ endpoint
        const response = await AxiosInstance.get('/rider-schedule/get_schedule_data/', {
          headers: { 'X-User-Id': user.user_id || user.id }
        });

        if (response.data.success) {
          // Note: In a real app, you would update state with the new data
          // For now, we'll just show a success message
          toast.success("Schedule data refreshed");
          // You might want to reload the page or use a state management solution
          window.location.reload(); // Simple refresh
        } else {
          toast.error("Failed to refresh data", {
            description: response.data.error || "Please try again",
          });
        }

      } catch (error) {
        console.error('Error fetching schedule data:', error);
        toast.error("Failed to load schedule data", {
          description: "Please try again later",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Handle updating availability status
    const handleUpdateAvailability = async () => {
      try {
        setIsLoading(true);
        
        // Use the NEW /rider-schedule/ endpoint
        const response = await AxiosInstance.post('/rider-schedule/update_availability/', availabilityForm, {
          headers: { 'X-User-Id': user.user_id || user.id }
        });

        if (response.data.success) {
          await fetchScheduleData(); // Refresh data
          setShowAvailabilityModal(false);
          toast.success("Availability updated successfully");
        }
      } catch (error) {
        console.error('Error updating availability:', error);
        toast.error("Failed to update availability", {
          description: "Please try again",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Handle saving custom schedule
    const handleSaveCustomSchedule = async () => {
      try {
        setIsLoading(true);
        
        // Convert custom schedule to object format
        const scheduleObj: Record<string, { start: string; end: string; available: boolean }> = {};
        
        // Use the existing schedule from loader data or create new
        const currentSchedule = scheduleData?.schedule || [];
        const updatedSchedule = [...currentSchedule];
        
        if (editingDay !== null) {
          updatedSchedule[editingDay] = scheduleForm;
        } else {
          updatedSchedule.push(scheduleForm);
        }
        
        // Map to the expected format
        updatedSchedule.forEach(schedule => {
          const dayKey = schedule.day_name.toLowerCase();
          scheduleObj[dayKey] = {
            start: schedule.start_time,
            end: schedule.end_time,
            available: schedule.is_available
          };
        });
        
        // Use the NEW /rider-schedule/ endpoint
        const response = await AxiosInstance.post('/rider-schedule/update_schedule/', {
          custom_schedule: scheduleObj
        }, {
          headers: { 'X-User-Id': user.user_id || user.id }
        });

        if (response.data.success) {
          await fetchScheduleData(); // Refresh data
          setShowCustomSchedule(false);
          setEditingDay(null);
          setScheduleForm({
            day_of_week: 0,
            day_name: 'Monday',
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
          });
          toast.success("Schedule updated successfully");
        }
      } catch (error) {
        console.error('Error saving schedule:', error);
        toast.error("Failed to save schedule", {
          description: "Please try again",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Handle editing a day's schedule
    const handleEditDaySchedule = (dayIndex: number) => {
      const daySchedule = scheduleData?.schedule?.find(s => s.day_of_week === dayIndex);
      if (daySchedule) {
        setScheduleForm(daySchedule);
        setEditingDay(dayIndex);
        setShowCustomSchedule(true);
      }
    };

    // Format time
    const formatTime = (timeString: string) => {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get week days
    const getWeekDays = () => {
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    };

    // Get deliveries for a specific day
    const getDeliveriesForDay = (date: Date) => {
      return scheduleData?.deliveries?.filter(delivery => {
        if (!delivery.scheduled_pickup_time) return false;
        const deliveryDate = new Date(delivery.scheduled_pickup_time);
        return isSameDay(deliveryDate, date);
      }) || [];
    };

    // Get schedule for a specific day
    const getScheduleForDay = (dayOfWeek: number) => {
      return scheduleData?.schedule?.find(schedule => schedule.day_of_week === dayOfWeek);
    };

    // Check if rider is available on a specific date
    const isAvailableOnDate = (date: Date) => {
      const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to 0-6 (Mon-Sun)
      const daySchedule = getScheduleForDay(dayOfWeek);
      
      if (daySchedule) {
        return daySchedule.is_available;
      }
      
      // Default availability if no schedule set
      return dayOfWeek < 5; // Monday-Friday available by default
    };

    // Get status badge configuration
    const getStatusConfig = (status: string) => {
      const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", text: string, icon: any }> = {
        offline: { variant: 'outline', text: 'Offline', icon: Clock },
        available: { variant: 'default', text: 'Available', icon: CheckCircle },
        busy: { variant: 'secondary', text: 'Busy', icon: Bike },
        break: { variant: 'outline', text: 'On Break', icon: Clock },
        unavailable: { variant: 'destructive', text: 'Unavailable', icon: XCircle },
        pending: { variant: 'outline', text: 'Pending', icon: Clock },
        scheduled: { variant: 'secondary', text: 'Scheduled', icon: Calendar },
        picked_up: { variant: 'default', text: 'In Transit', icon: Bike },
        in_progress: { variant: 'default', text: 'In Progress', icon: Bike },
        delivered: { variant: 'outline', text: 'Delivered', icon: CheckCircle },
        cancelled: { variant: 'destructive', text: 'Cancelled', icon: XCircle }
      };
      
      return configs[status] || configs.offline;
    };

    // Columns for scheduled deliveries table
    const deliveryColumns: ColumnDef<ScheduledDelivery>[] = [
      {
        accessorKey: "order",
        header: "Order ID",
        cell: ({ row }) => (
          <div className="font-mono text-sm">
            #{row.getValue("order")}
          </div>
        )
      },
      {
        accessorKey: "order_details.user.username",
        header: "Customer",
        cell: ({ row }) => {
          const orderDetails = row.original.order_details;
          return orderDetails?.user.username || 'Unknown';
        }
      },
      {
        accessorKey: "scheduled_pickup_time",
        header: "Scheduled Time",
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
            <div className="text-muted-foreground text-sm">Not scheduled</div>
          );
        }
      },
      {
        accessorKey: "order_details.shipping_address",
        header: "Delivery Address",
        cell: ({ row }) => {
          const address = row.original.order_details?.shipping_address;
          if (!address) return 'No address';
          
          return (
            <div className="max-w-[200px] truncate" title={`${address.street}, ${address.barangay}, ${address.city}`}>
              {address.city}, {address.province}
            </div>
          );
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
            <Badge variant={config.variant} className="flex items-center gap-1">
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
          return minutes ? `${minutes} min` : '-';
        }
      }
    ];

    // Loading skeleton
    const MetricCardSkeleton = () => (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mt-1" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );

    // Navigate weeks
    const nextWeek = () => setCurrentWeek(addDays(currentWeek, 7));
    const prevWeek = () => setCurrentWeek(subDays(currentWeek, 7));
    const goToToday = () => setCurrentWeek(new Date());

    // Show error if failed to load
    if (error && !scheduleData) {
      return (
        <UserProvider user={user}>
          <SidebarLayout>
            <div className="space-y-6">
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Failed to Load Schedule</h1>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchScheduleData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </SidebarLayout>
        </UserProvider>
      );
    }

    // Show loading skeleton if no data
    if (!scheduleData || isLoading) {
      return (
        <UserProvider user={user}>
          <SidebarLayout>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-28" />
                </div>
              </div>
              
              <Skeleton className="h-32 w-full" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
              
              <Skeleton className="h-64 w-full" />
            </div>
          </SidebarLayout>
        </UserProvider>
      );
    }

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Schedule Management</h1>
                            <p className="text-muted-foreground mt-1">Manage your availability and delivery schedule</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={goToToday}>
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Today
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowAvailabilityModal(true)}>
                            <Clock className="w-4 h-4 mr-2" />
                            Update Status
                          </Button>
                          <Button size="sm" onClick={() => setShowCustomSchedule(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Set Schedule
                          </Button>
                        </div>
                    </div>

                    {/* Current Status */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${
                              scheduleData.rider.availability_status === 'available' 
                                ? 'bg-green-100 text-green-600' 
                                : scheduleData.rider.availability_status === 'busy'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Bike className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">Current Status</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getStatusConfig(scheduleData.rider.availability_status).variant}>
                                  {getStatusConfig(scheduleData.rider.availability_status).text}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {scheduleData.rider.is_accepting_deliveries ? 'Accepting deliveries' : 'Not accepting deliveries'}
                                </span>
                              </div>
                              {scheduleData.rider.last_status_update && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last updated: {format(new Date(scheduleData.rider.last_status_update), 'MMM dd, h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => setShowAvailabilityModal(true)}>
                            Change Status
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {isLoading ? (
                            <>
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                            </>
                        ) : (
                            <>
                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Upcoming Deliveries</p>
                                        <p className="text-2xl font-bold mt-1">{scheduleData.metrics.upcoming_deliveries}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {scheduleData.metrics.total_deliveries} total deliveries
                                        </p>
                                      </div>
                                      <div className="p-3 bg-blue-100 rounded-full">
                                        <Calendar className="w-6 h-6 text-blue-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Average Rating</p>
                                        <p className="text-2xl font-bold mt-1">{scheduleData.metrics.average_rating}/5</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {scheduleData.metrics.completed_deliveries} completed
                                        </p>
                                      </div>
                                      <div className="p-3 bg-green-100 rounded-full">
                                        <TrendingUp className="w-6 h-6 text-green-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Total Distance</p>
                                        <p className="text-2xl font-bold mt-1">{scheduleData.metrics.total_distance_km} km</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {scheduleData.metrics.avg_deliveries_per_day.toFixed(1)} avg/day
                                        </p>
                                      </div>
                                      <div className="p-3 bg-purple-100 rounded-full">
                                        <MapPin className="w-6 h-6 text-purple-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Peak Day</p>
                                        <p className="text-2xl font-bold mt-1">{scheduleData.metrics.peak_day}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Most deliveries on this day
                                        </p>
                                      </div>
                                      <div className="p-3 bg-yellow-100 rounded-full">
                                        <CalendarDays className="w-6 h-6 text-yellow-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Weekly Calendar View */}
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <CardTitle>Weekly Schedule</CardTitle>
                            <CardDescription>
                              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd')} - 
                              {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={prevWeek}>
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={nextWeek}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={fetchScheduleData}>
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                          {getWeekDays().map((date, index) => {
                            const daySchedule = getScheduleForDay(index);
                            const dayDeliveries = getDeliveriesForDay(date);
                            const isAvailable = isAvailableOnDate(date);
                            
                            return (
                              <div key={index} className={`border rounded-lg p-4 ${isToday(date) ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <div className="flex flex-col h-full">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <div className="font-semibold">{format(date, 'EEE')}</div>
                                      <div className={`text-lg font-bold ${isToday(date) ? 'text-blue-600' : ''}`}>
                                        {format(date, 'd')}
                                      </div>
                                    </div>
                                    {!isAvailable && (
                                      <Badge variant="destructive" className="text-xs">
                                        Off
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {daySchedule ? (
                                    <div className="space-y-2 mb-4">
                                      <div className="text-sm font-medium">Working Hours:</div>
                                      <div className="text-sm">
                                        {formatTime(daySchedule.start_time)} - {formatTime(daySchedule.end_time)}
                                      </div>
                                      <Badge variant={daySchedule.is_available ? "default" : "outline"} className="text-xs">
                                        {daySchedule.is_available ? 'Available' : 'Unavailable'}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground mb-4">No schedule set</div>
                                  )}
                                  
                                  <div className="mt-auto">
                                    <div className="text-sm font-medium mb-2">Deliveries: {dayDeliveries.length}</div>
                                    {dayDeliveries.slice(0, 2).map(delivery => (
                                      <div key={delivery.id} className="text-xs p-2 bg-gray-50 rounded mb-1">
                                        <div className="font-medium truncate">#{delivery.order}</div>
                                        <div className="text-muted-foreground">
                                          {delivery.scheduled_pickup_time 
                                            ? format(new Date(delivery.scheduled_pickup_time), 'h:mm a')
                                            : 'Not scheduled'}
                                        </div>
                                      </div>
                                    ))}
                                    {dayDeliveries.length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{dayDeliveries.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                  
                                  {daySchedule && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="mt-2"
                                      onClick={() => handleEditDaySchedule(index)}
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Deliveries Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="upcoming" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Upcoming Deliveries</CardTitle>
                            <CardDescription>
                              {scheduleData.deliveries.filter(d => ['scheduled', 'pending'].includes(d.status)).length} upcoming deliveries
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {isLoading ? (
                              <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                  <Skeleton key={i} className="h-12 w-full" />
                                ))}
                              </div>
                            ) : scheduleData.deliveries.filter(d => ['scheduled', 'pending'].includes(d.status)).length > 0 ? (
                              <DataTable 
                                columns={deliveryColumns} 
                                data={scheduleData.deliveries.filter(d => ['scheduled', 'pending'].includes(d.status))}
                                searchConfig={{
                                  column: "order",
                                  placeholder: "Search by order ID..."
                                }}
                              />
                            ) : (
                              <div className="text-center py-8">
                                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Upcoming Deliveries</h3>
                                <p className="text-muted-foreground">
                                  You don't have any upcoming scheduled deliveries.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="in_progress" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>In Progress Deliveries</CardTitle>
                            <CardDescription>
                              {scheduleData.deliveries.filter(d => ['picked_up', 'in_progress'].includes(d.status)).length} deliveries in progress
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {isLoading ? (
                              <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                  <Skeleton key={i} className="h-12 w-full" />
                                ))}
                              </div>
                            ) : scheduleData.deliveries.filter(d => ['picked_up', 'in_progress'].includes(d.status)).length > 0 ? (
                              <DataTable 
                                columns={deliveryColumns} 
                                data={scheduleData.deliveries.filter(d => ['picked_up', 'in_progress'].includes(d.status))}
                                searchConfig={{
                                  column: "order",
                                  placeholder: "Search by order ID..."
                                }}
                              />
                            ) : (
                              <div className="text-center py-8">
                                <Bike className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Deliveries In Progress</h3>
                                <p className="text-muted-foreground">
                                  You don't have any deliveries in progress.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="completed" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Completed Deliveries</CardTitle>
                            <CardDescription>
                              {scheduleData.deliveries.filter(d => d.status === 'delivered').length} completed deliveries
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {isLoading ? (
                              <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                  <Skeleton key={i} className="h-12 w-full" />
                                ))}
                              </div>
                            ) : scheduleData.deliveries.filter(d => d.status === 'delivered').length > 0 ? (
                              <DataTable 
                                columns={deliveryColumns} 
                                data={scheduleData.deliveries.filter(d => d.status === 'delivered')}
                                searchConfig={{
                                  column: "order",
                                  placeholder: "Search by order ID..."
                                }}
                              />
                            ) : (
                              <div className="text-center py-8">
                                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Completed Deliveries</h3>
                                <p className="text-muted-foreground">
                                  You haven't completed any deliveries yet.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
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
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                          Status
                        </Label>
                        <Select 
                          value={availabilityForm.availability_status} 
                          onValueChange={(value: RiderAvailabilityData['availability_status']) => 
                            setAvailabilityForm({...availabilityForm, availability_status: value})
                          }
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available for Deliveries</SelectItem>
                            <SelectItem value="busy">Busy - On Delivery</SelectItem>
                            <SelectItem value="break">On Break</SelectItem>
                            <SelectItem value="unavailable">Temporarily Unavailable</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="accepting" className="text-right">
                          Accepting
                        </Label>
                        <div className="col-span-3">
                          <input
                            id="accepting"
                            type="checkbox"
                            checked={availabilityForm.is_accepting_deliveries}
                            onChange={(e) => setAvailabilityForm({
                              ...availabilityForm, 
                              is_accepting_deliveries: e.target.checked
                            })}
                            className="mr-2"
                          />
                          <Label htmlFor="accepting" className="text-sm">
                            Accept new delivery assignments
                          </Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAvailabilityModal(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateAvailability} disabled={isLoading}>
                        {isLoading ? 'Updating...' : 'Update Status'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Custom Schedule Dialog */}
                <Dialog open={showCustomSchedule} onOpenChange={setShowCustomSchedule}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingDay !== null ? 'Edit Schedule' : 'Add Schedule'}
                      </DialogTitle>
                      <DialogDescription>
                        Set your working hours and availability for a specific day.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="day" className="text-right">
                          Day
                        </Label>
                        <Select 
                          value={scheduleForm.day_of_week.toString()} 
                          onValueChange={(value) => {
                            const dayNum = parseInt(value);
                            setScheduleForm({
                              ...scheduleForm, 
                              day_of_week: dayNum,
                              day_name: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayNum]
                            });
                          }}
                          disabled={editingDay !== null}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6].map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start_time" className="text-right">
                          Start Time
                        </Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={scheduleForm.start_time}
                          onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end_time" className="text-right">
                          End Time
                        </Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={scheduleForm.end_time}
                          onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="available" className="text-right">
                          Available
                        </Label>
                        <div className="col-span-3">
                          <input
                            id="available"
                            type="checkbox"
                            checked={scheduleForm.is_available}
                            onChange={(e) => setScheduleForm({...scheduleForm, is_available: e.target.checked})}
                            className="mr-2"
                          />
                          <Label htmlFor="available" className="text-sm">
                            Mark as available for deliveries
                          </Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setShowCustomSchedule(false);
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
                      <Button onClick={handleSaveCustomSchedule} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Schedule'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </SidebarLayout>
        </UserProvider>
    )
}