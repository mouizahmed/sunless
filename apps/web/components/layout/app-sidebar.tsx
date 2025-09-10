"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { FolderTree } from './folder-tree'
import { sidebarData } from './sidebar-data'
import { useUser } from '@/hooks/use-user'
import { Badge } from '@/components/ui/badge'
import { Crown, Zap } from 'lucide-react'
import Image from 'next/image'

function SidebarHeaderContent() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-sidebar-border">
      <Image 
        src="/logo2.svg" 
        alt="WriteItOut Logo" 
        width={50}
        height={50}
        className="w-12 h-12 border border-gray-200 rounded-xl bg-white"
      />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">WriteItOut</span>
        <span className="truncate text-xs text-muted-foreground">Transcription Service</span>
      </div>
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading, error } = useUser()

  // Create user object with database data
  const userData = user ? {
    name: user.name || 'Unknown User',
    email: user.email || 'No email',
    avatar: user.avatar_url || '/avatars/default-user.jpg',
  } : {
    name: 'Loading...',
    email: 'Loading...',
    avatar: '/avatars/default-user.jpg'
  }

  // Helper functions for plan and quota display
  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
      case 'enterprise':
        return <Crown className="w-3 h-3" />;
      default:
        return <Zap className="w-3 h-3" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-green-100 text-green-800 hover:bg-green-200';
    }
  };

  const getQuotaColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-800';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Sidebar collapsible='none' variant='floating' {...props}>
      <SidebarHeader className="bg-amber-50/20">
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarContent className="bg-amber-50/15">
        {/* Folder Tree */}
        <FolderTree />
        
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
        
      </SidebarContent>
      <SidebarFooter className="bg-amber-50/20">
        {loading ? (
          <div className="space-y-4 p-4">
            {/* Plan and Quota Skeletons */}
            <div className="space-y-2">
              <div className="h-3 w-12 bg-muted rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-10 w-full bg-muted rounded-lg animate-pulse"></div>
                <div className="h-10 w-full bg-muted rounded-lg animate-pulse"></div>
              </div>
            </div>
            
            {/* User Profile Skeleton */}
            <div className="flex items-center gap-3 p-2">
              <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-xs text-red-600">
            Failed to load user
          </div>
        ) : user ? (
          <div className="space-y-4">
            {/* Plan and Quota Display */}
            <div className="pt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">Usage</div>
              <div className="space-y-2">
                <Badge variant="secondary" className={`${getPlanColor(user.plan)} border-0 rounded-lg w-full h-10 justify-start text-xs`}>
                  {getPlanIcon(user.plan)}
                  <span className="ml-1 capitalize">{user.plan} Plan</span>
                </Badge>
                <Badge variant="secondary" className={`${getQuotaColor(user.api_quota_used, user.api_quota_limit)} border-0 rounded-lg w-full h-10 justify-start text-xs`}>
                  <span>API: {user.api_quota_used.toLocaleString()} / {user.api_quota_limit.toLocaleString()}</span>
                </Badge>
              </div>
            </div>
            
            {/* User Profile */}
            <NavUser user={userData} />
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  )
}