/** Ticket numbers reserved for automated tests (999001–999999). */
export const TEST_TICKET_MIN = 999001;
export const TEST_TICKET_MAX = 999999;

export const TEST_NAME_PREFIX = "[TEST]";

export function isTestTicket(ticket: number): boolean {
    return ticket >= TEST_TICKET_MIN && ticket <= TEST_TICKET_MAX;
}

export function nextTestTicket(offset: number): number {
    return TEST_TICKET_MIN + offset;
}
