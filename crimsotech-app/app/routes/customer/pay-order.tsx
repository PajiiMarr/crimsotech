import { useState, useEffect } from "react";
import { useLoaderData, Link, useSearchParams, useNavigate } from "react-router";
import type { Route } from "./+types/pay-order";
import { UserProvider } from '~/components/providers/user-role-provider';
import AxiosInstance from '~/components/axios/Axios';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CheckCircle, Clock, AlertCircle, CreditCard, Smartphone, Wallet, ArrowLeft, Upload, FileText, Image, DollarSign, ShieldCheck } from "lucide-react";
export function meta(): Route.MetaDescriptors {
    return [{ title: "Complete Payment" }]
}
interface LoaderData {
    user: any;
}
interface OrderDetails {
    order_id: string;
    status: string;
    approval: string;
    total_amount: string;
    payment_method: string;
    delivery_method: string;
    delivery_address: string;
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    shipping_address?: {
        recipient_name: string;
        recipient_phone: string;
        full_address: string;
        address_type: string;
    };
}
interface MayaPaymentResponse {
    success: boolean;
    message: string;
    order_id: string;
    maya_checkout_id: string;
    redirect_url: string;
    reference_number: string;
    total_amount: number;
    items: any[];
    sandbox_mode: boolean;
    test_card: {
        message: string;
        card_number: string;
        expiry: string;
        cvv: string;
        otp: string;
    };
}
export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [mayaPayment, setMayaPayment] = useState<MayaPaymentResponse | null>(null);
    const [processingMaya, setProcessingMaya] = useState(false);

    const enableSandbox = import.meta.env.VITE_ENABLE_SANDBOX === 'true';

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
            setOrderDetails(response.data);
            setPaymentStatus(response.data.status === 'paid' || response.data.status === 'completed' ? 'paid' : 'pending');
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
            formData.append('order_id', orderId || '');
            formData.append('receipt', receiptFile);
            const response = await AxiosInstance.post('/checkout-order/add_receipt/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                navigate(`/order-successful/${orderId}`);
            } else {
                setError(response.data.error || "Failed to upload receipt");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Error uploading receipt");
        } finally {
            setUploadingReceipt(false);
        }
    };
    const handleMayaPayment = async () => {
        if (!orderDetails || orderDetails.payment_method !== 'Maya') return;
        
        try {

            console.log("Initiating Maya payment for order:", orderId);
            console.log("Initiating Maya payment for order:", user.user_id);

            setProcessingMaya(true);
            const response = await AxiosInstance.post('/checkout-order/initiate_maya_payment/', {
                order_id: orderId,
                user_id: user.user_id
            });
            
            if (response.data.success) {
                setMayaPayment(response.data);
                
                // Redirect to Maya checkout page
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
    const handlePaymentComplete = async () => {
        try {
            setLoading(true);
            const response = await AxiosInstance.post('/checkout-order/confirm_payment/', {
                order_id: orderId,
            });
            if (response.data.success) {
                navigate(`/order-successful/${orderId}`);
            } else setError(response.data.error || "Failed to confirm payment");
        } catch (err: any) {
            setError(err.response?.data?.error || "Error confirming payment");
        } finally {
            setLoading(false);
        }
    };
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                    <Link to="/orders">
                        <Button>View Orders</Button>
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
                            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-full">
                                            <PaymentIcon className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h1 className="text-2xl font-bold text-white">Complete Your Payment</h1>
                                            <p className="text-orange-100">Order #{orderDetails.order_id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-right">
                                        <div className="text-3xl font-bold text-white">₱{parseFloat(orderDetails.total_amount).toFixed(2)}</div>
                                        <div className="text-orange-100">Total Amount</div>
                                    </div>
                                </div>
                                
                                {/* Sandbox Mode Badge */}
                                {enableSandbox && (
                                    <div className="mt-4 flex justify-center">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/20 backdrop-blur-sm rounded-full border border-yellow-300/30">
                                            <ShieldCheck className="h-4 w-4 text-yellow-200" />
                                            <span className="text-sm font-medium text-yellow-100">Sandbox Mode Active</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 p-6 overflow-auto">
                                {paymentStatus === 'paid' && (
                                    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <CheckCircle className="h-8 w-8 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-green-800">Payment Confirmed!</h3>
                                                <p className="text-sm text-green-600">Your order is being processed</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Maya Sandbox Component */}
                                {enableSandbox && orderDetails.payment_method === 'Maya' && paymentStatus === 'pending' && !mayaPayment && (
                                    <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-blue-500 rounded-lg">
                                                <DollarSign className="h-5 w-5 text-white" />
                                            </div>
                                            <h3 className="font-semibold text-gray-900">Maya Sandbox Payment</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600">
                                                    You're in sandbox mode. Use these test credentials to simulate a payment:
                                                </p>
                                                
                                                <div className="bg-white rounded-lg p-4 border border-blue-100 space-y-3">
                                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                        <span className="text-xs font-medium text-gray-500">Test Card</span>
                                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Success</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">Card Number</div>
                                                        <div className="font-mono text-sm font-medium">5123 4500 0000 0008</div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Expiry</div>
                                                            <div className="font-mono text-sm">12/25</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-gray-500">CVV</div>
                                                            <div className="font-mono text-sm">123</div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">OTP</div>
                                                        <div className="font-mono text-sm">123456</div>
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded-lg p-4 border border-red-100">
                                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                        <span className="text-xs font-medium text-gray-500">Test Card</span>
                                                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Insufficient Balance</span>
                                                    </div>
                                                    <div className="mt-2">
                                                        <div className="text-xs text-gray-500">Card Number</div>
                                                        <div className="font-mono text-sm">5123 4500 0000 0016</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                                                <CreditCard className="h-12 w-12 mb-3 opacity-90" />
                                                <h4 className="font-semibold text-lg">Test Maya Checkout</h4>
                                                <p className="text-xs text-center text-blue-100 mb-4">
                                                    Click below to simulate a real payment flow
                                                </p>
                                                <Button
                                                    onClick={handleMayaPayment}
                                                    disabled={processingMaya}
                                                    className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                                                >
                                                    {processingMaya ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                                            Processing...
                                                        </div>
                                                    ) : (
                                                        'Proceed to Maya Sandbox'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                    <div className="h-full">
                                        <div className="h-full flex flex-col">
                                            <div className="border-2 border-dashed border-orange-300 rounded-2xl p-6 bg-gradient-to-b from-white to-orange-50 h-full flex flex-col">
                                                <div className="flex-1 flex flex-col items-center justify-center">
                                                    {qrCodeImage && !enableSandbox ? (
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
                                                    ) : enableSandbox && orderDetails.payment_method === 'Maya' ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center">
                                                            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                                                <CreditCard className="h-16 w-16 text-white" />
                                                            </div>
                                                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Sandbox Mode</h3>
                                                            <p className="text-sm text-gray-600 text-center max-w-xs">
                                                                You're testing Maya payments. Click the sandbox button to proceed.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center">
                                                            <CreditCard className="h-20 w-20 text-gray-400 mb-4" />
                                                            <p className="text-gray-500">Please complete your payment via {orderDetails.payment_method}</p>
                                                            <p className="text-sm text-gray-400 mt-2">Instructions will be provided by the seller</p>
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
                                                            <div className="font-mono text-sm break-all">{orderDetails.order_id}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Order Date</div>
                                                            <div className="font-medium text-sm">
                                                                {formatDate(orderDetails.created_at)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <div className="text-xs text-gray-500">Delivery Method</div>
                                                            <div className="font-medium text-sm">{orderDetails.delivery_method}</div>
                                                        </div>
                                                    </div>
                                                    {orderDetails.delivery_address && (
                                                        <div className="flex justify-between p-3 bg-white rounded-lg border">
                                                            <div>
                                                                <div className="text-xs text-gray-500">Delivery Address</div>
                                                                <div className="font-medium text-sm">{orderDetails.delivery_address}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {orderDetails.shipping_address && (
                                                        <div className="p-3 bg-white rounded-lg border">
                                                            <div className="text-xs text-gray-500 mb-1">Shipping Details</div>
                                                            <div className="font-medium text-sm">{orderDetails.shipping_address.recipient_name}</div>
                                                            <div className="text-xs text-gray-600">{orderDetails.shipping_address.recipient_phone}</div>
                                                            <div className="text-xs text-gray-600 mt-1">{orderDetails.shipping_address.full_address}</div>
                                                        </div>
                                                    )}
                                                    {/* Only show receipt upload for non-sandbox or non-Maya payments */}
                                                    {!(enableSandbox && orderDetails.payment_method === 'Maya') && (
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
                                                                                                    <Image className="h-3 w-3" />
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="relative">
                                                                                                <div className="w-28 h-28 bg-gray-100 rounded-lg border flex items-center justify-center">
                                                                                                    <FileText className="h-10 w-10 text-gray-400" />
                                                                                                </div>
                                                                                                <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1">
                                                                                                    <FileText className="h-3 w-3" />
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
                                                    )}
                                                    <div className="pt-3 space-y-3">
                                                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">Total Amount</div>
                                                                <div className="text-xs text-gray-600">Including all charges</div>
                                                            </div>
                                                            <div className="text-xl font-bold text-orange-600">
                                                                ₱{parseFloat(orderDetails.total_amount).toFixed(2)}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {paymentStatus === 'pending' ? (
                                                                <>
                                                                    {enableSandbox && orderDetails.payment_method === 'Maya' ? (
                                                                        <>
                                                                            <Button
                                                                                size="lg"
                                                                                className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                                                onClick={handleMayaPayment}
                                                                                disabled={processingMaya}
                                                                            >
                                                                                {processingMaya ? (
                                                                                    <div className="flex items-center justify-center gap-2">
                                                                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                                                        Processing...
                                                                                    </div>
                                                                                ) : (
                                                                                    'Pay with Maya Sandbox'
                                                                                )}
                                                                            </Button>
                                                                        </>
                                                                    ) : (
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
                                                                        </>
                                                                    )}
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full h-10"
                                                                        onClick={() => navigate(`/order-successful/${orderId}`)}
                                                                        disabled={uploadingReceipt || processingMaya}
                                                                    >
                                                                        Skip Payment for Now
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    size="lg"
                                                                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                                    onClick={() => navigate(`/order-successful/${orderId}`)}
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