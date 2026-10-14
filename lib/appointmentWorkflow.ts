import { updateAppointmentStatus, logVideoCallSession } from './api';
import { generateChannelName } from './agora';
import type { AppointmentRecord } from '../app/_constants/data';

export type TelemedicineSession = {
  appointmentId: string;
  channelName: string;
  doctorId: string;
};

export async function startTelemedicineSession(
  appointment: AppointmentRecord,
  doctorId: string
): Promise<TelemedicineSession> {
  if (appointment.status === 'Scheduled') {
    await updateAppointmentStatus(appointment.id, 'Active');
  }

  const channelName = generateChannelName(doctorId, appointment.id);

  await logVideoCallSession({
    appointmentId: appointment.id,
    channelName,
    hostId: doctorId,
    status: 'Active',
  });

  return { appointmentId: appointment.id, channelName, doctorId };
}

export async function completeTelemedicineSession(
  appointmentId: string,
  doctorId: string,
  channelName: string
): Promise<void> {
  await updateAppointmentStatus(appointmentId, 'Completed');
  await logVideoCallSession({
    appointmentId,
    channelName,
    hostId: doctorId,
    status: 'Completed',
  });
}
