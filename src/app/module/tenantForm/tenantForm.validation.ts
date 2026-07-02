import z from "zod";

const emergencyContactSchema = z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(6).max(20),
    address: z.string().max(200).optional(),
    relationship: z.string().max(50).optional(),
});

const familyMemberSchema = z.object({
    name: z.string().min(1).max(100),
    age: z.coerce.date().optional(),
    relationship: z.string().max(50).optional(),
    occupation: z.string().max(100).optional(),
    contactNumber: z.string().max(20).optional(),
});

const staffSchema = z.object({
    name: z.string().min(1).max(100),
    age: z.coerce.date().optional(),
    nidNumber: z.string().max(50).optional(),
    contactNumber: z.string().max(20).optional(),
    parmanentAddress: z.string().max(200).optional(),
});

const personSchema = z.object({
    name: z.string().min(1).max(100),
    contactNumber: z.string().max(20).optional(),
    address: z.string().max(200).optional(),
});

export const createTenantFormZodSchema = z.object({
    tenantId: z.string().min(1),
    name: z.string().min(1).max(100),
    fatherName: z.string().min(1).max(100),
    motherName: z.string().max(100).optional(),
    dateOfBirth: z.coerce.date().optional(),
    maritalStatus: z.string().max(50).optional(),
    parmanentAddress: z.string().max(200).optional(),
    occupationAndAddress: z.string().max(200).optional(),
    religion: z.string().max(50).optional(),
    educationalQualification: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    email: z.email().optional(),
    nidNumber: z.string().max(50).optional(),
    passportNumber: z.string().max(50).optional(),
    reasonForMoving: z.string().max(300).optional(),
    rentDate: z.coerce.date().optional(),
    submittedToPolice: z.boolean().optional(),

    division: z.string().max(100).optional(),
    thana: z.string().max(100).optional(),
    flatFloor: z.string().max(50).optional(),
    houseNo: z.string().max(50).optional(),
    roadNo: z.string().max(50).optional(),
    areaName: z.string().max(100).optional(),
    postCode: z.string().max(20).optional(),

    emergencyContact: emergencyContactSchema.optional(),
    familyMembers: z.array(familyMemberSchema).optional(),
    maidInfo: staffSchema.optional(),
    driverInfo: staffSchema.optional(),
    previousHouseOwner: personSchema.optional(),
    presentHouseOwner: personSchema.optional(),
});

export const updateTenantFormZodSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    fatherName: z.string().min(1).max(100).optional(),
    motherName: z.string().max(100).optional(),
    dateOfBirth: z.coerce.date().optional(),
    maritalStatus: z.string().max(50).optional(),
    parmanentAddress: z.string().max(200).optional(),
    occupationAndAddress: z.string().max(200).optional(),
    religion: z.string().max(50).optional(),
    educationalQualification: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    email: z.email().optional(),
    nidNumber: z.string().max(50).optional(),
    passportNumber: z.string().max(50).optional(),
    reasonForMoving: z.string().max(300).optional(),
    rentDate: z.coerce.date().optional(),
    submittedToPolice: z.boolean().optional(),

    division: z.string().max(100).optional(),
    thana: z.string().max(100).optional(),
    flatFloor: z.string().max(50).optional(),
    houseNo: z.string().max(50).optional(),
    roadNo: z.string().max(50).optional(),
    areaName: z.string().max(100).optional(),
    postCode: z.string().max(20).optional(),

    emergencyContact: emergencyContactSchema.optional(),
    familyMembers: z.array(familyMemberSchema).optional(),
    maidInfo: staffSchema.optional(),
    driverInfo: staffSchema.optional(),
    previousHouseOwner: personSchema.optional(),
    presentHouseOwner: personSchema.optional(),
});
