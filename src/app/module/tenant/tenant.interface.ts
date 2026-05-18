export interface ICreateTenantPayload {
    name: string;
    phone: string;
    email?: string;
    nidNumber?: string;
    emergencyContact?: string;
    emergencyName?: string;
    occupation?: string;
    permanentAddress?: string;
    photoUrl?: string;
    createLoginAccount?: boolean;
    password?: string;
}

export interface IUpdateTenantPayload {
    name?: string;
    phone?: string;
    email?: string;
    nidNumber?: string;
    emergencyContact?: string;
    emergencyName?: string;
    occupation?: string;
    permanentAddress?: string;
    photoUrl?: string;
    isActive?: boolean;
}
