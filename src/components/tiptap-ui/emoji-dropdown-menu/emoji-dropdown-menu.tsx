"use client";

import { type Editor, ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";

import { Button } from "@/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";

import "./emoji-dropdown-menu.scss";

export interface EmojiItem {
  name: string;
  emoji: string;
  fallbackImage?: string;
}

export interface EmojiDropdownMenuProps {
  editor: Editor | null;
  char?: string;
}

interface EmojiMenuListProps {
  items: EmojiItem[];
  selectedIndex: number;
  onSelect: (item: EmojiItem) => void;
}

function EmojiMenuList({ items, selectedIndex, onSelect }: EmojiMenuListProps) {
  if (items.length === 0) {
    return (
      <Card className="emoji-menu-card">
        <CardBody className="p-0">
          <div className="emoji-menu-empty">No emojis found</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="emoji-menu-card">
      <CardBody className="p-0">
        <div className="emoji-menu-items">
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;

            return (
              <Button
                key={item.name}
                type="button"
                data-style="ghost"
                data-selected={isSelected}
                className="emoji-menu-item"
                onClick={() => onSelect(item)}
                ref={(node) => {
                  if (isSelected && node) {
                    node.scrollIntoView({ block: "nearest" });
                  }
                }}
              >
                <span className="emoji-menu-emoji">
                  {item.fallbackImage ? (
                    <img src={item.fallbackImage} alt={item.name} />
                  ) : (
                    item.emoji
                  )}
                </span>
                <span className="emoji-menu-name">:{item.name}:</span>
              </Button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

export function EmojiDropdownMenu({ editor }: EmojiDropdownMenuProps) {
  if (!editor) return null;
  return null;
}

export function createEmojiSuggestion() {
  return {
    char: ":",
    allowSpaces: false,
    allowedPrefixes: null, // Allow : to trigger without needing a space before it
    
    items: ({ query, editor }: { query: string; editor: Editor }): EmojiItem[] => {
      const emojiExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "emoji"
      );

      if (!emojiExtension) {
        return [];
      }

      const emojis = emojiExtension.options.emojis || [];
      const forceFallbackImages = emojiExtension.options.forceFallbackImages || false;

      return emojis
        .filter((emoji: { name: string; shortcodes?: string[] }) => {
          const lowerQuery = query.toLowerCase();
          const matchesName = emoji.name.toLowerCase().includes(lowerQuery);
          const matchesShortcode = emoji.shortcodes?.some((sc: string) =>
            sc.toLowerCase().includes(lowerQuery)
          );
          return matchesName || matchesShortcode;
        })
        .slice(0, 10)
        .map((emoji: { name: string; emoji: string; fallbackImage?: string }) => ({
          name: emoji.name,
          emoji: emoji.emoji,
          fallbackImage: forceFallbackImages ? emoji.fallbackImage : undefined,
        }));
    },

    render: () => {
      let component: ReactRenderer<EmojiMenuListProps> | undefined;
      let popup: TippyInstance[] | undefined;
      let editorRef: Editor | undefined;

      return {
        onStart: (props: SuggestionProps) => {
          editorRef = props.editor;
          component = new ReactRenderer(EmojiMenuList, {
            props: {
              items: props.items as EmojiItem[],
              selectedIndex: 0,
              onSelect: (item: EmojiItem) => {
                props.editor
                  .chain()
                  .focus()
                  .deleteRange(props.range)
                  .insertContent(item.emoji)
                  .run();
              },
            },
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            maxWidth: "none",
            theme: "emoji-menu",
            offset: [0, 8],
            zIndex: 9999,
          });
        },

        onUpdate(props: SuggestionProps) {
          editorRef = props.editor;
          component?.updateProps({
            items: props.items as EmojiItem[],
            selectedIndex: 0,
            onSelect: (item: EmojiItem) => {
              props.editor
                .chain()
                .focus()
                .deleteRange(props.range)
                .insertContent(item.emoji)
                .run();
            },
          });

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }

          if (!component || !editorRef) {
            return false;
          }

          const currentProps = component.props as EmojiMenuListProps;
          const items = currentProps.items;
          let selectedIndex = currentProps.selectedIndex;

          if (props.event.key === "ArrowUp") {
            selectedIndex =
              selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
            component.updateProps({ ...currentProps, selectedIndex });
            return true;
          }

          if (props.event.key === "ArrowDown") {
            selectedIndex =
              selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
            component.updateProps({ ...currentProps, selectedIndex });
            return true;
          }

          if (props.event.key === "Enter") {
            const item = items[selectedIndex];
            if (item && editorRef) {
              editorRef
                .chain()
                .focus()
                .deleteRange(props.range)
                .insertContent(item.emoji)
                .run();
              return true;
            }
          }

          return false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
          editorRef = undefined;
        },
      };
    },
  };
}
