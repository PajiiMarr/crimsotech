// "use client";
// import React, { useState } from 'react';
// import type { Route } from './+types/customer-view-refund-request';
// import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
// import { UserProvider } from '~/components/providers/user-role-provider';
// import { Button } from '~/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
// import { Badge } from '~/components/ui/badge';
// import { Separator } from '~/components/ui/separator';
// import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
// import Breadcrumbs from "~/components/ui/breadcrumbs";
// import {
//   ArrowLeft,
//   Calendar,
//   Upload,
//   CheckCircle,
//   Clock,
//   FileText,
//   Download,
//   Image as ImageIcon,
//   User,
//   XCircle,
//   MessageCircle,
//   ShoppingBag,
//   CreditCard,
//   PhilippinePeso,
//   Truck,
//   Package,
//   Store,
//   MapPin,
//   Timer,
//   CheckCircle2,
//   AlertTriangle,
//   PackageCheck,
//   Phone,
//   Banknote,
//   AlertCircle,
//   RotateCcw,
//   Eye,
//   Printer,
//   Copy,
//   MoreVertical,
//   RefreshCw,
//   Edit,
//   Share2,
//   Star,
//   HelpCircle,
//   FileQuestion,
//   ShoppingCart,
//   ArrowRight,
//   Box,
//   DollarSign,
//   Hash,
//   ExternalLink,
//   ChevronRight,
//   MessageSquare,
//   ThumbsUp,
//   ThumbsDown,
//   Shield,
//   Award,
//   FileClock,
//   Receipt,
//   TrendingUp,
//   Archive,
//   FileWarning,
//   ShieldCheck,
//   Bell,
//   Filter,
//   Settings,
//   Zap,
//   BarChart,
//   Loader2,
//   AlertOctagon,
//   Activity,
// } from 'lucide-react';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '~/components/ui/dropdown-menu';

// // --- Component Metadata ---
// export function meta(): Route.MetaDescriptors {
//   return [
//     {
//       title: "Return/Refund Request",
//     },
//   ];
// }

// // --- Return/Refund Status Configuration for BUYER ---
// const RETURN_STATUS_CONFIG = {
//   pending: {
//     label: 'Under Review',
//     color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
//     icon: Clock,
//     description: 'Return request submitted, waiting for seller review',
//     buyerAction: 'Seller is reviewing your return request'
//   },
//   approved: {
//     label: 'Approved',
//     color: 'bg-green-100 text-green-800 hover:bg-green-100',
//     icon: CheckCircle2,
//     description: 'Seller approved your return request',
//     buyerAction: 'Return approved! Prepare item for return'
//   },
//   rejected: {
//     label: 'Rejected',
//     color: 'bg-red-100 text-red-800 hover:bg-red-100',
//     icon: XCircle,
//     description: 'Seller rejected your return request',
//     buyerAction: 'Your return request was rejected'
//   },
//   negotiation: {
//     label: 'Negotiation',
//     color: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
//     icon: AlertTriangle,
//     description: 'Seller suggested alternatives',
//     buyerAction: 'Review seller\'s alternative offer'
//   },
//   waiting_return: {
//     label: 'Waiting for Return',
//     color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
//     icon: PackageCheck,
//     description: 'Return approved, waiting for item return',
//     buyerAction: 'Return item to seller for refund'
//   },
//   processing: {
//     label: 'Refund Processing',
//     color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
//     icon: RefreshCw,
//     description: 'Item received, refund being processed',
//     buyerAction: 'Refund is being processed'
//   },
//   completed: {
//     label: 'Refund Completed',
//     color: 'bg-green-100 text-green-800 hover:bg-green-100',
//     icon: CheckCircle,
//     description: 'Refund successfully processed',
//     buyerAction: 'Refund completed successfully'
//   },
//   cancelled: {
//     label: 'Cancelled',
//     color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
//     icon: XCircle,
//     description: 'Return request cancelled',
//     buyerAction: 'Return request was cancelled'
//   }
// };

// // --- Types for Buyer Return/Refund ---
// interface ReturnItem {
//   id: string;
//   product_id: string;
//   name: string;
//   price: number;
//   quantity: number;
//   image_url: string;
//   reason: string;
//   condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
//   notes?: string;
// }

// interface ReturnRequest {
//   id: string;
//   order_id: string;
//   order_number: string;
//   user_id: string;
//   created_at: string;
//   updated_at: string;
//   status: 'pending' | 'approved' | 'rejected' | 'negotiation' | 'waiting_return' | 'processing' | 'completed' | 'cancelled';
//   type: 'return' | 'refund' | 'return_refund';
//   reason: string;
//   description: string;
//   refund_amount: number;
//   approved_amount: number;
//   shipping_fee: number;
//   refund_method: 'original_payment' | 'store_credit' | 'bank_transfer' | 'cash';
//   refund_account?: string;
//   seller_response?: string;
//   seller_response_date?: string;
//   return_deadline?: string;
//   tracking_number?: string;
//   courier?: string;
//   return_received_at?: string;
//   refund_processed_at?: string;
//   items: ReturnItem[];
//   evidence_photos: string[];
// }

// interface Customer {
//   id: string;
//   name: string;
//   email: string;
//   phone?: string;
//   avatar_url?: string;
// }

// interface ReturnDetails {
//   request: ReturnRequest;
//   customer: Customer;
// }

// // --- Base Mock Data (Same for all statuses) ---
// const BASE_RETURN_DATA: ReturnRequest = {
//   id: "RET-2024-00123",
//   order_id: "ORD-2024-00123",
//   order_number: "ORD-789456",
//   user_id: "user-123",
//   created_at: "2024-01-20T10:30:00Z",
//   updated_at: "2024-01-22T14:20:00Z",
//   status: "pending",
//   type: "return_refund",
//   reason: "Product arrived damaged",
//   description: "The product arrived with visible scratches on the screen and the packaging was torn. I believe this is a manufacturing defect.",
//   refund_amount: 45000,
//   approved_amount: 45000,
//   shipping_fee: 150,
//   refund_method: "original_payment",
//   refund_account: "GCash: 0912-345-6789",
//   seller_response: "We apologize for the inconvenience. We'll review your request within 24 hours.",
//   seller_response_date: "2024-01-21T09:15:00Z",
//   return_deadline: "2024-01-30T23:59:59Z",
//   tracking_number: "TRK-RET-789456",
//   courier: "J&T Express",
//   return_received_at: "2024-01-25T14:30:00Z",
//   refund_processed_at: "2024-01-26T10:00:00Z",
//   items: [
//     {
//       id: "item-001",
//       product_id: "prod-001",
//       name: "Apple iPhone 13 Pro",
//       price: 45000,
//       quantity: 1,
//       image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop",
//       reason: "Screen has visible scratches",
//       condition: "fair",
//       notes: "Includes charger and original box"
//     }
//   ],
//   evidence_photos: [
//     "https://images.unsplash.com/photo-1546054451-aa264e0a2e4c?w=400&h=300&fit=crop",
//     "https://images.unsplash.com/photo-1546054451-aa264e0a2e4c?w=400&h=300&fit=crop"
//   ]
// };

// // --- Loader ---
// export async function loader({ params, request }: Route.LoaderArgs) {
//   const { refundId } = params as { refundId: string };
//   const url = new URL(request.url);
//   const statusParam = url.searchParams.get('status') as keyof typeof RETURN_STATUS_CONFIG || 'pending';

//   // Clone base data and update status
//   const returnRequest = { ...BASE_RETURN_DATA, id: refundId || BASE_RETURN_DATA.id, status: statusParam };

//   const returnDetails: ReturnDetails = {
//     request: returnRequest,
//     customer: {
//       id: 'user-123',
//       name: 'Juan Dela Cruz',
//       email: 'juan.delacruz@example.com',
//       phone: '+63 912 345 6789',
//       avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
//     }
//   };

//   return {
//     user: {
//       id: "demo-customer-123",
//       name: "Juan Dela Cruz",
//       email: "customer@example.com",
//       isCustomer: true,
//       isAdmin: false,
//       isRider: false,
//       isModerator: false,
//       isSeller: false,
//       username: "juan_customer",
//     },
//     returnDetails,
//     currentStatus: statusParam
//   };
// }

// // --- Status-Specific UI Components for BUYER ---

// function PendingStatusUI({ returnDetails, formatDate, formatCurrency }: any) {
//   const request = returnDetails.request;

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       {/* Left Column */}
//       <div className="lg:col-span-2 space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <RotateCcw className="h-4 w-4" />
//                 Return Request #{request.id}
//               </CardTitle>
//               <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
//                 <Clock className="h-3 w-3 mr-1" />
//                 Under Review
//               </Badge>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Status Message */}
//             <Alert className="bg-yellow-50 border-yellow-200">
//               <Clock className="h-4 w-4 text-yellow-600" />
//               <AlertTitle className="text-yellow-800">Request Submitted Successfully</AlertTitle>
//               <AlertDescription className="text-yellow-700">
//                 Your return request has been submitted. The seller will respond within 48 hours.
//               </AlertDescription>
//             </Alert>

//             {/* Request Details */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Request ID:</p>
//                 <p className="font-medium text-sm">{request.id}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Submitted Date:</p>
//                 <p className="font-medium text-sm">{formatDate(request.created_at)}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Reason:</p>
//                 <p className="font-medium text-sm">{request.reason}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Method:</p>
//                 <p className="font-medium text-sm">{request.refund_method.replace('_', ' ').toUpperCase()}</p>
//               </div>
//             </div>

//             {/* Item Details */}
//             <div>
//               <p className="text-xs font-medium mb-2">Item for Return:</p>
//               <div className="flex items-center gap-3 p-3 border rounded">
//                 <div className="w-16 h-16 flex-shrink-0">
//                   <img
//                     src={request.items[0].image_url}
//                     alt={request.items[0].name}
//                     className="w-full h-full object-cover rounded"
//                   />
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium truncate">{request.items[0].name}</p>
//                   <p className="text-xs text-muted-foreground">Qty: {request.items[0].quantity}</p>
//                   <p className="text-xs text-muted-foreground">Reason: {request.items[0].reason}</p>
//                 </div>
//                 <div className="font-medium text-sm">
//                   {formatCurrency(request.items[0].price)}
//                 </div>
//               </div>
//             </div>

//             {/* Description */}
//             <div>
//               <p className="text-xs font-medium mb-1">Description:</p>
//               <p className="text-sm text-gray-700">{request.description}</p>
//             </div>

//             {/* Timeline */}
//             <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
//               <p className="text-sm font-medium text-yellow-800 mb-2">What happens next?</p>
//               <div className="space-y-2">
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
//                     <Clock className="h-3 w-3 text-yellow-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Seller Review</p>
//                     <p className="text-xs text-yellow-700">Seller has 48 hours to respond</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
//                     <CheckCircle2 className="h-3 w-3 text-gray-400" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Approval/Rejection</p>
//                     <p className="text-xs text-gray-400">Seller will approve or reject</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
//                     <Package className="h-3 w-3 text-gray-400" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Return Shipping</p>
//                     <p className="text-xs text-gray-400">Ship item back if approved</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Right Column */}
//       <div className="space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Request Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Request ID:</span>
//               <span className="font-medium">{request.id}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Status:</span>
//               <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
//                 Under Review
//               </Badge>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Expected Response:</span>
//               <span className="font-medium">Within 48 hours</span>
//             </div>
//             <Separator className="my-2" />
//             <div className="flex justify-between font-bold text-sm">
//               <span>Requested Refund:</span>
//               <span className="text-yellow-600">{formatCurrency(request.refund_amount)}</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Next Steps</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="space-y-1.5">
//               <ul className="text-muted-foreground space-y-1">
//                 <li className="flex items-start gap-1">
//                   <span>•</span>
//                   <span>Keep all original packaging</span>
//                 </li>
//                 <li className="flex items-start gap-1">
//                   <span>•</span>
//                   <span>Do not remove any tags</span>
//                 </li>
//                 <li className="flex items-start gap-1">
//                   <span>•</span>
//                   <span>Take photos of item condition</span>
//                 </li>
//                 <li className="flex items-start gap-1">
//                   <span>•</span>
//                   <span>Wait for seller's response</span>
//                 </li>
//               </ul>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Need Help?</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2">
//             <Button 
//               variant="outline" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <MessageCircle className="h-3 w-3 mr-1.5" />
//               Contact Seller
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <FileQuestion className="h-3 w-3 mr-1.5" />
//               Return Policy FAQ
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <HelpCircle className="h-3 w-3 mr-1.5" />
//               Contact Support
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// function ApprovedStatusUI({ returnDetails, formatDate, formatCurrency }: any) {
//   const request = returnDetails.request;

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       {/* Left Column */}
//       <div className="lg:col-span-2 space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <RotateCcw className="h-4 w-4" />
//                 Return Request Approved
//               </CardTitle>
//               <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
//                 <CheckCircle2 className="h-3 w-3 mr-1" />
//                 Approved
//               </Badge>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Status Message */}
//             <Alert className="bg-green-50 border-green-200">
//               <CheckCircle2 className="h-4 w-4 text-green-600" />
//               <AlertTitle className="text-green-800">Return Request Approved!</AlertTitle>
//               <AlertDescription className="text-green-700">
//                 Your return request has been approved. Please return the item within 7 days to receive your refund.
//               </AlertDescription>
//             </Alert>

//             {/* Approval Details */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Approved Date:</p>
//                 <p className="font-medium text-sm">{formatDate(request.seller_response_date || request.updated_at)}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Amount:</p>
//                 <p className="font-medium text-sm text-green-600">{formatCurrency(request.approved_amount)}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Method:</p>
//                 <p className="font-medium text-sm">{request.refund_method.replace('_', ' ').toUpperCase()}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Return Deadline:</p>
//                 <p className="font-medium text-sm">{formatDate(request.return_deadline || '')}</p>
//               </div>
//             </div>

//             {/* Seller Response */}
//             {request.seller_response && (
//               <div className="p-3 bg-blue-50 border border-blue-200 rounded">
//                 <p className="text-sm font-medium text-blue-800 mb-1">Seller's Response:</p>
//                 <p className="text-sm text-gray-700">{request.seller_response}</p>
//               </div>
//             )}

//             {/* Return Instructions */}
//             <div className="p-3 bg-green-50 border border-green-200 rounded">
//               <p className="text-sm font-medium text-green-800 mb-2">Return Instructions:</p>
//               <div className="space-y-2 text-sm">
//                 <p>Please return the item in its original packaging with all accessories included.</p>
//                 <div className="flex items-center gap-2">
//                   <Package className="h-4 w-4 text-green-600" />
//                   <span>Free return shipping included</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <Clock className="h-4 w-4 text-green-600" />
//                   <span>Refund processed within 3-5 business days after item received</span>
//                 </div>
//               </div>
//             </div>

//             {/* Return Label */}
//             <div className="p-3 border rounded">
//               <p className="text-sm font-medium mb-2">Return Label</p>
//               <div className="flex items-center gap-3">
//                 <FileText className="h-8 w-8 text-blue-600" />
//                 <div>
//                   <p className="text-sm font-medium">Return_Label_{request.order_number}.pdf</p>
//                   <p className="text-xs text-muted-foreground">Download and print this label</p>
//                 </div>
//                 <Button variant="outline" size="sm" className="ml-auto">
//                   <Download className="h-3 w-3 mr-1.5" />
//                   Download Label
//                 </Button>
//               </div>
//             </div>

//             {/* Next Steps */}
//             <div className="p-3 bg-blue-50 border border-blue-200 rounded">
//               <p className="text-sm font-medium text-blue-800 mb-2">What to do next:</p>
//               <div className="space-y-2">
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
//                     <CheckCircle2 className="h-3 w-3 text-green-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Request Approved ✓</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
//                     <Package className="h-3 w-3 text-blue-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Package Item & Attach Label</p>
//                     <p className="text-xs text-blue-700">Current step</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
//                     <Truck className="h-3 w-3 text-gray-400" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Drop Off at Carrier</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
//                     <Banknote className="h-3 w-3 text-gray-400" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Receive Refund</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Right Column */}
//       <div className="space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Return Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Status:</span>
//               <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
//                 Approved
//               </Badge>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Return Deadline:</span>
//               <span className="font-medium">{formatDate(request.return_deadline || '')}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Approved Amount:</span>
//               <span className="font-medium text-green-600">{formatCurrency(request.approved_amount)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Refund Method:</span>
//               <span className="font-medium">{request.refund_method.replace('_', ' ').toUpperCase()}</span>
//             </div>
//             <Separator className="my-2" />
//             <div className="flex justify-between font-bold text-sm">
//               <span>Time Remaining:</span>
//               <span className="text-blue-600">7 days</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Return Checklist</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="space-y-2">
//               <div className="flex items-center gap-2">
//                 <input type="checkbox" id="packaging" className="rounded" />
//                 <label htmlFor="packaging" className="text-sm">Include original packaging</label>
//               </div>
//               <div className="flex items-center gap-2">
//                 <input type="checkbox" id="accessories" className="rounded" />
//                 <label htmlFor="accessories" className="text-sm">Include all accessories</label>
//               </div>
//               <div className="flex items-center gap-2">
//                 <input type="checkbox" id="label" className="rounded" />
//                 <label htmlFor="label" className="text-sm">Attach return label</label>
//               </div>
//               <div className="flex items-center gap-2">
//                 <input type="checkbox" id="photos" className="rounded" />
//                 <label htmlFor="photos" className="text-sm">Take photos before packing</label>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Actions</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2">
//             <Button 
//               variant="default" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs bg-blue-600 hover:bg-blue-700"
//             >
//               <Download className="h-3 w-3 mr-1.5" />
//               Download Return Label
//             </Button>
//             <Button 
//               variant="outline" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <MessageCircle className="h-3 w-3 mr-1.5" />
//               Contact Seller
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <HelpCircle className="h-3 w-3 mr-1.5" />
//               Return Support
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// function RejectedStatusUI({ returnDetails, formatDate, formatCurrency }: any) {
//   const request = returnDetails.request;

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       {/* Left Column */}
//       <div className="lg:col-span-2 space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <RotateCcw className="h-4 w-4" />
//                 Return Request #{request.id}
//               </CardTitle>
//               <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
//                 <XCircle className="h-3 w-3 mr-1" />
//                 Rejected
//               </Badge>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Status Message */}
//             <Alert className="bg-red-50 border-red-200">
//               <XCircle className="h-4 w-4 text-red-600" />
//               <AlertTitle className="text-red-800">Return Request Rejected</AlertTitle>
//               <AlertDescription className="text-red-700">
//                 Your return request has been rejected by the seller. You may appeal this decision.
//               </AlertDescription>
//             </Alert>

//             {/* Rejection Details */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Request ID:</p>
//                 <p className="font-medium text-sm">{request.id}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Rejected Date:</p>
//                 <p className="font-medium text-sm">{formatDate(request.updated_at)}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Your Reason:</p>
//                 <p className="font-medium text-sm">{request.reason}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Reviewed By:</p>
//                 <p className="font-medium text-sm">Seller Support Team</p>
//               </div>
//             </div>

//             {/* Rejection Reason */}
//             <div className="p-3 bg-red-50 border border-red-200 rounded">
//               <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
//               <p className="text-sm text-gray-700 mb-2">Item shows signs of user damage and was returned outside the 30-day warranty period.</p>
//               <p className="text-xs text-gray-600">The screen scratches appear to be caused by improper handling, not manufacturing defects.</p>
//               <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-200">
//                 <User className="h-3 w-3 text-gray-500" />
//                 <span className="text-xs text-gray-600">Decision by Seller • {formatDate(request.updated_at)}</span>
//               </div>
//             </div>

//             {/* Appeal Information */}
//             <div className="p-3 border rounded">
//               <p className="text-sm font-medium mb-2">Appeal Information</p>
//               <div className="space-y-2 text-sm">
//                 <div className="flex items-center gap-2">
//                   <Calendar className="h-4 w-4 text-blue-600" />
//                   <div>
//                     <p className="font-medium">Appeal Deadline</p>
//                     <p className="text-muted-foreground">Within 14 days from rejection</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <FileText className="h-4 w-4 text-blue-600" />
//                   <div>
//                     <p className="font-medium">Appeal Instructions</p>
//                     <p className="text-muted-foreground">Submit additional evidence to support your claim</p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Next Steps */}
//             <div className="p-3 bg-gray-50 border rounded">
//               <p className="text-sm font-medium mb-2">Your Options:</p>
//               <div className="space-y-3">
//                 <div className="flex items-start gap-2">
//                   <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
//                     <MessageCircle className="h-3 w-3 text-blue-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Appeal the Decision</p>
//                     <p className="text-xs text-gray-600">Submit additional evidence within 14 days</p>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
//                     <ShoppingCart className="h-3 w-3 text-gray-500" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Keep the Item</p>
//                     <p className="text-xs text-gray-500">Continue using the product as-is</p>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
//                     <Star className="h-3 w-3 text-gray-500" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Leave a Review</p>
//                     <p className="text-xs text-gray-500">Share your experience with other buyers</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Right Column */}
//       <div className="space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Request Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Status:</span>
//               <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
//                 Rejected
//               </Badge>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Request ID:</span>
//               <span className="font-medium">{request.id}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Rejected Date:</span>
//               <span className="font-medium">{formatDate(request.updated_at)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Appeal Deadline:</span>
//               <span className="font-medium text-blue-600">14 days</span>
//             </div>
//             <Separator className="my-2" />
//             <div className="flex justify-between font-bold text-sm">
//               <span>Days to Appeal:</span>
//               <span className="text-blue-600">14 days</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Appeal Actions</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2">
//             <Button 
//               variant="outline" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
//             >
//               <MessageCircle className="h-3 w-3 mr-1.5" />
//               Submit Appeal
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <FileText className="h-3 w-3 mr-1.5" />
//               View Rejection Details
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <HelpCircle className="h-3 w-3 mr-1.5" />
//               Contact Support
//             </Button>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Policy Reference</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs text-gray-600">
//             <div className="flex items-start gap-2">
//               <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
//               <span>Warranty: 30 days from delivery</span>
//             </div>
//             <div className="flex items-start gap-2">
//               <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
//               <span>User damage is not covered</span>
//             </div>
//             <div className="flex items-start gap-2">
//               <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
//               <span>Original packaging required</span>
//             </div>
//             <div className="flex items-start gap-2">
//               <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
//               <span>Evidence must be clear and relevant</span>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// function ProcessingStatusUI({ returnDetails, formatDate, formatCurrency }: any) {
//   const request = returnDetails.request;

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       {/* Left Column */}
//       <div className="lg:col-span-2 space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <RotateCcw className="h-4 w-4" />
//                 Refund Processing
//               </CardTitle>
//               <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
//                 <RefreshCw className="h-3 w-3 mr-1" />
//                 Processing
//               </Badge>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Status Message */}
//             <Alert className="bg-indigo-50 border-indigo-200">
//               <RefreshCw className="h-4 w-4 text-indigo-600" />
//               <AlertTitle className="text-indigo-800">Refund Being Processed</AlertTitle>
//               <AlertDescription className="text-indigo-700">
//                 Your returned item has been received. Your refund is being processed and will be completed within 3-5 business days.
//               </AlertDescription>
//             </Alert>

//             {/* Processing Details */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Item Received:</p>
//                 <p className="font-medium text-sm">{formatDate(request.return_received_at || '')}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Amount:</p>
//                 <p className="font-medium text-sm text-green-600">{formatCurrency(request.approved_amount)}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Method:</p>
//                 <p className="font-medium text-sm">{request.refund_method.replace('_', ' ').toUpperCase()}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Expected Completion:</p>
//                 <p className="font-medium text-sm">Within 3-5 business days</p>
//               </div>
//             </div>

//             {/* Tracking Information */}
//             {request.tracking_number && (
//               <div className="p-3 bg-blue-50 border border-blue-200 rounded">
//                 <p className="text-sm font-medium text-blue-800 mb-1">Tracking Information:</p>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
//                   <div>
//                     <p className="text-xs text-muted-foreground">Tracking Number:</p>
//                     <p className="font-medium font-mono">{request.tracking_number}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-muted-foreground">Courier:</p>
//                     <p className="font-medium">{request.courier}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-muted-foreground">Status:</p>
//                     <p className="font-medium text-green-600">Delivered ✓</p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-muted-foreground">Delivered Date:</p>
//                     <p className="font-medium">{formatDate(request.return_received_at || '')}</p>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Refund Timeline */}
//             <div className="p-3 border rounded">
//               <p className="text-sm font-medium mb-3">Refund Timeline</p>
//               <div className="space-y-3">
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
//                     <CheckCircle2 className="h-3 w-3 text-green-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Request Approved</p>
//                     <p className="text-xs text-muted-foreground">{formatDate(request.seller_response_date || '')}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
//                     <Package className="h-3 w-3 text-green-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Item Returned</p>
//                     <p className="text-xs text-muted-foreground">You shipped the item back</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
//                     <Truck className="h-3 w-3 text-green-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Item Received</p>
//                     <p className="text-xs text-muted-foreground">{formatDate(request.return_received_at || '')}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
//                     <RefreshCw className="h-3 w-3 text-indigo-600" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium">Refund Processing</p>
//                     <p className="text-xs text-indigo-700">Current step - 3-5 business days</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
//                     <Banknote className="h-3 w-3 text-gray-400" />
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Refund Completed</p>
//                     <p className="text-xs text-gray-400">Funds will be sent to your account</p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Refund Details */}
//             <div className="p-3 bg-green-50 border border-green-200 rounded">
//               <p className="text-sm font-medium text-green-800 mb-2">Refund Details:</p>
//               <div className="space-y-1 text-sm">
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Original Payment:</span>
//                   <span>{formatCurrency(request.refund_amount)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Shipping Fee:</span>
//                   <span>{formatCurrency(request.shipping_fee)}</span>
//                 </div>
//                 <Separator className="my-1" />
//                 <div className="flex justify-between font-bold">
//                   <span>Total Refund:</span>
//                   <span className="text-green-700">{formatCurrency(request.approved_amount)}</span>
//                 </div>
//                 <div className="flex justify-between text-xs">
//                   <span className="text-muted-foreground">To be sent to:</span>
//                   <span className="font-medium">{request.refund_account}</span>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Right Column */}
//       <div className="space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Refund Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Status:</span>
//               <Badge variant="outline" className="bg-indigo-50 text-indigo-700 text-xs">
//                 Processing
//               </Badge>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Item Received:</span>
//               <span className="font-medium">{formatDate(request.return_received_at || '')}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Refund Amount:</span>
//               <span className="font-medium text-green-600">{formatCurrency(request.approved_amount)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Expected By:</span>
//               <span className="font-medium">3-5 business days</span>
//             </div>
//             <Separator className="my-2" />
//             <div className="flex justify-between font-bold text-sm">
//               <span>Refund Method:</span>
//               <span>{request.refund_method.replace('_', ' ').toUpperCase()}</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">What to Expect</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs text-gray-600">
//             <div className="space-y-1.5">
//               <div className="flex items-start gap-2">
//                 <Clock className="h-3 w-3 text-indigo-600 mt-0.5" />
//                 <span>Refunds typically take 3-5 business days</span>
//               </div>
//               <div className="flex items-start gap-2">
//                 <Bell className="h-3 w-3 text-indigo-600 mt-0.5" />
//                 <span>You'll receive an email when refund is completed</span>
//               </div>
//               <div className="flex items-start gap-2">
//                 <Banknote className="h-3 w-3 text-indigo-600 mt-0.5" />
//                 <span>Check your {request.refund_method.replace('_', ' ')} account</span>
//               </div>
//               <div className="flex items-start gap-2">
//                 <HelpCircle className="h-3 w-3 text-indigo-600 mt-0.5" />
//                 <span>Contact support if refund doesn't appear after 7 days</span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Actions</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2">
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <Eye className="h-3 w-3 mr-1.5" />
//               View Tracking Details
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <MessageCircle className="h-3 w-3 mr-1.5" />
//               Contact Seller
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <HelpCircle className="h-3 w-3 mr-1.5" />
//               Refund Support
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// function CompletedStatusUI({ returnDetails, formatDate, formatCurrency }: any) {
//   const request = returnDetails.request;

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       {/* Left Column */}
//       <div className="lg:col-span-2 space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <div className="flex items-center justify-between">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <RotateCcw className="h-4 w-4" />
//                 Refund Completed
//               </CardTitle>
//               <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
//                 <CheckCircle className="h-3 w-3 mr-1" />
//                 Completed
//               </Badge>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Status Message */}
//             <Alert className="bg-green-50 border-green-200">
//               <CheckCircle className="h-4 w-4 text-green-600" />
//               <AlertTitle className="text-green-800">Refund Completed Successfully!</AlertTitle>
//               <AlertDescription className="text-green-700">
//                 Your refund has been processed and the funds have been sent to your account.
//               </AlertDescription>
//             </Alert>

//             {/* Completion Details */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Completed:</p>
//                 <p className="font-medium text-sm">{formatDate(request.refund_processed_at || '')}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Amount:</p>
//                 <p className="font-medium text-sm text-green-600">{formatCurrency(request.approved_amount)}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Refund Method:</p>
//                 <p className="font-medium text-sm">{request.refund_method.replace('_', ' ').toUpperCase()}</p>
//               </div>
//               <div className="space-y-0.5">
//                 <p className="text-xs text-muted-foreground">Transaction ID:</p>
//                 <p className="font-medium text-sm font-mono">TRX-{request.id.slice(-6)}</p>
//               </div>
//             </div>

//             {/* Refund Confirmation */}
//             <div className="p-3 bg-green-50 border border-green-200 rounded">
//               <div className="flex items-center gap-3 mb-2">
//                 <CheckCircle className="h-5 w-5 text-green-600" />
//                 <div>
//                   <p className="text-sm font-medium text-green-800">Refund Confirmed</p>
//                   <p className="text-xs text-green-700">Successfully processed and sent</p>
//                 </div>
//               </div>
//               <div className="space-y-1 text-sm">
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Amount:</span>
//                   <span className="font-bold text-green-700">{formatCurrency(request.approved_amount)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Sent to:</span>
//                   <span className="font-medium">{request.refund_account}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Date:</span>
//                   <span className="font-medium">{formatDate(request.refund_processed_at || '')}</span>
//                 </div>
//               </div>
//             </div>

//             {/* Complete Timeline */}
//             <div className="p-3 border rounded">
//               <p className="text-sm font-medium mb-3">Return Journey</p>
//               <div className="space-y-2">
//                 <div className="flex items-center gap-2">
//                   <CheckCircle className="h-3 w-3 text-green-500" />
//                   <span className="text-sm">Request Submitted</span>
//                   <span className="text-xs text-muted-foreground ml-auto">{formatDate(request.created_at)}</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <CheckCircle className="h-3 w-3 text-green-500" />
//                   <span className="text-sm">Request Approved</span>
//                   <span className="text-xs text-muted-foreground ml-auto">{formatDate(request.seller_response_date || '')}</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <CheckCircle className="h-3 w-3 text-green-500" />
//                   <span className="text-sm">Item Returned</span>
//                   <span className="text-xs text-muted-foreground ml-auto">{formatDate(request.return_received_at || '')}</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <CheckCircle className="h-3 w-3 text-green-500" />
//                   <span className="text-sm">Refund Processed</span>
//                   <span className="text-xs text-muted-foreground ml-auto">{formatDate(request.refund_processed_at || '')}</span>
//                 </div>
//               </div>
//             </div>

//             {/* Feedback */}
//             <div className="p-3 bg-blue-50 border border-blue-200 rounded">
//               <p className="text-sm font-medium text-blue-800 mb-2">How was your experience?</p>
//               <p className="text-xs text-gray-600 mb-3">
//                 Help us improve by sharing your return experience.
//               </p>
//               <div className="flex gap-2">
//                 <Button variant="outline" size="sm" className="h-7 text-xs flex-1">
//                   <ThumbsUp className="h-3 w-3 mr-1" />
//                   Good
//                 </Button>
//                 <Button variant="outline" size="sm" className="h-7 text-xs flex-1">
//                   <ThumbsDown className="h-3 w-3 mr-1" />
//                   Could Improve
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Right Column */}
//       <div className="space-y-4">
//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Refund Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Status:</span>
//               <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
//                 Completed
//               </Badge>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Transaction ID:</span>
//               <span className="font-medium font-mono">TRX-{request.id.slice(-6)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Completed Date:</span>
//               <span className="font-medium">{formatDate(request.refund_processed_at || '')}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Refund Method:</span>
//               <span className="font-medium">{request.refund_method.replace('_', ' ').toUpperCase()}</span>
//             </div>
//             <Separator className="my-2" />
//             <div className="flex justify-between font-bold text-sm">
//               <span>Amount Refunded:</span>
//               <span className="text-green-700">{formatCurrency(request.approved_amount)}</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Next Steps</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-xs">
//             <div className="space-y-1.5">
//               <div className="flex items-start gap-2">
//                 <Banknote className="h-3 w-3 text-green-600 mt-0.5" />
//                 <span>Check your {request.refund_method.replace('_', ' ')} account</span>
//               </div>
//               <div className="flex items-start gap-2">
//                 <FileText className="h-3 w-3 text-green-600 mt-0.5" />
//                 <span>Save your refund receipt for records</span>
//               </div>
//               <div className="flex items-start gap-2">
//                 <ShoppingCart className="h-3 w-3 text-green-600 mt-0.5" />
//                 <span>Browse for replacement items</span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Actions</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2">
//             <Button 
//               variant="outline" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <Download className="h-3 w-3 mr-1.5" />
//               Download Receipt
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <FileText className="h-3 w-3 mr-1.5" />
//               View Transaction Details
//             </Button>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="w-full justify-start h-8 text-xs"
//             >
//               <ShoppingCart className="h-3 w-3 mr-1.5" />
//               Shop Again
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// // --- Status UI mapping ---
// const STATUS_UI_COMPONENTS = {
//   pending: PendingStatusUI,
//   approved: ApprovedStatusUI,
//   rejected: RejectedStatusUI,
//   negotiation: PendingStatusUI, // Use pending as fallback
//   waiting_return: ApprovedStatusUI, // Use approved as fallback
//   processing: ProcessingStatusUI,
//   completed: CompletedStatusUI,
//   cancelled: RejectedStatusUI, // Use rejected as fallback
// };

// // --- Main Component ---
// export default function ViewRefundRequest({ loaderData }: Route.ComponentProps) {
//   const { user, returnDetails, currentStatus } = loaderData;
//   const params = useParams<{ requestId: string }>();
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
  
//   // Get status from URL query param or loader data
//   const queryStatus = searchParams.get('status') as keyof typeof RETURN_STATUS_CONFIG;
//   const status = queryStatus || currentStatus;
  
//   // Update request status based on URL
//   const request = {
//     ...returnDetails.request,
//     status: status,
//     id: params.requestId || returnDetails.request.id
//   };

//   const statusConfig = RETURN_STATUS_CONFIG[status];
//   const StatusIcon = statusConfig?.icon || Clock;

//   // Get the status-specific UI component
//   const StatusSpecificUI = STATUS_UI_COMPONENTS[status] || (() => 
//     <Alert variant="destructive">
//       <XCircle className="h-4 w-4" />
//       <AlertTitle>Error</AlertTitle>
//       <AlertDescription>Unknown status: {status}</AlertDescription>
//     </Alert>
//   );

//   const formatDate = (dateString: string) => {
//     if (!dateString) return 'N/A';
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   const formatCurrency = (amount: number) => {
//     return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
//   };

//   const handlePrint = () => {
//     window.print();
//   };

//   const handleCopyRequestNumber = () => {
//     navigator.clipboard.writeText(request.id);
//     alert('Request number copied to clipboard!');
//   };

//   // Navigation buttons for different statuses
//   const getStatusNavigationButtons = () => {
//     const buttons = [];
    
//     buttons.push(
//       <Button
//         key="pending"
//         variant="outline"
//         size="sm"
//         onClick={() => navigate(`/view-refund-request/${request.id}?status=pending`)}
//         className={status === 'pending' ? 'bg-yellow-50 text-yellow-700' : ''}
//       >
//         Pending
//       </Button>
//     );
    
//     buttons.push(
//       <Button
//         key="approved"
//         variant="outline"
//         size="sm"
//         onClick={() => navigate(`/view-refund-request/${request.id}?status=approved`)}
//         className={status === 'approved' ? 'bg-green-50 text-green-700' : ''}
//       >
//         Approved
//       </Button>
//     );
    
//     buttons.push(
//       <Button
//         key="rejected"
//         variant="outline"
//         size="sm"
//         onClick={() => navigate(`/view-refund-request/${request.id}?status=rejected`)}
//         className={status === 'rejected' ? 'bg-red-50 text-red-700' : ''}
//       >
//         Rejected
//       </Button>
//     );
    
//     buttons.push(
//       <Button
//         key="processing"
//         variant="outline"
//         size="sm"
//         onClick={() => navigate(`/view-refund-request/${request.id}?status=processing`)}
//         className={status === 'processing' ? 'bg-indigo-50 text-indigo-700' : ''}
//       >
//         Processing
//       </Button>
//     );
    
//     buttons.push(
//       <Button
//         key="completed"
//         variant="outline"
//         size="sm"
//         onClick={() => navigate(`/view-refund-request/${request.id}?status=completed`)}
//         className={status === 'completed' ? 'bg-green-50 text-green-700' : ''}
//       >
//         Completed
//       </Button>
//     );

//     return buttons;
//   };

//   return (
//     <UserProvider user={user}>
//       <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <Button
//             variant="ghost"
//             onClick={() => navigate('/purchases')}
//             className="text-gray-600 hover:text-gray-900 px-0"
//           >
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             <span className="font-semibold">Back to My Orders</span>
//           </Button>
//           <Breadcrumbs />
//         </div>

//         <Separator />

//         {/* Header with Status */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
//           <div className="flex items-center gap-4">
//             <div>
//               <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Return/Refund Request</h1>
//               <p className="text-muted-foreground">Request #<strong>{request.id}</strong> • Order #{request.order_number}</p>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             {/* Status Badge */}
//             <Badge
//               variant="secondary"
//               className={`text-sm px-3 py-1.5 ${statusConfig?.color}`}
//             >
//               <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
//               {statusConfig?.label}
//             </Badge>

//             {/* Actions Dropdown */}
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="outline" size="sm">
//                   <MoreVertical className="w-4 h-4" />
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="end">
//                 <DropdownMenuLabel>Request Actions</DropdownMenuLabel>
//                 <DropdownMenuItem onClick={handlePrint}>
//                   <Printer className="w-4 h-4 mr-2" />
//                   Print Request Details
//                 </DropdownMenuItem>
//                 <DropdownMenuItem onClick={handleCopyRequestNumber}>
//                   <Copy className="w-4 h-4 mr-2" />
//                   Copy Request Number
//                 </DropdownMenuItem>
//                 <DropdownMenuSeparator />
//                 <DropdownMenuItem>
//                   <Download className="w-4 h-4 mr-2" />
//                   Download Receipt
//                 </DropdownMenuItem>
//                 <DropdownMenuItem>
//                   <Share2 className="w-4 h-4 mr-2" />
//                   Share Request Details
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu>
//           </div>
//         </div>

//         {/* Status Navigation Buttons */}
//         <div className="flex flex-wrap gap-2 mb-6">
//           <p className="text-sm text-muted-foreground mr-2">View as:</p>
//           {getStatusNavigationButtons()}
//         </div>

//         {/* Status-Specific UI Section */}
//         <StatusSpecificUI
//           returnDetails={{ ...returnDetails, request }}
//           formatDate={formatDate}
//           formatCurrency={formatCurrency}
//           navigate={navigate}
//         />

//         {/* Debug Info (remove in production) */}
//         <div className="mt-8 p-4 bg-gray-50 border rounded text-xs text-gray-600">
//           <p className="font-medium mb-1">Debug Info:</p>
//           <p>Current Status: <strong>{status}</strong></p>
//           <p>Request ID: {request.id}</p>
//           <p>View different statuses using the buttons above or modify URL with ?status= parameter</p>
//         </div>
//       </div>
//     </UserProvider>
//   );
// }