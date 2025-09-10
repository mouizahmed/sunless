"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag } from "@/types/folder";

interface TagEditorProps {
  tags: Tag[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function TagEditor({
  tags = [],
  onTagsChange,
  maxTags = 10,
  placeholder = "Add tag...",
  trigger,
  disabled = false,
}: TagEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim();
    if (
      trimmedTag &&
      !tags.some(tag => tag.name === trimmedTag) &&
      tags.length < maxTags
    ) {
      // Convert to string array for API call
      const tagNames = [...tags.map(tag => tag.name), trimmedTag];
      onTagsChange(tagNames);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    // Convert to string array for API call
    const tagNames = tags.filter(tag => tag.id !== tagToRemove.id).map(tag => tag.name);
    onTagsChange(tagNames);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-1 text-muted-foreground hover:text-foreground"
      disabled={disabled}
    >
      {tags.length > 0 ? (
        <div className="flex items-center space-x-1">
          <TagIcon className="w-3 h-3" />
          <span className="text-xs">{tags.length}</span>
        </div>
      ) : (
        <Plus className="w-3 h-3" />
      )}
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Tags</h4>
            <span className="text-xs text-muted-foreground">
              {tags.length}/{maxTags}
            </span>
          </div>

          {/* Tag display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs pr-1 pl-2"
                >
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add new tag input */}
          {tags.length < maxTags && (
            <div className="flex items-center space-x-2">
              <Input
                ref={inputRef}
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                maxLength={30}
              />
              <Button
                size="sm"
                onClick={() => addTag(inputValue)}
                disabled={!inputValue.trim()}
                className="h-8 px-3"
              >
                Add
              </Button>
            </div>
          )}

          {tags.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tags yet. Add tags to organize and filter your folders.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple display component for showing tags without editing
interface TagDisplayProps {
  tags: Tag[];
  maxVisible?: number;
  onTagClick?: (tag: Tag) => void;
}

export function TagDisplay({ 
  tags = [], 
  maxVisible = 3,
  onTagClick,
}: TagDisplayProps) {
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className="flex items-center space-x-1">
      {visibleTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="text-xs cursor-pointer hover:bg-muted"
          onClick={() => onTagClick?.(tag)}
        >
          {tag.name}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}