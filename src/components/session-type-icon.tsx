import { Building2, Phone, Video, type LucideProps } from "lucide-react";
import type { SessionType } from "@/domain/session-types";

const icons = { in_person: Building2, video: Video, phone: Phone } as const;

export function SessionTypeIcon({
  type,
  ...props
}: { type: SessionType } & LucideProps) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" {...props} />;
}
