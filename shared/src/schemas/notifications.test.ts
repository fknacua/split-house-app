import { describe, expect, it } from 'vitest';
import { parseNotificationTypeRule } from './notifications';

const text = { channel: 'checks', title: 'Title', body: 'Body' } as const;

const DEADLINE = {
  anchor: 'charge-due',
  time: '08:00',
  stages: { dueTomorrow: text, dueToday: text, overdue: { ...text, channel: 'action' } },
};

const DATED = { ...text, channel: 'fyi', anchor: 'last-aircon', offsetDays: 90, time: '08:00' };

const EVENT = { ...text, channel: 'fyi', trigger: 'month-settled', delay: 'immediate', expiresAfterDays: 3 };

describe('parseNotificationTypeRule', () => {
  it('reads each kind with its own shape', () => {
    expect(parseNotificationTypeRule('deadline', DEADLINE)).toEqual({ kind: 'deadline', rule: DEADLINE });
    expect(parseNotificationTypeRule('dated', DATED)).toEqual({ kind: 'dated', rule: DATED });
    expect(parseNotificationTypeRule('event', EVENT)).toEqual({ kind: 'event', rule: EVENT });
  });

  it('refuses a rule of another kind', () => {
    expect(() => parseNotificationTypeRule('deadline', EVENT)).toThrow();
    expect(() => parseNotificationTypeRule('event', DATED)).toThrow();
  });

  it('refuses an unknown kind, anchor, trigger or channel', () => {
    expect(() => parseNotificationTypeRule('weekly', DEADLINE)).toThrow();
    expect(() => parseNotificationTypeRule('deadline', { ...DEADLINE, anchor: 'rent-day' })).toThrow();
    expect(() => parseNotificationTypeRule('event', { ...EVENT, trigger: 'bill-saved' })).toThrow();
    expect(() => parseNotificationTypeRule('dated', { ...DATED, channel: 'loud' })).toThrow();
  });

  it('refuses a deadline missing a stage', () => {
    const { overdue: _overdue, ...twoStages } = DEADLINE.stages;
    expect(() => parseNotificationTypeRule('deadline', { ...DEADLINE, stages: twoStages })).toThrow();
  });

  it('refuses a time that is not HH:mm', () => {
    expect(() => parseNotificationTypeRule('deadline', { ...DEADLINE, time: '8:00' })).toThrow();
    expect(() => parseNotificationTypeRule('dated', { ...DATED, time: '24:00' })).toThrow();
  });

  it('refuses an empty title or body', () => {
    expect(() => parseNotificationTypeRule('event', { ...EVENT, title: '' })).toThrow();
  });
});
