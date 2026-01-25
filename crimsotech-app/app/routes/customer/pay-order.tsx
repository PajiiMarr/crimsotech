import { useState, useEffect } from "react";
import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/pay-order";
import { UserProvider } from '~/components/providers/user-role-provider';
import AxiosInstance from '~/components/axios/Axios';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CheckCircle, Clock, AlertCircle, CreditCard, Smartphone, Wallet, ArrowLeft, Upload, FileText, Image } from "lucide-react";

export function meta(): Route.MetaDescriptors {
    return [{ title: "Complete Payment" }]
}

interface LoaderData {
    user: any;
}

interface OrderDetails {
    order_id: string;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) user = await fetchUserRole({ request, context });
    await requireRole(request, context, ["isCustomer"]);
    return { user };
}

export async function action({ request }: { request: Request }) {
    try {
        const formData = await request.formData();
        const orderId = formData.get('order_id') as string;
        const receipt = formData.get('receipt') as File;
        
        if (!orderId || !receipt) {
            return { success: false, error: 'Missing required fields' };
        }

        const uploadData = new FormData();
        uploadData.append('order_id', orderId);
        uploadData.append('receipt', receipt);

        const response = await AxiosInstance.post('/checkout-order/add_receipt/', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            return { success: true, orderId, message: response.data.message };
        } else {
            return { success: false, error: response.data.error };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export default function PaymentPage({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    useEffect(() => {
        if (orderId) fetchOrderDetails();
        else {
            setError("No order ID provided");
            setLoading(false);
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const response = await AxiosInstance.get(`/checkout-order/get_order_details/${orderId}/`);
            if (response.data.success) {
                setOrderDetails(response.data.order);
                setPaymentStatus(response.data.order.status === 'paid' ? 'paid' : 'pending');
            } else setError(response.data.error || "Failed to load order details");
        } catch (err: any) {
            setError(err.response?.data?.error || "Error fetching order details");
        } finally {
            setLoading(false);
        }
    };

    const getPaymentMethodIcon = () => {
        if (!orderDetails) return CreditCard;
        switch(orderDetails.payment_method) {
            case 'GCash': return Smartphone;
            case 'Maya': return CreditCard;
            default: return Wallet;
        }
    };

    const getQRCodeImage = () => {
        if (!orderDetails) return null;
        switch(orderDetails.payment_method) {
            case 'GCash': return 'gcash.jpeg';
            case 'Maya': return 'maya.jpeg';
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
            formData.append('order_id', orderId || '');
            formData.append('receipt', receiptFile);

            const response = await AxiosInstance.post('/checkout-order/add_receipt/', formData, {
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
            const response = await AxiosInstance.post('/checkout-order/confirm_payment/', {
                order_id: orderId,
            });
            if (response.data.success) {
                setPaymentStatus('paid');
                setTimeout(() => {
                    window.location.href = `/order-successful/${orderId}`;
                });
            } else setError(response.data.error || "Failed to confirm payment");
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
                    <h2 className="text-xl font-semibold text-gray-900">Loading Payment...</h2>
                </div>
            </div>
        </UserProvider>
    );

    if (error || !orderDetails) return (
        <UserProvider user={user}>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || "Order Not Found"}</h2>
                    <Link to="/orders"><Button>View Orders</Button></Link>
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
                            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-full">
                                            <PaymentIcon className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h1 className="text-2xl font-bold text-white">Complete Your Payment</h1>
                                            <p className="text-orange-100">Order #{orderDetails.order_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-right">
                                        <div className="text-3xl font-bold text-white">₱{orderDetails.total_amount.toFixed(2)}</div>
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
                                                <h3 className="font-semibold text-green-800">Payment Confirmed!</h3>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                    <div className="h-full">
                                        <div className="h-full flex flex-col">
                                            <div className="border-2 border-dashed border-orange-300 rounded-2xl p-6 bg-gradient-to-b from-white to-orange-50 h-full flex flex-col">
                                                <div className="flex-1 flex flex-col items-center justify-center">
                                                    {qrCodeImage ? (
                                                        <>
                                                            <div className="mb-4 flex-1 flex items-center justify-center w-full">
                                                                <img 
                                                                    src={qrCodeImage} 
                                                                    alt={`${orderDetails.payment_method} QR Code`}
                                                                    className="w-full max-w-xs h-auto object-contain"
                                                                />
                                                            </div>
                                                            <div className="mt-auto pt-4 w-full text-center">
                                                                <div className="inline-flex items-center gap-3 px-5 py-2 bg-orange-100 text-orange-800 rounded-full mb-2">
                                                                    <PaymentIcon className="h-4 w-4" />
                                                                    <span className="font-semibold">{orderDetails.payment_method}</span>
                                                                </div>
                                                                <p className="text-gray-600 text-sm">
                                                                    Scan this QR code with your {orderDetails.payment_method} app
                                                                </p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center">
                                                            <CreditCard className="h-20 w-20 text-gray-400 mb-4" />
                                                            <p className="text-gray-500">QR Code not available for {orderDetails.payment_method}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

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
                                                                <div className="font-medium">{orderDetails.payment_method}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Order ID</div>
                                                            <div className="font-mono text-sm">{orderDetails.order_id}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Order Date</div>
                                                            <div className="font-medium text-sm">
                                                                {new Date(orderDetails.created_at).toLocaleDateString('en-PH', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-white rounded-lg border border-dashed border-blue-300">
                                                        <div className="text-center">
                                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
                                                                <Upload className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <h4 className="font-semibold text-gray-900 mb-1 text-sm">Upload Payment Receipt</h4>
                                                            <p className="text-xs text-gray-600 mb-3">
                                                                Upload a screenshot or photo of your payment confirmation
                                                            </p>
                                                            
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-center">
                                                                    <label className="cursor-pointer w-full">
                                                                        <div className="flex flex-col items-center justify-center px-3 py-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 transition-colors w-full">
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
                                                                                        <div className="w-28 h-28 bg-gray-100 rounded-lg border flex items-center justify-center">
                                                                                            <FileText className="h-10 w-10 text-gray-400" />
                                                                                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1">
                                                                                                <FileText className="h-2 w-2" />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <Upload className="h-10 w-10 text-blue-500 mb-2" />
                                                                            )}
                                                                            <span className="text-xs font-medium text-blue-600">
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

                                                    <div className="pt-3 space-y-3">
                                                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">Total Amount</div>
                                                                <div className="text-xs text-gray-600">Including all charges</div>
                                                            </div>
                                                            <div className="text-xl font-bold text-orange-600">
                                                                ₱{orderDetails.total_amount.toFixed(2)}
                                                            </div>
                                                        </div>

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
                                                                            `Confirm Payment with ${orderDetails.payment_method}`
                                                                        )}
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full h-10"
                                                                        onClick={() => window.location.href = `/order-successful/${orderId}`}
                                                                        disabled={uploadingReceipt}
                                                                    >
                                                                        Skip Payment for Now
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    size="lg"
                                                                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                                    onClick={() => window.location.href = `/order-successful/${orderId}`}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                                    View Order Details
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