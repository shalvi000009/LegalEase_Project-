import { PrismaClient, IntegrationProvider, ScanAction } from '@prisma/client';
import { encryptToken, decryptToken } from '../utils/crypto';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/integrations/google/callback';

export interface OAuthConnectPayload {
  code?: string;
  folder_id?: string;
  email_address?: string;
}

export class IntegrationService {
  /**
   * Generate Google OAuth2 Consent URL for Gmail
   */
  static getGmailAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent`;
  }

  /**
   * Generate Google OAuth2 Consent URL for Google Drive
   */
  static getDriveAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent`;
  }

  /**
   * Exchange OAuth authorization code for Access & Refresh tokens
   */
  static async exchangeCodeForTokens(code: string) {
    if (GOOGLE_CLIENT_ID === 'mock-google-client-id') {
      return {
        access_token: `mock_access_token_${Date.now()}`,
        refresh_token: `mock_refresh_token_${Date.now()}`,
        expires_in: 3600,
        email: 'user@example.com',
      };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange Google auth code: ${errorText}`);
    }

    const data = (await response.json()) as any;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      email: data.email || 'user@example.com',
    };
  }

  /**
   * Connect Gmail integration
   */
  static async connectGmail(userId: string, payload: OAuthConnectPayload) {
    let accessToken = `mock_access_token_${Date.now()}`;
    let refreshToken = `mock_refresh_token_${Date.now()}`;
    let emailAddress = payload.email_address || 'user@gmail.com';

    if (payload.code) {
      const tokenData = await this.exchangeCodeForTokens(payload.code);
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || refreshToken;
      emailAddress = tokenData.email || emailAddress;
    }

    const encryptedAccess = encryptToken(accessToken);
    const encryptedRefresh = encryptToken(refreshToken);

    // Upsert integration record
    const existing = await prisma.integration.findFirst({
      where: { user_id: userId, provider: IntegrationProvider.gmail },
    });

    if (existing) {
      return await prisma.integration.update({
        where: { id: existing.id },
        data: {
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          email_address: emailAddress,
          is_active: true,
          updated_at: new Date(),
        },
      });
    }

    return await prisma.integration.create({
      data: {
        user_id: userId,
        provider: IntegrationProvider.gmail,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        email_address: emailAddress,
        is_active: true,
      },
    });
  }

  /**
   * Connect Google Drive integration with folder selection
   */
  static async connectGoogleDrive(userId: string, payload: OAuthConnectPayload) {
    let accessToken = `mock_access_token_${Date.now()}`;
    let refreshToken = `mock_refresh_token_${Date.now()}`;
    let emailAddress = payload.email_address || 'user@drive.com';
    const folderId = payload.folder_id || 'root';

    if (payload.code) {
      const tokenData = await this.exchangeCodeForTokens(payload.code);
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || refreshToken;
      emailAddress = tokenData.email || emailAddress;
    }

    const encryptedAccess = encryptToken(accessToken);
    const encryptedRefresh = encryptToken(refreshToken);

    const existing = await prisma.integration.findFirst({
      where: { user_id: userId, provider: IntegrationProvider.google_drive },
    });

    if (existing) {
      return await prisma.integration.update({
        where: { id: existing.id },
        data: {
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          email_address: emailAddress,
          folder_id: folderId,
          is_active: true,
          updated_at: new Date(),
        },
      });
    }

    return await prisma.integration.create({
      data: {
        user_id: userId,
        provider: IntegrationProvider.google_drive,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        email_address: emailAddress,
        folder_id: folderId,
        is_active: true,
      },
    });
  }

  /**
   * Disconnect an integration
   */
  static async disconnectIntegration(userId: string, integrationId: string) {
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, user_id: userId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    return await prisma.integration.update({
      where: { id: integrationId },
      data: { is_active: false, access_token: null, refresh_token: null },
    });
  }

  /**
   * List all user integrations
   */
  static async getUserIntegrations(userId: string) {
    const list = await prisma.integration.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return list.map((item) => ({
      ...item,
      access_token: item.access_token ? '[ENCRYPTED]' : null,
      refresh_token: item.refresh_token ? '[ENCRYPTED]' : null,
    }));
  }

  /**
   * Get paginated scan log history for user
   */
  static async getScanHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.scanLog.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          integration: { select: { provider: true, email_address: true } },
          document: { select: { id: true, filename: true, status: true } },
        },
      }),
      prisma.scanLog.count({ where: { user_id: userId } }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Handle SendGrid Inbound Email Parse Webhook
   */
  static async handleInboundEmailWebhook(payload: any) {
    const sender = payload.from || payload.sender || 'unknown@domain.com';
    const subject = payload.subject || 'Inbound Contract Email';
    const recipient = payload.to || '';

    // Extract target user if user_id or email is matched
    const user = await prisma.user.findFirst({
      where: { email: { equals: sender.toLowerCase() } },
    });

    const targetUserId = user?.id || (await prisma.user.findFirst())?.id;
    if (!targetUserId) {
      return { status: 'skipped', reason: 'No matching user found' };
    }

    // Get or create inbound_email integration record
    let integration = await prisma.integration.findFirst({
      where: { user_id: targetUserId, provider: IntegrationProvider.inbound_email },
    });

    if (!integration) {
      integration = await prisma.integration.create({
        data: {
          user_id: targetUserId,
          provider: IntegrationProvider.inbound_email,
          email_address: sender,
          is_active: true,
        },
      });
    }

    // Record scan log entry
    const scanLog = await prisma.scanLog.create({
      data: {
        user_id: targetUserId,
        integration_id: integration.id,
        source_ref: `inbound_msg_${Date.now()}`,
        source_name: subject,
        action: ScanAction.detected,
        classifier_score: 0.85,
      },
    });

    return {
      status: 'processed',
      scan_log_id: scanLog.id,
      sender,
      subject,
    };
  }
}
