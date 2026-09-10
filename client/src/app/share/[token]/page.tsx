"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Note = {
  id: string;
  title: string;
  content: string;
};

type ShareResponse = {
  success: boolean;
  requiresPassword?: boolean;
  message?: string;
  note?: Note;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || "Unable to access this share link";
  }

  return "Something went wrong";
}

export default function SharePage() {
  const params = useParams();
  const rawToken = params?.token;

  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const hasLoadedRef = useRef(false);

  const [note, setNote] = useState<Note | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    const shareToken = token;

    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;

    async function loadShareLink() {
      try {
        const response = await api.get<ShareResponse>(
          `/api/share/${encodeURIComponent(shareToken)}`,
        );

        if (response.data.requiresPassword) {
          setRequiresPassword(true);
        } else if (response.data.note) {
          setNote(response.data.note);
        } else {
          setError("No note was returned");
        }
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    loadShareLink();
  }, [token]);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Invalid share link");
      return;
    }

    const shareToken = token;

    if (!password.trim()) {
      setError("Please enter the protected key");
      return;
    }

    try {
      setUnlocking(true);
      setError("");

      const response = await api.post<ShareResponse>(
        `/api/share/${encodeURIComponent(shareToken)}/unlock`,
        {
          password,
        },
      );

      if (response.data.note) {
        setNote(response.data.note);
        setRequiresPassword(false);
        setPassword("");
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Loading shared note...</p>
      </main>
    );
  }

  if (error && !requiresPassword) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to open note</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (requiresPassword) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Protected note</CardTitle>
            <CardDescription>
              Enter the protected key to view this note.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Protected key</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter protected key"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={unlocking}>
                {unlocking ? "Unlocking..." : "Unlock note"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">No note available.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{note.title}</CardTitle>
            <CardDescription>
              Shared securely through Note Sharing App
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="whitespace-pre-wrap break-words rounded-lg border bg-background p-5 leading-7">
              {note.content}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
