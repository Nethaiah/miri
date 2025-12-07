import type { Range } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { BlockquoteIcon } from "@/components/tiptap-icons/blockquote-icon";
import { CodeBlockIcon } from "@/components/tiptap-icons/code-block-icon";
// Icons
import { HeadingOneIcon } from "@/components/tiptap-icons/heading-one-icon";
import { HeadingThreeIcon } from "@/components/tiptap-icons/heading-three-icon";
import { HeadingTwoIcon } from "@/components/tiptap-icons/heading-two-icon";
import { ListIcon } from "@/components/tiptap-icons/list-icon";
import { ListOrderedIcon } from "@/components/tiptap-icons/list-ordered-icon";
import { ListTodoIcon } from "@/components/tiptap-icons/list-todo-icon";
import type { SuggestionItem } from "@/components/tiptap-ui-utils/suggestion-menu";

export type SlashMenuItemType =
  | "text"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bullet_list"
  | "ordered_list"
  | "task_list"
  | "quote"
  | "code_block"
  | "separator";

export interface SlashMenuConfig {
  enabledItems?: SlashMenuItemType[];
  customItems?: SuggestionItem[];
  itemGroups?: Record<string, string>;
  showGroups?: boolean;
}

export function getSlashMenuItems(
  editor: Editor,
  config?: SlashMenuConfig,
): SuggestionItem[] {
  const allItems: SuggestionItem[] = [
    {
      title: "Text",
      badge: "T",
      group: "Write",
      keywords: ["paragraph", "plain", "text"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run();
      },
    },
    {
      title: "Heading 1",
      badge: HeadingOneIcon,
      group: "Structure",
      keywords: ["h1", "title"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setHeading({ level: 1 })
          .run();
      },
    },
    {
      title: "Heading 2",
      badge: HeadingTwoIcon,
      group: "Structure",
      keywords: ["h2", "subtitle"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setHeading({ level: 2 })
          .run();
      },
    },
    {
      title: "Heading 3",
      badge: HeadingThreeIcon,
      group: "Structure",
      keywords: ["h3"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setHeading({ level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      badge: ListIcon,
      group: "Lists",
      keywords: ["unordered", "ul"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      badge: ListOrderedIcon,
      group: "Lists",
      keywords: ["ordered", "ol", "1"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Task List",
      badge: ListTodoIcon,
      group: "Lists",
      keywords: ["todo", "checkbox", "check"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Blockquote",
      badge: BlockquoteIcon,
      group: "Special",
      keywords: ["quote", "citation"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setBlockquote().run();
      },
    },
    {
      title: "Code Block",
      badge: CodeBlockIcon,
      group: "Special",
      keywords: ["code", "programming", "snippet"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setCodeBlock().run();
      },
    },
    {
      title: "Separator",
      badge: "—",
      group: "Special",
      keywords: ["horizontal", "rule", "divider", "hr"],
      onSelect: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  if (config?.customItems) {
    allItems.push(...config.customItems);
  }

  return allItems;
}
