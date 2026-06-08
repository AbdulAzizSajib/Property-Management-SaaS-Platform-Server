import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { Role } from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { generateUniqueOrgSlug } from "../../utils/slug";
import { tokenUtils } from "../../utils/token";
import { SubscriptionService } from "../subscription/subscription.service";
import {
    IChangePasswordPayload,
    ILoginUserPayload,
    IRegisterOwnerPayload,
} from "./auth.interface";

const buildTokenPayload = (user: {
    id: string;
    role?: string | Role | null;
    name: string;
    email: string;
    isActive?: boolean | null;
    isDeleted?: boolean | null;
    emailVerified: boolean;
    organizationId?: string | null;
}) => ({
    userId: user.id,
    role: (user.role ?? Role.OWNER) as Role,
    name: user.name,
    email: user.email,
    isActive: user.isActive ?? true,
    isDeleted: user.isDeleted ?? false,
    emailVerified: user.emailVerified,
    organizationId: user.organizationId ?? null,
});

const registerOwner = async (payload: IRegisterOwnerPayload) => {
    const { name, email, password, contactNumber, organization } = payload;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    const slug = await generateUniqueOrgSlug(organization.name);

    const data = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
        },
    });

    if (!data.user) {
        throw new AppError(status.BAD_REQUEST, "Failed to register owner");
    }

    try {
        const org = await prisma.$transaction(async (tx) => {
            const createdOrg = await tx.organization.create({
                data: {
                    name: organization.name,
                    slug,
                    phone: organization.phone,
                    email: organization.email,
                    address: organization.address,
                },
            });

            await tx.user.update({
                where: { id: data.user.id },
                data: {
                    organizationId: createdOrg.id,
                    role: Role.OWNER,
                    contactNumber,
                },
            });

            await SubscriptionService.createDefaultSubscriptionForOrg(
                createdOrg.id,
                tx,
            );

            return createdOrg;
        });

        const updatedUser = await prisma.user.findUniqueOrThrow({
            where: { id: data.user.id },
        });

        const tokenPayload = buildTokenPayload(updatedUser);
        const accessToken = tokenUtils.getAccessToken(tokenPayload);
        const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

        return {
            ...data,
            accessToken,
            refreshToken,
            organization: org,
        };
    } catch (error) {
        await prisma.user.delete({ where: { id: data.user.id } });
        throw error;
    }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveEmailFromIdentifier = async (
    identifier: string,
): Promise<string> => {
    const trimmed = identifier.trim();

    if (EMAIL_REGEX.test(trimmed)) {
        return trimmed.toLowerCase();
    }

    // Treat as phone number — look up the user by contactNumber
    const user = await prisma.user.findUnique({
        where: { contactNumber: trimmed },
        select: { email: true },
    });

    if (!user) {
        throw new AppError(
            status.UNAUTHORIZED,
            "Invalid credentials",
        );
    }

    return user.email;
};

const loginUser = async (payload: ILoginUserPayload) => {
    const { identifier, password } = payload;

    const email = await resolveEmailFromIdentifier(identifier);

    const data = await auth.api.signInEmail({ body: { email, password } });

    if (!data.user.isActive) {
        throw new AppError(status.FORBIDDEN, "User account is inactive");
    }

    if (data.user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await prisma.user.update({
        where: { id: data.user.id },
        data: { lastLoginAt: new Date() },
    });

    const tokenPayload = buildTokenPayload(data.user);
    const accessToken = tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

    return { ...data, accessToken, refreshToken };
};

const getMe = async (user: IRequestUser) => {
    const isUserExists = await prisma.user.findUnique({
        where: { id: user.userId },
        include: {
            organization: true,
            tenantProfile: true,
            managedBuildings: { include: { building: true } },
            caretakerOf: true,
        },
    });

    if (!isUserExists) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    return isUserExists;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
    const isSessionTokenExists = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
    });

    if (!isSessionTokenExists) {
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const verifiedRefreshToken = jwtUtils.verifyToken(
        refreshToken,
        envVars.REFRESH_TOKEN_SECRET,
    );

    if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    const data = verifiedRefreshToken.data as JwtPayload;

    const tokenPayload = {
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        isActive: data.isActive,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
        organizationId: data.organizationId,
    };

    const newAccessToken = tokenUtils.getAccessToken(tokenPayload);
    const newRefreshToken = tokenUtils.getRefreshToken(tokenPayload);

    const { token } = await prisma.session.update({
        where: { token: sessionToken },
        data: {
            expiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
            updatedAt: new Date(),
        },
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionToken: token,
    };
};

const changePassword = async (
    payload: IChangePasswordPayload,
    sessionToken: string,
) => {
    const session = await auth.api.getSession({
        headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });

    if (!session) {
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const { currentPassword, newPassword } = payload;

    const result = await auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: true },
        headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });

    if (session.user.needPasswordChange) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { needPasswordChange: false },
        });
    }

    const tokenPayload = buildTokenPayload(session.user);
    const accessToken = tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

    return { ...result, accessToken, refreshToken };
};

const logoutUser = async (sessionToken: string) => {
    const result = await auth.api.signOut({
        headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });

    return result;
};

const verifyEmail = async (email: string, otp: string) => {
    const result = await auth.api.verifyEmailOTP({ body: { email, otp } });

    if (result.status && !result.user.emailVerified) {
        await prisma.user.update({
            where: { email },
            data: { emailVerified: true },
        });
    }
};

const resendVerificationOtp = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true, isActive: true, isDeleted: true },
    });

    if (!user || user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (user.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email is already verified");
    }

    if (!user.isActive) {
        throw new AppError(status.FORBIDDEN, "Account is inactive");
    }

    await auth.api.sendVerificationOTP({
        body: { email, type: "email-verification" },
    });
};

const resendPasswordResetOtp = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true, isActive: true, isDeleted: true },
    });

    if (!user || user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!user.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (!user.isActive) {
        throw new AppError(status.FORBIDDEN, "Account is inactive");
    }

    await auth.api.sendVerificationOTP({
        body: { email, type: "forget-password" },
    });
};

const forgetPassword = async (email: string) => {
    const isUserExist = await prisma.user.findUnique({ where: { email } });

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (isUserExist.isDeleted || !isUserExist.isActive) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await auth.api.requestPasswordResetEmailOTP({ body: { email } });
};

const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string,
) => {
    const isUserExist = await prisma.user.findUnique({ where: { email } });

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (isUserExist.isDeleted || !isUserExist.isActive) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await auth.api.resetPasswordEmailOTP({
        body: { email, otp, password: newPassword },
    });

    if (isUserExist.needPasswordChange) {
        await prisma.user.update({
            where: { id: isUserExist.id },
            data: { needPasswordChange: false },
        });
    }

    await prisma.session.deleteMany({ where: { userId: isUserExist.id } });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleLoginSuccess = async (session: Record<string, any>) => {
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const tokenPayload = buildTokenPayload(user);
    const accessToken = tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

    return { accessToken, refreshToken };
};

export const AuthService = {
    registerOwner,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    logoutUser,
    verifyEmail,
    resendVerificationOtp,
    resendPasswordResetOtp,
    forgetPassword,
    resetPassword,
    googleLoginSuccess,
};
