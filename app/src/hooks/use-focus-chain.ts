import { useRef } from 'react';

import { fieldOrder } from '@/lib';

/** What one input of a focus chain takes: spread it onto a TextInput, MoneyInput, CountInput or PhoneInput. */
export interface FocusChainField {
  /** Holds the input, so the field before it can focus it. */
  ref: (node: unknown) => void;
  /** Focuses the next input in the chain; unset for the last one, so the keyboard shows `done`. */
  onNext: (() => void) | undefined;
}

/**
 * The keyboard "next" chain for a form whose inputs are standalone (values in component state, not react-hook-form),
 * so `fieldControlProps.next` cannot reach them. A react-hook-form form uses `fieldControlProps.next` instead.
 *
 * @param order - The form's text inputs top to bottom, by any key unique in the form; an input not on screen is left
 * out or given as `false`, `null` or `undefined`, so `next` never points at a hidden one.
 * @returns `field(key)`: the `ref` and `onNext` to spread onto that input.
 */
export function useFocusChain<K extends string>(
  order: readonly (K | false | null | undefined)[]
): { field: (key: K) => FocusChainField } {
  const nodes = useRef(new Map<K, { focus?: () => void }>());
  // One ref callback per key, so React does not detach and reattach every input on each render.
  const refs = useRef(new Map<K, (node: unknown) => void>());
  const next = fieldOrder(order);

  const field = (key: K): FocusChainField => {
    let ref = refs.current.get(key);
    if (!ref) {
      ref = (node: unknown) => {
        if (node) nodes.current.set(key, node as { focus?: () => void });
        else nodes.current.delete(key);
      };
      refs.current.set(key, ref);
    }
    const target = next(key);
    return { ref, onNext: target === undefined ? undefined : () => nodes.current.get(target)?.focus?.() };
  };

  return { field };
}
