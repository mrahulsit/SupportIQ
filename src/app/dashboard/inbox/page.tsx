import type { Metadata } from "next";
import { Headset, MessagesSquare, Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxIndex() {
  return (
    <div className="hidden h-full items-center justify-center p-8 md:flex">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <MessagesSquare className="size-5" />
        </div>
        <p className="font-medium">Select a conversation</p>
        <p className="mt-1 text-sm text-slate-500">Chats that need a person are pinned to the top and sorted by AI-assigned priority.</p>
        <div className="mt-6 grid gap-3 text-left text-sm sm:grid-cols-2">
          <div className="card p-4">
            <Headset className="size-4 text-amber-600" />
            <p className="mt-2 font-medium">Take over</p>
            <p className="text-slate-500">Reply and the AI steps back. Hand it back to the AI any time.</p>
          </div>
          <div className="card p-4">
            <Sparkles className="size-4 text-indigo-600" />
            <p className="mt-2 font-medium">Draft with AI</p>
            <p className="text-slate-500">Get a suggested reply from your knowledge base, edit, then send.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
