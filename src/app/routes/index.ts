import { Router } from "express";
import { AdminRoutes } from "../module/admin/admin.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { BuildingRoutes } from "../module/building/building.route";
import { FloorRoutes } from "../module/floor/floor.route";
import { InvoiceRoutes } from "../module/invoice/invoice.route";
import { LeaseRoutes } from "../module/lease/lease.route";
import { OrganizationRoutes } from "../module/organization/organization.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { SubscriptionRoutes } from "../module/subscription/subscription.route";
import { TenantRoutes } from "../module/tenant/tenant.route";
import { UnitRoutes } from "../module/unit/unit.route";
import { UserRoutes } from "../module/user/user.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/users", UserRoutes);
router.use("/admins", AdminRoutes);
router.use("/organizations", OrganizationRoutes);
router.use("/subscriptions", SubscriptionRoutes);
router.use("/buildings", BuildingRoutes);
router.use("/floors", FloorRoutes);
router.use("/units", UnitRoutes);
router.use("/tenants", TenantRoutes);
router.use("/leases", LeaseRoutes);
router.use("/invoices", InvoiceRoutes);
router.use("/payments", PaymentRoutes);

export const IndexRoutes = router;
