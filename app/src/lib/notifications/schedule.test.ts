import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Notifications from 'expo-notifications';
import type { PlannedNotification } from '@splithouse/shared';

import { askForNotificationsIfNeverAsked, rebuildNotificationSchedule, scheduleNotificationPlan } from './schedule';

// Shared with the mock factories, which vitest hoists above the imports.
const { calls, permission, fetchQuery } = vi.hoisted(() => ({
  calls: [] as string[],
  permission: { granted: true, status: 'granted', canAskAgain: true },
  fetchQuery: vi.fn(),
}));

vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  getPermissionsAsync: vi.fn(async () => permission),
  requestPermissionsAsync: vi.fn(async () => {
    calls.push('request');
    return { ...permission, granted: true, status: 'granted' };
  }),
  cancelAllScheduledNotificationsAsync: vi.fn(async () => {
    calls.push('cancel');
  }),
  scheduleNotificationAsync: vi.fn(async (request: { identifier: string }) => {
    calls.push(`schedule ${request.identifier}`);
    return request.identifier;
  }),
}));
vi.mock('./channels', () => ({
  setUpNotificationChannels: vi.fn(async () => {
    calls.push('channels');
  }),
}));
vi.mock('@/lib/query-client', () => ({ queryClient: { fetchQuery: (...args: unknown[]) => fetchQuery(...args) } }));
vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));

const CHECK: PlannedNotification = {
  id: 'check:util-sam',
  channel: 'checks',
  title: 'Did Priya pay Nov utilities for Sam ($82.46)?',
  body: 'Due today.',
  at: '2026-11-07T20:00:00+08:00',
  tap: null,
  actions: [
    { kind: 'paid', target: { kind: 'mark-paid', chargeId: 'util-sam' } },
    { kind: 'nudge', target: { kind: 'send-nudge', personId: 'person-priya', chargeId: 'util-sam' } },
  ],
};

const UPLOAD: PlannedNotification = {
  id: 'upload:2026-12-02',
  channel: 'action',
  title: 'Upload this month’s utilities bill',
  body: 'It usually lands around the 2nd. Tap to upload it.',
  at: '2026-12-02T09:00:00+08:00',
  tap: { kind: 'bill-upload', month: '2026-12' },
  actions: [],
};

beforeEach(() => {
  calls.length = 0;
  Object.assign(permission, { granted: true, status: 'granted', canAskAgain: true });
  vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
  fetchQuery.mockReset();
});

describe('scheduleNotificationPlan', () => {
  it('cancels everything, then schedules each notification on its channel at its time, carrying its targets', async () => {
    await scheduleNotificationPlan([CHECK, UPLOAD]);
    expect(calls).toEqual(['channels', 'cancel', 'schedule check:util-sam', 'schedule upload:2026-12-02']);
    expect(vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0]).toEqual({
      identifier: 'check:util-sam',
      content: {
        title: CHECK.title,
        body: CHECK.body,
        data: { id: CHECK.id, channel: 'checks', tap: null, actions: CHECK.actions },
      },
      trigger: { type: 'date', date: new Date('2026-11-07T12:00:00Z'), channelId: 'checks' },
    });
  });

  it('only cancels while notifications are not allowed', async () => {
    Object.assign(permission, { granted: false, status: 'denied' });
    await scheduleNotificationPlan([CHECK]);
    expect(calls).toEqual(['channels', 'cancel']);
  });
});

describe('rebuildNotificationSchedule', () => {
  it('runs once more after the current rebuild instead of overlapping it', async () => {
    let release: () => void = () => {};
    fetchQuery
      .mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve({ notifications: [CHECK] }))))
      .mockResolvedValueOnce({ notifications: [UPLOAD] });
    const first = rebuildNotificationSchedule();
    const second = rebuildNotificationSchedule();
    const third = rebuildNotificationSchedule();
    release();
    await Promise.all([first, second, third]);
    expect(fetchQuery).toHaveBeenCalledTimes(2);
    expect(calls).toEqual([
      'channels',
      'cancel',
      'schedule check:util-sam',
      'channels',
      'cancel',
      'schedule upload:2026-12-02',
    ]);
  });

  it('keeps what was scheduled when the plan cannot be fetched', async () => {
    fetchQuery.mockRejectedValueOnce(new Error("Can't reach the server."));
    await expect(rebuildNotificationSchedule()).rejects.toThrow("Can't reach the server.");
    expect(calls).toEqual([]);
  });
});

describe('askForNotificationsIfNeverAsked', () => {
  it('asks on a phone where it was never asked', async () => {
    Object.assign(permission, { granted: false, status: 'undetermined', canAskAgain: true });
    expect(await askForNotificationsIfNeverAsked()).toBe(true);
    expect(calls).toEqual(['channels', 'request']);
  });

  it('never asks again once answered', async () => {
    Object.assign(permission, { granted: false, status: 'denied', canAskAgain: false });
    expect(await askForNotificationsIfNeverAsked()).toBe(false);
    expect(calls).toEqual(['channels']);
  });
});
