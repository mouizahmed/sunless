"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Monitor } from "lucide-react";
import { useOS } from "@/hooks/useOS";

interface DownloadButtonProps {
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function DownloadButton({
  variant = "default",
  size = "md",
  className = "",
}: DownloadButtonProps) {
  const os = useOS();

  const baseClasses =
    "font-medium rounded-full transition-colors flex items-center gap-2";
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-6 text-lg",
  };
  const variantClasses = {
    default: "bg-violet-600 hover:bg-violet-700 text-white",
    outline: "bg-white hover:bg-gray-50 text-black border border-gray-300",
  };

  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  // Windows users get direct download
  if (os === "windows") {
    return (
      <Button className={buttonClasses}>
        <Image
          src="/windows.svg"
          alt="Windows"
          width={20}
          height={20}
          className={`w-5 h-5 ${variant === "default" ? "filter invert" : ""}`}
        />
        Download
      </Button>
    );
  }

  // Mac users get direct download
  if (os === "mac") {
    return (
      <Button className={buttonClasses}>
        <Image
          src="/apple.svg"
          alt="Mac"
          width={20}
          height={20}
          className={`w-5 h-5 ${variant === "default" ? "filter invert" : ""}`}
        />
        Download
      </Button>
    );
  }

  // All other users get dialog
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={`${buttonClasses} cursor-pointer`}>
          <Monitor className="w-5 h-5" />
          Download
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your platform</DialogTitle>
          <DialogDescription>
            Select the download option for your operating system.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button className="flex items-center gap-3 p-4 h-auto">
            <Image
              src="/windows.svg"
              alt="Windows"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <div className="text-left">
              <div className="font-medium">Download for Windows</div>
              <div className="text-sm text-muted-foreground">Windows 10/11</div>
            </div>
          </Button>
          <Button className="flex items-center gap-3 p-4 h-auto">
            <Image
              src="/apple.svg"
              alt="Mac"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <div className="text-left">
              <div className="font-medium">Download for Mac</div>
              <div className="text-sm text-muted-foreground">macOS 10.15+</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
