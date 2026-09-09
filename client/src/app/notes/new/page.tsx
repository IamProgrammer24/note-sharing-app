"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Link as LinkIcon } from "lucide-react";

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

export default function NewNotePage() {
  return (
    <main className="min-h-screen bg-muted/30">
      {/* <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-5">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </header> */}

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
              You can configure the sharing rules after writing your note.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Project credentials" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your note here..."
                className="min-h-48 resize-y"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="share-type">Share type</Label>

                <select
                  id="share-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue="time-based"
                >
                  <option value="time-based">Time-based access</option>
                  <option value="one-time">One-time access</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-type">Access type</Label>

                <select
                  id="access-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue="password"
                >
                  <option value="password">Password protected</option>
                  <option value="public">Public access</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry date and time</Label>
              <Input id="expiry" type="datetime-local" />
              <p className="text-xs text-muted-foreground">
                The share link will stop working after this time.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 text-primary" />

                <div>
                  <h3 className="font-medium">Secure sharing</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A secure link and dynamic access key will be generated after
                    you create this note.
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" size="lg">
              <LinkIcon className="mr-2 h-4 w-4" />
              Create secure link
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
