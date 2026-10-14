import { getPatientsForCaregiver } from './api';
import type { Patient } from '../app/_constants/data';

export type FieldRouteStop = {
  id: string;
  name: string;
  ward: string;
  condition: string;
  urgencyScore: number;
  followUpUrgent: boolean;
  query: string;
};

export async function getFieldRouteStops(ashaId: string, limit = 6): Promise<FieldRouteStop[]> {
  const patients = await getPatientsForCaregiver(ashaId, 'asha');

  return patients
    .filter((p) => p.followUpUrgent || (p.urgencyScore ?? 0) >= 40)
    .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0))
    .slice(0, limit)
    .map((p) => toStop(p));
}

function toStop(p: Patient): FieldRouteStop {
  const ward = p.ward ?? 'local ward';
  return {
    id: p.id,
    name: p.name,
    ward,
    condition: p.condition,
    urgencyScore: p.urgencyScore ?? 0,
    followUpUrgent: p.followUpUrgent,
    query: `${p.name}, ${ward}, India`,
  };
}

export function buildGoogleMapsDirectionsUrl(stops: FieldRouteStop[]): string | null {
  if (!stops.length) return null;
  const destination = encodeURIComponent(stops[stops.length - 1].query);
  const waypoints = stops
    .slice(0, -1)
    .map((s) => encodeURIComponent(s.query))
    .join('|');

  if (waypoints) {
    return `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&destination=${destination}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}
