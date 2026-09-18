"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render gagal:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            Halaman ini gagal dimuat. Datamu tidak terpengaruh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">ref: {error.digest}</p>
          ) : null}
          <Button size="touch" onClick={reset} className="w-full md:w-auto">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
