"use client";

import {
  autoUpdate,
  flip,
  offset,
  type Placement,
  shift,
  useFloating,
} from "@floating-ui/react";
import { PluginKey } from "@tiptap/pm/state";
import { type Editor, ReactRenderer } from "@tiptap/react";
import {
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  SuggestionItem,
  SuggestionMenuRenderProps,
} from "./suggestion-menu-types";

export interface SuggestionMenuProps<T = any> {
  /**
   * The Tiptap editor instance
   */
  editor: Editor | null;
  /**
   * Character that triggers the suggestion menu
   */
  char?: string;
  /**
   * Function returning suggestion items
   */
  items: (props: {
    query: string;
    editor: Editor;
  }) => SuggestionItem<T>[] | Promise<SuggestionItem<T>[]>;
  /**
   * Render function for menu content
   */
  children: (props: SuggestionMenuRenderProps<T>) => ReactNode;
  /**
   * Floating UI placement
   */
  placement?: Placement;
  /**
   * CSS selector for the menu container
   */
  selector?: string;
  /**
   * Unique identifier for the suggestion plugin
   */
  pluginKey?: string | PluginKey;
  /**
   * Maximum height of the suggestion menu in pixels
   */
  maxHeight?: number;
  /**
   * Allow spaces in suggestion queries
   */
  allowSpaces?: boolean;
  /**
   * Include trigger character in query
   */
  allowToIncludeChar?: boolean;
  /**
   * Characters that can precede the trigger
   */
  allowedPrefixes?: string[] | null;
  /**
   * Only trigger at line start
   */
  startOfLine?: boolean;
  /**
   * HTML tag for decoration element
   */
  decorationTag?: string;
  /**
   * CSS class for decoration styling
   */
  decorationClass?: string;
}

export function SuggestionMenu<T = any>({
  editor,
  char = "/",
  items,
  children,
  placement = "bottom-start",
  selector = "tiptap-suggestion-menu",
  pluginKey = "suggestionMenu",
  maxHeight = 384,
  allowSpaces = false,
  allowToIncludeChar = false,
  allowedPrefixes = [" "],
  startOfLine = false,
  decorationTag = "span",
  decorationClass = "suggestion",
}: SuggestionMenuProps<T>) {
  const [suggestionItems, setSuggestionItems] = useState<SuggestionItem<T>[]>(
    [],
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles, update } = useFloating({
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const onSelect = useCallback((item: SuggestionItem<T>) => {
    // This will be called by the rendered menu items
    // The actual selection is handled by Tiptap's suggestion plugin
  }, []);

  useEffect(() => {
    if (!editor) return;

    const key =
      typeof pluginKey === "string" ? new PluginKey(pluginKey) : pluginKey;

    const suggestionOptions: Omit<SuggestionOptions, "editor"> = {
      char,
      pluginKey: key,
      allowSpaces,
      startOfLine,

      allow: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        const type = state.schema.nodes[decorationTag];
        const allow = !!$from.parent.type.contentMatch.matchType(type);
        return allow;
      },

      items: async ({ query, editor: editorInstance }) => {
        const itemList = await items({ query, editor: editorInstance });
        setSuggestionItems(itemList);
        setSelectedIndex(0);
        return itemList;
      },

      render: () => {
        let component: ReactRenderer | null = null;
        let popup: HTMLElement | null = null;

        return {
          onStart: (props) => {
            if (!containerRef.current) return;

            component = new ReactRenderer(() => null, {
              props,
              editor: props.editor,
            });

            popup = containerRef.current;
            if (popup) {
              document.body.appendChild(popup);
            }

            refs.setReference({
              getBoundingClientRect: () =>
                props.clientRect?.() || new DOMRect(),
            });

            update();
          },

          onUpdate: (props) => {
            component?.updateProps(props);

            if (props.clientRect) {
              refs.setReference({
                getBoundingClientRect: () =>
                  props.clientRect?.() || new DOMRect(),
              });
              update();
            }
          },

          onKeyDown: (props) => {
            if (props.event.key === "ArrowUp") {
              setSelectedIndex((prev) =>
                prev > 0 ? prev - 1 : suggestionItems.length - 1,
              );
              return true;
            }

            if (props.event.key === "ArrowDown") {
              setSelectedIndex((prev) =>
                prev < suggestionItems.length - 1 ? prev + 1 : 0,
              );
              return true;
            }

            if (props.event.key === "Enter") {
              const item = suggestionItems[selectedIndex];
              if (item) {
                item.onSelect({
                  editor: editor!,
                  range: props.range,
                  context: item.context,
                });
                return true;
              }
            }

            if (props.event.key === "Escape") {
              return true;
            }

            return false;
          },

          onExit: () => {
            if (popup && popup.parentNode) {
              popup.parentNode.removeChild(popup);
            }
            component?.destroy();
            setSuggestionItems([]);
          },
        };
      },
    };

    // We would need to register this as an extension, but for now we'll handle it differently
    // This is a simplified approach - normally you'd create a Tiptap extension
  }, [
    editor,
    char,
    items,
    allowSpaces,
    startOfLine,
    decorationTag,
    pluginKey,
    refs,
    update,
    selectedIndex,
    suggestionItems,
  ]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        refs.setFloating(node);
      }}
      className={selector}
      data-selector={selector}
      style={
        {
          ...floatingStyles,
          maxHeight: `${maxHeight}px`,
          display: suggestionItems.length > 0 ? "block" : "none",
          "--suggestion-menu-max-height": `${maxHeight}px`,
        } as React.CSSProperties
      }
      role="listbox"
      aria-label="Suggestions"
    >
      {children({ items: suggestionItems, selectedIndex, onSelect })}
    </div>
  );
}
