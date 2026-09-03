import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOPICS, TOPIC_LABELS } from "@/lib/trivia";

const schema = z.object({
  topic: z.enum(TOPICS, { required_error: "Pick a topic to continue" }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trivia Pack — pick your topic" },
      {
        name: "description",
        content: "Choose Movies, History, or Science and unlock a 5-question trivia pack for $1.",
      },
      { property: "og:title", content: "Trivia Pack — pick your topic" },
      {
        property: "og:description",
        content: "Choose Movies, History, or Science and unlock a 5-question trivia pack for $1.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link to="/my-packs">My Packs</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trivia Pack</CardTitle>
          <CardDescription>
            Pick a topic and unlock a pack of 5 questions for $1.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit((values) =>
                navigate({ to: "/checkout", search: { topic: values.topic } }),
              )}
            >
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a topic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TOPICS.map((topic) => (
                          <SelectItem key={topic} value={topic}>
                            {TOPIC_LABELS[topic]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Each pack contains 5 hand-picked questions.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
