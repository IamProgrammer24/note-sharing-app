"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, Shield, Zap } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import Link from "next/link";

type ApiResponse = {
  success: boolean;
  message: string;
};

export default function Home() {
  const [apiStatus, setApiStatus] = useState("Checking server...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await api.get<ApiResponse>("/");
        setApiStatus(response.data.message);
      } catch {
        setApiStatus("Unable to connect to the server");
      } finally {
        setIsLoading(false);
      }
    };

    checkServer();
  }, []);

  const isServerRunning = apiStatus === "Note Sharing API is running";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">NoteShare</h1>
            <p className="text-xs text-muted-foreground">Secure note sharing</p>
          </div>

          <Button variant="outline">Sign in</Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Private by design
          </p>

          <h2 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            Share information securely, for exactly as long as you want.
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Create protected notes with expiring links, password access, and
            one-time viewing. Simple for you. Secure for everyone.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/notes/new">
              <Button size="lg">
                Create a note
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Button size="lg" variant="outline">
              Learn more
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <FeatureCheck>Protected sharing</FeatureCheck>
            <FeatureCheck>Automatic expiry</FeatureCheck>
            <FeatureCheck>One-time access</FeatureCheck>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>

            <CardTitle>Built for sensitive notes</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title="Controlled access"
              description="Choose public or password-protected sharing."
            />

            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Automatic expiry"
              description="Links stop working after their chosen lifetime."
            />

            <Feature
              icon={<Check className="h-5 w-5" />}
              title="Reliable tracking"
              description="View counts update only after successful access."
            />
          </CardContent>
        </Card>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-muted-foreground">
          Backend status:{" "}
          <span
            className={
              isLoading
                ? "font-medium text-yellow-600"
                : isServerRunning
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
            }
          >
            {apiStatus}
          </span>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 text-primary">{icon}</div>

      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeatureCheck({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary" />
      {children}
    </span>
  );
}
