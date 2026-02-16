import type { Route } from "./+types/earnings"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Truck, PhilippinePeso, DollarSign, MinusCircle } from 'lucide-react';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Earnings | Admin",
        }
    ]
}

interface LoaderData {
    user: any;
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

    return { user };
}

export default function Earnings({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;

    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<{ total_deliveries?: number; total_earnings?: number } | null>(null);
    const [totalCollected, setTotalCollected] = useState<number>(0);

    useEffect(() => {
      const fetchMetrics = async () => {
        try {
          setIsLoading(true);
          const res = await AxiosInstance.get('/rider-history/order_history/', {
            headers: { 'X-User-Id': user.user_id || user.id }
          });

          if (res.data && res.data.success) {
            setMetrics(res.data.metrics || null);
            const deliveries = res.data.deliveries || [];
            const collected = deliveries.reduce((s: number, d: any) => s + (d.order_amount || 0), 0);
            setTotalCollected(Number(collected));
          } else {
            setMetrics(null);
            setTotalCollected(0);
          }
        } catch (err) {
          console.error('Failed to load earnings metrics', err);
          setMetrics(null);
          setTotalCollected(0);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMetrics();
    }, [user]);

    // Riders with no issues should see zero deductions
    const deductions = 0;

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0);

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold">Earnings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Quick summary of your delivery performance</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Total deliveries</div>
                            <div className="text-lg font-bold mt-1">{isLoading ? <Skeleton className="h-6 w-20" /> : (metrics?.total_deliveries ?? 0)}</div>
                          </div>
                          <div className="p-2 bg-blue-50 rounded-full">
                            <Truck className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Total money collected</div>
                            <div className="text-lg font-bold mt-1">{isLoading ? <Skeleton className="h-6 w-28" /> : formatCurrency(totalCollected)}</div>
                          </div>
                          <div className="p-2 bg-green-50 rounded-full">
                            <PhilippinePeso className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Total earnings (delivery fees)</div>
                            <div className="text-lg font-bold mt-1">{isLoading ? <Skeleton className="h-6 w-28" /> : formatCurrency(Number(metrics?.total_earnings || 0))}</div>
                          </div>
                          <div className="p-2 bg-yellow-50 rounded-full">
                            <DollarSign className="w-5 h-5 text-yellow-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Deductions</div>
                            <div className="text-lg font-bold mt-1">{isLoading ? <Skeleton className="h-6 w-28" /> : formatCurrency(deductions)}</div>
                          </div>
                          <div className="p-2 bg-red-50 rounded-full">
                            <MinusCircle className="w-5 h-5 text-red-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                </div>
            </SidebarLayout>
        </UserProvider>
    )
}