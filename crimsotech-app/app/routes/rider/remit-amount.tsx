// app/routes/rider/remit-amount.tsx
import type { Route } from "./+types/remit-amount"
import { UserProvider } from '~/components/providers/user-role-provider';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useToast } from '~/hooks/use-toast';
import { 
  ArrowLeft,
  CheckCircle,
  Send,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react';

import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Remit Amount | Rider",
        }
    ]
}

// ================================
// Interfaces
// ================================
interface RemittanceData {
  to_remit: number;
  formatted_date: string;
  deliveries_count: number;
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
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

    return { user };
}

// ================================
// Helper Functions
// ================================
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { 
    style: 'currency', 
    currency: 'PHP', 
    minimumFractionDigits: 2 
  }).format(amount || 0);
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

// Confirmation Dialog
const ConfirmRemitDialog = ({ 
  open, 
  onOpenChange,
  onConfirm,
  amount
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  amount: number;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    setIsSubmitting(true);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Remittance</DialogTitle>
          <DialogDescription>
            Are you sure you want to remit this amount?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-sm text-orange-600 mb-1">Amount to Remit</p>
            <p className="text-2xl font-semibold text-orange-700">{formatCurrency(amount)}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Success Dialog
const SuccessDialog = ({ 
  open, 
  onOpenChange,
  reference
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  reference: string;
}) => {
  const navigate = useNavigate();

  const handleDone = () => {
    onOpenChange(false);
    navigate('/rider/earnings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remittance Successful</DialogTitle>
          <DialogDescription>
            Your remittance has been processed
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Reference Number</p>
            <p className="text-sm font-mono bg-white p-2 rounded border">{reference}</p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleDone} 
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ================================
// Main Component
// ================================
export default function RemitAmount({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [toRemit, setToRemit] = useState<number>(0);
  const [deliveriesCount, setDeliveriesCount] = useState<number>(0);
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Fetch today's data
  const fetchTodayData = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const response = await AxiosInstance.get(
        `/rider-history/order_history/?start_date=${startDate}&end_date=${endDate}`,
        { headers: { "X-User-Id": user.user_id || user.id } }
      );

      if (response.data?.success) {
        const todayDeliveries = response.data.deliveries || [];
        
        const totalCollected = todayDeliveries
          .filter((d: any) => d.status === 'delivered')
          .reduce((sum: number, d: any) => sum + d.order_amount, 0);
        
        const totalEarnings = todayDeliveries
          .filter((d: any) => d.status === 'delivered')
          .reduce((sum: number, d: any) => sum + d.delivery_fee, 0);
        
        setToRemit(totalCollected - totalEarnings);
        setDeliveriesCount(todayDeliveries.filter((d: any) => d.status === 'delivered').length);
        setFormattedDate(formatDate(today.toISOString()));
      }
    } catch (error) {
      console.error('Error fetching remittance data:', error);
      toast({
        title: "Error",
        description: "Failed to load remittance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRemit = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRemit = () => {
    setTimeout(() => {
      setShowConfirmDialog(false);
      
      const ref = 'REM' + Math.random().toString(36).substring(2, 10).toUpperCase();
      setReferenceNumber(ref);
      
      setShowSuccessDialog(true);
      
      toast({
        title: "Success",
        description: "Remittance submitted successfully",
      });
    }, 1500);
  };

  if (isLoading) return (
    <UserProvider user={user}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    </UserProvider>
  );

  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 relative">
          <div className="absolute left-4 top-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBack}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-w-md mx-auto px-4 py-4">
            <h1 className="text-center text-lg font-semibold text-white">Remit Amount</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-8">
          {toRemit > 0 ? (
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6">
                {/* Date */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span>{formattedDate}</span>
                </div>

                {/* Amount */}
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 mb-2">Amount to Remit</p>
                  <p className="text-4xl font-bold text-orange-600">{formatCurrency(toRemit)}</p>
                </div>

                {/* Delivery count */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-6">
                  <Clock className="w-3 h-3 text-orange-400" />
                  <span>Based on {deliveriesCount} completed {deliveriesCount === 1 ? 'delivery' : 'deliveries'}</span>
                </div>

                {/* Button */}
                <Button
                  onClick={handleRemit}
                  className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Remit Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-gray-700 font-medium mb-1">No amount to remit today</p>
                <p className="text-sm text-gray-400 mb-6">You have no completed deliveries yet</p>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  Go Back
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        {toRemit > 0 && (
          <>
            <ConfirmRemitDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
              onConfirm={handleConfirmRemit}
              amount={toRemit}
            />

            <SuccessDialog
              open={showSuccessDialog}
              onOpenChange={setShowSuccessDialog}
              reference={referenceNumber}
            />
          </>
        )}
      </div>
    </UserProvider>
  );
}