//     "use client";

// import type { Route } from './+types/view-refund-details';
// import { 
//   Card, 
//   CardHeader, 
//   CardTitle, 
//   CardContent,
//   CardDescription,
//   CardFooter 
// } from '~/components/ui/card';
// import { Button } from '~/components/ui/button';
// import { Badge } from '~/components/ui/badge';
// import { Separator } from '~/components/ui/separator';
// import { Link, useNavigate } from 'react-router';
// import { 
//   ArrowLeft,
//   User,
//   Package,
//   Calendar,
//   PhilippinePeso,
//   FileText,
//   Image as ImageIcon,
//   CheckCircle,
//   XCircle,
//   MessageCircle,
//   Clock,
//   AlertCircle,
//   ShoppingBag,
//   Store,
//   CreditCard,
//   Truck,
//   CheckSquare,
//   RotateCcw
// } from 'lucide-react';
// import { format } from 'date-fns';

// export function meta(): Route.MetaDescriptors {
//   return [
//     {
//       title: "View Refund Request",
//     },
//   ];
// }

// interface RefundItem {
//   refund: string;
//   order: {
    
//     order: string;
//     order_id: string;
//     total_amount: number;
//     created_at: string;
//     order_items?: Array<{
//       id: string;
//       product: {
//         id: string;
//         name: string;
//         image?: string;
//         shop: {
//           id: string;
//           name: string;
//         };
//         price: number;
//       };
//       quantity: number;
//       variation?: string;
//     }>;
//   };
//   requested_by: {
//     id: string;
//     username: string;
//     name: string;
//     email: string;
//   };
//   reason: string;
//   status: 'pending' | 'approved' | 'rejected' | 'waiting_for_return' | 'to_verify' | 'to_process' | 'negotiation' | 'dispute' | 'completed';
//   requested_at: string;
//   logistic_service?: string;
//   tracking_number?: string;
//   preferred_refund_method?: string;
//   refund_medias?: Array<{
//     refund_media: string;
//     file_data: string;
//     file_type: string;
//   }>;
//   notes?: string;
// }

// export async function loader({ params, request }: Route.LoaderArgs) {
//   const { refundId } = params;
  
//   // Mock data - in real app, fetch from API
//   const refundItem: RefundItem = {
//     refund: refundId || "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
//     order: {
//       order: "ord-001-uuid",
//       order_id: "ORD-2024-00123",
//       total_amount: 45000,
//       created_at: "2024-01-20T08:30:00Z",
//       order_items: [
//         {
//           id: "item-001",
//           product: {
//             id: "prod-001",
//             name: "Apple iPhone 13 Pro",
//             image: "/images/iphone.jpg",
//             shop: {
//               id: "shop-001",
//               name: "TechGadgets Store"
//             },
//             price: 45000
//           },
//           quantity: 1,
//           variation: "256GB, Space Gray"
//         }
//       ]
//     },
//     requested_by: {
//       id: "user-001",
//       username: "john_doe",
//       name: "John Doe",
//       email: "john@example.com"
//     },
//     reason: "Product defective - screen has dead pixels upon arrival. The issue was noticed immediately upon unboxing. Multiple dead pixels are visible across the screen.",
//     status: "pending",
//     requested_at: "2024-01-20T10:30:00Z",
//     preferred_refund_method: "Original Payment Method (Credit Card)",
//     refund_medias: [
//       {
//         refund_media: "media-001",
//         file_data: "/images/defect1.jpg",
//         file_type: "image/jpeg"
//       },
//       {
//         refund_media: "media-002",
//         file_data: "/images/defect2.jpg",
//         file_type: "image/jpeg"
//       },
//       {
//         refund_media: "media-003",
//         file_data: "/images/defect3.jpg",
//         file_type: "image/jpeg"
//       }
//     ],
//     notes: "Customer has provided clear evidence of the defect. Need to verify if this is covered under warranty."
//   };

//   return {
//     refundItem,
//     user: {
//       id: "demo-seller-123",
//       name: "Jane Seller",
//       email: "seller@example.com",
//       isSeller: true,
//     }
//   };
// }

// export default function ViewRefundRequest({ loaderData }: Route.ComponentProps) {
//   const { refundItem } = loaderData;
//   const navigate = useNavigate();
//   const product = refundItem.order.order_items?.[0]?.product;

//   const formatDate = (dateString: string) => {
//     return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
//   };

//   const handleApprove = () => {
//     if (confirm("Are you sure you want to approve this refund request?")) {
//       // In real app: API call to approve refund
//       alert("Refund request approved!");
//       navigate('/seller/refunds');
//     }
//   };

//   const handleReject = () => {
//     if (confirm("Are you sure you want to reject this refund request?")) {
//       // In real app: API call to reject refund
//       alert("Refund request rejected!");
//       navigate('/seller/refunds');
//     }
//   };

//   const handleContactCustomer = () => {
//     navigate(`/chat/customer/${refundItem.requested_by.id}?refund=${refundItem.refund}`);
//   };

//   return (
//     <div className="container mx-auto py-6 space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           <Link to="/seller/refunds">
//             <Button variant="ghost" size="sm" className="gap-2">
//               <ArrowLeft className="w-4 h-4" />
//               Back to Refunds
//             </Button>
//           </Link>
//           <div>
//             <h1 className="text-2xl sm:text-3xl font-bold">Refund Request Details</h1>
//             <p className="text-gray-600 text-sm">Review and manage this refund request</p>
//           </div>
//         </div>
//         <Badge 
//           variant="secondary" 
//           className="px-3 py-1 text-sm"
//         >
//           <Clock className="w-3 h-3 mr-1" />
//           Pending Review
//         </Badge>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Left Column - Main Details */}
//         <div className="lg:col-span-2 space-y-6">
//           {/* Customer Information */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <User className="w-5 h-5" />
//                 Customer Information
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <div className="text-sm font-medium text-gray-500">Name</div>
//                   <div className="text-lg font-semibold">{refundItem.requested_by.name}</div>
//                 </div>
//                 <div className="space-y-2">
//                   <div className="text-sm font-medium text-gray-500">Username</div>
//                   <div className="text-lg">@{refundItem.requested_by.username}</div>
//                 </div>
//                 <div className="space-y-2">
//                   <div className="text-sm font-medium text-gray-500">Email</div>
//                   <div className="text-lg">{refundItem.requested_by.email}</div>
//                 </div>
//                 <div className="space-y-2">
//                   <div className="text-sm font-medium text-gray-500">Customer ID</div>
//                   <div className="text-sm font-mono bg-gray-100 p-2 rounded">
//                     {refundItem.requested_by.id}
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Order & Product Information */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <ShoppingBag className="w-5 h-5" />
//                 Order & Product Details
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
//                 {product?.image ? (
//                   <img 
//                     src={product.image} 
//                     alt={product.name} 
//                     className="w-24 h-24 rounded-lg object-cover border"
//                   />
//                 ) : (
//                   <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
//                     <Package className="w-8 h-8 text-gray-400" />
//                   </div>
//                 )}
//                 <div className="flex-1">
//                   <h3 className="text-xl font-semibold">{product?.name}</h3>
//                   <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
//                     <div className="flex items-center gap-1">
//                       <Store className="w-4 h-4" />
//                       {product?.shop.name}
//                     </div>
//                     <div>•</div>
//                     <div>Order: {refundItem.order.order_id}</div>
//                     <div>•</div>
//                     <div className="flex items-center gap-1">
//                       <Calendar className="w-4 h-4" />
//                       {formatDate(refundItem.order.created_at)}
//                     </div>
//                   </div>
                  
//                   <div className="mt-4 grid grid-cols-2 gap-4">
//                     <div>
//                       <div className="text-sm font-medium text-gray-500">Variation</div>
//                       <div>{refundItem.order.order_items?.[0]?.variation || 'Standard'}</div>
//                     </div>
//                     <div>
//                       <div className="text-sm font-medium text-gray-500">Quantity</div>
//                       <div>{refundItem.order.order_items?.[0]?.quantity || 1}</div>
//                     </div>
//                     <div>
//                       <div className="text-sm font-medium text-gray-500">Unit Price</div>
//                       <div className="flex items-center gap-1">
//                         <PhilippinePeso className="w-4 h-4" />
//                         {product?.price?.toLocaleString() || '0'}
//                       </div>
//                     </div>
//                     <div>
//                       <div className="text-sm font-medium text-gray-500">Total Amount</div>
//                       <div className="flex items-center gap-1 text-lg font-semibold">
//                         <PhilippinePeso className="w-4 h-4" />
//                         {refundItem.order.total_amount.toLocaleString()}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Refund Reason */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <FileText className="w-5 h-5" />
//                 Refund Reason
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="bg-gray-50 p-4 rounded-lg">
//                 <p className="whitespace-pre-line">{refundItem.reason}</p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Evidence / Media */}
//           {refundItem.refund_medias && refundItem.refund_medias.length > 0 && (
//             <Card>
//               <CardHeader>
//                 <CardTitle className="text-lg flex items-center gap-2">
//                   <ImageIcon className="w-5 h-5" />
//                   Evidence Provided ({refundItem.refund_medias.length})
//                 </CardTitle>
//                 <CardDescription>
//                   Customer has attached images as evidence
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//                   {refundItem.refund_medias.map((media, index) => (
//                     <div key={media.refund_media} className="relative group">
//                       <img 
//                         src={media.file_data} 
//                         alt={`Evidence ${index + 1}`} 
//                         className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
//                         onClick={() => window.open(media.file_data, '_blank')}
//                       />
//                       <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
//                         Image {index + 1}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           )}
//         </div>

//         {/* Right Column - Actions & Summary */}
//         <div className="space-y-6">
//           {/* Quick Actions */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="text-lg">Actions</CardTitle>
//               <CardDescription>
//                 Take action on this refund request
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-2 gap-3">
//                 <Button 
//                   onClick={handleApprove}
//                   className="bg-green-600 hover:bg-green-700 h-12"
//                 >
//                   <CheckCircle className="w-5 h-5 mr-2" />
//                   Approve Request
//                 </Button>
//                 <Button 
//                   onClick={handleReject}
//                   variant="destructive"
//                   className="h-12"
//                 >
//                   <XCircle className="w-5 h-5 mr-2" />
//                   Reject Request
//                 </Button>
//               </div>
              
//               <Button 
//                 onClick={handleContactCustomer}
//                 variant="outline" 
//                 className="w-full h-12"
//               >
//                 <MessageCircle className="w-5 h-5 mr-2" />
//                 Contact Customer
//               </Button>

//               <Separator />

//               <div className="space-y-2">
//                 <div className="text-sm font-medium text-gray-700">Need more information?</div>
//                 <p className="text-sm text-gray-500">
//                   You can contact the customer for clarification before making a decision.
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Refund Summary */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="text-lg">Refund Summary</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="space-y-3">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Refund ID</span>
//                   <span className="font-mono text-sm">{refundItem.refund.substring(0, 8)}...</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Request Date</span>
//                   <span>{formatDate(refundItem.requested_at)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Status</span>
//                   <Badge variant="secondary">
//                     <Clock className="w-3 h-3 mr-1" />
//                     Pending Review
//                   </Badge>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Preferred Method</span>
//                   <span className="font-medium">{refundItem.preferred_refund_method}</span>
//                 </div>
//                 <div className="flex justify-between items-center pt-2 border-t">
//                   <span className="text-lg font-semibold">Refund Amount</span>
//                   <div className="text-2xl font-bold flex items-center gap-1">
//                     <PhilippinePeso className="w-6 h-6" />
//                     {refundItem.order.total_amount.toLocaleString()}
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Timeline */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="text-lg">Timeline</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 <div className="flex items-start gap-3">
//                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
//                     <ShoppingBag className="w-4 h-4 text-blue-600" />
//                   </div>
//                   <div>
//                     <div className="font-medium">Order Placed</div>
//                     <div className="text-sm text-gray-500">{formatDate(refundItem.order.created_at)}</div>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
//                     <RotateCcw className="w-4 h-4 text-yellow-600" />
//                   </div>
//                   <div>
//                     <div className="font-medium">Refund Requested</div>
//                     <div className="text-sm text-gray-500">{formatDate(refundItem.requested_at)}</div>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
//                     <Clock className="w-4 h-4 text-gray-400" />
//                   </div>
//                   <div>
//                     <div className="font-medium">Under Review</div>
//                     <div className="text-sm text-gray-500">Awaiting your decision</div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Additional Notes */}
//           {refundItem.notes && (
//             <Card>
//               <CardHeader>
//                 <CardTitle className="text-lg flex items-center gap-2">
//                   <AlertCircle className="w-5 h-5" />
//                   Seller Notes
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
//                   <p className="text-sm">{refundItem.notes}</p>
//                 </div>
//               </CardContent>
//             </Card>
//           )}
//         </div>
//       </div>

//       {/* Footer Actions */}
//       <div className="flex justify-between items-center pt-6 border-t">
//         <div className="text-sm text-gray-500">
//           Decision required within 48 hours
//         </div>
//         <div className="flex gap-3">
//           <Button 
//             variant="outline" 
//             onClick={() => navigate('/seller/refunds')}
//           >
//             Cancel
//           </Button>
//           <Button 
//             variant="destructive"
//             onClick={handleReject}
//           >
//             <XCircle className="w-4 h-4 mr-2" />
//             Reject Request
//           </Button>
//           <Button 
//             onClick={handleApprove}
//             className="bg-green-600 hover:bg-green-700"
//           >
//             <CheckCircle className="w-4 h-4 mr-2" />
//             Approve Request
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }