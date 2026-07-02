export interface IPersonPayload {
    name: string;
    contactNumber?: string;
    address?: string;
}

export interface IEmergencyContactPayload {
    name: string;
    phone: string;
    address?: string;
    relationship?: string;
}

export interface IFamilyMemberPayload {
    name: string;
    age?: string;
    relationship?: string;
    occupation?: string;
    contactNumber?: string;
}

export interface IStaffPayload {
    name: string;
    age?: string;
    nidNumber?: string;
    contactNumber?: string;
    parmanentAddress?: string;
}

export interface ICreateTenantFormPayload {
    tenantId: string;
    name: string;
    fatherName: string;
    motherName?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    parmanentAddress?: string;
    occupationAndAddress?: string;
    religion?: string;
    educationalQualification?: string;
    phone?: string;
    email?: string;
    nidNumber?: string;
    passportNumber?: string;
    reasonForMoving?: string;
    rentDate?: string;
    submittedToPolice?: boolean;

    // Police-form header + property address
    division?: string;
    thana?: string;
    flatFloor?: string;
    houseNo?: string;
    roadNo?: string;
    areaName?: string;
    postCode?: string;

    emergencyContact?: IEmergencyContactPayload;
    familyMembers?: IFamilyMemberPayload[];
    maidInfo?: IStaffPayload;
    driverInfo?: IStaffPayload;
    previousHouseOwner?: IPersonPayload;
    presentHouseOwner?: IPersonPayload;
}

export interface IUpdateTenantFormPayload {
    name?: string;
    fatherName?: string;
    motherName?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    parmanentAddress?: string;
    occupationAndAddress?: string;
    religion?: string;
    educationalQualification?: string;
    phone?: string;
    email?: string;
    nidNumber?: string;
    passportNumber?: string;
    reasonForMoving?: string;
    rentDate?: string;
    submittedToPolice?: boolean;

    division?: string;
    thana?: string;
    flatFloor?: string;
    houseNo?: string;
    roadNo?: string;
    areaName?: string;
    postCode?: string;

    // Nested children. When a key is present it is upserted; familyMembers
    // (when present) replaces the whole list. Omit a key to leave it unchanged.
    emergencyContact?: IEmergencyContactPayload;
    familyMembers?: IFamilyMemberPayload[];
    maidInfo?: IStaffPayload;
    driverInfo?: IStaffPayload;
    previousHouseOwner?: IPersonPayload;
    presentHouseOwner?: IPersonPayload;
}
