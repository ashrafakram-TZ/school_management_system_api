import { TransportMode } from '../transport/entities/student-transport.entity';
import { TripKind } from './entities/transport-trip.entity';
import { BoardingAction } from './entities/trip-boarding.entity';
import { ridesOn, tripLabel } from './tracking.logic';

export interface Refusal {
  code: string;
  message: string;
}

export type BoardingStep = 'record' | 'duplicate' | 'not_boarded';

export function routeRefusal(
  assignment: { route_id: number; mode: TransportMode } | null,
  trip: { route_id: number; kind: TripKind },
): Refusal | null {
  if (!assignment || assignment.route_id !== trip.route_id) {
    return { code: 'NOT_ON_THIS_ROUTE', message: 'This student is not on this bus route' };
  }
  if (!ridesOn(assignment.mode, trip.kind)) {
    return { code: 'NOT_ON_THIS_TRIP', message: `This student does not ride the ${tripLabel(trip.kind).en}` };
  }
  return null;
}

export function boardingStep(recorded: BoardingAction[], action: BoardingAction): BoardingStep {
  if (recorded.includes(action)) return 'duplicate';
  if (action === 'alighted' && !recorded.includes('boarded')) return 'not_boarded';
  return 'record';
}

export function boardingStopId(action: BoardingAction, kind: TripKind, assignedStopId: number): number | null {
  const atHomeStop = (kind === 'pickup' && action === 'boarded') || (kind === 'drop' && action === 'alighted');
  return atHomeStop ? assignedStopId : null;
}

export function clockIn(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone }).format(at);
}
