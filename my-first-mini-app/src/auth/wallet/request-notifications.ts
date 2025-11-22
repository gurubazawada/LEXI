import { MiniKit } from 'minikit-js-dev-preview';

export type MiniAppRequestPermissionSuccessPayload = {
  status: 'success';
  permission: 'notifications';
  timestamp: string; // ISO-8601
  version: number; // same version that was received from MiniKit
};

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * Requests notification permission from the user
 * Should be called after successful authentication
 * @param walletAddress - User's wallet address to register for notifications
 * @returns Promise with the permission result
 */
export async function requestNotificationPermission(walletAddress?: string): Promise<MiniAppRequestPermissionSuccessPayload | null> {
  try {
    const result = await (MiniKit.commandsAsync as any).requestPermission({
      permission: 'notifications',
    });

    if (result?.finalPayload?.status === 'success') {
      console.log('Notification permission granted:', result.finalPayload);
      
      // Register user with backend for notifications
      if (walletAddress) {
        try {
          await fetch(`${BACKEND_URL}/api/notifications/enable`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress }),
          });
          console.log('✓ User registered for notifications in backend');
        } catch (error) {
          console.error('Failed to register user for notifications in backend:', error);
          // Don't fail the permission request if backend call fails
        }
      }
      
      return result.finalPayload as MiniAppRequestPermissionSuccessPayload;
    } else {
      console.log('Notification permission denied or cancelled');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

