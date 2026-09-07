export type DrivingRecordVersion = Date | string;

export type DrivingRecordVersionCheck =
  | { allowed: true }
  | {
      allowed: false;
      code: 'DRIVING_RECORD_CONFLICT';
      serverUpdatedAt: string;
    };

function toTimestamp(value: DrivingRecordVersion): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function checkDrivingRecordVersion(
  currentUpdatedAt: DrivingRecordVersion | null,
  expectedRecordUpdatedAt: string | null | undefined
): DrivingRecordVersionCheck {
  // Omitting the field preserves compatibility with existing clients.
  if (expectedRecordUpdatedAt === undefined) return { allowed: true };

  if (currentUpdatedAt === null && expectedRecordUpdatedAt === null) {
    return { allowed: true };
  }

  if (currentUpdatedAt !== null && expectedRecordUpdatedAt !== null) {
    const expectedTimestamp = toTimestamp(expectedRecordUpdatedAt);
    const currentTimestamp = toTimestamp(currentUpdatedAt);

    if (Number.isFinite(expectedTimestamp) && expectedTimestamp === currentTimestamp) {
      return { allowed: true };
    }
  }

  if (currentUpdatedAt === null) {
    return {
      allowed: false,
      code: 'DRIVING_RECORD_CONFLICT',
      serverUpdatedAt: '',
    };
  }

  return {
    allowed: false,
    code: 'DRIVING_RECORD_CONFLICT',
    serverUpdatedAt:
      currentUpdatedAt instanceof Date
        ? currentUpdatedAt.toISOString()
        : new Date(currentUpdatedAt).toISOString(),
  };
}
