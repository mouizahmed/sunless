"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Languages, Users, FunnelX, Brain } from "lucide-react";
import { TranscriptionConfig } from "@/types/transcription";

interface TranscriptionSettingsProps {
  settings: TranscriptionConfig;
  onSettingsChange: (settings: TranscriptionConfig) => void;
  title?: string;
  description?: string;
  showModelSelection?: boolean;
  showLanguageSelection?: boolean;
  showSpeakerDetection?: boolean;
  showFillerDetection?: boolean;
  languageOptions?: Array<{ value: string; label: string }>;
  className?: string;
}

const MODEL_OPTIONS = [
  {
    value: "nova-3",
    label: "Nova-3 General",
    description: "Highest performance, best for everyday audio",
  },
  {
    value: "nova-3-medical",
    label: "Nova-3 Medical",
    description: "Optimized for medical vocabulary",
  },
  {
    value: "nova-2",
    label: "Nova-2 General",
    description: "Enhanced entity recognition for everyday audio",
  },
  {
    value: "nova-2-meeting",
    label: "Nova-2 Meeting",
    description: "Conference rooms, multiple speakers",
  },
  {
    value: "nova-2-phonecall",
    label: "Nova-2 Phonecall",
    description: "Low-bandwidth phone calls",
  },
  {
    value: "nova-2-voicemail",
    label: "Nova-2 Voicemail",
    description: "Single speaker, low-bandwidth clips",
  },
  {
    value: "nova-2-finance",
    label: "Nova-2 Finance",
    description: "Finance vocabulary, earnings calls",
  },
  {
    value: "nova-2-conversationalai",
    label: "Nova-2 Conversational AI",
    description: "Human-to-bot conversations, IVR",
  },
  {
    value: "nova-2-video",
    label: "Nova-2 Video",
    description: "Audio from video sources",
  },
  {
    value: "nova-2-medical",
    label: "Nova-2 Medical",
    description: "Medical vocabulary",
  },
  {
    value: "nova-2-drivethru",
    label: "Nova-2 Drive-thru",
    description: "Drive-thru audio",
  },
  {
    value: "nova-2-automotive",
    label: "Nova-2 Automotive",
    description: "Automotive vocabulary",
  },
  {
    value: "nova-2-atc",
    label: "Nova-2 Air Traffic Control",
    description: "Air traffic control audio",
  },
];

const DEFAULT_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
  { value: "nl", label: "Dutch" },
  { value: "da", label: "Danish" },
  { value: "sv", label: "Swedish" },
];

export function TranscriptionSettings({
  settings,
  onSettingsChange,
  title = "Transcription Settings",
  description = "Configure how your files should be transcribed",
  showModelSelection = true,
  showLanguageSelection = true,
  showSpeakerDetection = true,
  languageOptions = DEFAULT_LANGUAGE_OPTIONS,
  showFillerDetection = true,
  className,
}: TranscriptionSettingsProps) {
  const updateSetting = <K extends keyof TranscriptionConfig>(
    key: K,
    value: TranscriptionConfig[K],
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className={className}>
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* Model Selection */}
            {showModelSelection && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Transcription Model
                </Label>
                <Select
                  value={settings.model}
                  onValueChange={(value) => updateSetting("model", value)}
                >
                  <SelectTrigger className="min-h-[5rem] sm:min-h-[4rem]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-w-[calc(100vw-2rem)] max-h-[280px] overflow-hidden"
                    position="popper"
                    sideOffset={4}
                    alignOffset={0}
                    avoidCollisions
                  >
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="
                        relative
                        flex items-center gap-2
                        w-full
                        py-3 pr-3 pl-9
                        min-h-[4rem]
                        data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground
                      "
                      >
                        <div className="flex flex-col items-start space-y-1 w-full">
                          <span className="font-medium text-sm">
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-normal break-words leading-relaxed text-left">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Language Selection */}
            {showLanguageSelection && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Language
                </Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => updateSetting("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Speaker Detection */}
          {showSpeakerDetection && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Speaker Detection</p>
                  <p className="text-sm text-muted-foreground">
                    Identify and label different speakers in the transcript
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.speakerDetection}
                onCheckedChange={(checked) =>
                  updateSetting("speakerDetection", checked)
                }
              />
            </div>
          )}

          {showFillerDetection && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FunnelX className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Filler Detection</p>
                  <p className="text-sm text-muted-foreground">
                    Identify and remove filler words in the transcript
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.fillerDetection}
                onCheckedChange={(checked) =>
                  updateSetting("fillerDetection", checked)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
