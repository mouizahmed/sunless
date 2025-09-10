"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { glossaryApi } from "@/lib/api";
import { Glossary } from "@/types/glossary";
import { BookOpen, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

interface GlossarySelectorProps {
  selectedGlossary: Glossary | null;
  onGlossaryChange: (glossary: Glossary | null) => void;
  title?: string;
  description?: string;
  className?: string;
}

export function GlossarySelector({
  selectedGlossary,
  onGlossaryChange,
  title = "Glossary",
  description = "Select a glossary to improve transcription accuracy",
  className
}: GlossarySelectorProps) {
  const { getToken } = useAuth();
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [showGlossarySelector, setShowGlossarySelector] = useState(false);
  const [glossariesLoading, setGlossariesLoading] = useState(false);
  // Load glossaries on component mount
  useEffect(() => {
    const loadGlossaries = async () => {
      setGlossariesLoading(true);
      try {
        const token = await getToken();
        if (token) {
          const response = await glossaryApi.getGlossaries(token);
          setGlossaries(response.glossaries || []);
        }
      } catch (error) {
        console.error('Failed to load glossaries:', error);
        toast.error('Failed to load glossaries');
      } finally {
        setGlossariesLoading(false);
      }
    };
    
    loadGlossaries();
  }, [getToken]);

  const handleGlossarySelect = (glossaryId: string | null) => {
    const glossary = glossaries.find(g => g.id === glossaryId) || null;
    onGlossaryChange(glossary);
    setShowGlossarySelector(false);
  };

  const displayText = selectedGlossary?.name || "No glossary selected";

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{displayText}</span>
              </div>
            </div>
            <Dialog open={showGlossarySelector} onOpenChange={setShowGlossarySelector}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Select
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Glossary</DialogTitle>
                  <DialogDescription>
                    Choose a glossary to improve transcription accuracy for specific terms
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  {glossariesLoading ? (
                    <div className="space-y-2 py-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2 p-2">
                          <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 bg-muted rounded flex-1 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : glossaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No glossaries available</p>
                      <p className="text-sm">Create a glossary first to improve transcription accuracy</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-4">
                        {/* No glossary option */}
                        <div
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                            !selectedGlossary 
                              ? 'bg-primary/5 border-primary/20' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleGlossarySelect(null)}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            !selectedGlossary 
                              ? 'bg-primary border-primary' 
                              : 'border-muted-foreground/30'
                          }`}>
                            {!selectedGlossary && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">No Glossary</div>
                            <div className="text-xs text-muted-foreground">
                              Transcribe without glossary assistance
                            </div>
                          </div>
                        </div>

                        {glossaries.map((glossary) => {
                          const isSelected = selectedGlossary?.id === glossary.id;
                          return (
                            <div
                              key={glossary.id}
                              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-primary/5 border-primary/20' 
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => handleGlossarySelect(glossary.id)}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-primary border-primary' 
                                  : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{glossary.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {glossary.item_count || 0} terms
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}