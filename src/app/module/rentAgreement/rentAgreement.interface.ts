export interface ICreateRentAgreementPayload {
    content?: string;
    validFrom?: string;
    validUntil?: string;
}

export interface ISignRentAgreementPayload {
    role: "owner" | "tenant";
    signatureUrl?: string;
}
