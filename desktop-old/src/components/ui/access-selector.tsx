// React import not needed for modern JSX transform
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccessOption {
  value: string;
  label: string;
  description: string;
}

interface AccessSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: "sharing" | "workspace" | "folder-access";
  disabled?: boolean;
  workspaceName?: string;
}

const SHARING_PERMISSIONS: AccessOption[] = [
  {
    value: "full",
    label: "Full access",
    description: "Can edit, share and delete.",
  },
  {
    value: "edit",
    label: "Edit access",
    description: "Can edit and delete but not share.",
  },
  {
    value: "view",
    label: "View access",
    description: "Can only view.",
  },
];

const WORKSPACE_PERMISSIONS: AccessOption[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Can change workspace settings and invite new members.",
  },
  {
    value: "member",
    label: "Member",
    description: "Can view and edit content.",
  },
];

export function AccessSelector({
  value,
  onChange,
  type,
  disabled = false,
  workspaceName,
}: AccessSelectorProps) {
  let options: AccessOption[];

  if (type === "sharing") {
    options = SHARING_PERMISSIONS;
  } else if (type === "folder-access") {
    options = [
      {
        value: "workspace",
        label: `Everyone in ${workspaceName || "workspace"}`,
        description: `All ${workspaceName || "workspace"} members can access this folder.`,
      },
      {
        value: "invite_only",
        label: "Invite only",
        description: "Only people you invite can access this folder.",
      },
    ];
  } else {
    options = WORKSPACE_PERMISSIONS;
  }

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 cursor-pointer">
        <SelectValue>{selectedOption?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-neutral-500">
                {option.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
