// import type { Route } from "./+types/admin-view-withdrawal-details"
// import SidebarLayout from '~/components/layouts/sidebar'
// import { UserProvider } from '~/components/providers/user-role-provider';

// import { 
//   Card, 
//   CardHeader, 
//   CardTitle,  
//   CardContent, 
//   CardDescription,
// } from '~/components/ui/card';
// import { Button } from '~/components/ui/button';
// import { Badge } from '~/components/ui/badge';
// import { Separator } from '~/components/ui/separator';
// import {
//   Clock,
//   User,
//   Calendar,
//   RefreshCw,
//   DollarSign,
//   AlertTriangle,
//   CheckCircle,
//   XCircle,
//   ArrowLeft,
//   Download,
//   FileText,
//   Mail,
//   Phone,
//   MapPin,
//   CreditCard,
//   Wallet,
//   Banknote,
//   Copy,
//   ExternalLink,
//   Upload,
//   Eye
// } from 'lucide-react';
// import AxiosInstance from '~/components/axios/Axios';
// import { Link, useNavigate } from 'react-router';
// import { useState } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '~/components/ui/dialog';
// import { Input } from '~/components/ui/input';
// import { Label } from '~/components/ui/label';
// import { Textarea } from '~/components/ui/textarea';
// import { useToast } from '~/hooks/use-toast';
// import { Avatar, AvatarFallback } from '~/components/ui/avatar';

// export function meta(): Route.MetaDescriptors {
//   return [
//     {
//       title: "Withdrawal Details | Admin",
//     },
//   ];
// }

// interface WithdrawalDetail {
//   id: number;
//   withdrawal_id: string;
//   user: {
//     id: number;
//     username: string;
//     email: string;
//     first_name?: string;
//     last_name?: string;
//     phone?: string;
//     address?: string;
//   };
//   wallet: {
//     id: number;
//     wallet_id: string;
//     balance: number;
//     available_balance?: number;
//     pending_balance?: number;
//   };
//   amount: number;
//   status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
//   payment_method?: string;
//   account_details?: string;
//   requested_at: string;
//   approved_at?: string;
//   completed_at?: string;
//   approved_by?: {
//     id: number;
//     username: string;
//     email?: string;
//   };
//   admin_proof?: string;
//   notes?: string;
//   rejection_reason?: string;
//   cancellation_reason?: string;
// }

// interface LoaderData {
//   user: any;
//   withdrawal: WithdrawalDetail | null;
//   error?: string;
// }

// export async function loader({ params, request, context }: Route.LoaderArgs): Promise<LoaderData> {
//   const { requireRole } = await import("~/middleware/role-require.server");
//   const { fetchUserRole } = await import("~/middleware/role.server");

//   let user = (context as any).user;
//   if (!user) {
//     user = await fetchUserRole({ request, context });
//   }

//   await requireRole(request, context, ["isAdmin"]);

//   const { getSession } = await import('~/sessions.server');
//   const session = await getSession(request.headers.get("Cookie"));
//   const userId = session.get("userId");
//   const withdrawalId = params.id;

//   let withdrawalDetail: WithdrawalDetail | null = null;
//   let error: string | undefined;

//   try {
//     const response = await AxiosInstance.get(`/admin-withdrawals/${withdrawalId}/`, {
//       headers: { "X-User-Id": userId }
//     });

//     if (response.data?.success) {
//       withdrawalDetail = response.data.withdrawal;
//     } else {
//       error = response.data?.error || 'Failed to load withdrawal details';
//     }
//   } catch (err: any) {
//     console.error('Error fetching withdrawal details:', err);
//     error = err.response?.data?.error || 'Failed to load withdrawal details';
//   }

//   return { 
//     user, 
//     withdrawal: withdrawalDetail,
//     error
//   };
// }

// // Status Badge Component
// const StatusBadge = ({ status }: { status: string }) => {
//   const getStatusConfig = (s: string) => {
//     const statusMap: Record<string, { color: string; icon: any; label: string }> = {
//       pending: { color: '#f59e0b', icon: Clock, label: 'Pending' },
//       approved: { color: '#3b82f6', icon: CheckCircle, label: 'Approved' },
//       processing: { color: '#8b5cf6', icon: Clock, label: 'Processing' },
//       completed: { color: '#10b981', icon: CheckCircle, label: 'Completed' },
//       rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
//       cancelled: { color: '#6b7280', icon: XCircle, label: 'Cancelled' }
//     };
//     return statusMap[s.toLowerCase()] || statusMap.pending;
//   };

//   const config = getStatusConfig(status);
//   const IconComponent = config.icon;

//   return (
//     <Badge 
//       variant="secondary"
//       className="text-sm capitalize flex items-center gap-1 w-fit px-3 py-1"
//       style={{ backgroundColor: `${config.color}20`, color: config.color }}
//     >
//       <IconComponent className="w-4 h-4" />
//       {config.label}
//     </Badge>
//   );
// };

// // Action Dialog Components
// interface ActionDialogProps {
//   withdrawal: WithdrawalDetail;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSuccess: () => void;
// }

// const ApproveDialog = ({ withdrawal, open, onOpenChange, onSuccess }: ActionDialogProps) => {
//   const [loading, setLoading] = useState(false);
//   const { toast } = useToast();
//   const navigate = useNavigate();

//   const handleApprove = async () => {
//     setLoading(true);
//     try {
//       const { getSession } = await import('~/sessions.server');
//       const session = await getSession(document.cookie);
//       const userId = session.get("userId");
      
//       const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawal.id}/approve/`, {}, {
//         headers: { "X-User-Id": userId }
//       });

//       if (response.data?.success) {
//         toast({
//           title: "Success",
//           description: "Withdrawal request approved successfully",
//         });
//         onSuccess();
//         onOpenChange(false);
//         navigate('.', { replace: true });
//       }
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.response?.data?.error || "Failed to approve withdrawal",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Approve Withdrawal</DialogTitle>
//           <DialogDescription>
//             Are you sure you want to approve this withdrawal request?
//           </DialogDescription>
//         </DialogHeader>
//         <div className="py-4">
//           <div className="space-y-2">
//             <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
//             <p><strong>User:</strong> {withdrawal.user?.username} ({withdrawal.user?.email})</p>
//             <p><strong>Amount:</strong> ₱{withdrawal.amount?.toLocaleString()}</p>
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
//             Cancel
//           </Button>
//           <Button onClick={handleApprove} disabled={loading}>
//             {loading ? "Approving..." : "Approve"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const RejectDialog = ({ withdrawal, open, onOpenChange, onSuccess }: ActionDialogProps) => {
//   const [loading, setLoading] = useState(false);
//   const [reason, setReason] = useState('');
//   const { toast } = useToast();
//   const navigate = useNavigate();

//   const handleReject = async () => {
//     if (!reason.trim()) {
//       toast({
//         title: "Error",
//         description: "Please provide a reason for rejection",
//         variant: "destructive",
//       });
//       return;
//     }

//     setLoading(true);
//     try {
//       const { getSession } = await import('~/sessions.server');
//       const session = await getSession(document.cookie);
//       const userId = session.get("userId");
      
//       const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawal.id}/reject/`, 
//         { reason },
//         { headers: { "X-User-Id": userId } }
//       );

//       if (response.data?.success) {
//         toast({
//           title: "Success",
//           description: "Withdrawal request rejected",
//         });
//         onSuccess();
//         onOpenChange(false);
//         navigate('.', { replace: true });
//       }
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.response?.data?.error || "Failed to reject withdrawal",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Reject Withdrawal</DialogTitle>
//           <DialogDescription>
//             Please provide a reason for rejecting this withdrawal request.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="py-4 space-y-4">
//           <div className="space-y-2">
//             <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
//             <p><strong>Amount:</strong> ₱{withdrawal.amount?.toLocaleString()}</p>
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="reason">Rejection Reason</Label>
//             <Textarea
//               id="reason"
//               value={reason}
//               onChange={(e) => setReason(e.target.value)}
//               placeholder="Enter reason for rejection..."
//               rows={3}
//             />
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
//             Cancel
//           </Button>
//           <Button variant="destructive" onClick={handleReject} disabled={loading}>
//             {loading ? "Rejecting..." : "Reject"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const ProcessDialog = ({ withdrawal, open, onOpenChange, onSuccess }: ActionDialogProps) => {
//   const [loading, setLoading] = useState(false);
//   const { toast } = useToast();
//   const navigate = useNavigate();

//   const handleProcess = async () => {
//     setLoading(true);
//     try {
//       const { getSession } = await import('~/sessions.server');
//       const session = await getSession(document.cookie);
//       const userId = session.get("userId");
      
//       const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawal.id}/process/`, {}, {
//         headers: { "X-User-Id": userId }
//       });

//       if (response.data?.success) {
//         toast({
//           title: "Success",
//           description: "Withdrawal marked as processing",
//         });
//         onSuccess();
//         onOpenChange(false);
//         navigate('.', { replace: true });
//       }
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.response?.data?.error || "Failed to process withdrawal",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Process Withdrawal</DialogTitle>
//           <DialogDescription>
//             Mark this withdrawal request as processing.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="py-4">
//           <p>Are you sure you want to mark this withdrawal as processing?</p>
//           <div className="mt-4 space-y-2">
//             <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
//             <p><strong>Amount:</strong> ₱{withdrawal.amount?.toLocaleString()}</p>
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
//             Cancel
//           </Button>
//           <Button onClick={handleProcess} disabled={loading}>
//             {loading ? "Processing..." : "Mark as Processing"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const CompleteDialog = ({ withdrawal, open, onOpenChange, onSuccess }: ActionDialogProps) => {
//   const [loading, setLoading] = useState(false);
//   const [proofFile, setProofFile] = useState<File | null>(null);
//   const [preview, setPreview] = useState<string | null>(null);
//   const { toast } = useToast();
//   const navigate = useNavigate();

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       // Validate file type
//       const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
//       if (!allowedTypes.includes(file.type)) {
//         toast({
//           title: "Error",
//           description: "Invalid file type. Allowed: JPEG, PNG, GIF, PDF",
//           variant: "destructive",
//         });
//         return;
//       }

//       // Validate file size (5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         toast({
//           title: "Error",
//           description: "File size too large. Maximum 5MB",
//           variant: "destructive",
//         });
//         return;
//       }

//       setProofFile(file);
      
//       // Create preview for images
//       if (file.type.startsWith('image/')) {
//         const reader = new FileReader();
//         reader.onloadend = () => {
//           setPreview(reader.result as string);
//         };
//         reader.readAsDataURL(file);
//       } else {
//         setPreview(null);
//       }
//     }
//   };

//   const handleComplete = async () => {
//     if (!proofFile) {
//       toast({
//         title: "Error",
//         description: "Please upload proof of payment",
//         variant: "destructive",
//       });
//       return;
//     }

//     setLoading(true);
//     try {
//       const { getSession } = await import('~/sessions.server');
//       const session = await getSession(document.cookie);
//       const userId = session.get("userId");
      
//       const formData = new FormData();
//       formData.append('admin_proof', proofFile);

//       const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawal.id}/complete/`, formData, {
//         headers: { 
//           "X-User-Id": userId,
//           "Content-Type": "multipart/form-data"
//         }
//       });

//       if (response.data?.success) {
//         toast({
//           title: "Success",
//           description: "Withdrawal completed successfully",
//         });
//         onSuccess();
//         onOpenChange(false);
//         navigate('.', { replace: true });
//       }
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.response?.data?.error || "Failed to complete withdrawal",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>Complete Withdrawal</DialogTitle>
//           <DialogDescription>
//             Upload proof of payment to complete this withdrawal.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="py-4 space-y-4">
//           <div className="space-y-2">
//             <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
//             <p><strong>Amount:</strong> ₱{withdrawal.amount?.toLocaleString()}</p>
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="proof">Proof of Payment</Label>
//             <Input
//               id="proof"
//               type="file"
//               accept=".jpg,.jpeg,.png,.gif,.pdf"
//               onChange={handleFileChange}
//             />
//             <p className="text-xs text-muted-foreground">
//               Allowed: JPEG, PNG, GIF, PDF (Max 5MB)
//             </p>
//           </div>

//           {preview && (
//             <div className="mt-2">
//               <p className="text-sm font-medium mb-2">Preview:</p>
//               <img src={preview} alt="Preview" className="max-h-40 rounded-md border" />
//             </div>
//           )}

//           {proofFile && !preview && (
//             <div className="flex items-center gap-2 text-sm">
//               <FileText className="w-4 h-4" />
//               <span>{proofFile.name}</span>
//             </div>
//           )}
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
//             Cancel
//           </Button>
//           <Button onClick={handleComplete} disabled={loading}>
//             {loading ? "Completing..." : "Complete Withdrawal"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// // Info Row Component
// const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | number | React.ReactNode; icon?: any }) => (
//   <div className="flex items-start gap-3 py-2">
//     {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
//     <div className="flex-1">
//       <p className="text-sm text-muted-foreground">{label}</p>
//       <p className="text-sm font-medium mt-0.5">{value}</p>
//     </div>
//   </div>
// );

// // Copyable Text Component
// const CopyableText = ({ text, label }: { text: string; label: string }) => {
//   const [copied, setCopied] = useState(false);
//   const { toast } = useToast();

//   const handleCopy = () => {
//     navigator.clipboard.writeText(text);
//     setCopied(true);
//     toast({
//       title: "Copied!",
//       description: `${label} copied to clipboard`,
//     });
//     setTimeout(() => setCopied(false), 2000);
//   };

//   return (
//     <div className="flex items-center gap-2">
//       <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{text}</span>
//       <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
//         <Copy className="h-3 w-3" />
//       </Button>
//     </div>
//   );
// };

// export default function ViewWithdrawalDetails({ loaderData }: { loaderData: LoaderData }) {
//   const { user, withdrawal, error } = loaderData;
//   const navigate = useNavigate();
//   const [dialogType, setDialogType] = useState<'approve' | 'reject' | 'process' | 'complete' | null>(null);

//   if (error) {
//     return (
//       <UserProvider user={user}>
//         <SidebarLayout>
//           <div className="flex flex-col items-center justify-center h-[60vh]">
//             <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
//             <h2 className="text-xl font-bold mb-2">Error Loading Withdrawal</h2>
//             <p className="text-muted-foreground mb-4">{error}</p>
//             <Button onClick={() => navigate('/admin/withdrawals')}>
//               <ArrowLeft className="w-4 h-4 mr-2" />
//               Back to Withdrawals
//             </Button>
//           </div>
//         </SidebarLayout>
//       </UserProvider>
//     );
//   }

//   if (!withdrawal) {
//     return (
//       <UserProvider user={user}>
//         <SidebarLayout>
//           <div className="flex items-center justify-center h-[60vh]">
//             <div>Loading withdrawal details...</div>
//           </div>
//         </SidebarLayout>
//       </UserProvider>
//     );
//   }

//   const handleAction = (action: string) => {
//     setDialogType(action as any);
//   };

//   const handleDialogClose = () => {
//     setDialogType(null);
//   };

//   const handleSuccess = () => {
//     // Refresh the page data
//     navigate('.', { replace: true });
//   };

//   const status = withdrawal.status?.toLowerCase() || '';
//   const userInitials = withdrawal.user?.username?.substring(0, 2).toUpperCase() || 'U';

//   return (
//     <UserProvider user={user}>
//       <SidebarLayout>
//         <div className="space-y-6">
//           {/* Header with back button */}
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <div className="flex items-center gap-4">
//               <Button variant="outline" size="sm" onClick={() => navigate('/admin/withdrawals')}>
//                 <ArrowLeft className="w-4 h-4 mr-2" />
//                 Back
//               </Button>
//               <div>
//                 <h1 className="text-2xl sm:text-3xl font-bold">Withdrawal Details</h1>
//                 <p className="text-muted-foreground mt-1">
//                   View and manage withdrawal request
//                 </p>
//               </div>
//             </div>
//             <StatusBadge status={withdrawal.status} />
//           </div>

//           {/* Main Content */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Left Column - Withdrawal Info */}
//             <div className="lg:col-span-2 space-y-6">
//               {/* Withdrawal Information Card */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <Wallet className="w-5 h-5" />
//                     Withdrawal Information
//                   </CardTitle>
//                   <CardDescription>
//                     Details of the withdrawal request
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <InfoRow 
//                       label="Withdrawal ID" 
//                       value={<CopyableText text={withdrawal.withdrawal_id} label="Withdrawal ID" />}
//                       icon={FileText}
//                     />
//                     <InfoRow 
//                       label="Amount" 
//                       value={`₱${withdrawal.amount?.toLocaleString()}`}
//                       icon={DollarSign}
//                     />
//                     <InfoRow 
//                       label="Requested Date" 
//                       value={new Date(withdrawal.requested_at).toLocaleString()}
//                       icon={Calendar}
//                     />
//                     {withdrawal.approved_at && (
//                       <InfoRow 
//                         label="Approved Date" 
//                         value={new Date(withdrawal.approved_at).toLocaleString()}
//                         icon={Calendar}
//                       />
//                     )}
//                     {withdrawal.completed_at && (
//                       <InfoRow 
//                         label="Completed Date" 
//                         value={new Date(withdrawal.completed_at).toLocaleString()}
//                         icon={Calendar}
//                       />
//                     )}
//                     {withdrawal.approved_by && (
//                       <InfoRow 
//                         label="Approved By" 
//                         value={withdrawal.approved_by.username}
//                         icon={User}
//                       />
//                     )}
//                   </div>
                  
//                   {withdrawal.payment_method && (
//                     <InfoRow 
//                       label="Payment Method" 
//                       value={withdrawal.payment_method}
//                       icon={CreditCard}
//                     />
//                   )}
                  
//                   {withdrawal.account_details && (
//                     <InfoRow 
//                       label="Account Details" 
//                       value={withdrawal.account_details}
//                       icon={Banknote}
//                     />
//                   )}
                  
//                   {withdrawal.rejection_reason && (
//                     <div className="mt-4 p-4 bg-red-50 rounded-lg">
//                       <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
//                       <p className="text-sm text-red-600">{withdrawal.rejection_reason}</p>
//                     </div>
//                   )}
                  
//                   {withdrawal.notes && (
//                     <div className="mt-4 p-4 bg-blue-50 rounded-lg">
//                       <p className="text-sm font-medium text-blue-800 mb-1">Notes</p>
//                       <p className="text-sm text-blue-600">{withdrawal.notes}</p>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               {/* Proof of Payment Card */}
//               {withdrawal.admin_proof && (
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="flex items-center gap-2">
//                       <Upload className="w-5 h-5" />
//                       Proof of Payment
//                     </CardTitle>
//                     <CardDescription>
//                       Admin uploaded proof for this withdrawal
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="flex items-center gap-4">
//                       <Button asChild variant="outline">
//                         <a href={withdrawal.admin_proof} target="_blank" rel="noopener noreferrer">
//                           <Eye className="w-4 h-4 mr-2" />
//                           View Proof
//                         </a>
//                       </Button>
//                       <Button asChild variant="outline">
//                         <a href={withdrawal.admin_proof} download>
//                           <Download className="w-4 h-4 mr-2" />
//                           Download
//                         </a>
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </Card>
//               )}
//             </div>

//             {/* Right Column - User & Wallet Info */}
//             <div className="space-y-6">
//               {/* User Information Card */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <User className="w-5 h-5" />
//                     User Information
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="flex items-center gap-3">
//                     <Avatar className="h-12 w-12">
//                       <AvatarFallback>{userInitials}</AvatarFallback>
//                     </Avatar>
//                     <div>
//                       <p className="font-medium">{withdrawal.user?.username}</p>
//                       <p className="text-sm text-muted-foreground">
//                         {withdrawal.user?.first_name} {withdrawal.user?.last_name}
//                       </p>
//                     </div>
//                   </div>
                  
//                   <Separator />
                  
//                   <InfoRow 
//                     label="Email" 
//                     value={withdrawal.user?.email || 'N/A'}
//                     icon={Mail}
//                   />
                  
//                   {withdrawal.user?.phone && (
//                     <InfoRow 
//                       label="Phone" 
//                       value={withdrawal.user.phone}
//                       icon={Phone}
//                     />
//                   )}
                  
//                   {withdrawal.user?.address && (
//                     <InfoRow 
//                       label="Address" 
//                       value={withdrawal.user.address}
//                       icon={MapPin}
//                     />
//                   )}
                  
//                   <Button variant="outline" className="w-full" asChild>
//                     <Link to={`/admin/users/${withdrawal.user?.id}`}>
//                       <ExternalLink className="w-4 h-4 mr-2" />
//                       View Full Profile
//                     </Link>
//                   </Button>
//                 </CardContent>
//               </Card>

//               {/* Wallet Information Card */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <Wallet className="w-5 h-5" />
//                     Wallet Information
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <InfoRow 
//                     label="Wallet ID" 
//                     value={<CopyableText text={withdrawal.wallet?.wallet_id || 'N/A'} label="Wallet ID" />}
//                     icon={Wallet}
//                   />
                  
//                   <InfoRow 
//                     label="Current Balance" 
//                     value={`₱${withdrawal.wallet?.balance?.toLocaleString() || 0}`}
//                     icon={DollarSign}
//                   />
                  
//                   {withdrawal.wallet?.available_balance !== undefined && (
//                     <InfoRow 
//                       label="Available Balance" 
//                       value={`₱${withdrawal.wallet.available_balance.toLocaleString()}`}
//                       icon={DollarSign}
//                     />
//                   )}
                  
//                   {withdrawal.wallet?.pending_balance !== undefined && (
//                     <InfoRow 
//                       label="Pending Balance" 
//                       value={`₱${withdrawal.wallet.pending_balance.toLocaleString()}`}
//                       icon={Clock}
//                     />
//                   )}
//                 </CardContent>
//               </Card>

//               {/* Action Buttons Card */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Actions</CardTitle>
//                   <CardDescription>
//                     Manage this withdrawal request
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-2">
//                   {status === 'pending' && (
//                     <>
//                       <Button 
//                         className="w-full bg-green-600 hover:bg-green-700"
//                         onClick={() => handleAction('approve')}
//                       >
//                         <CheckCircle className="w-4 h-4 mr-2" />
//                         Approve Withdrawal
//                       </Button>
//                       <Button 
//                         variant="destructive" 
//                         className="w-full"
//                         onClick={() => handleAction('reject')}
//                       >
//                         <XCircle className="w-4 h-4 mr-2" />
//                         Reject Withdrawal
//                       </Button>
//                     </>
//                   )}

//                   {status === 'approved' && (
//                     <Button 
//                       className="w-full bg-purple-600 hover:bg-purple-700"
//                       onClick={() => handleAction('process')}
//                     >
//                       <RefreshCw className="w-4 h-4 mr-2" />
//                       Mark as Processing
//                     </Button>
//                   )}

//                   {status === 'processing' && (
//                     <Button 
//                       className="w-full bg-green-600 hover:bg-green-700"
//                       onClick={() => handleAction('complete')}
//                     >
//                       <Upload className="w-4 h-4 mr-2" />
//                       Complete with Proof
//                     </Button>
//                   )}

//                   {status === 'completed' && (
//                     <Button variant="outline" className="w-full" disabled>
//                       <CheckCircle className="w-4 h-4 mr-2" />
//                       Completed
//                     </Button>
//                   )}

//                   {status === 'rejected' && (
//                     <Button variant="outline" className="w-full" disabled>
//                       <XCircle className="w-4 h-4 mr-2" />
//                       Rejected
//                     </Button>
//                   )}

//                   {status === 'cancelled' && (
//                     <Button variant="outline" className="w-full" disabled>
//                       <XCircle className="w-4 h-4 mr-2" />
//                       Cancelled by User
//                     </Button>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>
//           </div>
//         </div>

//         {/* Action Dialogs */}
//         {withdrawal && dialogType === 'approve' && (
//           <ApproveDialog
//             withdrawal={withdrawal}
//             open={true}
//             onOpenChange={handleDialogClose}
//             onSuccess={handleSuccess}
//           />
//         )}

//         {withdrawal && dialogType === 'reject' && (
//           <RejectDialog
//             withdrawal={withdrawal}
//             open={true}
//             onOpenChange={handleDialogClose}
//             onSuccess={handleSuccess}
//           />
//         )}

//         {withdrawal && dialogType === 'process' && (
//           <ProcessDialog
//             withdrawal={withdrawal}
//             open={true}
//             onOpenChange={handleDialogClose}
//             onSuccess={handleSuccess}
//           />
//         )}

//         {withdrawal && dialogType === 'complete' && (
//           <CompleteDialog
//             withdrawal={withdrawal}
//             open={true}
//             onOpenChange={handleDialogClose}
//             onSuccess={handleSuccess}
//           />
//         )}
//       </SidebarLayout>
//     </UserProvider>
//   );
// }