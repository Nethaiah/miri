// 🪶 Preset folders for different categories

export type FolderPreset = {
  emoji: string
  name: string
}

export const FOLDER_PRESETS: Record<string, FolderPreset[]> = {
  Notes: [
    { emoji: "💡", name: "Personal" },
    { emoji: "💼", name: "Work" },
    { emoji: "📚", name: "Study" },
    { emoji: "🎯", name: "Goals" },
    { emoji: "📝", name: "Ideas" },
    { emoji: "🏠", name: "Home" },
    { emoji: "💰", name: "Finance" },
    { emoji: "🏋️", name: "Fitness" },
    { emoji: "🍳", name: "Recipes" },
    { emoji: "✈️", name: "Travel" },
  ],
  Journal: [
    { emoji: "📆", name: "Daily Logs" },
    { emoji: "💭", name: "Reflections" },
    { emoji: "🕊️", name: "Gratitude" },
    { emoji: "🌟", name: "Achievements" },
    { emoji: "💪", name: "Personal Growth" },
    { emoji: "❤️", name: "Relationships" },
    { emoji: "🧘", name: "Mindfulness" },
    { emoji: "😊", name: "Mood Tracker" },
    { emoji: "🎨", name: "Creative Ideas" },
    { emoji: "📖", name: "Reading Log" },
  ],
  Kanban: [
    { emoji: "🚀", name: "Projects" },
    { emoji: "🧠", name: "Learning" },
    { emoji: "🎯", name: "Goals" },
    { emoji: "💻", name: "Development" },
    { emoji: "🎨", name: "Design" },
    { emoji: "📱", name: "Mobile App" },
    { emoji: "🌐", name: "Website" },
    { emoji: "🛠️", name: "Maintenance" },
    { emoji: "🔬", name: "Research" },
    { emoji: "📊", name: "Marketing" },
  ],
}