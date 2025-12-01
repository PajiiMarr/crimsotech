// ~/components/ui/sonner.tsx
"use client"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          
          // Success (Green) - Brighter colors for better visibility
          success: "group-[.toast]:!bg-green-500 group-[.toast]:!text-white group-[.toast]:!border-green-600 dark:group-[.toast]:!bg-green-600 dark:group-[.toast]:!text-white dark:group-[.toast]:!border-green-700",
          
          // Error/Destructive (Red) - Brighter colors
          error: "group-[.toast]:!bg-red-500 group-[.toast]:!text-white group-[.toast]:!border-red-600 dark:group-[.toast]:!bg-red-600 dark:group-[.toast]:!text-white dark:group-[.toast]:!border-red-700",
          
          // Warning (Amber/Yellow) - Better contrast
          warning: "group-[.toast]:!bg-amber-500 group-[.toast]:!text-white group-[.toast]:!border-amber-600 dark:group-[.toast]:!bg-amber-600 dark:group-[.toast]:!text-white dark:group-[.toast]:!border-amber-700",
          
          // Info (Blue) - Brighter colors
          info: "group-[.toast]:!bg-blue-500 group-[.toast]:!text-white group-[.toast]:!border-blue-600 dark:group-[.toast]:!bg-blue-600 dark:group-[.toast]:!text-white dark:group-[.toast]:!border-blue-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }