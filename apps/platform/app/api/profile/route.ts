import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@governs-ai/auth";
import {
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    getFullUserData,
    getUserDataCounts
} from "@governs-ai/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // const session = await auth();
        const session = null; // TODO: Implement auth

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get("includeAll") === "true";

        if (includeAll) {
            // Get full user data including profile, activities, goals, etc.
            const [userData, dataCounts] = await Promise.all([
                getFullUserData(session.user.id),
                getUserDataCounts(session.user.id)
            ]);

            if (!userData) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "User not found",
                    },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: {
                    ...userData,
                    counts: dataCounts
                },
            });
        } else {
            // Get just the profile
            const profile = await getUserProfile(session.user.id);

            return NextResponse.json({
                success: true,
                data: profile,
            });
        }
    } catch (error) {
        console.error("Profile API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch profile",
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // const session = await auth();
        const session = null; // TODO: Implement auth

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const {
            targetRole,
            targetSalary,
            targetLocation,
            aiGoals,
            skills,
            experience,
            education,
            linkedin,
            github,
            portfolio,
        } = body;

        // Check if profile exists
        const existingProfile = await getUserProfile(session.user.id);

        let profile;
        if (existingProfile) {
            // Update existing profile
            profile = await updateUserProfile(session.user.id, {
                targetRole,
                targetSalary,
                targetLocation,
                aiGoals,
                skills,
                experience,
                education,
                linkedin,
                github,
                portfolio,
            });
        } else {
            // Create new profile
            profile = await createUserProfile({
                userId: session.user.id,
                targetRole,
                targetSalary,
                targetLocation,
                aiGoals,
                skills,
                experience,
                education,
                linkedin,
                github,
                portfolio,
            });
        }

        return NextResponse.json({
            success: true,
            data: profile,
            message: existingProfile ? "Profile updated successfully" : "Profile created successfully",
        });
    } catch (error) {
        console.error("Update Profile API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update profile",
            },
            { status: 500 }
        );
    }
} 