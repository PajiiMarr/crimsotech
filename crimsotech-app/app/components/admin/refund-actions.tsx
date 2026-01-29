"use client";

import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Eye } from 'lucide-react';

interface Props {
  refundId: string;
}

export default function RefundActions({ refundId }: Props) {
  const navigate = useNavigate();

  const onView = () => {
    // Navigate to the admin refund details page and open the processing action
    navigate(`/admin/view-refund-details/${refundId}?action=process`);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="View details"
        onClick={onView}
      >
        <Eye className="w-4 h-4" />
      </Button>
    </div>
  );
}
