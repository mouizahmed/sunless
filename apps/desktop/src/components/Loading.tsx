
interface LoadingProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

export function Loading({ size = "medium", className = "" }: LoadingProps) {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-6 w-6",
    large: "h-8 w-8"
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300`}
      />
    </div>
  );
}

export default Loading;