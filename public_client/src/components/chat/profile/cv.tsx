import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mail,
  MapPin,
  Phone,
  Globe,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Fingerprint,
} from "lucide-react";

// --- 1. LO SCHEMA DATI (Preciso e Intuitivo) ---

export interface CVSchema {
  personalInfo: {
    fullName: string;
    role: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    avatarUrl?: string; // Opzionale
    summary?: string; // Bio breve
  };
  experience: Array<{
    id: string;
    role: string;
    company: string;
    location?: string;
    startDate: string; // "YYYY-MM" o "Year"
    endDate?: string; // null/undefined = "Presente"
    description: string; // Supporta newline
    tags?: string[]; // Tecnologie usate
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[]; // Lista semplice di stringhe
  languages?: Array<{ name: string; level: string }>;
}

interface Props {
  data: CVSchema;
  className?: string;
}

// --- 2. IL COMPONENTE ---

export default function CV({ data, className }: Props) {
  const { personalInfo, experience, education, skills, languages } = data;

  return (
    <div className={cn("flex justify-center py-10 px-4", className)}>
      {/* Container "Foglio A4" */}
      <div className="relative w-full max-w-[900px] group perspective-[1000px]">
        {/* EFFETTO CARTA (Stacked Paper Background) */}
        {/* Foglio sottostante rotato leggermente */}
        <div className="absolute inset-0 bg-slate-200 rounded-[2px] shadow-sm transform rotate-1 translate-y-2 -z-20 border border-slate-300" />
        {/* Foglio sottostante dritto */}
        <div className="absolute inset-0 bg-slate-100 rounded-[2px] shadow-sm transform translate-y-1 -z-10 border border-slate-200" />

        {/* --- IL DOCUMENTO REALE --- */}
        <div className="relative bg-white rounded-[2px] shadow-xl border border-slate-200/60 overflow-hidden min-h-[1000px]">
          {/* DECORAZIONE TOP: "Archived File" */}
          <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
            <div className="border-2 border-slate-200 rounded px-2 py-1 rotate-[-10deg]">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                CONFIDENTIAL
              </span>
            </div>
          </div>

          {/* HEADER SECTION (Full Width) */}
          <div className="bg-slate-50/50 border-b border-slate-100 p-8 md:p-12 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-serif font-medium text-slate-900 tracking-tight">
                  {personalInfo.fullName}
                </h1>
                <p className="text-lg font-mono text-slate-500 uppercase tracking-wider">
                  {personalInfo.role}
                </p>

                {personalInfo.summary && (
                  <p className="max-w-xl text-sm text-slate-600 leading-relaxed font-light mt-4 italic border-l-2 border-slate-200 pl-4">
                    "{personalInfo.summary}"
                  </p>
                )}
              </div>

              {/* Box Contatti Rapidi (Top Right) */}
              <div className="flex flex-col gap-2 text-right md:items-end min-w-[200px]">
                <ContactRow icon={Mail} value={personalInfo.email} />
                {personalInfo.phone && (
                  <ContactRow icon={Phone} value={personalInfo.phone} />
                )}
                {personalInfo.location && (
                  <ContactRow icon={MapPin} value={personalInfo.location} />
                )}
                {personalInfo.website && (
                  <ContactRow
                    icon={Globe}
                    value={personalInfo.website}
                    isLink
                  />
                )}
              </div>
            </div>
          </div>

          {/* BODY GRID: Sidebar (Left) vs Main (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[600px]">
            {/* --- SIDEBAR (Skills, Education, Languages) --- */}
            <div className="bg-[#fcfcfc] border-r border-slate-100 p-8 space-y-10">
              {/* SKILLS */}
              <section>
                <SectionTitle icon={Award} title="Competenze" />
                <div className="flex flex-wrap gap-2 mt-4">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 font-normal rounded-md px-2.5 py-1 text-xs"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* EDUCATION */}
              <section>
                <SectionTitle icon={GraduationCap} title="Formazione" />
                <div className="mt-4 space-y-6">
                  {education.map((edu) => (
                    <div key={edu.id} className="relative group">
                      <div className="absolute -left-[33px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
                      <h4 className="text-sm font-semibold text-slate-800 leading-tight">
                        {edu.degree}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {edu.institution}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        {edu.year}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* LANGUAGES (Opzionale) */}
              {languages && languages.length > 0 && (
                <section>
                  <SectionTitle icon={Globe} title="Lingue" />
                  <ul className="mt-4 space-y-2">
                    {languages.map((lang, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0"
                      >
                        <span className="text-slate-700">{lang.name}</span>
                        <span className="text-slate-400 text-xs">
                          {lang.level}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* META DATA (ID) */}
              <div className="pt-10 mt-auto opacity-40">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-8 h-8 text-slate-300" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">
                      File ID
                    </span>
                    <span className="text-[10px] font-mono text-slate-800">
                      CV-{Math.floor(Math.random() * 100000)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* --- MAIN CONTENT (Experience) --- */}
            <div className="p-8 md:p-12 bg-white">
              <section className="h-full">
                <SectionTitle
                  icon={Briefcase}
                  title="Esperienza Professionale"
                  large
                />

                {/* TIMELINE CONTAINER */}
                <div className="mt-8 space-y-0 relative border-l border-slate-200 ml-2 md:ml-3">
                  {experience.map((job) => (
                    <div
                      key={job.id}
                      className="relative pl-8 md:pl-10 pb-12 last:pb-0 group"
                    >
                      {/* Timeline Dot (Pulsing if current) */}
                      <div
                        className={cn(
                          "absolute -left-[5px] md:-left-[6px] top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white transition-all duration-300",
                          !job.endDate
                            ? "bg-emerald-500 ring-4 ring-emerald-50" // Current job
                            : "bg-slate-300 group-hover:bg-slate-400", // Past job
                        )}
                      />

                      {/* Job Header */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-2">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-900 transition-colors">
                          {job.role}
                        </h3>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 whitespace-nowrap bg-slate-50 px-2 py-1 rounded">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {job.startDate} — {job.endDate || "Presente"}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        {job.company}
                        {job.location && (
                          <span className="text-slate-400 font-normal text-xs">
                            • {job.location}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-normal">
                        {job.description}
                      </div>

                      {/* Tech Tags */}
                      {job.tags && job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                          {job.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* End of Timeline Indicator */}
                  <div className="absolute -left-[3px] bottom-0 w-1.5 h-1.5 bg-slate-200 rounded-full" />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 3. SUB-COMPONENTS (Per pulizia codice) ---

function SectionTitle({
  icon: Icon,
  title,
  large,
}: {
  icon: any;
  title: string;
  large?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-slate-100 text-slate-600",
          large ? "w-8 h-8" : "w-6 h-6",
        )}
      >
        <Icon className={cn(large ? "w-4 h-4" : "w-3 h-3")} />
      </div>
      <h3
        className={cn(
          "font-bold text-slate-800 uppercase tracking-wider",
          large ? "text-sm" : "text-xs",
        )}
      >
        {title}
      </h3>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  isLink,
}: {
  icon: any;
  value: string;
  isLink?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-2 text-sm text-slate-600 group cursor-pointer justify-end">
      <span
        className={cn(
          "group-hover:text-slate-900 transition-colors",
          isLink && "underline decoration-slate-300 underline-offset-2",
        )}
      >
        {value.replace(/^https?:\/\//, "")}
      </span>
      <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
    </div>
  );

  if (isLink)
    return (
      <a href={value} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  return content;
}
