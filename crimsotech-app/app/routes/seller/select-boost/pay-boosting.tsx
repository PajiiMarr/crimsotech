import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/pay-boosting";
import { UserProvider } from '~/components/providers/user-role-provider';
import AxiosInstance from '~/components/axios/Axios';
import { Button } from "~/components/ui/button";
import { CheckCircle, AlertCircle, CreditCard, Package, Clock, Zap } from "lucide-react";

export function meta(): Route.MetaDescriptors {
    return [{ title: "Complete Boosting Payment" }]
}

interface LoaderData {
    user: any;
    planId: string;
}

interface BoostPlanDetails {
    id: string;
    name: string;
    price: number;
    duration: number;
    time_unit: string;
    total_amount: number;
    product_count: number;
    product_ids: string[];
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    let user = (context as any).user;
    if (!user) user = await fetchUserRole({ request, context });
    await requireRole(request, context, ["isCustomer"]);
    const planId = params.boostPlanId as string;
    return { user, planId };
}

export default function PayBoosting({ loaderData }: { loaderData: LoaderData }) {
    const { user, planId } = loaderData;
    const [searchParams] = useSearchParams();
    const productIdsParam = searchParams.get('product_ids') || '';
    const [productIds] = useState(() => productIdsParam.split(',').filter(id => id));

    const [planDetails, setPlanDetails] = useState<BoostPlanDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingMaya, setProcessingMaya] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);


    useEffect(() => {
        if (hasFetched) return;
        if (planId && productIds.length > 0) fetchPlanDetails();
        else { setError("No boost plan or products selected"); setLoading(false); }
    }, [planId, productIds, hasFetched]);

    const fetchPlanDetails = async () => {
        try {
            setLoading(true);
            const response = await AxiosInstance.get(`/seller-boosts/${planId}/plan_detail/`);
            if (response.data.success) {
                const plan = response.data.plan;
                setPlanDetails({
                    id: plan.id,
                    name: plan.name,
                    price: plan.price,
                    duration: plan.duration,
                    time_unit: plan.time_unit,
                    total_amount: plan.price * productIds.length,
                    product_count: productIds.length,
                    product_ids: productIds
                });
                setHasFetched(true);
            } else {
                setError(response.data.error || "Failed to load plan details");
                setHasFetched(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Error fetching plan details");
            setHasFetched(true);
        } finally {
            setLoading(false);
        }
    };

    const handleMayaPayment = async () => {
        if (!planDetails) return;
        try {
            setProcessingMaya(true);
            const response = await AxiosInstance.post('/seller-boosts/initiate_maya_payment/', {
                plan_id: planId,
                product_ids: productIdsParam,
                user_id: user.user_id,
            });
            if (response.data.success) {
                window.location.href = response.data.redirect_url;
            } else {
                setError(response.data.error || "Failed to initiate Maya payment");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Error initiating Maya payment");
        } finally {
            setProcessingMaya(false);
        }
    };

    if (loading) return (
        <UserProvider user={user}>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900">Loading Boosting Payment...</h2>
                </div>
            </div>
        </UserProvider>
    );

    if (error || !planDetails) return (
        <UserProvider user={user}>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || "Boosting Request Not Found"}</h2>
                    <Link to="/seller/seller-boosts">
                        <Button className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700">
                            View Boosting Plans
                        </Button>
                    </Link>
                </div>
            </div>
        </UserProvider>
    );

    return (
        <UserProvider user={user}>
            <div className="min-h-screen flex flex-col">
                <div className="flex-1 flex flex-col">
                    <div className="max-w-7xl mx-auto p-4 w-full h-full">
                        <div className="bg-white rounded-xl shadow-md flex flex-col overflow-hidden">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-full">
                                            <CreditCard className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h1 className="text-2xl font-bold text-white">Complete Boosting Payment</h1>
                                            <p className="text-orange-100">
                                                {planDetails.name} — {planDetails.product_count} Product{planDetails.product_count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-right">
                                        <div className="text-3xl font-bold text-white">₱{planDetails.total_amount.toFixed(2)}</div>
                                        <div className="text-orange-100">Total Amount</div>
                                    </div>
                                </div>


                            </div>

                            {/* Body */}
                            <div className="flex-1 p-6 overflow-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* Left — Boost overview */}
                                    <div className="border-2 border-dashed border-orange-300 rounded-2xl p-6 bg-gradient-to-b from-white to-orange-50 flex flex-col items-center justify-center gap-4">
                                        <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                                            <Zap className="h-12 w-12 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-semibold text-gray-800 mb-1">{planDetails.name}</h3>
                                            <p className="text-sm text-gray-500">Boost Plan</p>
                                        </div>
                                        <div className="w-full max-w-xs space-y-2">
                                            <div className="flex items-center gap-3 bg-white rounded-xl border p-3">
                                                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                                                    <Package className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Products</p>
                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {planDetails.product_count} product{planDetails.product_count !== 1 ? 's' : ''} selected
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white rounded-xl border p-3">
                                                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                                                    <Clock className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Duration</p>
                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {planDetails.duration} {planDetails.time_unit}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white rounded-xl border p-3">
                                                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                                                    <CreditCard className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Total</p>
                                                    <p className="text-sm font-semibold text-orange-600">
                                                        ₱{planDetails.total_amount.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 text-center max-w-xs">
                                            You will be redirected to Maya to complete your payment securely.
                                        </p>
                                    </div>

                                    {/* Right — Plan details + action */}
                                    <div className="bg-gray-50 rounded-xl p-5 flex flex-col">
                                        <h3 className="font-semibold text-gray-900 mb-5 text-center text-lg">Payment Details</h3>
                                        <div className="space-y-3 flex-1">

                                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-100 rounded-lg">
                                                        <CreditCard className="h-4 w-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">Payment Method</div>
                                                        <div className="font-medium">Maya</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-white rounded-lg border">
                                                <div className="text-xs text-gray-500">Boost Plan</div>
                                                <div className="font-medium">{planDetails.name}</div>
                                            </div>

                                            <div className="p-3 bg-white rounded-lg border">
                                                <div className="text-xs text-gray-500">Products Selected</div>
                                                <div className="font-medium">
                                                    {planDetails.product_count} Product{planDetails.product_count !== 1 ? 's' : ''}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-white rounded-lg border">
                                                <div className="text-xs text-gray-500">Duration</div>
                                                <div className="font-medium">{planDetails.duration} {planDetails.time_unit}</div>
                                            </div>

                                            {/* Total */}
                                            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">Total Amount</div>
                                                    <div className="text-xs text-gray-600">
                                                        Plan price × {planDetails.product_count} product{planDetails.product_count !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                                <div className="text-xl font-bold text-orange-600">
                                                    ₱{planDetails.total_amount.toFixed(2)}
                                                </div>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="pt-2 space-y-2">
                                                <Button
                                                    size="lg"
                                                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                    onClick={handleMayaPayment}
                                                    disabled={processingMaya}
                                                >
                                                    {processingMaya ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                            Processing...
                                                        </div>
                                                    ) : 'Proceed to Payment'}
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-10 border-orange-300 text-orange-700 hover:bg-orange-50"
                                                    onClick={() => window.location.href = '/seller/seller-boosts'}
                                                    disabled={processingMaya}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </UserProvider>
    );
}