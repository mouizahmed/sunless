interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {avatarUrl ? (
        <>
          <img
            src={avatarUrl}
            alt={name}
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-neutral-800`}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onLoad={(e) => {
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) {
                (fallback as HTMLElement).style.display = "none";
              }
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) {
                (fallback as HTMLElement).style.display = "flex";
              }
            }}
          />
          <div
            className={`${sizeClasses[size]} rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-medium border-2 border-white dark:border-neutral-800`}
            style={{ display: "none" }}
          >
            {getInitials(name)}
          </div>
        </>
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-medium border-2 border-white dark:border-neutral-800`}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
