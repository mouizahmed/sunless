"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export interface ProgressState {
  isProcessing: boolean;
  progress: number;
  status?: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
  error?: string;
}

interface ProgressTrackerProps {
  progressState: ProgressState;
  title?: string;
  description?: string;
  successMessage?: string;
  successDescription?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressTracker({
  progressState,
  title = "Processing",
  description = "Your files are being processed...",
  successMessage = "Processing completed!",
  successDescription = "Your content is ready for review.",
  showPercentage = true,
  className
}: ProgressTrackerProps) {
  const { isProcessing, progress, status = 'idle', message, error } = progressState;

  if (!isProcessing && progress === 0 && status === 'idle') {
    return null;
  }

  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };


  const getCardContent = () => {
    if (status === 'error') {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">Processing failed</p>
          </div>
          <p className="text-red-600 text-sm">
            {error || "An error occurred during processing. Please try again."}
          </p>
        </div>
      );
    }

    if (status === 'completed' || progress >= 100) {
      return (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
          <p className="text-green-600 text-sm">
            {message || successDescription}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span>{message || "Progress"}</span>
          {showPercentage && <span>{Math.round(progress)}%</span>}
        </div>
        <Progress value={progress} className="w-full" />
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {getCardContent()}
        </CardContent>
      </Card>
    </div>
  );
}