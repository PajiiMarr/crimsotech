import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import type { Route } from "./+types/add-proof";
import { Camera, X, CheckCircle, AlertCircle, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Progress } from "~/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface ProofUploadProps {
  deliveryId: string;
  riderId: string;
  onUploadSuccess?: (proofData: any) => void;
  onUploadError?: (error: string) => void;
}

interface UploadedProof {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  file_size: number;
}

interface LoaderData {
  user: any;
}

function AddProofForm({ deliveryId, riderId, onUploadSuccess, onUploadError }: ProofUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const [uploadedProofs, setUploadedProofs] = useState<UploadedProof[]>([]);
  const [isLoadingProofs, setIsLoadingProofs] = useState(false);

  const MAX_FILES = 6;

  // Fetch existing proofs when component mounts
  useEffect(() => {
    fetchExistingProofs();
  }, [deliveryId]);

  const fetchExistingProofs = async () => {
    setIsLoadingProofs(true);
    try {
      const response = await AxiosInstance.get(
        `/rider-proof/delivery/${deliveryId}/proofs/`, // Updated endpoint
        {
          headers: {
            'X-User-Id': riderId || localStorage.getItem('userId') || '',
          }
        }
      );
      
      if (response.data?.success) {
        setUploadedProofs(response.data.proofs || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing proofs:', error);
    } finally {
      setIsLoadingProofs(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError(null);

    if (!files.length) return;

    if (selectedFiles.length + files.length > MAX_FILES - uploadedProofs.length) {
      setFileError(`You can only add ${MAX_FILES - uploadedProofs.length} more images`);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
    const maxSize = 10 * 1024 * 1024;

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        setFileError('Only JPG, PNG, HEIC images allowed');
        return;
      }

      if (file.size > maxSize) {
        setFileError('Each file must be less than 10MB');
        return;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previewUrls];

    URL.revokeObjectURL(newPreviews[index]);

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const validateForm = () => {
    if (selectedFiles.length === 0) {
      setFileError('Please upload at least one image');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const headerId = riderId || localStorage.getItem('userId') || '';
    console.debug('add-proof submit', { riderId, headerId, deliveryId, selectedFiles });
    e.preventDefault();
    if (!validateForm()) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setUploadSuccess(false);

    // Upload files one by one since backend expects single file
    const uploadedResults: UploadedProof[] = [];
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('delivery_id', deliveryId);
        formData.append('proof_type', 'delivery');
        formData.append('file', file); // Backend expects 'file' not 'proofs'

        const response = await AxiosInstance.post(
          `/rider-proof/upload/${deliveryId}/`, // Updated endpoint
          formData,
          {
            headers: {
              'X-User-Id': headerId,
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (evt: any) => {
              if (evt.total) {
                // Calculate overall progress
                const fileProgress = (evt.loaded * 100) / evt.total;
                const overallProgress = ((i * 100) + fileProgress) / selectedFiles.length;
                setUploadProgress(Math.round(overallProgress));
              }
            }
          }
        );

        if (response.data?.success) {
          uploadedResults.push(response.data.proof);
        }
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      
      // Add new proofs to the existing list
      setUploadedProofs(prev => [...uploadedResults, ...prev]);
      
      onUploadSuccess?.(uploadedResults);

      // Clear selected files after successful upload
      setTimeout(() => {
        previewUrls.forEach(u => URL.revokeObjectURL(u));
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 2000);
      
    } catch (err: any) {
      let msg = 'Failed to upload proof';
      if (err.response?.data) msg = err.response.data.error || msg;
      else if (err.message) msg = err.message;
      setErrorMessage(msg);
      setUploadProgress(0);
      onUploadError?.(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const totalImages = selectedFiles.length + uploadedProofs.length;
  const remainingSlots = MAX_FILES - totalImages;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <CardTitle className="m-0">Upload Proof of Delivery</CardTitle>
        </div>
        <CardDescription>
          Upload delivery photos (max {MAX_FILES} images)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Delivery Photos *</Label>

            {/* Loading state */}
            {isLoadingProofs && (
              <div className="text-center py-4 text-muted-foreground">
                Loading uploaded images...
              </div>
            )}

            {/* Image Grid - Combined uploaded and new images */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {/* Uploaded Images */}
              {uploadedProofs.map((proof, index) => (
                <div key={proof.id} className="relative aspect-square">
                  <div className="border-2 border-green-200 rounded-lg p-1 h-full w-full flex items-center justify-center bg-muted">
                    <img
                      src={proof.file_url}
                      alt={`uploaded-${index}`}
                      className="object-cover h-full w-full rounded"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=Error';
                      }}
                    />
                  </div>
                  
                  {/* Uploaded badge */}
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                    ✓
                  </span>

                  {index === 0 && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      Cover
                    </span>
                  )}
                </div>
              ))}

              {/* New Images (to be uploaded) */}
              {previewUrls.map((url, index) => (
                <div key={`new-${index}`} className="relative aspect-square">
                  <div className="border-2 border-dashed rounded-lg p-1 h-full w-full flex items-center justify-center bg-muted">
                    <img
                      src={url}
                      alt={`preview-${index}`}
                      className="object-cover h-full w-full rounded"
                    />
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  {/* New badge */}
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    New
                  </span>
                </div>
              ))}

              {/* Add Button - Only show if remaining slots available */}
              {remainingSlots > 0 && (
                <div className="aspect-square">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/heic,image/heif"
                    id="multi-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading || uploadSuccess}
                  />
                  <label
                    htmlFor="multi-upload"
                    className="cursor-pointer block h-full"
                  >
                    <div className="border-2 border-dashed rounded-lg h-full flex flex-col items-center justify-center hover:border-primary transition-colors bg-muted/30 p-2">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] mt-1 text-muted-foreground text-center">
                        Add Image
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Image count indicator */}
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
              <span>
                {totalImages} of {MAX_FILES} images 
                ({uploadedProofs.length} uploaded, {selectedFiles.length} new)
                {remainingSlots > 0 && ` (${remainingSlots} slots left)`}
              </span>
              {totalImages > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  First image is cover photo
                </span>
              )}
            </div>

            {fileError && (
              <p className="text-sm text-red-500">{fileError}</p>
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'}...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {uploadSuccess && (
            <Alert className="bg-green-50 text-green-600 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedFiles.length} {selectedFiles.length === 1 ? 'photo' : 'photos'} uploaded successfully!
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={selectedFiles.length === 0 || isUploading || uploadSuccess}
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} New ${selectedFiles.length === 1 ? 'Photo' : 'Photos'}`}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Delivery ID: {deliveryId}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  return { user };
}

export default function AddProofPage({ loaderData }: { loaderData: LoaderData }) {
  const params = useParams();
  const deliveryId = params.deliveryId || '';
  const user = loaderData.user;
  const riderId = user?.user_id || user?.id || '';
  console.debug('AddProofPage loader user', user, 'computed riderId', riderId);
  return <AddProofForm deliveryId={deliveryId} riderId={riderId} />;
}