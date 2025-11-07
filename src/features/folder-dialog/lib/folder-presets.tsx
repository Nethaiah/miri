// src/features/notes/data/folderPresets.ts
export type Preset = {
  name: string
  emoji: string
  color?: string
}

const PRESETS: Record<string, Preset[]> = {
  Notes: [
    { name: "Quick Notes", emoji: "✍️", color: "bg-yellow-200" },
    { name: "Archive", emoji: "🗄️", color: "bg-slate-200" },
    { name: "Ideas", emoji: "💡", color: "bg-amber-200" },
  ],
  Journal: [
    { name: "Daily Logs", emoji: "📆", color: "bg-sky-200" },
    { name: "Reflections", emoji: "💭", color: "bg-rose-100" },
    { name: "Gratitude", emoji: "🙏", color: "bg-green-100" },
  ],
  Kanban: [
    { name: "Backlog", emoji: "📥", color: "bg-indigo-100" },
    { name: "In Progress", emoji: "🔧", color: "bg-orange-100" },
    { name: "Done", emoji: "✅", color: "bg-emerald-100" },
  ],
}

export default PRESETS