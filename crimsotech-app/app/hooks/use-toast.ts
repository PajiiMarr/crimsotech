// ~/hooks/use-toast.ts
import { toast as sonnerToast, type ExternalToast } from "sonner";

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

interface ToastProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

function toast({ title, description, variant = 'default', duration = 5000 }: ToastProps) {
  // Combine title and description properly
  const hasTitle = title && String(title).trim();
  const hasDescription = description && String(description).trim();
  
  let message: React.ReactNode;
  
  if (hasTitle && hasDescription) {
    // Both title and description - show title as main message
    message = title;
  } else if (hasTitle) {
    // Only title
    message = title;
  } else if (hasDescription) {
    // Only description
    message = description;
  } else {
    return null;
  }
  
  const options: ExternalToast = {
    duration,
    // Add description if both title and description exist
    description: (hasTitle && hasDescription) ? description : undefined,
  };
  
  switch (variant) {
    case 'destructive':
      return sonnerToast.error(message, options);
    case 'success':
      return sonnerToast.success(message, options);
    case 'warning':
      return sonnerToast.warning(message, options);
    case 'info':
      return sonnerToast.info(message, options);
    default:
      return sonnerToast(message, options);
  }
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast, toast };