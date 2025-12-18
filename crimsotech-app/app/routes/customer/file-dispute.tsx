import type { Route } from "./+types/file-dispute";
import { data } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession } = await import("~/sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  // Get user data from session
  const userId = session.get("userId");
  const isCustomer = session.get("isCustomer");
  const shopId = session.get("shopId");

  return data({
    userId,
    isCustomer,
    shopId,
  });
}

"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useToast } from '~/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { AlertTriangle, ArrowLeft, ShieldAlert, Upload, X } from 'lucide-react';

export default function FileDisputeClient({ loaderData }: Route.ComponentProps) {
  const { refundId } = useParams<{ refundId: string }>();
  const navigate = useNavigate();
  const { userId, isCustomer, shopId } = loaderData;
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [refundData, setRefundData] = useState<any>(null);
  const [reason, setReason] = useState<string>('other');
  const [description, setDescription] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);

  const RAW_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').endsWith('/api')
    ? RAW_BASE_URL.replace(/\/+$/, '')
    : `${RAW_BASE_URL.replace(/\/+$/, '')}/api`;

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [files]);

const fetchRefund = useCallback(async () => {
  if (!refundId || !userId) {
    setInitialLoading(false);
    return;
  }
  try {
    const getHeaders: Record<string, string> = { Accept: 'application/json' };
    if (userId) getHeaders['X-User-Id'] = userId;

    const res = await fetch(`${API_BASE_URL}/return-refund/${encodeURIComponent(refundId)}/get_my_refund/`, {
      method: 'GET',
      headers: getHeaders as HeadersInit,
      credentials: 'include',
    });
    
    if (!res.ok) throw new Error(`Failed to load refund (${res.status})`);
    
    const data = await res.json();
    console.log('Refund data received:', data);
    console.log('Available order fields:', {
      order_info: data?.order_info,
      order: data?.order,
      order_id: data?.order_info?.order_id,
      id: data?.order_info?.id,
      all_keys: Object.keys(data || {}),
      order_info_keys: data?.order_info ? Object.keys(data.order_info) : null
    });
    
    setRefundData(data);
    
    // Try different ways to get the order ID
    const orderIdentifier = 
      data?.order_info?.id ||      // Direct order id
      data?.order_info?.order?.id || // Nested order object
      data?.order ||               // Direct order reference
      data?.order_id ||            // Direct order_id field
      null;
    
    console.log('Order identifier found:', orderIdentifier);
    setOrderId(orderIdentifier);
    
    // For display purposes, try to get order number
    const orderNumber = 
      data?.order_info?.order_number ||
      data?.order_number ||
      data?.order_info?.order?.order_number ||
      null;
    
    setOrderNumber(orderNumber);
    
    if (!orderIdentifier) {
      console.warn('No order identifier found in refund response:', data);
      toast({
        title: 'Warning',
        description: 'Could not find associated order information',
        variant: 'destructive',
      });
    }
  } catch (e: any) {
    console.error('Error fetching refund:', e);
    toast({
      title: 'Error',
      description: e?.message || 'Unable to load refund',
      variant: 'destructive',
    });
  } finally {
    setInitialLoading(false);
  }
}, [refundId, userId, API_BASE_URL, toast]);

  useEffect(() => {
    fetchRefund();
  }, [fetchRefund]);

  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    // Filter out duplicates and limit total files
    setFiles(prev => {
      const newFiles = [...prev];
      selectedFiles.forEach(file => {
        const isDuplicate = prev.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate && newFiles.length < 10) { // Limit to 10 files
          newFiles.push(file);
        }
      });
      return newFiles;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validTypes = ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const filteredFiles = droppedFiles.filter(file => 
      validTypes.some(type => file.type.startsWith(type))
    );
    
    if (filteredFiles.length > 0) {
      handleFileSelect(filteredFiles);
    } else {
      toast({
        title: 'Invalid files',
        description: 'Please upload only images, videos, PDFs, or Word documents',
        variant: 'destructive',
      });
    }
  }, [handleFileSelect, toast]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFilePreview = useCallback((file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }, []);

  const getFileIcon = useCallback((file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    return '📎';
  }, []);

  const handleSignInRedirect = () => {
    navigate('/login', { state: { returnTo: `/customer/file-dispute/${refundId}` } });
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to file a dispute',
        variant: 'destructive',
      });
      navigate('/login', { state: { returnTo: `/customer/file-dispute/${refundId}` } });
      return;
    }
    
    if (!orderId) {
      toast({
        title: 'Missing order',
        description: 'Could not determine the related order',
        variant: 'destructive',
      });
      return;
    }
    
    if (!reason) {
      toast({ title: 'Missing reason', description: 'Please select a dispute reason' });
      return;
    }
    
    if (!description.trim()) {
      toast({ title: 'Missing description', description: 'Please provide a brief description' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        order: orderId,
        refund: refundId,
        reason: reason || 'other',
        description,
      };
      
      const postHeaders: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      if (userId) postHeaders['X-User-Id'] = userId;

      const res = await fetch(`${API_BASE_URL}/disputes/`, {
        method: 'POST',
        headers: postHeaders as HeadersInit,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        toast({
          title: 'Session expired',
          description: 'Please sign in again',
          variant: 'destructive',
        });
        navigate('/login', { state: { returnTo: `/customer/file-dispute/${refundId}` } });
        return;
      }

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!res.ok) {
        const message = data?.error || data?.message || text || 'Failed to file dispute';
        throw new Error(message);
      }

      toast({
        title: 'Dispute Request Submitted',
        description: 'Your dispute request has been submitted successfully',
      });

      // Upload evidence if files are provided
      if (files.length > 0 && data?.id) {
        setUploadingFiles(true);
        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append('dispute', data.id);
          formData.append('file', file);
          
          try {
            const uploadHeaders: Record<string, string> = {};
            if (userId) uploadHeaders['X-User-Id'] = userId;

            const evidenceRes = await fetch(
              `${API_BASE_URL}/disputes/${data.id}/add_evidence/`,
              {
                method: 'POST',
                headers: uploadHeaders as HeadersInit,
                credentials: 'include',
                body: formData,
              }
            );
            
            if (!evidenceRes.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }
            return { success: true, file: file.name };
          } catch (e) {
            return { success: false, file: file.name, error: e };
          }
        });

        const results = await Promise.allSettled(uploadPromises);
        const failedUploads = results.filter(
          r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
        );

        if (failedUploads.length > 0) {
          const errorMessages = failedUploads.map(upload => {
            const result = upload.status === 'fulfilled' ? upload.value : upload.reason;
            const error = result.error;
            if (error && typeof error === 'object' && 'message' in error) {
              return `${result.file}: ${error.message}`;
            }
            return `${result.file}: Upload failed`;
          }).join('; ');
          
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${failedUploads.length} file(s): ${errorMessages}`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Success',
            description: 'All evidence files have been uploaded',
          });
        }
        setUploadingFiles(false);
      }

      if (isCustomer) {
        navigate(`/view-customer-return-cancel/${refundId}?status=dispute`);
      } else {
        navigate(`/view-refund-details/${refundId}?status=dispute`);
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dispute form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="px-0 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            File a Dispute
          </CardTitle>
          <CardDescription>
            {orderNumber ? (
              <span className="text-gray-600">For Order #{orderNumber}</span>
            ) : (
              <span className="text-gray-600">Provide details to submit your dispute.</span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!userId ? (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Sign in required</AlertTitle>
              <AlertDescription className="text-amber-700">
                You need to sign in to file a dispute. 
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignInRedirect}
                    className="mt-2"
                  >
                    Sign In
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {refundData && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {refundData?.order_info?.order_number && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Number:</span>
                        <span className="font-medium">#{refundData.order_info.order_number}</span>
                      </div>
                    )}
                    {refundData?.order_info?.total_amount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Amount:</span>
                        <span className="font-medium">₱{parseFloat(refundData.order_info.total_amount).toFixed(2)}</span>
                      </div>
                    )}
                    {refundData?.reason && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Return Reason:</span>
                        <span className="font-medium">{refundData.reason}</span>
                      </div>
                    )}
                    {refundData?.status && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium capitalize">{refundData.status.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="reason-select">Reason for Dispute *</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger id="reason-select" className="w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="item_not_received">Item Not Received</SelectItem>
                      <SelectItem value="item_damaged">Item Damaged</SelectItem>
                      <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                      <SelectItem value="not_as_described">Not As Described</SelectItem>
                      <SelectItem value="seller_unresponsive">Seller Unresponsive</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue and what resolution you expect. Please include relevant details like dates, communication attempts, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-32 resize-y"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">Required field</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Evidence (Optional)</Label>
                    <span className="text-xs text-gray-500">
                      {files.length}/10 files
                    </span>
                  </div>
                  
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors bg-gray-50"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
                        className="hidden"
                        id="file-upload"
                      />
                      
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-white rounded-full shadow-sm mb-4">
                            <Upload className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-lg font-semibold text-gray-800 mb-2">
                            Upload Evidence
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            Click to browse or drag & drop files here
                          </p>
                          <p className="text-xs text-gray-500">
                            Supports images, videos, PDFs, Word docs (Max 10MB each)
                          </p>
                        </div>
                      </label>
                    </div>
                    
                    {files.length > 0 && (
                      <div className="mt-8 pt-6 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-4">
                          Selected Files ({files.length})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {files.map((file, index) => {
                            const preview = getFilePreview(file);
                            return (
                              <div
                                key={`${file.name}-${index}`}
                                className="relative group bg-white rounded-lg border p-2 hover:shadow-sm transition-shadow"
                              >
                                <div className="aspect-square bg-gray-50 rounded-md overflow-hidden flex items-center justify-center">
                                  {preview ? (
                                    <img
                                      src={preview}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                      onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center p-2">
                                      <span className="text-2xl mb-1">{getFileIcon(file)}</span>
                                      <p className="text-xs text-gray-500 text-center truncate w-full">
                                        {file.type.split('/')[1] || 'file'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 px-1">
                                  <p
                                    className="text-xs font-medium text-gray-700 truncate"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                  onClick={() => removeFile(index)}
                                  aria-label={`Remove ${file.name}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add More Files
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {uploadingFiles && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Uploading evidence files...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={loading || uploadingFiles}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || uploadingFiles || !userId || !reason || !description.trim()}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : uploadingFiles ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading Files...
                    </>
                  ) : (
                    'Submit Dispute'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}