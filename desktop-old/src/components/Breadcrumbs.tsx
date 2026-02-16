import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Breadcrumb {
  id: string | null;
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onBreadcrumbClick?: (id: string | null) => void;
  className?: string;
}

export function Breadcrumbs({
  breadcrumbs,
  onBreadcrumbClick,
  className = "",
}: BreadcrumbsProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id || "root"}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log(
                "🍞 Breadcrumb clicked:",
                crumb.name,
                "id:",
                crumb.id,
              );
              onBreadcrumbClick?.(crumb.id);
            }}
            className="h-auto p-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            {index === 0 ? (
              <div className="flex items-center space-x-1">
                <Home className="w-4 h-4" />
                <span>{crumb.name}</span>
              </div>
            ) : (
              crumb.name
            )}
          </Button>
        </React.Fragment>
      ))}
    </nav>
  );
}
