import type {MockPrisma} from "./prismaMock";

/** Minimal Prisma mock chain for rematchLoadToJob when no existing daily/job. */
export function setupRematchMocks(prisma: MockPrisma, jobId = 100): void {
    prisma.dailies.findFirst.mockResolvedValue(null);
    prisma.dailies.create.mockResolvedValue({ID: 1, DriverID: 1, Week: "2026-W30"} as never);
    prisma.weeklies.create.mockResolvedValue({ID: 10, CompanyRate: 15} as never);
    prisma.jobs.create.mockResolvedValue({ID: jobId} as never);
}

export const baseLoadMutationInput = {
    DriverID: 1,
    TruckID: 2,
    CustomerID: 3,
    LoadTypeID: 116,
    DeliveryLocationID: 4,
    Week: "2026-W30",
    StartDate: new Date("2026-07-20"),
    Created: new Date("2026-07-20"),
    TruckRate: 10,
    MaterialRate: 5,
    DriverRate: 8,
    TotalRate: 15,
    TotalAmount: 270,
    Weight: 18,
    TicketNumber: 999001,
};
