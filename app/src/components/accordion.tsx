import { ChevronDown } from 'lucide-react-native';
import type { ReactNode } from 'react';

import {
  Accordion as NativeAccordion,
  AccordionContent,
  AccordionHeader,
  AccordionIcon,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/** One expandable row: its always-visible header and the content shown when it is open. */
export interface AccordionRow {
  /** Unique within the list; used to track which rows are open. */
  value: string;
  /** The always-visible row content, such as a day, a title and an amount. */
  header: ReactNode;
  /** The content shown when the row is open. */
  content: ReactNode;
  /** Stops the row from opening. */
  disabled?: boolean;
  /** Screen-reader name for the row's button. */
  accessibilityLabel?: string;
}

/**
 * Expandable row list (screen mapping doc: Accordion), such as the person rows on Home. A thin
 * wrapper over the native gluestack accordion in `ui/accordion`: the 64px header, the chevron
 * and the open/close animation live there; this file composes a row from `header` and `content`.
 * Rows are separated by 1px `outline-variant` lines, so put the list in a `Card` with `padded`
 * off.
 *
 * @param rows - The rows, in order.
 * @param multiple - Allow several rows open at once. Defaults to one at a time.
 * @param defaultOpen - Values of the rows that start open.
 * @param className - Extra classes for the list.
 */
export function Accordion({
  rows,
  multiple = false,
  defaultOpen,
  className,
}: {
  rows: AccordionRow[];
  multiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}) {
  return (
    <NativeAccordion
      type={multiple ? 'multiple' : 'single'}
      isCollapsible
      defaultValue={defaultOpen}
      className={className}
    >
      {rows.map((row) => (
        <AccordionItem
          key={row.value}
          value={row.value}
          isDisabled={row.disabled}
          className="border-t border-outline-variant first:border-t-0"
        >
          <AccordionHeader>
            <AccordionTrigger accessibilityLabel={row.accessibilityLabel}>
              {row.header}
              <AccordionIcon as={ChevronDown} />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>{row.content}</AccordionContent>
        </AccordionItem>
      ))}
    </NativeAccordion>
  );
}
