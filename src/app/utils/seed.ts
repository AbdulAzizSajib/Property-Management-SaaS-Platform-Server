import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
    try {
        if (!envVars.SUPER_ADMIN_EMAIL || !envVars.SUPER_ADMIN_PASSWORD) {
            console.log("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping super admin seeding.");
            return;
        }

        const isSuperAdminExist = await prisma.user.findFirst({
            where: {
                role: Role.SUPER_ADMIN,
            },
        });

        if (isSuperAdminExist) {
            console.log("Super admin already exists. Skipping seeding super admin.");
            return;
        }

        const superAdminUser = await auth.api.signUpEmail({
            body: {
                email: envVars.SUPER_ADMIN_EMAIL,
                password: envVars.SUPER_ADMIN_PASSWORD,
                name: "Super Admin",
                rememberMe: false,
            },
        });

        const superAdmin = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: superAdminUser.user.id },
                data: {
                    emailVerified: true,
                    role: Role.SUPER_ADMIN,
                },
            });

            await tx.admin.create({
                data: {
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                },
            });

            return user;
        });

        console.log("Super Admin Created ", superAdmin);
    } catch (error) {
        console.error("Error seeding super admin: ", error);
    }
};
