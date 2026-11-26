import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Notifications from 'expo-notifications';
import type { PlannedNotification } from '@splithouse/shared';

import { apiFetch } from '@/lib/api';
import {
  askForNotificationsIfNeverAsked,
  rebuildNotificationSchedule,
  scheduledTime,
  scheduleNotificationPlan,
} from './schedule';

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
  PAID_NUDGE_CATEGORY: 'paid-nudge',
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
    { kind: 'paid', target: { kind: 'mark-paid', chargeIds: ['util-sam', 'rent-priya'] } },
    { kind: 'nudge', target: { kind: 'send-nudge', personId: 'person-priya', chargeIds: ['util-sam', 'rent-priya'] } },
  ],
  acknowledge: false,
};

const UPLOAD: PlannedNotification = {
  id: 'upload:2026-12-02',
  channel: 'action',
  title: 'Upload this month’s utilities bill',
  body: 'It usually lands around the 2nd. Tap to upload it.',
  at: '2026-12-02T09:00:00+08:00',
  tap: { kind: 'bill-upload', month: '2026-12' },
  actions: [],
  acknowledge: false,
};

const NOW = new Date('2026-11-29T10:00:00+08:00').getTime();

/** A settled FYI the phone hasn't scheduled yet, due 5 seconds after the list was built. */
const SETTLED: PlannedNotification = {
  id: 'settled:2026-11:2026-11-29',
  channel: 'fyi',
  title: 'November is settled',
  body: 'Everyone has paid and the utilities bill is covered.',
  at: '2026-11-29T10:00:05+08:00',
  tap: null,
  actions: [],
  acknowledge: true,
};

beforeEach(() => {
  calls.length = 0;
  Object.assign(permission, { granted: true, status: 'granted', canAskAgain: true });
  vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
  vi.mocked(apiFetch).mockReset();
  fetchQuery.mockReset();
  vi.useRealTimers();
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
        categoryIdentifier: 'paid-nudge',
      },
      trigger: { type: 'date', date: new Date('2026-11-07T12:00:00Z'), channelId: 'checks' },
    });
  });

  it('only cancels while notifications are not allowed, so no event FYI is reported scheduled', async () => {
    Object.assign(permission, { granted: false, status: 'denied' });
    expect(await scheduleNotificationPlan([CHECK, SETTLED])).toEqual([]);
    expect(calls).toEqual(['channels', 'cancel']);
  });

  it('returns only the event FYIs to acknowledge, with the time each was scheduled for', async () => {
    vi.useFakeTimers({ now: NOW });
    expect(await scheduleNotificationPlan([CHECK, SETTLED, UPLOAD])).toEqual([
      { id: SETTLED.id, at: '2026-11-29T02:00:05.000Z' },
    ]);
  });
});

describe('scheduledTime', () => {
  it('keeps a reminder at its time', () => {
    expect(scheduledTime(UPLOAD, NOW)).toEqual(new Date(UPLOAD.at));
  });

  it('fires an event FYI at its time, or 5 seconds from now when that has passed', () => {
    expect(scheduledTime(SETTLED, NOW)).toEqual(new Date('2026-11-29T10:00:05+08:00'));
    expect(scheduledTime(SETTLED, NOW + 60_000)).toEqual(new Date('2026-11-29T10:01:05+08:00'));
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

  it('acknowledges the event FYIs it scheduled, after scheduling them', async () => {
    vi.useFakeTimers({ now: NOW });
    fetchQuery.mockResolvedValueOnce({ notifications: [SETTLED, UPLOAD] });
    vi.mocked(apiFetch).mockImplementation(async () => {
      calls.push('acknowledge');
      return { acknowledged: [SETTLED.id] };
    });
    await rebuildNotificationSchedule();
    expect(calls).toEqual(['channels', 'cancel', `schedule ${SETTLED.id}`, 'schedule upload:2026-12-02', 'acknowledge']);
    expect(apiFetch).toHaveBeenCalledWith('/api/notifications/acknowledge', {
      method: 'POST',
      body: { events: [{ id: SETTLED.id, at: '2026-11-29T02:00:05.000Z' }] },
    });
  });

  it('acknowledges nothing when nothing was scheduled to acknowledge', async () => {
    fetchQuery.mockResolvedValueOnce({ notifications: [UPLOAD] });
    await rebuildNotificationSchedule();
    Object.assign(permission, { granted: false, status: 'denied' });
    fetchQuery.mockResolvedValueOnce({ notifications: [SETTLED] });
    await rebuildNotificationSchedule();
    expect(apiFetch).not.toHaveBeenCalled();
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
