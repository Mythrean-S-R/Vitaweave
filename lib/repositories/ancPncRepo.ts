import { encryptField, decryptField } from '../db/fieldEncryption';
import { writeLocalFirst, readLocalCollection } from '../sync/SyncService';
import { listLocal, newLocalId, nowIso, getLocalById } from './base';

export type PregnancyRecord = {
  id: string;
  patientId: string;
  lmp?: string;
  edd?: string;
  gravida?: number;
  para?: number;
  riskFlags: string[];
  status: string;
};

export type AncVisitRecord = {
  id: string;
  pregnancyId: string;
  patientId: string;
  visitNumber: number;
  visitDate?: string;
  findings?: string;
  bp?: string;
  weight?: number;
  hb?: number;
  nextDue?: string;
};

export type PncVisitRecord = {
  id: string;
  pregnancyId: string;
  patientId: string;
  visitDay: number;
  visitDate?: string;
  findings?: string;
  motherWell: boolean;
  babyWell: boolean;
};

export async function createPregnancy(input: {
  patientId: string;
  lmp?: string;
  edd?: string;
  gravida?: number;
  para?: number;
  riskFlags?: string[];
  assignedAshaId?: string;
}): Promise<PregnancyRecord> {
  const id = newLocalId();
  const edd =
    input.edd ??
    (input.lmp
      ? (() => {
          const d = new Date(input.lmp);
          d.setDate(d.getDate() + 280);
          return d.toISOString().slice(0, 10);
        })()
      : undefined);

  await writeLocalFirst('pregnancies', {
    id,
    patient_id: input.patientId,
    lmp: input.lmp ?? null,
    edd: edd ?? null,
    gravida: input.gravida ?? null,
    para: input.para ?? null,
    risk_flags_json: JSON.stringify(input.riskFlags ?? []),
    status: 'active',
    assigned_asha_id: input.assignedAshaId ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  return {
    id,
    patientId: input.patientId,
    lmp: input.lmp,
    edd,
    gravida: input.gravida,
    para: input.para,
    riskFlags: input.riskFlags ?? [],
    status: 'active',
  };
}

export async function listPregnancies(patientId?: string): Promise<PregnancyRecord[]> {
  const rows = patientId
    ? await listLocal('pregnancies', [{ column: 'patient_id', value: patientId }])
    : await readLocalCollection('pregnancies');
  return rows.map((r) => ({
    id: String(r.id),
    patientId: String(r.patient_id),
    lmp: r.lmp as string | undefined,
    edd: r.edd as string | undefined,
    gravida: r.gravida != null ? Number(r.gravida) : undefined,
    para: r.para != null ? Number(r.para) : undefined,
    riskFlags: (() => {
      try {
        return JSON.parse(String(r.risk_flags_json ?? '[]'));
      } catch {
        return [];
      }
    })(),
    status: String(r.status ?? 'active'),
  }));
}

export async function addAncVisit(input: {
  pregnancyId: string;
  patientId: string;
  visitNumber: number;
  visitDate?: string;
  findings?: string;
  bp?: string;
  weight?: number;
  hb?: number;
  nextDue?: string;
  recordedBy?: string;
}): Promise<AncVisitRecord> {
  const id = newLocalId();
  await writeLocalFirst('anc_visits', {
    id,
    pregnancy_id: input.pregnancyId,
    patient_id: input.patientId,
    visit_number: input.visitNumber,
    visit_date: input.visitDate ?? nowIso().slice(0, 10),
    findings_enc: await encryptField(input.findings ?? null),
    bp: input.bp ?? null,
    weight: input.weight ?? null,
    hb: input.hb ?? null,
    next_due: input.nextDue ?? null,
    recorded_by: input.recordedBy ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  return {
    id,
    pregnancyId: input.pregnancyId,
    patientId: input.patientId,
    visitNumber: input.visitNumber,
    visitDate: input.visitDate,
    findings: input.findings,
    bp: input.bp,
    weight: input.weight,
    hb: input.hb,
    nextDue: input.nextDue,
  };
}

export async function listAncVisits(pregnancyId: string): Promise<AncVisitRecord[]> {
  const rows = await listLocal('anc_visits', [{ column: 'pregnancy_id', value: pregnancyId }]);
  return Promise.all(
    rows.map(async (r) => ({
      id: String(r.id),
      pregnancyId: String(r.pregnancy_id),
      patientId: String(r.patient_id),
      visitNumber: Number(r.visit_number),
      visitDate: r.visit_date as string | undefined,
      findings: (await decryptField(r.findings_enc as string)) ?? undefined,
      bp: r.bp as string | undefined,
      weight: r.weight != null ? Number(r.weight) : undefined,
      hb: r.hb != null ? Number(r.hb) : undefined,
      nextDue: r.next_due as string | undefined,
    }))
  );
}

export async function addPncVisit(input: {
  pregnancyId: string;
  patientId: string;
  visitDay: 1 | 3 | 7 | 42;
  visitDate?: string;
  findings?: string;
  motherWell?: boolean;
  babyWell?: boolean;
  recordedBy?: string;
}): Promise<PncVisitRecord> {
  const id = newLocalId();
  await writeLocalFirst('pnc_visits', {
    id,
    pregnancy_id: input.pregnancyId,
    patient_id: input.patientId,
    visit_day: input.visitDay,
    visit_date: input.visitDate ?? nowIso().slice(0, 10),
    findings_enc: await encryptField(input.findings ?? null),
    mother_well: input.motherWell === false ? 0 : 1,
    baby_well: input.babyWell === false ? 0 : 1,
    recorded_by: input.recordedBy ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  return {
    id,
    pregnancyId: input.pregnancyId,
    patientId: input.patientId,
    visitDay: input.visitDay,
    visitDate: input.visitDate,
    findings: input.findings,
    motherWell: input.motherWell !== false,
    babyWell: input.babyWell !== false,
  };
}

export async function listPncVisits(pregnancyId: string): Promise<PncVisitRecord[]> {
  const rows = await listLocal('pnc_visits', [{ column: 'pregnancy_id', value: pregnancyId }]);
  return Promise.all(
    rows.map(async (r) => ({
      id: String(r.id),
      pregnancyId: String(r.pregnancy_id),
      patientId: String(r.patient_id),
      visitDay: Number(r.visit_day),
      visitDate: r.visit_date as string | undefined,
      findings: (await decryptField(r.findings_enc as string)) ?? undefined,
      motherWell: Boolean(r.mother_well),
      babyWell: Boolean(r.baby_well),
    }))
  );
}

export async function getActivePregnancyForPatient(patientId: string): Promise<PregnancyRecord | null> {
  const all = await listPregnancies(patientId);
  return all.find((p) => p.status === 'active') ?? all[0] ?? null;
}

export async function patientHasActivePregnancy(patientId: string): Promise<boolean> {
  const p = await getActivePregnancyForPatient(patientId);
  return Boolean(p);
}
