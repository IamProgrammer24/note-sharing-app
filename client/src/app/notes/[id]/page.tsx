"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Check, Copy, ShieldAlert } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ShareLink = {
  url: string;
  shareType: "ONE_TIME" | "TIME_BASED";
  accessType: "PUBLIC" | "PASSWORD";
  expiresAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  createdAt: string;
};

type NoteDetailsResponse = {
  success: boolean;
  note: Note;
  shareLinks: ShareLink[];
  message?: string;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || "Unable to load note details";
  }

  return "Something went wrong";
}

function formatDate(value: string | null) {
  if (!value) return "Not applicable";

  return new Date(value).toLocaleString();
}

export default function NoteDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params?.id;
  const noteId = Array.isArray(rawId) ? rawId[0] : rawId;

  const hasLoadedRef = useRef(false);

  const [note, setNote] = useState<Note | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!noteId) {
      setError("Invalid note ID");
      setLoading(false);
      return;
    }

    const currentNoteId = noteId;

    async function loadNoteDetails() {
      try {
        const response = await api.get<NoteDetailsResponse>(
          `/api/notes/${encodeURIComponent(currentNoteId)}`,
        );

        setNote(response.data.note);
        setShareLink(response.data.shareLinks[0] ?? null);
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    loadNoteDetails();
  }, [noteId]);

  async function handleRevoke() {
    if (!noteId || !shareLink || shareLink.revokedAt) {
      return;
    }

    const currentNoteId = noteId;

    const confirmed = window.confirm(
      "Are you sure you want to revoke this share link?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setRevoking(true);
      setError("");

      await api.post(`/api/notes/${encodeURIComponent(currentNoteId)}/revoke`);

      setShareLink((current) =>
        current
          ? {
              ...current,
              revokedAt: new Date().toISOString(),
            }
          : current,
      );
    } catch (error: any) {
      setError(error.response?.data?.message || "Unable to revoke share link");
    } finally {
      setRevoking(false);
    }
  }

  async function copyShareLink() {
    if (!shareLink) return;

    await navigator.clipboard.writeText(shareLink.url);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  function getShareStatus() {
    if (!shareLink) return "No share link";
    if (shareLink.revokedAt) return "Revoked";
    if (shareLink.usedAt) return "Used";
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) <= new Date()) {
      return "Expired";
    }

    return "Active";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Loading note details...</p>
      </main>
    );
  }

  if (error && !note) {
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

  if (!note) {
    return null;
  }

  return (
    <main className="min-h-screen bg-muted/30 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => router.push("/notes/new")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to create note
        </Button>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Note details
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {note.title}
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage your note and its share link.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Note content</CardTitle>
            <CardDescription>
              Created on {formatDate(note.createdAt)}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="whitespace-pre-wrap break-words rounded-lg border bg-background p-5 leading-7">
              {note.content}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share link management</CardTitle>
            <CardDescription>
              Protected access keys are never displayed again.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {shareLink ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Share link</p>

                  <div className="flex gap-2">
                    <input
                      value={shareLink.url}
                      readOnly
                      className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyShareLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {copied && (
                    <p className="text-xs text-green-600">Link copied</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Share type</p>
                    <p className="mt-1 font-medium">
                      {shareLink.shareType === "ONE_TIME"
                        ? "One-time"
                        : "Time-based"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Access type</p>
                    <p className="mt-1 font-medium">
                      {shareLink.accessType === "PASSWORD"
                        ? "Password protected"
                        : "Public"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium">{getShareStatus()}</p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Successful views
                    </p>
                    <p className="mt-1 font-medium">{shareLink.viewCount}</p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Expires at</p>
                    <p className="mt-1 font-medium">
                      {formatDate(shareLink.expiresAt)}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Used at</p>
                    <p className="mt-1 font-medium">
                      {formatDate(shareLink.usedAt)}
                    </p>
                  </div>
                </div>

                {!shareLink.revokedAt && !shareLink.usedAt && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={revoking}
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    {revoking ? "Revoking..." : "Revoke share link"}
                  </Button>
                )}

                {shareLink.revokedAt && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    This share link was revoked and cannot be opened.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No share link found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
