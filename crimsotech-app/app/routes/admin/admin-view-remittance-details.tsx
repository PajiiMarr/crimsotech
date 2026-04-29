import type { Route } from "./+types/admin-view-remittance-details";
import { UserProvider } from "~/components/providers/user-role-provider";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
    Clock,
    User,
    Calendar,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ArrowLeft,
    Download,
    FileText,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Wallet,
    Banknote,
    Copy,
    ExternalLink,
    Upload,
    PhilippinePeso,
} from "lucide-react";
import AxiosInstance from "~/components/axios/Axios";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useToast } from "~/hooks/use-toast";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Remittance Details | Admin",
        },
    ];
}

interface RemittanceDetail {
    id: string;
    reference_number: string;
    user: {
        id: number;
        username: string;
        email: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        address?: string;
    };
    wallet: {
        id: string;
        wallet_id: string;
        balance: number;
        available_balance?: number;
        pending_balance?: number;
    };
    amount: number;
    status: "pending" | "completed" | "failed" | "cancelled";
    payment_method?: string;
    requested_at: string;
    completed_at?: string;
    processed_by?: {
        id: number;
        username: string;
        email?: string;
    };
    proof_url?: string;
}

interface LoaderData {
    user: any;
    userId: string | null;
    remittance: RemittanceDetail | null;
    error?: string;
}

export async function loader({
    params,
    request,
    context,
}: Route.LoaderArgs): Promise<LoaderData> {
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isAdmin"]);

    const { getSession } = await import("~/sessions.server");
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId") || null;
    const remittanceId = params.id;

    let remittanceDetail: RemittanceDetail | null = null;
    let error: string | undefined;

    try {
        const response = await AxiosInstance.get(
            `/admin-remittances/${remittanceId}/`,
            {
                headers: { "X-User-Id": userId },
            }
        );

        if (response.data?.success) {
            remittanceDetail = response.data.remittance || response.data.data;
        } else {
            error = response.data?.error || "Failed to load remittance details";
        }
    } catch (err: any) {
        console.error("Error fetching remittance details:", err);
        if (err.response?.status === 404) {
            error = "Remittance not found.";
        } else {
            error = err.response?.data?.error || "Failed to load remittance details";
        }
    }

    return {
        user,
        userId,
        remittance: remittanceDetail,
        error,
    };
}

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = (s: string) => {
        const statusMap: Record<
            string,
            { color: string; icon: any; label: string }
        > = {
            pending: { color: "#f59e0b", icon: Clock, label: "Pending" },
            completed: { color: "#10b981", icon: CheckCircle, label: "Completed" },
            failed: { color: "#ef4444", icon: XCircle, label: "Failed" },
            rejected: { color: "#ef4444", icon: XCircle, label: "Rejected" },
            cancelled: { color: "#6b7280", icon: XCircle, label: "Cancelled" },
        };
        return statusMap[s.toLowerCase()] || statusMap.pending;
    };

    const config = getStatusConfig(status);
    const IconComponent = config.icon;

    return (
        <Badge
            variant="secondary"
            className="text-sm capitalize flex items-center gap-1 w-fit px-3 py-1"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
            <IconComponent className="w-4 h-4" />
            {config.label}
        </Badge>
    );
};

interface ActionDialogProps {
    remittance: RemittanceDetail;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    userId: string | null;
}

const ApproveDialog = ({
    remittance,
    open,
    onOpenChange,
    onSuccess,
    userId,
}: ActionDialogProps) => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleApprove = async () => {
        setLoading(true);
        try {
            const headers: Record<string, string> = {};
            if (userId) headers["X-User-Id"] = userId;

            const response = await AxiosInstance.post(
                `/admin-remittances/${remittance.id}/approve/`,
                {},
                { headers }
            );

            if (response.data?.success) {
                toast({ title: "Success", description: "Remittance approved successfully" });
                onSuccess();
                onOpenChange(false);
                navigate(".", { replace: true });
            } else {
                toast({ title: "Error", description: response.data?.error || "Failed to approve remittance", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.error || "Failed to approve remittance", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Approve Remittance</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to approve this remittance?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-2">
                    <p><strong>Ref No:</strong> {remittance.reference_number}</p>
                    <p><strong>User:</strong> {remittance.user?.username}</p>
                    <p><strong>Amount:</strong> ₱{remittance.amount?.toLocaleString()}</p>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove} disabled={loading}>{loading ? "Approving..." : "Approve"}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const RejectDialog = ({
    remittance,
    open,
    onOpenChange,
    onSuccess,
    userId,
}: ActionDialogProps) => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleReject = async () => {
        setLoading(true);
        try {
            const headers: Record<string, string> = {};
            if (userId) headers["X-User-Id"] = userId;

            const response = await AxiosInstance.post(
                `/admin-remittances/${remittance.id}/reject/`,
                {},
                { headers }
            );

            if (response.data?.success) {
                toast({ title: "Success", description: "Remittance rejected" });
                onSuccess();
                onOpenChange(false);
                navigate(".", { replace: true });
            } else {
                toast({ title: "Error", description: response.data?.error || "Failed to reject remittance", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.error || "Failed to reject remittance", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reject Remittance</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to reject this remittance?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-2">
                    <p><strong>Ref No:</strong> {remittance.reference_number}</p>
                    <p><strong>Amount:</strong> ₱{remittance.amount?.toLocaleString()}</p>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReject} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {loading ? "Rejecting..." : "Reject"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | number | React.ReactNode; icon?: any }) => (
    <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
        <div className="flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="text-sm font-medium mt-0.5">{value}</div>
        </div>
    </div>
);

const CopyableText = ({ text, label }: { text: string; label: string }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ title: "Copied!", description: `${label} copied to clipboard` });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{text}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}><Copy className="h-3 w-3" /></Button>
        </div>
    );
};

export default function ViewRemittanceDetails({ loaderData }: { loaderData: LoaderData }) {
    const { user, userId, remittance, error } = loaderData;
    const navigate = useNavigate();
    const [dialogType, setDialogType] = useState<"approve" | "reject" | null>(null);

    const formatCurrency = (amount: number) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (error) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 md:p-6">
                    <div className="flex flex-col items-center justify-center h-[60vh]">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold mb-2">Error Loading Remittance</h2>
                        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
                        <Button onClick={() => navigate("/admin/remittances")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Remittances</Button>
                    </div>
                </div>
            </UserProvider>
        );
    }

    if (!remittance) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 md:p-6 flex items-center justify-center h-[60vh]">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Loading remittance details...</p>
                    </div>
                </div>
            </UserProvider>
        );
    }

    const handleAction = (action: string) => setDialogType(action as any);
    const handleDialogClose = () => setDialogType(null);
    const handleSuccess = () => navigate(".", { replace: true });

    const status = remittance.status?.toLowerCase() || "";
    const userInitials = remittance.user?.username?.substring(0, 2).toUpperCase() || "U";

    const getImageUrl = (url: string) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `http://127.0.0.1:8000${url}`;
    };

    const proofImageUrl = remittance.proof_url ? getImageUrl(remittance.proof_url) : null;

    return (
        <UserProvider user={user}>
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => navigate("/admin/remittances")}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Remittance Details</h1>
                            <p className="text-muted-foreground mt-1">View and manage rider remittance</p>
                        </div>
                    </div>
                    <StatusBadge status={remittance.status} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5" /> Remittance Information</CardTitle>
                                <CardDescription>Details of the rider's remittance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoRow label="Reference Number" value={<CopyableText text={remittance.reference_number} label="Reference Number" />} icon={FileText} />
                                    <InfoRow label="Amount" value={formatCurrency(remittance.amount)} icon={PhilippinePeso} />
                                    <InfoRow label="Requested Date" value={new Date(remittance.requested_at).toLocaleString()} icon={Calendar} />
                                    {remittance.completed_at && <InfoRow label="Processed Date" value={new Date(remittance.completed_at).toLocaleString()} icon={Calendar} />}
                                    {remittance.processed_by && <InfoRow label="Processed By" value={remittance.processed_by.username} icon={User} />}
                                </div>
                                {remittance.payment_method && <InfoRow label="Payment Method" value={remittance.payment_method} icon={CreditCard} />}
                            </CardContent>
                        </Card>

                        {remittance.proof_url && proofImageUrl && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Proof of Receipt</CardTitle>
                                    <CardDescription>Rider uploaded proof of receipt</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="rounded-lg border overflow-hidden bg-gray-50">
                                            {proofImageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || proofImageUrl.startsWith('http') ? (
                                                <img src={proofImageUrl} alt="Proof of Payment" className="w-full max-h-[400px] object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-8">
                                                    <FileText className="w-16 h-16 text-gray-400 mb-2" />
                                                    <p className="text-sm text-muted-foreground">Document - Click download to view</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end">
                                            <Button asChild variant="outline">
                                                <a href={proofImageUrl} download target="_blank" rel="noopener noreferrer">
                                                    <Download className="w-4 h-4 mr-2" /> View Proof
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Rider Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12"><AvatarFallback>{userInitials}</AvatarFallback></Avatar>
                                    <div>
                                        <p className="font-medium">{remittance.user?.username}</p>
                                        <p className="text-sm text-muted-foreground">{remittance.user?.first_name} {remittance.user?.last_name}</p>
                                    </div>
                                </div>
                                <Separator />
                                <InfoRow label="Email" value={remittance.user?.email || "N/A"} icon={Mail} />
                                {remittance.user?.phone && <InfoRow label="Phone" value={remittance.user.phone} icon={Phone} />}
                                {remittance.user?.address && <InfoRow label="Address" value={remittance.user.address} icon={MapPin} />}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Wallet Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow label="Wallet ID" value={<CopyableText text={remittance.wallet?.wallet_id || "N/A"} label="Wallet ID" />} icon={Wallet} />
                                <InfoRow label="Current Balance" value={formatCurrency(remittance.wallet?.balance || 0)} icon={PhilippinePeso} />
                                {remittance.wallet?.available_balance !== undefined && <InfoRow label="Available Balance" value={formatCurrency(remittance.wallet.available_balance)} icon={PhilippinePeso} />}
                                {remittance.wallet?.pending_balance !== undefined && <InfoRow label="Pending Balance" value={formatCurrency(remittance.wallet.pending_balance)} icon={Clock} />}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Actions</CardTitle>
                                <CardDescription>Manage this remittance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {status === "pending" && (
                                    <>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleAction("approve")}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Approve Remittance
                                        </Button>
                                        <Button variant="destructive" className="w-full" onClick={() => handleAction("reject")}>
                                            <XCircle className="w-4 h-4 mr-2" /> Reject Remittance
                                        </Button>
                                    </>
                                )}
                                {status === "completed" && <Button variant="outline" className="w-full" disabled><CheckCircle className="w-4 h-4 mr-2" /> Completed</Button>}
                                {(status === "failed" || status === "rejected") && <Button variant="outline" className="w-full" disabled><XCircle className="w-4 h-4 mr-2" /> Failed/Rejected</Button>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {remittance && dialogType === "approve" && <ApproveDialog remittance={remittance} open={true} onOpenChange={handleDialogClose} onSuccess={handleSuccess} userId={userId} />}
            {remittance && dialogType === "reject" && <RejectDialog remittance={remittance} open={true} onOpenChange={handleDialogClose} onSuccess={handleSuccess} userId={userId} />}
        </UserProvider>
    );
}
