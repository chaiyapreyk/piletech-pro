import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    pile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    drivingRecord: {
      upsert: vi.fn(),
    },
  };

  return {
    txMock,
    prismaMock: {
      pile: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      drivingRecord: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
    },
  };
});

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { POST } from '@/app/api/piles/[id]/drive/route';

const updatedAt = new Date('2026-09-07T03:00:00.000Z');

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/piles/pile-1/drive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      penetrationBlows: [20, null, 35],
      recordUnit: 'FEET',
      recordScope: 'WINDOW',
      windowLengthFt: 20,
      measuredLast10Cm: 4,
      measuredTempCCm: 1.2,
      drivenLengthM: 0.91,
      totalPileLengthM: 21,
      stickUpLengthM: 0.5,
      cutOffLevelM: 2.5,
      groundLevelM: 3,
      tipLevelM: -17.5,
      inspectorName: 'Field Engineer',
      notes: '',
      ...body,
    }),
  });
}

describe('POST /api/piles/[id]/drive conflict handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => callback(txMock));
    prismaMock.pile.findUnique.mockResolvedValue({
      id: 'pile-1',
      criteria: { targetSet10BlowsCm: 7 },
      drivingRecord: { updatedAt },
    });
    txMock.pile.findUnique.mockResolvedValue({
      id: 'pile-1',
      criteria: { targetSet10BlowsCm: 7 },
      drivingRecord: { updatedAt },
    });
    txMock.drivingRecord.upsert.mockResolvedValue({ pileId: 'pile-1', updatedAt });
    txMock.pile.update.mockResolvedValue({ id: 'pile-1', status: 'COMPLETED' });
    prismaMock.drivingRecord.findUnique.mockResolvedValue({ updatedAt });
  });

  it('returns 409 without writing when the expected timestamp is stale', async () => {
    const response = await POST(request({ expectedRecordUpdatedAt: '2026-09-07T02:00:00.000Z' }), {
      params: Promise.resolve({ id: 'pile-1' }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: 'DRIVING_RECORD_CONFLICT',
        serverUpdatedAt: updatedAt.toISOString(),
      })
    );
    expect(txMock.drivingRecord.upsert).not.toHaveBeenCalled();
    expect(txMock.pile.update).not.toHaveBeenCalled();
  });

  it('rejects force overwrite without an observed timestamp', async () => {
    const response = await POST(request({ forceOverwrite: true }), {
      params: Promise.resolve({ id: 'pile-1' }),
    });

    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('allows an explicit overwrite when the latest timestamp matches', async () => {
    const response = await POST(request({ expectedRecordUpdatedAt: updatedAt.toISOString(), forceOverwrite: true }), {
      params: Promise.resolve({ id: 'pile-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(txMock.drivingRecord.upsert).toHaveBeenCalledOnce();
    expect(txMock.pile.update).toHaveBeenCalledOnce();
  });

  it('maps a serializable transaction retry failure to a conflict response', async () => {
    prismaMock.$transaction.mockRejectedValue({ code: 'P2034' });

    const response = await POST(request({ expectedRecordUpdatedAt: '2026-09-07T02:00:00.000Z' }), {
      params: Promise.resolve({ id: 'pile-1' }),
    });

    expect(prismaMock.drivingRecord.findUnique).toHaveBeenCalledOnce();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: 'DRIVING_RECORD_CONFLICT',
        serverUpdatedAt: updatedAt.toISOString(),
      })
    );
  });
});
