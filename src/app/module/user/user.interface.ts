import { Role } from "../../../generated/prisma/enums";

export interface ICreateStaffPayload {
    password: string;
    role: Extract<Role, "MANAGER" | "CARETAKER">;
    user: {
        name: string;
        email: string;
        contactNumber?: string;
        image?: string;
    };
    // For MANAGER: optional buildings to assign on creation
    // For CARETAKER: optional building to assign (one caretaker per building)
    buildingIds?: string[];
}

export interface ICreateTenantPayload {
    tenant: {
        name: string;
        phone: string;
        email?: string;
        nidNumber?: string;
        emergencyContact?: string;
        emergencyName?: string;
        occupation?: string;
        permanentAddress?: string;
        photoUrl?: string;
    };
    // If true, also create a User account for tenant-app login
    createLoginAccount?: boolean;
    password?: string;
}
