import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Not found</CardTitle>
          <CardDescription>
            Halaman atau entri ini tidak ada — atau bukan milikmu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="touch" className="w-full" render={<Link href="/" />}>
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
