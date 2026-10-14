/**
 * Pure JS mirrors of lib modules for unit tests (avoid native Expo imports in Jest).
 */

function generateUipSchedule(dateOfBirth) {
  const schedule = [
    { vaccineName: 'BCG', ageLabel: 'Birth', dueDaysFromBirth: 0 },
    { vaccineName: 'OPV-1', ageLabel: '6 Weeks', dueDaysFromBirth: 42 },
  ];
  const addDays = (iso, days) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return schedule.map((dose) => ({
    vaccineName: dose.vaccineName,
    ageLabel: dose.ageLabel,
    dueDate: addDays(dateOfBirth, dose.dueDaysFromBirth),
    status: 'due',
  }));
}

function detectSymptomClusters(reports, threshold = { minCount: 5, windowDays: 7 }) {
  const cutoff = Date.now() - threshold.windowDays * 24 * 60 * 60 * 1000;
  const buckets = new Map();
  for (const r of reports) {
    const created = r.created_at ? Date.parse(r.created_at) : Date.now();
    if (created < cutoff) continue;
    const key = `${(r.ward || 'unknown').toLowerCase()}::${r.symptom.toLowerCase()}`;
    buckets.set(key, (buckets.get(key) || 0) + (r.count || 1));
  }
  const clusters = [];
  for (const [key, total] of buckets) {
    if (total < threshold.minCount) continue;
    const [ward, symptom] = key.split('::');
    clusters.push({ symptom, ward, total });
  }
  return clusters;
}

function mergeRemoteWithLocal(remote, local, localTimestamp) {
  const merged = { ...remote };
  const remoteTimestamp = remote.updated_at ? Date.parse(remote.updated_at) : 0;
  for (const key of Object.keys(local)) {
    if (['local_dirty', 'sync_status'].includes(key)) continue;
    if (remoteTimestamp > localTimestamp && remote[key] !== undefined && remote[key] !== local[key]) {
      continue;
    }
    merged[key] = local[key];
  }
  return merged;
}

class MockAbdmClient {
  async linkAbha(input) {
    return {
      txnId: `mock-txn-${input.patientId.slice(0, 8)}`,
      message: 'OTP sent',
      otpHint: '123456',
    };
  }
  async verifyOtp(txnId, otp) {
    if (otp !== '123456') throw new Error('Invalid OTP');
    return { abhaId: '12-3456-7890-1234@sbx', abhaNumber: '12-3456-7890-1234', verified: true };
  }
  async createPrescription(bundle) {
    return { status: 'created', prescriptionId: `ERX-MOCK-${Date.now()}`, bundle };
  }
}

describe('UIP calendar (pure)', () => {
  test('generates doses from DOB', () => {
    const doses = generateUipSchedule('2026-01-01');
    expect(doses[0].vaccineName).toBe('BCG');
    expect(doses[0].dueDate).toBe('2026-01-01');
    expect(doses[1].dueDate).toBe('2026-02-12');
  });
});

describe('outbreak clusters (pure)', () => {
  test('flags clusters', () => {
    const now = new Date().toISOString();
    const reports = Array.from({ length: 6 }, () => ({
      symptom: 'Fever',
      count: 1,
      ward: 'Ward 3',
      created_at: now,
    }));
    expect(detectSymptomClusters(reports).length).toBe(1);
  });
});

describe('ABDM mock + sync merge (pure)', () => {
  test('OTP flow', async () => {
    const client = new MockAbdmClient();
    const link = await client.linkAbha({ patientId: 'p-12345678' });
    const id = await client.verifyOtp(link.txnId, '123456');
    expect(id.verified).toBe(true);
    const erx = await client.createPrescription({ resourceType: 'Bundle' });
    expect(erx.status).toBe('created');
  });

  test('merge prefers newer local', () => {
    const merged = mergeRemoteWithLocal(
      { name: 'Remote', updated_at: '2026-01-01T00:00:00.000Z' },
      { name: 'Local', updated_at: '2026-01-02T00:00:00.000Z' },
      Date.parse('2026-01-02T00:00:00.000Z')
    );
    expect(merged.name).toBe('Local');
  });
});
