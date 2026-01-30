// Server route wrapper: loads refund by id then renders client AdminProcessRefundUI
import { redirect } from 'react-router';

export async function loader({ request, params, context }: any) {
  try {
    const { registrationMiddleware } = await import('~/middleware/registration.server');
    await registrationMiddleware({ request, context: undefined, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import('~/middleware/role-require.server');
    await requireRole(request, undefined, ['isAdmin'] as any);
  } catch (err) {
    console.error('Loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const refundId = params?.refundId || new URL(request.url).searchParams.get('refund_id') || new URL(request.url).searchParams.get('refund');
  if (!refundId) {
    throw new Response('refund id required', { status: 400 });
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const endpoint = `${API_BASE_URL}/admin-refunds/refund_list/`;

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User-Id': String(userId),
    },
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Response(text || 'Failed to fetch refunds list', { status: res.status });
  }

  const list = await res.json();
  const refunds = Array.isArray(list) ? list : Array.isArray(list.refunds) ? list.refunds : [];

  const refund = refunds.find((r: any) => String(r.refund) === String(refundId) || String(r.refund).startsWith(String(refundId)));

  if (!refund) throw new Response('Refund not found', { status: 404 });

  // Fetch authoritative admin refund details and merge them into the refund object
  try {
    const detailEndpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(String(refund.refund))}/get_admin_refund_details/`;
    const detailRes = await fetch(detailEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-User-Id': String(userId),
      },
      credentials: 'include'
    });

    if (detailRes.ok) {
      const details = await detailRes.json();
      if (details) {
        // Merge authoritative fields (e.g., total_refund_amount, proofs, payment details)
        Object.assign(refund, details);
        if (details.total_refund_amount != null && Number(details.total_refund_amount) !== Number(refund.total_refund_amount || 0)) {
          console.warn('Admin process page: total_refund_amount mismatch between list and details', { refundId: refund.refund, listValue: refund.total_refund_amount, detailValue: details.total_refund_amount });
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch admin refund details on process page', err);
  }

  return { refund, userId };
}

import React from 'react';
import { useLoaderData } from 'react-router';
import AdminProcessRefundUI from './process-refund';

export default function Page() {
  const { refund, userId } = useLoaderData() as any;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <AdminProcessRefundUI refund={refund} userId={userId} />
    </div>
  );
}
