import { ExpenseCategory, PaymentMethod } from "../../../generated/prisma/enums";

export interface ICreateExpensePayload {
    title: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate?: string;
    paidTo?: string;
    paymentMethod?: PaymentMethod;
    receiptUrl?: string;
    notes?: string;
    buildingId?: string;
    unitId?: string;
}

export interface IUpdateExpensePayload {
    title?: string;
    category?: ExpenseCategory;
    amount?: number;
    expenseDate?: string;
    paidTo?: string;
    paymentMethod?: PaymentMethod;
    receiptUrl?: string;
    notes?: string;
}

export interface IExpenseQuery {
    buildingId?: string;
    unitId?: string;
    category?: string;
    from?: string;
    to?: string;
}
