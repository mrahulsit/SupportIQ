import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxIndex() {
  return (
    <div className="hidden h-full items-center justify-center md:flex">
      <EmptyState icon={<MessagesSquare className="size-5" />} title="Select a conversation">
        Conversations that need a human are pinned to the top, sorted by AI-assigned priority.
      </EmptyState>
    </div>
  );
}
