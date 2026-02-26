import { useState, useEffect } from "react";
import { useLoaderData, Link, useSearchParams, useParams } from "react-router";
import type { Route } from "./+types/pay-boosting";
import { UserProvider } from '~/components/providers/user-role-provider';
import AxiosInstance from '~/components/axios/Axios';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CheckCircle, Clock, AlertCircle, CreditCard, Smartphone, Wallet, ArrowLeft, Upload, FileText, Image } from "lucide-react";

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
    payment_method?: string;
    product_count: number;
    product_ids: string[];
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) user = await fetchUserRole({ request, context });
    await requireRole(request, context, ["isCustomer"]);
    
    const planId = params.boostPlanId as string;
    return { user, planId };
}

export async function action({ request }: { request: Request }) {
    try {
        const formData = await request.formData();
        const planId = formData.get('plan_id') as string;
        const productIds = formData.get('product_ids') as string;
        const receipt = formData.get('receipt') as File;
        
        if (!planId || !productIds || !receipt) {
            return { success: false, error: 'Missing required fields' };
        }

        const uploadData = new FormData();
        uploadData.append('plan_id', planId);
        uploadData.append('product_ids', productIds);
        uploadData.append('receipt', receipt);

        const response = await AxiosInstance.post('/boosting/add_receipt/', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            return { success: true, message: response.data.message };
        } else {
            return { success: false, error: response.data.error };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export default function PayBoosting({ loaderData}: { loaderData: LoaderData }){
    const { user, planId } = loaderData;
    const [searchParams] = useSearchParams();
    const productIdsParam = searchParams.get('product_ids') || '';
    
    // Store as a ref to avoid dependency changes
    const [productIds] = useState(() => productIdsParam.split(',').filter(id => id));
    
    const [planDetails, setPlanDetails] = useState<BoostPlanDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('GCash');
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        // Only fetch once
        if (hasFetched) return;
        
        if (planId && productIds.length > 0) {
            fetchPlanDetails();
        } else {
            setError("No boost plan or products selected");
            setLoading(false);
        }
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

    const getPaymentMethodIcon = () => {
        switch(paymentMethod) {
            case 'GCash': return Smartphone;
            case 'Maya': return CreditCard;
            default: return Wallet;
        }
    };

    const getQRCodeImage = () => {
        switch(paymentMethod) {
            case 'GCash': return '/gcash.jpeg';
            case 'Maya': return '/maya.jpeg';
            default: return null;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("File size too large. Maximum size is 5MB.");
                return;
            }

            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setError("Invalid file type. Please upload JPEG, PNG, or PDF files.");
                return;
            }

            setReceiptFile(file);
            setError(null);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setReceiptPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setReceiptPreview(null);
            }
        }
    };

    const uploadReceipt = async () => {
        if (!receiptFile) {
            setError("Please select a receipt file first.");
            return;
        }

        try {
            setUploadingReceipt(true);
            const formData = new FormData();
            formData.append('plan_id', planId);
            formData.append('product_ids', productIdsParam);
            formData.append('receipt', receiptFile);
            formData.append('payment_method', paymentMethod);

            const response = await AxiosInstance.post('/boosting/add_receipt/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                handlePaymentComplete();
            } else {
                setError(response.data.error || "Failed to upload receipt");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Error uploading receipt");
        } finally {
            setUploadingReceipt(false);
        }
    };

    const handlePaymentComplete = async () => {
        try {
            setLoading(true);
            const response = await AxiosInstance.post('/boosting/confirm_payment/', {
                plan_id: planId,
                product_ids: productIds
            });
            if (response.data.success) {
                setPaymentStatus('paid');
                setTimeout(() => {
                    window.location.href = `/seller/seller-boosts`;
                }, 1500);
            } else {
                setError(response.data.error || "Failed to confirm payment");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Error confirming payment");
        } finally {
            setLoading(false);
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
                        <Button className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700">View Boosting Plans</Button>
                    </Link>
                </div>
            </div>
        </UserProvider>
    );

    const PaymentIcon = getPaymentMethodIcon();
    const qrCodeImage = getQRCodeImage();

    return (
        <UserProvider user={user}>
            <div className="min-h-screen flex flex-col">
                <div className="flex-1 flex flex-col">
                    <div className="max-w-7xl mx-auto p-4 w-full h-full">
                        <div className="bg-white rounded-xl shadow-md h-auto flex flex-col overflow-hidden">
                            {/* Header - Orange gradient */}
                            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-full">
                                            <PaymentIcon className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h1 className="text-2xl font-bold text-white">Complete Boosting Payment</h1>
                                            <p className="text-orange-100">{planDetails.name} - {planDetails.product_count} Product{planDetails.product_count !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-right">
                                        <div className="text-3xl font-bold text-white">₱{planDetails.total_amount.toFixed(2)}</div>
                                        <div className="text-orange-100">Total Amount</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-auto">
                                {paymentStatus === 'paid' && (
                                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <CheckCircle className="h-8 w-8 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-green-800">Payment Confirmed! Redirecting...</h3>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                    {/* Left Column - QR Code */}
                                    <div className="h-full">
                                        <div className="h-full flex flex-col">
                                            <div className="border-2 border-dashed border-orange-300 rounded-2xl p-6 bg-gradient-to-b from-white to-orange-50 h-full flex flex-col">
                                                <div className="flex-1 flex flex-col items-center justify-center">
                                                    {qrCodeImage ? (
                                                        <>
                                                            <div className="mb-4 flex-1 flex items-center justify-center w-full">
                                                                <img 
                                                                    src={qrCodeImage} 
                                                                    alt={`${paymentMethod} QR Code`}
                                                                    className="w-full max-w-xs h-auto object-contain"
                                                                />
                                                            </div>
                                                            <div className="mt-auto pt-4 w-full text-center">
                                                                <div className="inline-flex items-center gap-3 px-5 py-2 bg-orange-100 text-orange-800 rounded-full mb-2">
                                                                    <PaymentIcon className="h-4 w-4" />
                                                                    <select 
                                                                        value={paymentMethod}
                                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                                        className="bg-transparent border-none focus:ring-0 text-orange-800 font-semibold"
                                                                    >
                                                                        <option value="GCash">GCash</option>
                                                                        <option value="Maya">Maya</option>
                                                                    </select>
                                                                </div>
                                                                <p className="text-gray-600 text-sm">
                                                                    Scan this QR code with your {paymentMethod} app
                                                                </p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center">
                                                            <CreditCard className="h-20 w-20 text-gray-400 mb-4" />
                                                            <select 
                                                                value={paymentMethod}
                                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                                className="mt-2 p-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                                            >
                                                                <option value="GCash">GCash</option>
                                                                <option value="Maya">Maya</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Payment Details */}
                                    <div className="h-full">
                                        <div className="h-full flex flex-col">
                                            <div className="bg-gray-50 rounded-xl p-5 h-full flex flex-col">
                                                <h3 className="font-semibold text-gray-900 mb-5 text-center text-lg">Payment Details</h3>
                                                <div className="space-y-3 flex-1 overflow-y-auto">
                                                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-orange-100 rounded-lg">
                                                                <PaymentIcon className="h-4 w-4 text-orange-600" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500">Payment Method</div>
                                                                <div className="font-medium">{paymentMethod}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Boost Plan</div>
                                                            <div className="font-medium">{planDetails.name}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Products Selected</div>
                                                            <div className="font-medium">{planDetails.product_count} Product{planDetails.product_count !== 1 ? 's' : ''}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Duration</div>
                                                            <div className="font-medium">{planDetails.duration} {planDetails.time_unit}</div>
                                                        </div>
                                                    </div>

                                                    {/* Receipt Upload Section */}
                                                    <div className="p-4 bg-white rounded-lg border border-dashed border-orange-300">
                                                        <div className="text-center">
                                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mb-2">
                                                                <Upload className="h-5 w-5 text-orange-600" />
                                                            </div>
                                                            <h4 className="font-semibold text-gray-900 mb-1 text-sm">Upload Payment Receipt</h4>
                                                            <p className="text-xs text-gray-600 mb-3">
                                                                Upload a screenshot or photo of your payment confirmation
                                                            </p>
                                                            
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-center">
                                                                    <label className="cursor-pointer w-full">
                                                                        <div className="flex flex-col items-center justify-center px-3 py-4 bg-orange-50 border-2 border-dashed border-orange-300 rounded-lg hover:bg-orange-100 transition-colors w-full">
                                                                            {receiptPreview ? (
                                                                                <div className="mb-2">
                                                                                    {receiptFile?.type.startsWith('image/') ? (
                                                                                        <div className="relative">
                                                                                            <img 
                                                                                                src={receiptPreview} 
                                                                                                alt="Receipt preview" 
                                                                                                className="w-28 h-28 object-cover rounded-lg border"
                                                                                            />
                                                                                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1">
                                                                                                <Image className="h-2 w-2" />
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="relative w-28 h-28 bg-gray-100 rounded-lg border flex items-center justify-center">
                                                                                            <FileText className="h-10 w-10 text-gray-400" />
                                                                                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1">
                                                                                                <FileText className="h-2 w-2" />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <Upload className="h-10 w-10 text-orange-500 mb-2" />
                                                                            )}
                                                                            <span className="text-xs font-medium text-orange-600">
                                                                                {receiptFile ? 'Change file' : 'Choose file'}
                                                                            </span>
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                JPG, PNG, or PDF (max 5MB)
                                                                            </p>
                                                                        </div>
                                                                        <Input
                                                                            id="receipt"
                                                                            type="file"
                                                                            accept=".jpg,.jpeg,.png,.pdf,image/*"
                                                                            className="hidden"
                                                                            onChange={handleFileChange}
                                                                        />
                                                                    </label>
                                                                </div>

                                                                {receiptFile && (
                                                                    <div className="text-center">
                                                                        <p className="text-xs text-gray-700">
                                                                            Selected: <span className="font-medium">{receiptFile.name}</span>
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            Size: {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Total Amount */}
                                                    <div className="pt-3 space-y-3">
                                                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">Total Amount</div>
                                                                <div className="text-xs text-gray-600">Plan price × {planDetails.product_count} product{planDetails.product_count !== 1 ? 's' : ''}</div>
                                                            </div>
                                                            <div className="text-xl font-bold text-orange-600">
                                                                ₱{planDetails.total_amount.toFixed(2)}
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="space-y-2">
                                                            {paymentStatus === 'pending' ? (
                                                                <>
                                                                    <Button
                                                                        size="lg"
                                                                        className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                                                                        onClick={uploadReceipt}
                                                                        disabled={loading || uploadingReceipt || !receiptFile}
                                                                    >
                                                                        {uploadingReceipt ? (
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                                                Uploading...
                                                                            </div>
                                                                        ) : loading ? (
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                                                Processing...
                                                                            </div>
                                                                        ) : (
                                                                            `Confirm Payment with ${paymentMethod}`
                                                                        )}
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full h-10 border-orange-300 text-orange-700 hover:bg-orange-50"
                                                                        onClick={() => window.location.href = `/seller/seller-boosts`}
                                                                        disabled={uploadingReceipt}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    size="lg"
                                                                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                                    onClick={() => window.location.href = `/seller/seller-boosts`}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                                    Back to Boosts
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
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