import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateTenantFormPayload,
    IUpdateTenantFormPayload,
} from "./tenantForm.interface";

const assertOrg = (user: IRequestUser) => {
    if (!user.organizationId) {
        throw new AppError(status.FORBIDDEN, "No organization context");
    }
    return user.organizationId;
};

const formInclude = {
    emergencyContact: true,
    familyMembers: true,
    maidInfo: true,
    driverInfo: true,
    previousHouseOwner: true,
    presentHouseOwner: true,
    tenant: { select: { id: true, name: true, phone: true } },
};

const createTenantForm = async (
    user: IRequestUser,
    payload: ICreateTenantFormPayload,
) => {
    const organizationId = assertOrg(user);

    // Tenant must belong to the caller's organization.
    const tenant = await prisma.tenant.findFirst({
        where: { id: payload.tenantId, organizationId },
    });
    if (!tenant) {
        throw new AppError(status.NOT_FOUND, "Tenant not found");
    }

    // One form per tenant (tenantId is @unique).
    const existing = await prisma.tenantForm.findUnique({
        where: { tenantId: payload.tenantId },
    });
    if (existing) {
        throw new AppError(
            status.CONFLICT,
            "A form already exists for this tenant",
        );
    }

    const {
        tenantId,
        emergencyContact,
        familyMembers,
        maidInfo,
        driverInfo,
        previousHouseOwner,
        presentHouseOwner,
        ...scalars
    } = payload;

    return prisma.tenantForm.create({
        data: {
            ...scalars,
            organization: { connect: { id: organizationId } },
            tenant: { connect: { id: tenantId } },
            emergencyContact: emergencyContact
                ? { create: emergencyContact }
                : undefined,
            familyMembers: familyMembers?.length
                ? { create: familyMembers }
                : undefined,
            maidInfo: maidInfo ? { create: maidInfo } : undefined,
            driverInfo: driverInfo ? { create: driverInfo } : undefined,
            previousHouseOwner: previousHouseOwner
                ? { create: previousHouseOwner }
                : undefined,
            presentHouseOwner: presentHouseOwner
                ? { create: presentHouseOwner }
                : undefined,
        },
        include: formInclude,
    });
};

const getAllTenantForms = async (user: IRequestUser) => {
    const organizationId = assertOrg(user);

    return prisma.tenantForm.findMany({
        where: { organizationId },
        include: formInclude,
        orderBy: { createdAt: "desc" },
    });
};

const getTenantFormById = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const form = await prisma.tenantForm.findFirst({
        where: { id, organizationId },
        include: formInclude,
    });

    if (!form) {
        throw new AppError(status.NOT_FOUND, "Tenant form not found");
    }

    return form;
};

const updateTenantForm = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateTenantFormPayload,
) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.tenantForm.findFirst({
        where: { id, organizationId },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Tenant form not found");
    }

    const {
        emergencyContact,
        familyMembers,
        maidInfo,
        driverInfo,
        previousHouseOwner,
        presentHouseOwner,
        ...scalars
    } = payload;

    // A present key is upserted (update if the child exists, else create).
    // An absent key is left untouched.
    const upsert = <T extends object>(data: T | undefined) =>
        data ? { upsert: { create: data, update: data } } : undefined;

    return prisma.tenantForm.update({
        where: { id },
        data: {
            ...scalars,
            emergencyContact: upsert(emergencyContact),
            maidInfo: upsert(maidInfo),
            driverInfo: upsert(driverInfo),
            previousHouseOwner: upsert(previousHouseOwner),
            presentHouseOwner: upsert(presentHouseOwner),
            // Family members is a list — replace the whole set when provided.
            familyMembers: familyMembers
                ? { deleteMany: {}, create: familyMembers }
                : undefined,
        },
        include: formInclude,
    });
};

const deleteTenantForm = async (user: IRequestUser, id: string) => {
    const organizationId = assertOrg(user);

    const existing = await prisma.tenantForm.findFirst({
        where: { id, organizationId },
    });
    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Tenant form not found");
    }

    // Child records cascade-delete via the schema relations.
    return prisma.tenantForm.delete({ where: { id } });
};

export const TenantFormService = {
    createTenantForm,
    getAllTenantForms,
    getTenantFormById,
    updateTenantForm,
    deleteTenantForm,
};
