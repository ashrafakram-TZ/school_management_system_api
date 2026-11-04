import { TICKET_SEVERITIES, TicketSeverity, TicketStatus } from './entities/maintenance-ticket.entity';

export const DTC_PATTERN = /^[PCBU][0-9A-F]{4}$/;

export interface VehicleFaultEvent {
  id?: number;
  type: 'vehicle.fault';
  at?: string;
  device_id?: number;
  fault?: { code?: string; description?: string; severity?: string };
  odometer_km?: number;
}

export interface FaultTicketDraft {
  device_id: number;
  fault_code: string;
  severity: TicketSeverity | null;
  title: string;
  description: string;
  odometer_km: number | null;
  opened_at: Date;
  telematics_fault_id: number | null;
}

export interface FuelEconomy {
  km_since_last: number | null;
  km_per_litre: number | null;
}

export interface OdometerReading {
  odometer_km: number;
  filled_on: string;
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export function faultTicket(event: VehicleFaultEvent, now = new Date()): FaultTicketDraft | null {
  const deviceId = Number(event.device_id);
  const code = String(event.fault?.code ?? '')
    .trim()
    .toUpperCase();
  if (!Number.isInteger(deviceId) || deviceId <= 0 || !DTC_PATTERN.test(code)) return null;
  const severity = TICKET_SEVERITIES.includes(event.fault?.severity as TicketSeverity)
    ? (event.fault!.severity as TicketSeverity)
    : null;
  const description = (event.fault?.description ?? '').trim().slice(0, 1000) || `Fault code ${code}`;
  const at = event.at ? new Date(event.at) : now;
  const odometer = Number(event.odometer_km);
  return {
    device_id: deviceId,
    fault_code: code,
    severity,
    title: `${code}: ${description}`.slice(0, 150),
    description,
    odometer_km: event.odometer_km != null && Number.isFinite(odometer) && odometer >= 0 ? round(odometer, 1) : null,
    opened_at: Number.isNaN(at.getTime()) ? now : at,
    telematics_fault_id: Number.isInteger(event.id) && event.id! > 0 ? event.id! : null,
  };
}

export function closedAtFor(current: TicketStatus, next: TicketStatus, closedAt: Date | null, now: Date): Date | null {
  if (next !== 'done') return null;
  return current === 'done' && closedAt ? closedAt : now;
}

export function fuelEconomy(odometer: number, previousOdometer: number | null, litres: number): FuelEconomy {
  if (previousOdometer === null || odometer < previousOdometer) return { km_since_last: null, km_per_litre: null };
  const km = round(odometer - previousOdometer, 1);
  return { km_since_last: km, km_per_litre: litres > 0 && km > 0 ? round(km / litres, 2) : null };
}

export function pricePerLitre(amount: number, litres: number): number {
  return litres > 0 ? round(amount / litres, 2) : 0;
}

export function odometerProblem(
  odometer: number,
  previous: OdometerReading | null,
  next: OdometerReading | null,
): string | null {
  if (previous && odometer < previous.odometer_km) {
    return `odometer_km must be at least ${previous.odometer_km} km, the reading on ${previous.filled_on}`;
  }
  if (next && odometer > next.odometer_km) {
    return `odometer_km must be at most ${next.odometer_km} km, the reading on ${next.filled_on}`;
  }
  return null;
}

export function averageKmPerLitre(rows: { km: number | null; litres: number }[]): number | null {
  const counted = rows.filter((row) => row.km !== null && row.km > 0);
  const litres = counted.reduce((sum, row) => sum + row.litres, 0);
  const km = counted.reduce((sum, row) => sum + row.km!, 0);
  return litres > 0 ? round(km / litres, 2) : null;
}
