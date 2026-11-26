import { describe, expect, it, vi } from 'vitest';

import {
  actionRequestFromData,
  setPendingTapRequest,
  subscribePendingTapRequest,
  takePendingTapRequest,
  tapRequestFromData,
} from './tap-target';

describe('tapRequestFromData', () => {
  it('reads a valid target', () => {
    expect(tapRequestFromData({ tap: { kind: 'bill-upload', month: '2026-12' } })).toEqual({
      target: { kind: 'bill-upload', month: '2026-12' },
    });
    expect(tapRequestFromData({ tap: { kind: 'mark-paid', chargeId: 'c1' } }).target?.kind).toBe('mark-paid');
  });

  it('falls back to Home for a null, missing or invalid target', () => {
    expect(tapRequestFromData({ tap: null })).toEqual({ target: null });
    expect(tapRequestFromData({})).toEqual({ target: null });
    expect(tapRequestFromData(undefined)).toEqual({ target: null });
    expect(tapRequestFromData({ tap: { kind: 'nope' } })).toEqual({ target: null });
    expect(tapRequestFromData({ tap: { kind: 'bill-upload', month: 'December' } })).toEqual({ target: null });
  });
});

describe('pending tap request', () => {
  it('is taken once and tells listeners', () => {
    const listener = vi.fn();
    const stop = subscribePendingTapRequest(listener);
    setPendingTapRequest({ target: null });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(takePendingTapRequest()).toEqual({ target: null });
    expect(takePendingTapRequest()).toBeNull();
    stop();
    setPendingTapRequest({ target: null });
    expect(listener).toHaveBeenCalledTimes(1);
    takePendingTapRequest();
  });
});

describe('actionRequestFromData', () => {
  const data = {
    actions: [
      { kind: 'paid', target: { kind: 'mark-paid', chargeId: 'c1' } },
      { kind: 'nudge', target: { kind: 'send-nudge', personId: 'p1', chargeId: 'c1' } },
    ],
  };

  it('finds the target of the pressed button', () => {
    expect(actionRequestFromData(data, 'paid')).toEqual({ target: { kind: 'mark-paid', chargeId: 'c1' } });
    expect(actionRequestFromData(data, 'nudge')?.target?.kind).toBe('send-nudge');
  });

  it('gives null for an unknown button or odd data', () => {
    expect(actionRequestFromData(data, 'dismiss')).toBeNull();
    expect(actionRequestFromData({ actions: [] }, 'paid')).toBeNull();
    expect(actionRequestFromData({ actions: 'x' }, 'paid')).toBeNull();
    expect(actionRequestFromData(undefined, 'paid')).toBeNull();
  });
});
