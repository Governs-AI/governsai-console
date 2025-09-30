import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

// DELETE - Remove passkey
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-Governs-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Find API key and get user/org
    const keyRecord = await prisma.aPIKey.findUnique({
      where: { key: apiKey },
      include: {
        user: true,
        org: true,
      },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const passkeyId = params.id;

    // Verify passkey belongs to this user+org
    const passkey = await prisma.passkey.findFirst({
      where: {
        id: passkeyId,
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found' },
        { status: 404 }
      );
    }

    // Delete the passkey
    await prisma.passkey.delete({
      where: { id: passkeyId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        action: 'passkey.delete',
        resource: 'Passkey',
        details: {
          passkeyId: passkey.id,
          deviceName: passkey.deviceName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Passkey removed successfully',
    });

  } catch (error) {
    console.error('Error deleting passkey:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete passkey',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH - Rename passkey
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-Governs-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Find API key and get user/org
    const keyRecord = await prisma.aPIKey.findUnique({
      where: { key: apiKey },
      include: {
        user: true,
        org: true,
      },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const passkeyId = params.id;
    const body = await request.json();
    const { deviceName } = body;

    if (!deviceName || typeof deviceName !== 'string') {
      return NextResponse.json(
        { error: 'Device name required' },
        { status: 400 }
      );
    }

    // Verify passkey belongs to this user+org
    const passkey = await prisma.passkey.findFirst({
      where: {
        id: passkeyId,
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found' },
        { status: 404 }
      );
    }

    // Update device name
    await prisma.passkey.update({
      where: { id: passkeyId },
      data: { deviceName },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        action: 'passkey.rename',
        resource: 'Passkey',
        details: {
          passkeyId: passkey.id,
          oldName: passkey.deviceName,
          newName: deviceName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Passkey renamed successfully',
    });

  } catch (error) {
    console.error('Error renaming passkey:', error);
    return NextResponse.json(
      {
        error: 'Failed to rename passkey',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
