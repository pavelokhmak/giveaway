"use client";

import { Camera, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GiveawayFormProps {
  authError?: string;
}

export function GiveawayForm({ authError }: GiveawayFormProps) {
  return (
    <div className="w-full max-w-sm space-y-4">
      {authError && (
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="size-4" />
          <AlertTitle>Не вдалося увійти</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <Button asChild size="lg" className="w-full">
        <a href="/api/auth/instagram/login">
          <Camera className="size-4" />
          Увійти через Instagram
        </a>
      </Button>
    </div>
  );
}
