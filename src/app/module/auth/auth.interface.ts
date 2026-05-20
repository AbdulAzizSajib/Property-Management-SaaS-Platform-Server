export interface ILoginUserPayload {
    email: string;
    password: string;
}

export interface IRegisterOwnerPayload {
    name: string;
    email: string;
    password: string;
    contactNumber?: string;
    organization: {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
    };
}

export interface IChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}
