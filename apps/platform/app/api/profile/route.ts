import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, getUserOrganizations } from "@/lib/auth";
import { prisma } from "@governs-ai/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Get session token from cookies
        const sessionToken = request.cookies.get('session')?.value;
        
        if (!sessionToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify session token
        const session = verifySessionToken(sessionToken);
        
        if (!session) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Get user data from database
        const user = await prisma.user.findUnique({
            where: { id: session.sub },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user's organizations
        const memberships = await getUserOrganizations(session.sub);
        
        // Find active org (from session or default to first)
        const activeOrg = memberships.find(m => m.orgId === session.orgId) || memberships[0];

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
            },
            organizations: memberships.map(m => ({
                id: m.org.id,
                name: m.org.name,
                slug: m.org.slug,
                role: m.role,
            })),
            activeOrg: activeOrg ? {
                id: activeOrg.org.id,
                name: activeOrg.org.name,
                slug: activeOrg.org.slug,
                role: activeOrg.role,
            } : null,
        });
    } catch (error) {
        console.error("Profile API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch profile" },
            { status: 500 }
        );
    }
} 