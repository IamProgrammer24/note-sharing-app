"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import axios from "axios";
import { ArrowLeft, Check, Copy, Link as LinkIcon, Lock } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";

type CreateNoteResponse = {
  success: boolean;
  message: string;
  note: {
    id: string;
    title: string;
    createdAt: string;
  };
  share: {
    url: string;
    accessKey: string | null;
    shareType: string;
    accessType: string;
    expiresAt: string | null;
  };
};

export default function NewNotePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shareType, setShareType] = useState("time-based");
  const [accessType, setAccessType] = useState("password");
  const [expiresAt, setExpiresAt] = useState("");

  const [result, setResult] = useState<CreateNoteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedValue, setCopiedValue] = useState("");

  const isTimeBased = shareType === "time-based";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setResult(null);

    if (isTimeBased && !expiresAt) {
      setErrorMessage("Please select an expiry date and time");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post<CreateNoteResponse>("/api/notes", {
        title,
        content,
        shareType,
        accessType,
        expiresAt:
          isTimeBased && expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      setResult(response.data);
      setTitle("");
      setContent("");
      setExpiresAt("");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Unable to create the note",
        );
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(label);

    setTimeout(() => {
      setCopiedValue("");
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-5">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            New note
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Create a secure note
          </h1>

          <p className="mt-2 text-muted-foreground">
            Write your note and choose how people can access it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Note details</CardTitle>
            <CardDescription>
              A secure sharing link will be generated after submission.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>

                <Input
                  id="title"
                  placeholder="e.g. Project credentials"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>

                <Textarea
                  id="content"
                  placeholder="Write your note here..."
                  className="min-h-48 resize-y"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  required
                  maxLength={100000}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="share-type">Share type</Label>

                  <select
                    id="share-type"
                    value={shareType}
                    onChange={(event) => {
                      const value = event.target.value;

                      setShareType(value);

                      if (value === "one-time") {
                        setExpiresAt("");
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="time-based">Time-based access</option>
                    <option value="one-time">One-time access</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-type">Access type</Label>

                  <select
                    id="access-type"
                    value={accessType}
                    onChange={(event) => setAccessType(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="password">Password protected</option>
                    <option value="public">Public access</option>
                  </select>
                </div>
              </div>

              {isTimeBased ? (
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry date and time</Label>

                  <Input
                    id="expiry"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    required
                  />

                  <p className="text-xs text-muted-foreground">
                    The link will stop working after this time.
                  </p>
                </div>
              ) : (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  This link will automatically expire after the first successful
                  access.
                </p>
              )}

              {errorMessage && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {isSubmitting
                  ? "Creating secure link..."
                  : "Create secure link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="mt-6 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                Note created successfully
              </CardTitle>

              <CardDescription>
                Save the access details now. The access key is shown only once.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Share link</Label>

                <div className="flex gap-2">
                  <Input value={result.share.url} readOnly />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(result.share.url, "link")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {copiedValue === "link" && (
                  <p className="text-xs text-green-600">Link copied</p>
                )}
              </div>

              {result.share.accessKey && (
                <div className="space-y-2">
                  <Label>Access key</Label>

                  <div className="flex gap-2">
                    <Input value={result.share.accessKey} readOnly />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(result.share.accessKey!, "key")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {copiedValue === "key" && (
                    <p className="text-xs text-green-600">Access key copied</p>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                <Lock className="mt-0.5 h-5 w-5 text-primary" />

                <p className="text-sm text-muted-foreground">
                  Keep the access key private. Anyone with both the link and key
                  can open the protected note.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
