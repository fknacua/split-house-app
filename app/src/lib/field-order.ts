/** A form's keyboard "next" chain: the field after `name`, or `undefined` for the last field. */
export type NextField<N extends string> = (name: N) => N | undefined;

/**
 * Builds a form's keyboard "next" chain from its text fields, listed once, top to bottom. A field
 * that is not on screen is left out of the list or given as `false`, `null` or `undefined`, so
 * `next` never points at a hidden field. Pass the result to each field's `fieldControlProps.next`.
 *
 * @param order - The form's text fields top to bottom; falsy entries are skipped.
 * @returns `next(name)`: the field after `name`, or `undefined` for the last field or a name not in the list.
 */
export function fieldOrder<N extends string>(
  order: readonly (N | false | null | undefined)[]
): NextField<N> {
  const shown = order.filter((name): name is N => !!name);
  return (name) => {
    const at = shown.indexOf(name);
    return at === -1 ? undefined : shown[at + 1];
  };
}
