import type { Route } from "./+types/add-delivery-media";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { useState, useEffect, useRef } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import { useNavigate } from 'react-router';
import { 
  Upload,
  Camera,
  FileText,
  CheckCircle,
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  X,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Eye,
  Video,
  File
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from '~/hooks/use-toast';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Add Delivery Proof | Riders",
    }
  ]
}

interface Delivery {
  id: string;
  order: {
    order_id: string;
    customer: {
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      contact_number: string;
    };
    shipping_address: {
      id: string;
      recipient_name: string;
      recipient_phone: string;
      street: string;
      barangay: string;
      city: string;
      province: string;
      full_address: string;
    };
    total_amount: number;
    payment_method: string;
    delivery_method: string;
    status: string;
    created_at: string;
  };
  status: string;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Proof {
  id: string;
  proof_type: 'delivery' | 'seller' | 'pickup';
  file_type: 'image' | 'video' | 'document' | 'other';
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface LoaderData {
  user: any;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  return { user };
}

export default function AddDeliveryMedia({ loaderData, params }: { loaderData: LoaderData; params: Route.Params }) {
  const { user } = loaderData;
  const { deliveryId } = params;
  const navigate = useNavigate();
  
  // State for data
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [existingProofs, setExistingProofs] = useState<Proof[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingProofs, setIsFetchingProofs] = useState(false);
  
  // State for files
  const [proofsFiles, setProofsFiles] = useState<File[]>([]);
  const [proofsPreviews, setProofsPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  // State for camera
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  
  // State for dialogs
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  
  // Fetch delivery details
  const fetchDeliveryDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await AxiosInstance.get(`/rider-orders-active/get_deliveries/?status=all&page=1&page_size=50`, {
        headers: {
          'X-User-Id': user.user_id
        }
      });

      if (response.data.success) {
        const foundDelivery = response.data.deliveries.find(
          (d: any) => d.id === deliveryId
        );
        
        if (foundDelivery) {
          setDelivery(foundDelivery);
          fetchExistingProofs(foundDelivery.id);
        } else {
          throw new Error('Delivery not found');
        }
      } else {
        throw new Error(response.data.error || 'Failed to fetch delivery details');
      }

    } catch (error: any) {
      console.error('Error fetching delivery details:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to load delivery details",
        variant: "destructive",
      });
      setTimeout(() => navigate('/rider/orders/active'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch existing proofs for the delivery
  const fetchExistingProofs = async (deliveryId: string) => {
    try {
      setIsFetchingProofs(true);
      const response = await AxiosInstance.get(`/proof-management/get_delivery_proofs/?delivery_id=${deliveryId}`, {
  headers: {
    'X-User-Id': user.user_id
  }
});


      if (response.data && response.data.success) {
        const proofs = response.data.all_proofs || [];
        setExistingProofs(proofs);
      }
    } catch (error: any) {
      console.error('Error fetching existing proofs:', error);
    } finally {
      setIsFetchingProofs(false);
    }
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment'
        } 
      });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    
    if (context) {
      context.drawImage(cameraVideoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `delivery-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setProofsFiles(prev => [...prev, file]);
          
          const previewUrl = URL.createObjectURL(blob);
          setProofsPreviews(prev => [...prev, previewUrl]);
          
          stopCamera();
          setShowCamera(false);
          
          toast({
            title: "Photo Captured",
            description: "Delivery proof photo has been captured successfully.",
          });
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Handle file uploads
  const handleProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setProofsFiles(prev => [...prev, ...fileArray]);
    
    fileArray.forEach(file => {
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setProofsPreviews(prev => [...prev, previewUrl]);
      } else {
        setProofsPreviews(prev => [...prev, '']);
      }
    });

    event.target.value = '';
  };

  // Remove proof file
  const removeProof = (index: number) => {
    if (proofsPreviews[index]) {
      URL.revokeObjectURL(proofsPreviews[index]);
    }
    
    setProofsFiles(prev => prev.filter((_, i) => i !== index));
    setProofsPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Delete existing proof
  const deleteProof = async (proofId: string) => {
    try {
      const response = await AxiosInstance.delete('/proof-management/delete_proof/', {
        headers: {
          'X-User-Id': user.user_id,
          'Content-Type': 'application/json'
        },
        data: {
          proof_id: proofId
        }
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Proof deleted successfully",
        });
        if (delivery) {
          fetchExistingProofs(delivery.id);
        }
      } else {
        throw new Error(response.data.error || 'Failed to delete proof');
      }
    } catch (error: any) {
      console.error('Error deleting proof:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to delete proof",
        variant: "destructive",
      });
    }
  };

  // View proof details
  const viewProof = (proof: Proof) => {
    setSelectedProof(proof);
    setShowPreviewDialog(true);
  };

  // Alternative: Just add proofs without marking as delivered
  const addProofsOnly = async () => {
    if (!deliveryId) {
      toast({
        title: "Error",
        description: "Delivery ID is missing",
        variant: "destructive",
      });
      return;
    }

    if (proofsFiles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide at least one proof",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('delivery_id', deliveryId);
      formData.append('proof_type', 'delivery');

      proofsFiles.forEach((file) => {
        formData.append('proofs', file);
      });

      if (notes.trim()) {
        formData.append('notes', notes);
      }

      const response = await AxiosInstance.post('/proof-management/upload_proofs/', formData, {
        headers: {
          'X-User-Id': user.user_id,
        },
      });

      if (response.data.success) {
        toast({
          title: "Success!",
          description: response.data.message || "Proofs have been uploaded successfully.",
          variant: "default",
        });

        fetchExistingProofs(deliveryId);
        setProofsFiles([]);
        setProofsPreviews([]);
        proofsPreviews.forEach(url => url && URL.revokeObjectURL(url));
        setNotes('');
        
      } else {
        throw new Error(response.data.error || 'Failed to upload proofs');
      }
    } catch (error: any) {
      console.error('Error uploading proofs:', error);
      console.error('Upload response:', error?.response);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.error || `Request failed (${error.response?.status || error.message})` || "Failed to upload proofs",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string, fileName: string) => {
    const ft = fileType || '';
    if (ft.startsWith('image') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (ft.startsWith('video')) {
      return <Video className="w-4 h-4" />;
    } else if (ft.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      proofsPreviews.forEach(url => url && URL.revokeObjectURL(url));
      stopCamera();
    };
  }, []);

  // Initialize camera when showCamera changes
  useEffect(() => {
    if (showCamera) {
      initializeCamera();
    } else {
      stopCamera();
    }
  }, [showCamera]);

  // Fetch delivery details on mount
  useEffect(() => {
    fetchDeliveryDetails();
  }, []);

  if (isLoading) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[400px] lg:col-span-2" />
              <Skeleton className="h-[400px]" />
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/rider/orders/active')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Add Delivery Proof</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Order #{delivery?.order.order_id?.slice(-8)}
                </p>
              </div>
            </div>
            
            <Badge variant={delivery?.status === 'delivered' ? 'outline' : 'secondary'}>
              {delivery?.status === 'delivered' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Delivered
                </>
              ) : delivery?.status === 'picked_up' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  In Transit
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {delivery?.status || 'Unknown'}
                </>
              )}
            </Badge>
          </div>

          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {delivery && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <p className="font-semibold">#{delivery.order.order_id?.slice(-8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-semibold">
                          {delivery.order.customer.first_name} {delivery.order.customer.last_name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Delivery Address</p>
                        <p className="font-semibold text-sm line-clamp-2">
                          {delivery.order.shipping_address?.full_address || 'No address'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Payment</p>
                        <p className="font-semibold">₱{delivery.order.total_amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Delivery Proof Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="w-5 h-5" />
                    Upload Proof of Delivery
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Upload photos, videos, or documents as proof of delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                          multiple
                          onChange={(e) => handleProofUpload(e)}
                        />
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Upload</span>
                      </label>

                      <div className="flex flex-col items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCamera(true)}
                          className="w-24 h-24"
                        >
                          <Camera className="w-5 h-5" />
                        </Button>
                        <span className="text-xs text-muted-foreground">Camera</span>
                      </div>

                      {/* File Previews - Smaller */}
                      {proofsFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="w-24 h-24 rounded-md overflow-hidden border bg-gray-50 flex flex-col items-center justify-center p-1">
                            {proofsPreviews[index] ? (
                              <img
                                src={proofsPreviews[index]}
                                alt={`Proof ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full">
                                {getFileIcon('', file.name)}
                                <p className="text-xs mt-1 text-center truncate w-full px-1">
                                  {file.name.length > 12 ? `${file.name.substring(0, 10)}...` : file.name}
                                </p>
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeProof(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {proofsFiles.length === 0 && (
                      <p className="text-sm text-muted-foreground italic text-center py-2">
                        Please upload at least one proof of delivery.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                  <CardDescription className="text-sm">
                    Add any additional notes about the delivery (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full h-24 p-3 border rounded-lg text-sm"
                    placeholder="Enter any notes about the delivery..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Existing Proofs Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="w-5 h-5" />
                    Existing Proofs ({existingProofs.length})
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Previously uploaded proof files for this delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isFetchingProofs ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : existingProofs.length === 0 ? (
                    <div className="text-center py-6">
                      <ImageIcon className="h-10 w-10 mx-auto text-gray-300" />
                      <p className="text-muted-foreground mt-2 text-sm">
                        No proofs uploaded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {existingProofs.map((proof) => (
                        <div key={proof.id} className="group relative">
                          <div className="aspect-square bg-gray-100 rounded-md overflow-hidden border flex items-center justify-center">
                            {(proof.file_type || proof.file_url) && ((proof.file_type || '').toString().startsWith('image') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(proof.file_url || '')) ? (
                              <img
                                src={proof.file_url}
                                alt={proof.file_name}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => viewProof(proof)}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `
                                    <div class="flex flex-col items-center justify-center h-full p-2">
                                      ${getFileIcon(proof.file_type, proof.file_name).props.className.includes('w-4') ? 
                                        '<div class="text-gray-400"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>' : 
                                        '<div class="text-gray-400"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg></div>'}
                                      <span class="text-xs text-gray-500 mt-1 text-center truncate w-full">${proof.file_name.length > 12 ? proof.file_name.substring(0, 10) + '...' : proof.file_name}</span>
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div 
                                className="flex flex-col items-center justify-center h-full p-2 cursor-pointer"
                                onClick={() => viewProof(proof)}
                              >
                                {getFileIcon(proof.file_type, proof.file_name)}
                                <span className="text-xs text-gray-500 mt-1 text-center truncate w-full">
                                  {proof.file_name.length > 12 ? `${proof.file_name.substring(0, 10)}...` : proof.file_name}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 bg-white/90 hover:bg-white"
                                onClick={() => viewProof(proof)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 bg-white/90 hover:bg-white text-red-500 hover:text-red-700"
                                onClick={() => deleteProof(proof.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1">
                            <p className="text-xs font-medium truncate">{proof.file_name}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {proof.proof_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(proof.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary and Submit */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proof Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">New Proofs</span>
                      <span className="font-semibold">{proofsFiles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Existing Proofs</span>
                      <span className="font-semibold">{existingProofs.length}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold">Total Files</span>
                      <span className="font-bold">
                        {proofsFiles.length + existingProofs.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={proofsFiles.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Proof
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="w-5 h-5" />
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>At least one proof is required</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Photos should clearly show the delivered package</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Accepted: Images, Videos, PDFs, Documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Proofs are verified before payment processing</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Camera Modal */}
          {showCamera && (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto"
                  />
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="rounded-full h-14 w-14"
                  >
                    <Camera className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={() => {
                      stopCamera();
                      setShowCamera(false);
                    }}
                    variant="destructive"
                    size="lg"
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Proof Preview Dialog */}
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedProof?.file_name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {((selectedProof?.file_type || '').toString().startsWith('image') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(selectedProof?.file_url || '')) ? (
                  <img
                    src={selectedProof?.file_url}
                    alt={selectedProof?.file_name}
                    className="w-full max-h-[60vh] object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48">
                    {getFileIcon(selectedProof?.file_type || '', selectedProof?.file_name || '')}
                    <p className="mt-4 font-medium">{selectedProof?.file_name}</p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      This is a {selectedProof?.file_type} file. Click below to download.
                    </p>
                    <Button asChild className="mt-4">
                      <a href={selectedProof?.file_url} target="_blank" rel="noopener noreferrer">
                        Download File
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Proof Type</p>
                  <p className="font-medium">{selectedProof?.proof_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded</p>
                  <p className="font-medium">
                    {selectedProof?.uploaded_at ? new Date(selectedProof.uploaded_at).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmation Dialog */}
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit Delivery Proof?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to submit {proofsFiles.length} new file(s) as proof for Order #{delivery?.order.order_id?.slice(-8)}.
                  {existingProofs.length > 0 && ` There are already ${existingProofs.length} existing proof(s).`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={addProofsOnly}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Proof'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}