"use client";

import React, { useEffect, useState } from 'react';
import { useLoaderData, useSearchParams, useNavigate } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';
import { Button } from '~/components/ui/button';
import { useToast } from '~/hooks/use-toast';
import SellerSidebarLayout from '~/components/layouts/seller-sidebar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Skeleton } from '~/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { Building, Home, MapPin, Phone, User, Edit, Trash2, Plus, Check, Package, Loader2 } from 'lucide-react';

// Server loader below provides user/shop and initial addresses
export async function loader({ request, context }: any) {
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }
  const shopId = session.get('shopId') || undefined;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const headers: Record<string, string> = { 'X-User-Id': String(userId) };
  if (shopId) headers['X-Shop-Id'] = String(shopId);

  // Try to fetch initial addresses on server to hydrate client
  let initialAddresses: any[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/return-address/`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (res.ok) {
      initialAddresses = await res.json();
    }
  } catch (err) {
    // ignore server-side fetch errors and let client retry
    console.error('Server loader: failed to fetch return-addresses', err);
  }

  return { userId: String(userId), shopId: shopId || null, initialAddresses };
}

export default function SellerReturnAddressPage() {
  const { toast } = useToast();
  // loader-provided data
  const { userId, shopId, initialAddresses } = useLoaderData<typeof loader>();

  const [addresses, setAddresses] = useState<any[]>(initialAddresses || []);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    recipient_name: '',
    contact_number: '',
    country: 'Philippines',
    province: '',
    city: '',
    barangay: '',
    street: '',
    zip_code: '',
    notes: ''
  });

  // Inline validation errors for the form
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getHeaders = () => {
    const headers: Record<string, string> = { 'X-User-Id': String(userId) };
    if (shopId) headers['X-Shop-Id'] = String(shopId);
    return headers;
  };

  const [searchParams] = useSearchParams();
  const refundId = String(searchParams.get('refund_id') || '');
  const navigate = useNavigate();

  const handleUseForRefund = async (addr: any) => {
    if (!refundId) {
      toast({ title: 'No refund selected', description: 'No refund specified to apply this address to', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        recipient_name: addr.recipient_name,
        contact_number: addr.contact_number,
        country: addr.country,
        province: addr.province,
        city: addr.city,
        barangay: addr.barangay,
        street: addr.street,
        zip_code: addr.zip_code,
        notes: addr.notes || ''
      };
      const res = await AxiosInstance.post(`/return-refund/${encodeURIComponent(refundId)}/set_return_address/`, payload, { headers: getHeaders() });
      toast({ title: 'Success', description: 'Return address applied to refund' });
      await fetchAddresses();
    } catch (e: any) {
      console.error('Failed to set return address for refund', e);
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to apply address to refund', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();

    // If a refund_id is provided in the query params, pre-fill or open the form to add the address
    const refundId = searchParams.get('refund_id');
    if (refundId) {
      (async () => {
        try {
          setLoading(true);
          const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/return-refund/${encodeURIComponent(String(refundId))}/get_seller_refund_details/?shop_id=${encodeURIComponent(String(shopId || ''))}`;
          const res = await AxiosInstance.get(apiUrl, { headers: getHeaders() });
          const data = res.data;
          if (data && data.return_address) {
            // Edit existing return address
            openEdit({ ...data.return_address, id: data.return_address.id });
          } else {
            // Pre-fill form defaults from shop or leave blank and open create form
            setForm(prev => ({ ...prev }));
            setShowDialog(true);
          }
        } catch (err) {
          // Ignore errors, let user create manually
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await AxiosInstance.get('/return-address/', { headers: getHeaders() });
      setAddresses(res.data || []);
    } catch (e: any) {
      console.error('Failed to fetch return addresses', e);
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to fetch return addresses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      recipient_name: '', contact_number: '', country: 'Philippines', province: '', city: '', barangay: '', street: '', zip_code: '', notes: ''
    });
    setErrors({});
    setShowDialog(true);
  };

  const openEdit = (ra: any) => {
    setEditing(ra);
    setForm({
      recipient_name: ra.recipient_name || '',
      contact_number: ra.contact_number || '',
      country: ra.country || 'Philippines',
      province: ra.province || '',
      city: ra.city || '',
      barangay: ra.barangay || '',
      street: ra.street || '',
      zip_code: ra.zip_code || '',
      notes: ra.notes || ''
    });
    setErrors({});
    setShowDialog(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.recipient_name.trim()) {
      newErrors.recipient_name = 'Recipient name is required';
    }
    if (!form.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    }
    if (!form.country.trim()) {
      newErrors.country = 'Country is required';
    }
    if (!form.province.trim()) {
      newErrors.province = 'Province is required';
    }
    if (!form.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!form.barangay.trim()) {
      newErrors.barangay = 'Barangay is required';
    }
    if (!form.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!form.zip_code.trim()) {
      newErrors.zip_code = 'ZIP code is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      if (editing) {
        // PATCH
        const res = await AxiosInstance.patch(`/return-address/${editing.id}/`, form, { headers: getHeaders() });
        toast({ title: 'Success', description: 'Return address updated successfully' });
      } else {
        const res = await AxiosInstance.post(`/return-address/`, form, { headers: getHeaders() });
        toast({ title: 'Success', description: 'Return address created successfully' });
      }

      await fetchAddresses();
      setShowDialog(false);
      setEditing(null);
    } catch (e: any) {
      console.error('Failed to save return address', e);
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to save address', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setAddressToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;
    try {
      await AxiosInstance.delete(`/return-address/${addressToDelete}/`, { headers: getHeaders() });
      toast({ title: 'Success', description: 'Return address deleted successfully' });
      await fetchAddresses();
    } catch (e: any) {
      console.error('Failed to delete', e);
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to delete address', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  return (
    <SellerSidebarLayout>
      <div className="container mx-auto p-4 space-y-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Return Addresses</h1>
            <p className="text-muted-foreground mt-2">
              Manage your return addresses for customer refunds and returns
            </p>
          </div>
          <Button onClick={openCreate} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Return Address
          </Button>
        </div>

        {refundId && (
          <Alert className="bg-blue-50 border-blue-200">
            <Package className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Select a return address for refund #{refundId}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {loading && !addresses.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No return addresses yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Add a return address where customers can send back products for refunds and returns.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addresses.map((addr) => (
              <Card key={addr.id} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {addr.shop ? (
                          <Building className="h-4 w-4 text-primary" />
                        ) : (
                          <Home className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{addr.recipient_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {addr.contact_number}
                        </CardDescription>
                      </div>
                    </div>
                    {addr.shop && (
                      <Badge variant="outline" className="text-xs">
                        Shop Address
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{addr.street}</p>
                        <p className="text-muted-foreground">
                          {addr.barangay}, {addr.city}, {addr.province}
                        </p>
                        <p className="text-muted-foreground">
                          {addr.zip_code}, {addr.country}
                        </p>
                      </div>
                    </div>
                    {addr.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground text-sm">{addr.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 pt-3 border-t">
                  {refundId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUseForRefund(addr)}
                      disabled={loading}
                    >
                      <Check className="h-3 w-3 mr-2" />
                      Use for Refund
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEdit(addr)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteClick(addr.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Return Address' : 'Add New Return Address'}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update your return address details'
                  : 'Add a new address where customers can return products'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">
                    <User className="inline h-4 w-4 mr-2" />
                    Recipient Name *
                  </Label>
                  <Input
                    id="recipient_name"
                    name="recipient_name"
                    value={form.recipient_name}
                    onChange={handleChange}
                    placeholder="Enter recipient name"
                  />
                  {errors.recipient_name && (
                    <p className="text-sm text-destructive">{errors.recipient_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_number">
                    <Phone className="inline h-4 w-4 mr-2" />
                    Contact Number *
                  </Label>
                  <Input
                    id="contact_number"
                    name="contact_number"
                    value={form.contact_number}
                    onChange={handleChange}
                    placeholder="Enter contact number"
                  />
                  {errors.contact_number && (
                    <p className="text-sm text-destructive">{errors.contact_number}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Enter country"
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Input
                    id="province"
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    placeholder="Enter province"
                  />
                  {errors.province && (
                    <p className="text-sm text-destructive">{errors.province}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barangay">Barangay *</Label>
                  <Input
                    id="barangay"
                    name="barangay"
                    value={form.barangay}
                    onChange={handleChange}
                    placeholder="Enter barangay"
                  />
                  {errors.barangay && (
                    <p className="text-sm text-destructive">{errors.barangay}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    placeholder="Enter street address"
                  />
                  {errors.street && (
                    <p className="text-sm text-destructive">{errors.street}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code *</Label>
                  <Input
                    id="zip_code"
                    name="zip_code"
                    value={form.zip_code}
                    onChange={handleChange}
                    placeholder="Enter ZIP code"
                  />
                  {errors.zip_code && (
                    <p className="text-sm text-destructive">{errors.zip_code}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Enter any additional notes or instructions"
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground">
                  Special instructions or landmarks for delivery
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update Address' : 'Create Address'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the return address
                and remove it from any associated refunds.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SellerSidebarLayout>
  );
}