import { BuildingType } from "../../../generated/prisma/enums";

export interface ICreateBuildingPayload {
    name: string;
    type?: BuildingType;
    address: string;
    city?: string;
    area?: string;
    totalFloors?: number;
    description?: string;
    imageUrl?: string;
    caretakerId?: string;
}

export interface IUpdateBuildingPayload {
    name?: string;
    type?: BuildingType;
    address?: string;
    city?: string;
    area?: string;
    totalFloors?: number;
    description?: string;
    imageUrl?: string;
    isActive?: boolean;
}

export interface IAssignCaretakerPayload {
    caretakerId: string | null;
}
