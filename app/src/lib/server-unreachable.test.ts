import { beforeEach, describe, expect, it } from 'vitest';

import {
  getServerUnreachableState,
  reportServerUnreachable,
  resetServerUnreachable,
  retryServerConnection,
} from './server-unreachable';

beforeEach(resetServerUnreachable);

describe('reportServerUnreachable', () => {
  it('opens the prompt, and repeated reports change nothing', () => {
    reportServerUnreachable();
    reportServerUnreachable();
    expect(getServerUnreachableState()).toEqual({ open: true, retrying: false });
  });
});

describe('retryServerConnection', () => {
  it('shows the retrying state while it refetches, then closes when nothing failed again', async () => {
    reportServerUnreachable();
    let during = getServerUnreachableState();
    await retryServerConnection(async () => {
      during = getServerUnreachableState();
    });
    expect(during).toEqual({ open: true, retrying: true });
    expect(getServerUnreachableState()).toEqual({ open: false, retrying: false });
  });

  it('stays open when a refetch reports another failure', async () => {
    reportServerUnreachable();
    await retryServerConnection(async () => {
      reportServerUnreachable();
    });
    expect(getServerUnreachableState()).toEqual({ open: true, retrying: false });
  });

  it('stays open when the refetch itself rejects', async () => {
    reportServerUnreachable();
    await retryServerConnection(() => Promise.reject(new Error('boom')));
    expect(getServerUnreachableState()).toEqual({ open: true, retrying: false });
  });

  it('forgets an earlier failed retry on the next one', async () => {
    reportServerUnreachable();
    await retryServerConnection(async () => reportServerUnreachable());
    await retryServerConnection(async () => {});
    expect(getServerUnreachableState()).toEqual({ open: false, retrying: false });
  });

  it('ignores a second tap while a retry is running', async () => {
    reportServerUnreachable();
    let calls = 0;
    const slow = async () => {
      calls += 1;
      await Promise.resolve();
    };
    await Promise.all([retryServerConnection(slow), retryServerConnection(slow)]);
    expect(calls).toBe(1);
  });
});
