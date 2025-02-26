import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function calculateVolume(length: number, width: number, height: number): number {
  return length * width * height;
}

export const formatDimensions = (length: number, width: number, height: number) => {
  return `${length}" × ${width}" × ${height}"`;
};

export const BLOCK_TYPES = [
  "Single",
  "Double-A",
  "Double-B",
  "Triple-A",
  "Triple-B",
  "Triple-C",
];

export const PRODUCTION_STAGES = [
  "cutting",
  "grinding",
  "chemical_treatment",
  "polishing",
  "finished",
];

export function calculateCoverage(length: number, height: number, totalSlabs: number): number {
  // Direct calculation without conversion
  const area = length * height * totalSlabs;
  return Number(area.toFixed(1));
}

export const MACHINE_TYPES = ["Cutter", "Grinder", "Polisher"];

export const QUALITY_LEVELS = ["Premium", "Standard", "Economy"];

export function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    cutting: "text-blue-500",
    grinding: "text-yellow-500",
    chemical_treatment: "text-purple-500",
    polishing: "text-green-500",
    finished: "text-emerald-500",
  };
  return colors[stage] || "text-gray-500";
}

export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    in_progress: "bg-blue-500",
    completed: "bg-green-500",
    pending: "bg-yellow-500",
    failed: "bg-red-500",
    idle: "bg-gray-500",
  };
  return colors[status] || "bg-gray-500";
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(2)} tonnes`;
}
export const COLOR_OPTIONS = [
  "Pwhite Bala",
  "Pwhite Denda",
  "Cheema 99",
  "Devda Green",
  "Pearl Black",
  "Majestic Black (Kotada)",
  "R Black",
  "Kekri Black",
  "S White",
  "Tiger",
  "Baghera",
  "Commando",
  "Beejwar",
  "Paradisso",
  "Juniya",
  "Salari",
  "Crystal blue",
  "Khalda red",
  "Imperial red"
];