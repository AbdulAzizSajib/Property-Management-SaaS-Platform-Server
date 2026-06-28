import cron from "node-cron";
import { SubscriptionStatus } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";

// Safety net on top of the per-request check in requireActiveOrg: catches orgs
// that simply stop making requests, so an expired trial / lapsed renewal is
// reflected even without traffic.
const expireLapsedSubscriptions = async () => {
    const now = new Date();

    const [trials, renewals] = await Promise.all([
        // Trial window elapsed.
        prisma.subscription.updateMany({
            where: {
                status: SubscriptionStatus.TRIALING,
                trialEndsAt: { lt: now },
            },
            data: { status: SubscriptionStatus.EXPIRED },
        }),
        // Paid period ended (endDate is set when a billing cycle is recorded).
        prisma.subscription.updateMany({
            where: {
                endDate: { lt: now },
                status: {
                    notIn: [
                        SubscriptionStatus.EXPIRED,
                        SubscriptionStatus.CANCELLED,
                        SubscriptionStatus.PAST_DUE,
                    ],
                },
            },
            data: { status: SubscriptionStatus.EXPIRED },
        }),
    ]);

    const total = trials.count + renewals.count;
    if (total > 0) {
        console.log(`[cron] Expired ${total} lapsed subscription(s)`);
    }
};

export const startSubscriptionJobs = () => {
    // Top of every hour.
    cron.schedule("0 * * * *", () => {
        void expireLapsedSubscriptions().catch((e) =>
            console.error("[cron] subscription expiry failed", e),
        );
    });
    // And once shortly after boot.
    void expireLapsedSubscriptions().catch(() => {});
};
