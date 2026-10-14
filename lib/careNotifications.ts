import { getAshaProfileStats, getDoctorProfileStats } from './profileStats';
import { notifyCareTeamDigest, notifyAppointmentReminder } from './notifications';
import { sendServerPush } from './serverPush';
import { getDoctorAppointments } from './api';
import { formatAppointmentTime, isAppointmentToday } from './formatters';
import type { UserRole } from './roles';

export async function syncRoleNotifications(userId: string, role: UserRole): Promise<void> {
  if (role === 'asha') {
    const stats = await getAshaProfileStats(userId);
    const parts: string[] = [];
    if (stats.pendingTasks > 0) parts.push(`${stats.pendingTasks} urgent task(s)`);
    if (stats.activeAlerts > 0) parts.push(`${stats.activeAlerts} priority alert(s)`);
    if (stats.dueVaccinations > 0) parts.push(`${stats.dueVaccinations} vaccination(s) due`);
    const body = parts.join(' · ') || 'Review your dashboard';

    await notifyCareTeamDigest({
      urgentTasks: stats.pendingTasks,
      highAlerts: stats.activeAlerts,
      dueVaccinations: stats.dueVaccinations,
    });
    await sendServerPush({
      profileId: userId,
      title: 'VitaWeave - Action needed',
      body,
      data: { type: 'care_digest' },
    });
    return;
  }

  if (role === 'doctor') {
    const stats = await getDoctorProfileStats(userId);
    const appointments = await getDoctorAppointments(userId);
    const nextToday = appointments.find(
      (a) => isAppointmentToday(a.appointmentTime) && a.status === 'Scheduled'
    );
    if (nextToday) {
      await notifyAppointmentReminder(
        nextToday.patientName ?? 'Patient',
        formatAppointmentTime(nextToday.appointmentTime)
      );
      await sendServerPush({
        profileId: userId,
        title: 'Upcoming consultation',
        body: `${nextToday.patientName ?? 'Patient'} at ${formatAppointmentTime(nextToday.appointmentTime)}`,
        data: { type: 'appointment', appointmentId: nextToday.id },
      });
    }
    if (stats.todayAppointments > 0) {
      await notifyCareTeamDigest({
        urgentTasks: stats.todayAppointments,
        highAlerts: 0,
      });
    }
  }
}
