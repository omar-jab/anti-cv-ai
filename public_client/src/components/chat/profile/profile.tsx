import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mail,
  MapPin,
  Phone,
  Globe,
  Fingerprint,
  Link as LinkIcon,
} from "lucide-react";

export interface UserProfileData {
  imageUrl?: string;
  name: string;
  surname: string;
  role: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  bio?: string;
  status?: "active" | "away" | "busy";
  id_code?: string;
}

interface Props {
  user: UserProfileData;
  className?: string;
}

export default function Profile({ user, className }: Props) {
  const statusColor =
    user.status === "active"
      ? "bg-emerald-500 ring-emerald-100"
      : user.status === "busy"
        ? "bg-red-500 ring-red-100"
        : "bg-amber-500 ring-amber-100";

  return (
    // Container stretto (max-w-sm) per forzare verticalità
    <div
      className={cn("relative w-full max-w-[340px] mx-auto pt-8", className)}
    >
      {/* 1. IL FILO DI SOSPENSIONE (The Wire) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-0">
        {/* Il filo che sale all'infinito (o al contenitore padre) */}
        <div className="w-px h-10 bg-gradient-to-b from-slate-200 to-slate-400" />
        {/* Il nodo di giunzione */}
        <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white shadow-sm z-10" />
        {/* Il gancio fisico alla card */}
        <div className="w-px h-4 bg-slate-400" />
      </div>

      {/* 2. LA CARD VERTICALE */}
      <div className="relative group z-10">
        {/* Effetto Stacked Paper (Sfondo) */}
        <div className="absolute inset-0 top-1.5 left-1.5 rounded-2xl bg-slate-100 border border-slate-200 -z-10 transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-1" />

        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* HEADER: Identità */}
          <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center bg-slate-50/30 border-b border-slate-50">
            {/* Avatar con Anello di Stato */}
            <div className="relative mb-4">
              <div className="p-1 bg-white rounded-full shadow-sm border border-slate-100">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user.imageUrl} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 text-slate-400 text-xl font-serif">
                    {user.name[0]}
                    {user.surname[0]}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Indicatore Stato */}
              <div
                className={cn(
                  "absolute bottom-1 right-1 w-5 h-5 border-2 border-white rounded-full ring-2 shadow-sm",
                  statusColor,
                )}
                title={`Status: ${user.status}`}
              />
            </div>

            {/* Typography */}
            <h2 className="text-xl font-serif text-slate-900 leading-tight">
              {user.name}{" "}
              <span className="font-light text-slate-600">{user.surname}</span>
            </h2>

            <Badge
              variant="outline"
              className="mt-2 bg-white text-slate-500 border-slate-200 font-mono text-[10px] tracking-widest uppercase py-0.5 px-2"
            >
              {user.role}
            </Badge>
          </div>

          {/* BODY: Dati e Contenuto */}
          <div className="p-6 space-y-6">
            {/* Bio "Quote" style */}
            {user.bio && (
              <div className="relative pl-3 border-l-2 border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed italic font-light">
                  "{user.bio}"
                </p>
              </div>
            )}

            {/* Lista Contatti Verticale */}
            <div className="space-y-3">
              <ContactItem
                icon={Mail}
                label="Email"
                value={user.email}
                href={`mailto:${user.email}`}
              />

              {user.phone && (
                <ContactItem
                  icon={Phone}
                  label="Phone"
                  value={user.phone}
                  href={`tel:${user.phone}`}
                />
              )}

              {user.website && (
                <ContactItem
                  icon={Globe}
                  label="Web"
                  value={user.website.replace(/^https?:\/\//, "")}
                  href={user.website}
                  isLink
                />
              )}

              {user.location && (
                <ContactItem icon={MapPin} label="Base" value={user.location} />
              )}
            </div>
          </div>

          {/* FOOTER: Technical ID */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 opacity-50">
              <Fingerprint className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                ID: {user.id_code || "UNK-00"}
              </span>
            </div>

            {/* Visual Decorative Barcode-ish */}
            <div className="flex gap-0.5 opacity-20">
              <div className="w-px h-3 bg-slate-800" />
              <div className="w-0.5 h-3 bg-slate-800" />
              <div className="w-px h-3 bg-slate-800" />
              <div className="w-1 h-3 bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Component per le righe dei contatti
function ContactItem({
  icon: Icon,
  label,
  value,
  href,
  isLink,
}: {
  icon: any;
  label: string;
  value: string;
  href?: string;
  isLink?: boolean;
}) {
  const content = (
    <div className="flex items-center justify-between w-full group/row">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover/row:border-slate-200 group-hover/row:bg-white transition-colors">
          <Icon className="w-3.5 h-3.5 text-slate-400 group-hover/row:text-slate-600" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider leading-none mb-0.5">
            {label}
          </span>
          <span
            className={cn(
              "text-xs font-medium text-slate-700 truncate block max-w-[180px]",
              isLink &&
                "group-hover/row:text-blue-600 group-hover/row:underline decoration-blue-200 underline-offset-2",
            )}
          >
            {value}
          </span>
        </div>
      </div>

      {/* Freccina esterna che appare solo se è un link */}
      {(href || isLink) && (
        <LinkIcon className="w-3 h-3 text-slate-300 opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-1 group-hover/row:translate-x-0" />
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={isLink ? "_blank" : undefined}
        rel={isLink ? "noreferrer" : undefined}
        className="block w-full"
      >
        {content}
      </a>
    );
  }

  return content;
}
