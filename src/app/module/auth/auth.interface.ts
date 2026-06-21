export interface ILoginUserPayload {
    identifier: string; // email or phone number
    password: string;
}

export interface IRegisterOwnerPayload {
    name: string;
    email: string;
    password: string;
    contactNumber?: string;
}

export interface IChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}
