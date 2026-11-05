import type { PersonColor } from '@splithouse/shared';

/** The fill class for each person color. Written out in full so the class scanner finds them. */
export const PERSON_COLOR_BG: Record<PersonColor, string> = {
  BLUE: 'bg-person-blue',
  ORANGE: 'bg-person-orange',
  GREEN: 'bg-person-green',
  PURPLE: 'bg-person-purple',
  PINK: 'bg-person-pink',
  TEAL: 'bg-person-teal',
  GOLD: 'bg-person-gold',
  BROWN: 'bg-person-brown',
  SLATE: 'bg-person-slate',
};

/** The border class for each person color, for a hollow ring. Written out in full for the same reason. */
export const PERSON_COLOR_BORDER: Record<PersonColor, string> = {
  BLUE: 'border-person-blue',
  ORANGE: 'border-person-orange',
  GREEN: 'border-person-green',
  PURPLE: 'border-person-purple',
  PINK: 'border-person-pink',
  TEAL: 'border-person-teal',
  GOLD: 'border-person-gold',
  BROWN: 'border-person-brown',
  SLATE: 'border-person-slate',
};
