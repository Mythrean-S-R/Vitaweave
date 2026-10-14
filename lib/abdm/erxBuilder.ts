import type { ERxBundle, ERxMedication } from './types';

export type MedicationLine = ERxMedication;

export function buildAbdmPrescription(input: {
  patientId: string;
  patientName: string;
  patientAbha?: string | null;
  doctorId: string;
  doctorName?: string;
  diagnosis?: string;
  medications: MedicationLine[];
  notes?: string;
}): ERxBundle {
  const id = `erx-${Date.now()}`;
  const timestamp = new Date().toISOString();

  return {
    resourceType: 'Bundle',
    type: 'document',
    timestamp,
    identifier: {
      system: 'https://vitaweave.app/abdm/prescription',
      value: id,
    },
    entry: [
      {
        resource: {
          resourceType: 'Composition',
          status: 'final',
          type: {
            coding: [
              {
                system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-document-type',
                code: 'Prescription',
                display: 'Prescription record',
              },
            ],
          },
          subject: {
            reference: input.patientAbha
              ? `Patient/${input.patientAbha}`
              : `Patient/${input.patientId}`,
            display: input.patientName,
          },
          date: timestamp,
          author: [{ reference: `Practitioner/${input.doctorId}`, display: input.doctorName }],
          title: 'Prescription',
          section: [
            {
              title: 'Medications',
              entry: input.medications.map((m, i) => ({
                reference: `MedicationRequest/med-${i}`,
                display: `${m.name} ${m.dose ?? ''} ${m.frequency ?? ''} ${m.duration ?? ''}`.trim(),
              })),
            },
          ],
        },
      },
      ...input.medications.map((m, i) => ({
        resource: {
          resourceType: 'MedicationRequest',
          id: `med-${i}`,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: { text: m.name },
          dosageInstruction: [
            {
              text: [m.dose, m.frequency, m.duration, m.instructions].filter(Boolean).join(' · '),
            },
          ],
        },
      })),
      ...(input.diagnosis
        ? [
            {
              resource: {
                resourceType: 'Condition',
                code: { text: input.diagnosis },
                subject: { reference: `Patient/${input.patientId}` },
              },
            },
          ]
        : []),
      ...(input.notes
        ? [
            {
              resource: {
                resourceType: 'Annotation',
                text: input.notes,
              },
            },
          ]
        : []),
    ],
  };
}
