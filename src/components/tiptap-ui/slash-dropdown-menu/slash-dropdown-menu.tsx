"use client";

import { type Editor, ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";

import { Button } from "@/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";
import {
  filterSuggestionItems,
  type SuggestionItem,
} from "@/components/tiptap-ui-utils/suggestion-menu";
import { getSlashMenuItems, type SlashMenuConfig } from "./slash-menu-items";

import "./slash-dropdown-menu.scss";

export interface SlashDropdownMenuProps {
  editor: Editor | null;
  config?: SlashMenuConfig;
}

interface SlashMenuListProps {
  items: SuggestionItem[];
  selectedIndex: number;
  onSelect: (item: SuggestionItem) => void;
}

function SlashMenuList({ items, selectedIndex, onSelect }: SlashMenuListProps) {
  const showGroups = true;
  const groups: Record<string, SuggestionItem[]> = {};

  items.forEach((item) => {
    const group = item.group || "Other";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  });

  let globalIndex = 0;

  return (
    <Card className="slash-menu-card">
      <CardBody className="p-0">
        {Object.entries(groups).map(([groupName, groupItems]) => (
          <div key={groupName} className="slash-menu-group">
            {showGroups && (
              <div className="slash-menu-group-label">{groupName}</div>
            )}
            <div className="slash-menu-items">
              {groupItems.map((item) => {
                const itemIndex = globalIndex++;
                const isSelected = itemIndex === selectedIndex;
                const Icon = item.badge;

                return (
                  <Button
                    key={item.title}
                    type="button"
                    data-style="ghost"
                    data-selected={isSelected}
                    className="slash-menu-item"
                    onClick={() => onSelect(item)}
                    // Auto-scroll logic
                    ref={(node) => {
                      if (isSelected && node) {
                        node.scrollIntoView({ block: "nearest" });
                      }
                    }}
                  >
                    {typeof Icon === "string" ? (
                      <span className="slash-menu-icon-text">{Icon}</span>
                    ) : Icon ? (
                      <div className="slash-menu-icon">
                        {/* Reduced size to 16px to fix "too big" issue */}
                        <Icon strokeWidth={1.5} size={16} />
                      </div>
                    ) : null}
                    <div className="slash-menu-content">
                      <div className="slash-menu-title">{item.title}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function SlashDropdownMenu({ editor, config }: SlashDropdownMenuProps) {
  if (!editor) return null;
  return null;
}

export function createSlashMenuSuggestion(config?: SlashMenuConfig) {
  return {
    items: ({ query, editor }: { query: string; editor: Editor }) => {
      const allItems = getSlashMenuItems(editor, config);
      const filteredItems = filterSuggestionItems(allItems, query);
      return filteredItems;
    },

    render: () => {
      let component: ReactRenderer<SlashMenuListProps> | undefined;
      let popup: TippyInstance[] | undefined;
      let editorRef: Editor | undefined;

      return {
        onStart: (props: SuggestionProps) => {
          editorRef = props.editor;
          component = new ReactRenderer(SlashMenuList, {
            props: {
              items: props.items as SuggestionItem[],
              selectedIndex: 0,
              onSelect: (item: SuggestionItem) => {
                item.onSelect({
                  editor: props.editor,
                  range: props.range,
                  context: item.context,
                });
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
            theme: "slash-menu",
            // Small offset to separate cursor from menu slightly
            offset: [0, 8], 
            zIndex: 9999,
          });
        },

        onUpdate(props: SuggestionProps) {
          editorRef = props.editor;
          component?.updateProps({
            items: props.items as SuggestionItem[],
            selectedIndex: 0,
            onSelect: (item: SuggestionItem) => {
              item.onSelect({
                editor: props.editor,
                range: props.range,
                context: item.context,
              });
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

          const currentProps = component.props as SlashMenuListProps;
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
            if (item) {
              item.onSelect({
                editor: editorRef,
                range: props.range,
                context: item.context,
              });
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