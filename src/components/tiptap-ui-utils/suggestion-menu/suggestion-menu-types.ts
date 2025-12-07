import type { Range } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

/**
 * Suggestion item interface
 */
export interface SuggestionItem<T = any> {
  /**
   * Main display text
   */
  title: string;
  /**
   * Secondary context text
   */
  subtext?: string;
  /**
   * Icon or badge component
   */
  badge?: React.MemoExoticComponent<any> | React.FC<any> | string;
  /**
   * Group identifier for organization
   */
  group?: string;
  /**
   * Additional search keywords
   */
  keywords?: string[];
  /**
   * Custom data passed to onSelect
   */
  context?: T;
  /**
   * Selection handler
   */
  onSelect: (props: { editor: Editor; range: Range; context?: T }) => void;
}

/**
 * Render props passed to SuggestionMenu children
 */
export interface SuggestionMenuRenderProps<T = any> {
  /**
   * Filtered suggestion items
   */
  items: SuggestionItem<T>[];
  /**
   * Currently selected item index
   */
  selectedIndex?: number;
  /**
   * Item selection handler
   */
  onSelect: (item: SuggestionItem<T>) => void;
}
