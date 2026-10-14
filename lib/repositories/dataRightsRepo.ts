import { writeLocalFirst, readLocalCollection } from '../sync/SyncService';
import { newLocalId, nowIso, listLocal } from './base';
import { listPatientsLocal } from './patientRepo';
import { getSecureSession } from '../auth/secureSession';

export async function saveConsentRecord(input: {
  actorId: string;
  version: string;
  purposes?: string[];
  guardian?: {
    isMinor?: boolean;
    guardianName?: string;
    guardianRelationship?: string;
    guardianAcknowledged?: boolean;
  };
}): Promise<void> {
  await writeLocalFirst('consent_records', {
    id: newLocalId(),
    actor_id: input.actorId,
    version: input.version,
    purposes_json: JSON.stringify(input.purposes ?? ['care_delivery', 'ai_assist', 'analytics']),
    medical_disclaimer: 1,
    privacy_policy: 1,
    data_processing: 1,
    is_minor: input.guardian?.isMinor ? 1 : 0,
    guardian_name: input.guardian?.guardianName ?? null,
    guardian_relationship: input.guardian?.guardianRelationship ?? null,
    guardian_acknowledged: input.guardian?.guardianAcknowledged ? 1 : 0,
    accepted_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

export async function requestDataExport(actorId: string): Promise<{ id: string; payload: unknown }> {
  const patients = await listPatientsLocal();
  const session = await getSecureSession();
  const payload = {
    exportedAt: nowIso(),
    actorId,
    session,
    patients,
    consent: await listLocal('consent_records', [{ column: 'actor_id', value: actorId }]),
  };
  const id = newLocalId();
  await writeLocalFirst('data_rights_requests', {
    id,
    actor_id: actorId,
    request_type: 'export',
    status: 'processed',
    payload_json: JSON.stringify(payload),
    processed_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  return { id, payload };
}

export async function requestErasure(actorId: string): Promise<{ id: string }> {
  const id = newLocalId();
  await writeLocalFirst('data_rights_requests', {
    id,
    actor_id: actorId,
    request_type: 'erasure',
    status: 'requested',
    payload_json: JSON.stringify({ reason: 'data_principal_request' }),
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  // Soft-delete local patient rows linked to this profile
  const patients = await listLocal('patients', [{ column: 'profile_id', value: actorId }]);
  for (const p of patients) {
    await writeLocalFirst('patients', {
      ...p,
      deleted_at: nowIso(),
      name: 'REDACTED',
      phone_enc: null,
      abha_id_enc: null,
      updated_at: nowIso(),
    });
  }

  return { id };
}

export async function listDataRightsRequests(actorId: string) {
  return listLocal('data_rights_requests', [{ column: 'actor_id', value: actorId }]);
}
