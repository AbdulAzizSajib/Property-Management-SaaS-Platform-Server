import { UnitStatus, UnitType } from "../../../generated/prisma/enums";

export interface ICreateUnitPayload {
    buildingId: string;
    floorId?: string;
    name: string;
    type?: UnitType;
    bedrooms?: number;
    bathrooms?: number;
    drawingRooms?: number;
    diningRooms?: number;
    kitchens?: number;
    balconies?: number;
    sizeSqft?: number;
    baseRent: number;
    serviceCharge?: number;
    description?: string;
}

export interface IUpdateUnitPayload {
    floorId?: string;
    name?: string;
    type?: UnitType;
    status?: UnitStatus;
    bedrooms?: number;
    bathrooms?: number;
    drawingRooms?: number;
    diningRooms?: number;
    kitchens?: number;
    balconies?: number;
    sizeSqft?: number;
    baseRent?: number;
    serviceCharge?: number;
    description?: string;
}

export interface IUnitQuery {
    buildingId?: string;
    floorId?: string;
    status?: UnitStatus;
    type?: UnitType;
}
