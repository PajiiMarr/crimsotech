
"use client";

import React, { useEffect, useState } from 'react';
import { useLoaderData, useSearchParams, useNavigate } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { useToast } from '~/hooks/use-toast';
import SellerSidebarLayout from '~/components/layouts/seller-sidebar';

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
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const getHeaders = () => {
    const headers: Record<string, string> = { 'X-User-Id': String(userId) };
    if (shopId) headers['X-Shop-Id'] = String(shopId);
    return headers;
  };


  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
            setShowForm(true);
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
    setShowForm(true);
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
    setShowForm(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // basic validation
    if (!form.recipient_name.trim() || !form.contact_number.trim() || !form.street.trim() || !form.city.trim()) {
      toast({ title: 'Validation', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      if (editing) {
        // PATCH
        const res = await AxiosInstance.patch(`/return-address/${editing.id}/`, form, { headers: getHeaders() });
        toast({ title: 'Updated', description: 'Return address updated' });
      } else {
        const res = await AxiosInstance.post(`/return-address/`, form, { headers: getHeaders() });
        toast({ title: 'Created', description: 'Return address added' });
      }

      await fetchAddresses();
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      console.error('Failed to save return address', e);
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to save address', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this return address?')) return;
    try {
      await AxiosInstance.delete(`/return-address/${id}/`, { headers: getHeaders() });
      toast({ title: 'Deleted', description: 'Return address removed' });
      await fetchAddresses();
    } catch (e: any) {
      console.error('Failed to delete', e);
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to delete address', variant: 'destructive' });
    }
  };

  return (
    <SellerSidebarLayout>
      <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Return Addresses</h2>
        <div>
          <Button onClick={openCreate}>Add Return Address</Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div className="p-4 border rounded bg-gray-50">No return addresses yet</div>
          ) : (
            addresses.map(addr => (
              <div key={addr.id} className="p-3 border rounded flex items-start justify-between">
                <div>
                  <p className="font-medium">{addr.recipient_name} — {addr.contact_number}</p>
                  <p className="text-sm">{addr.street}, {addr.barangay}, {addr.city}, {addr.province} {addr.zip_code}, {addr.country}</p>
                  {addr.notes && <p className="text-sm text-gray-600">{addr.notes}</p>}
                  {addr.shop && <p className="text-xs text-gray-500 mt-1">Shop: {addr.shop.name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => openEdit(addr)}>Edit</Button>
                  <Button variant="destructive" onClick={() => handleDelete(addr.id)}>Delete</Button>
                </div>
              </div>
            ))
          )}

          {showForm && (
            <div className="p-4 border rounded bg-white">
              <h3 className="font-medium mb-2">{editing ? 'Edit' : 'Add'} Return Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input name="recipient_name" value={form.recipient_name} onChange={handleChange} placeholder="Recipient name" />
                <Input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="Contact number" />
                <Input name="country" value={form.country} onChange={handleChange} placeholder="Country" />
                <Input name="province" value={form.province} onChange={handleChange} placeholder="Province" />
                <Input name="city" value={form.city} onChange={handleChange} placeholder="City" />
                <Input name="barangay" value={form.barangay} onChange={handleChange} placeholder="Barangay" />
                <Input name="street" value={form.street} onChange={handleChange} placeholder="Street" />
                <Input name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="Zip code" />
              </div>
              <div className="mt-3">
                <Textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notes (optional)" />
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : (editing ? 'Save changes' : 'Create Address')}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </SellerSidebarLayout>
  );
}
