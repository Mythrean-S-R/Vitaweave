/** Format helpers for appointment and date display in UI. */

export function formatAppointmentTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatAppointmentDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} Days`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function isAppointmentToday(iso: string): boolean {
    const date = new Date(iso);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

export function isAppointmentPast(iso: string): boolean {
    return new Date(iso).getTime() < Date.now();
}

export function mapAppointmentStatusToUi(
    status: string,
    appointmentTime: string
): 'completed' | 'in-progress' | 'upcoming' {
    if (status === 'Completed' || status === 'Cancelled' || status === 'No-Show') {
        return 'completed';
    }
    if (status === 'Active') return 'in-progress';
    if (isAppointmentPast(appointmentTime) && status === 'Scheduled') return 'in-progress';
    return 'upcoming';
}

export function formatCampaignDate(dateStr?: string): string {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
