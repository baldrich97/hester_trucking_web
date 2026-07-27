import {describe, expect, it} from "vitest";
import {
    getDriverFormComplianceEndDate,
    isDriverFormRecordCompliant,
    isDriverFormExpiringSoon,
    isDriverLicenseExpiringSoon,
    startOfDay,
} from "../../src/utils/driverFormCompliance";

describe("driverFormCompliance", () => {
    const now = new Date("2024-06-15T12:00:00");

    it("NONE cadence never expires", () => {
        const end = getDriverFormComplianceEndDate(
            {Created: new Date("2020-01-01"), Expiration: null},
            "NONE",
            null,
        );
        expect(end).toBeNull();
        expect(
            isDriverFormRecordCompliant(
                {Created: new Date("2020-01-01"), Expiration: null},
                "NONE",
                null,
                now,
            ),
        ).toBe(true);
    });

    it("EXPIRATION_DATE uses Expiration field", () => {
        const exp = new Date("2024-12-31");
        const end = getDriverFormComplianceEndDate(
            {Created: new Date("2024-01-01"), Expiration: exp},
            "EXPIRATION_DATE",
            null,
        );
        expect(end?.getTime()).toBe(startOfDay(exp).getTime());
    });

    it("CALENDAR_YEAR ends Dec 31 of created year", () => {
        const end = getDriverFormComplianceEndDate(
            {Created: new Date("2024-03-01"), Expiration: null},
            "CALENDAR_YEAR",
            null,
        );
        expect(end?.getMonth()).toBe(11);
        expect(end?.getDate()).toBe(31);
    });

    it("ROLLING_MONTHS adds validity months", () => {
        const created = new Date("2024-01-15");
        const end = getDriverFormComplianceEndDate(
            {Created: created, Expiration: null},
            "ROLLING_MONTHS",
            3,
        );
        expect(end).not.toBeNull();
        expect(end!.getMonth()).toBe(3);
    });

    it("detects license expiring soon", () => {
        const soon = new Date("2024-06-20");
        expect(isDriverLicenseExpiringSoon(soon, 30, now)).toBe(true);
        expect(isDriverLicenseExpiringSoon(new Date("2025-01-01"), 30, now)).toBe(false);
    });

    it("treats @db.Date UTC-midnight license dates as their calendar day (no tz shift)", () => {
        // MySQL DATE columns come back as UTC midnight; in timezones west of UTC a local
        // startOfDay used to shift this back a day and mark today's license as expired.
        const storedToday = new Date("2024-06-15T00:00:00.000Z");
        expect(isDriverLicenseExpiringSoon(storedToday, 30, now)).toBe(true);
    });

    it("detects form expiring soon within window", () => {
        const record = {Created: new Date("2024-06-01"), Expiration: new Date("2024-06-25")};
        expect(isDriverFormExpiringSoon(record, "EXPIRATION_DATE", null, 30, now)).toBe(true);
    });
});
