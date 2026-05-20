import { prisma } from "../lib/prisma";

const toSlug = (input: string): string =>
    input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

export const generateUniqueOrgSlug = async (name: string): Promise<string> => {
    const base = toSlug(name) || "org";
    let candidate = base;
    let counter = 2;

    while (true) {
        const existing = await prisma.organization.findUnique({
            where: { slug: candidate },
            select: { id: true },
        });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
};
