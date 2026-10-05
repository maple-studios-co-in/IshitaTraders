import { Mail, MessageCircle, MessageSquareText, MessagesSquare, Phone, type LucideIcon } from "lucide-react";

import { Badge, type BadgeTone } from "@/admin/components/ui/primitives";
import {
  leadEventLabels,
  messageChannelLabels,
  messageStatusLabels,
  type LeadEventType,
  type MessageChannel,
  type MessageStatus,
} from "@/admin/content/types";
import { formatPhone } from "@/admin/lib/format";
import { cn } from "@/lib/cn";

/** Inbox visuals shared by server pages and client tables (no server imports here). */

export const channelIcons: Record<MessageChannel, LucideIcon> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageSquareText,
  call: Phone,
  other: MessagesSquare,
};

const channelTones: Record<MessageChannel, string> = {
  whatsapp: "bg-leaf-600/12 text-leaf-700",
  email: "bg-brand-500/10 text-brand-600",
  sms: "bg-violet-50 text-violet-700",
  call: "bg-amber-100 text-amber-800",
  other: "bg-slate-100 text-slate-600",
};

export const statusTones: Record<MessageStatus, BadgeTone> = {
  new: "blue",
  open: "amber",
  replied: "leaf",
  closed: "slate",
  spam: "red",
};

export function ChannelIcon({ channel, className }: { channel: MessageChannel; className?: string }) {
  const Icon = channelIcons[channel];
  return (
    <span
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", channelTones[channel], className)}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

export function ChannelLabel({ channel }: { channel: MessageChannel }) {
  return (
    <span className="inline-flex items-center gap-2 font-medium whitespace-nowrap text-slate-700">
      <ChannelIcon channel={channel} />
      {messageChannelLabels[channel]}
    </span>
  );
}

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  return (
    <Badge tone={statusTones[status]} dot>
      {messageStatusLabels[status]}
    </Badge>
  );
}

const leadEventIcons: Record<LeadEventType, LucideIcon> = { whatsapp: MessageCircle, call: Phone, email: Mail };
const leadEventChannel: Record<LeadEventType, MessageChannel> = { whatsapp: "whatsapp", call: "call", email: "email" };

export function LeadEventLabel({ type }: { type: LeadEventType }) {
  const Icon = leadEventIcons[type];
  return (
    <span className="inline-flex items-center gap-2 font-medium whitespace-nowrap text-slate-700">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          channelTones[leadEventChannel[type]],
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      {leadEventLabels[type]}
    </span>
  );
}

/** Who a message is from, for headings and lists. */
export function contactTitle(message: { contactName: string; contactPhone: string; contactEmail: string }) {
  return (
    message.contactName ||
    (message.contactPhone ? formatPhone(message.contactPhone) : "") ||
    message.contactEmail ||
    "Unknown contact"
  );
}
