export interface ICreateFloorPayload {
    buildingId: string;
    name: string;
    floorNumber: number;
}

export interface IUpdateFloorPayload {
    name?: string;
    floorNumber?: number;
}
