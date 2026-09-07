import { describe, expect, it } from 'vitest';
import { checkDrivingRecordVersion } from '@/lib/drivingRecordConcurrency';

const serverUpdatedAt = new Date('2026-09-07T03:00:00.000Z');

describe('Driving Record optimistic concurrency', () => {
  it('keeps legacy clients compatible when no expected timestamp is sent', () => {
    expect(checkDrivingRecordVersion(serverUpdatedAt, undefined)).toEqual({ allowed: true });
  });

  it('allows creating a record when the client expects no existing record', () => {
    expect(checkDrivingRecordVersion(null, null)).toEqual({ allowed: true });
  });

  it('allows a write when the expected timestamp matches the server', () => {
    expect(checkDrivingRecordVersion(serverUpdatedAt, serverUpdatedAt.toISOString())).toEqual({
      allowed: true,
    });
  });

  it('rejects a stale timestamp and returns the server timestamp', () => {
    expect(checkDrivingRecordVersion(serverUpdatedAt, '2026-09-07T02:00:00.000Z')).toEqual({
      allowed: false,
      code: 'DRIVING_RECORD_CONFLICT',
      serverUpdatedAt: serverUpdatedAt.toISOString(),
    });
  });

  it('rejects an expected empty record when the server already has one', () => {
    expect(checkDrivingRecordVersion(serverUpdatedAt, null)).toEqual({
      allowed: false,
      code: 'DRIVING_RECORD_CONFLICT',
      serverUpdatedAt: serverUpdatedAt.toISOString(),
    });
  });
});
