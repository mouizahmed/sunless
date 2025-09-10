"use client";

import React from "react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card, CardContent } from "../ui/card";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileAudio, 
  FileVideo, 
  Upload, 
  X, 
  Youtube, 
  Music, 
  Video, 
  Globe, 
  Trash2 
} from "lucide-react";
import { UploadMedia, UploadUrl } from "@/types/file";

// Helper function to format file size with appropriate units
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function to format duration in minutes:seconds
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to calculate total duration in minutes
const calculateTotalMinutes = (mediaList: UploadMedia[]): number => {
  const totalSeconds = mediaList.reduce((total, media) => {
    return total + (media.duration || 0);
  }, 0);
  
  return Math.round(totalSeconds / 60 * 10) / 10; // Round to 1 decimal place
};

const getPlatformInfo = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { name: 'YouTube', icon: Youtube, color: 'text-red-500' };
    }
    if (hostname.includes('vimeo.com')) {
      return { name: 'Vimeo', icon: Video, color: 'text-blue-500' };
    }
    if (hostname.includes('soundcloud.com')) {
      return { name: 'SoundCloud', icon: Music, color: 'text-orange-500' };
    }
    if (hostname.includes('spotify.com')) {
      return { name: 'Spotify', icon: Music, color: 'text-green-500' };
    }
    if (hostname.includes('tiktok.com')) {
      return { name: 'TikTok', icon: Video, color: 'text-black' };
    }
    
    return { name: 'Web', icon: Globe, color: 'text-gray-500' };
  } catch {
    return { name: 'Unknown', icon: Globe, color: 'text-gray-500' };
  }
};

interface MediaListProps {
  uploadedMedia: UploadMedia[];
  onCancelUpload: (mediaId: string) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  className?: string;
}

export function MediaList({ uploadedMedia, onCancelUpload, onDeleteMedia, className }: MediaListProps) {
  if (uploadedMedia.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {uploadedMedia.map((media) => (
          <Card key={media.id}>
            <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {media.type === 'url' ? (
                  (() => {
                    const platform = getPlatformInfo((media as UploadUrl).url);
                    const PlatformIcon = platform.icon;
                    return <PlatformIcon className={`h-5 w-5 ${platform.color} flex-shrink-0`} />;
                  })()
                ) : media.contentType?.startsWith('video/') ? (
                  <FileVideo className="h-5 w-5 text-blue-500 flex-shrink-0" />
                ) : media.contentType?.startsWith('audio/') ? (
                  <FileAudio className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Upload className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {media.type === 'url' ? (
                      media.status === 'uploaded'
                        ? `Processing complete: ${media.name}`
                        : media.status === 'failed'
                          ? `Failed: ${media.name}`
                          : media.status === 'cancelled'
                            ? `Cancelled: ${media.name}`
                            : media.status === 'queued'
                              ? `Queued: ${media.name}`
                              : `Processing ${media.name}...`
                    ) : (
                      media.status === 'uploaded'
                        ? `Upload complete: ${media.name}`
                        : media.status === 'failed'
                          ? `Failed: ${media.name}`
                          : media.status === 'cancelled'
                            ? `Cancelled: ${media.name}`
                            : media.status === 'queued'
                              ? `Queued: ${media.name}`
                              : `Uploading ${media.name}...`
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <span>{media.progress.toFixed(0)}%</span>
              </div>
            </div>
            <Progress value={media.progress} className="w-full mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{media.size && media.size > 0 ? formatFileSize(media.size) : 'Calculating...'}</span>
                {media.duration && media.duration > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{formatDuration(media.duration)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {(media.status === 'uploading' || media.status === 'queued') ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => onCancelUpload(media.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                ) : media.status === 'uploaded' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {media.type === 'file' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDeleteMedia(media.id)}
                        title="Delete uploaded file"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                ) : media.status === 'failed' ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteMedia(media.id)}
                      title="Remove failed upload"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                ) : media.status === 'cancelled' ? (
                  <X className="h-4 w-4 text-orange-500" />
                ) : null}
              </div>
            </div>
            {/* Show URL for URL media */}
            {media.kind === 'url' && (
              <div className="text-xs text-gray-400 mt-2 truncate">
                {(media as UploadedUrl).url}
              </div>
            )}
            
            {media.error && (
              <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
                Error: {media.error}
              </div>
            )}
            </CardContent>
          </Card>
        ))}
        
        {/* Total Minutes Display */}
        {uploadedMedia.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-center gap-4 text-sm font-medium text-blue-700">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span>
                    {uploadedMedia.filter(m => m.status === 'uploaded').length} of {uploadedMedia.length} files accepted
                  </span>
                </div>
                {calculateTotalMinutes(uploadedMedia) > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Total Duration: {calculateTotalMinutes(uploadedMedia)} minutes
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
