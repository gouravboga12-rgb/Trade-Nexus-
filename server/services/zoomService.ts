import dotenv from 'dotenv';
dotenv.config();

export interface ZoomMeetingParams {
  topic: string;
  type?: number; // 1: instant, 2: scheduled
  startTime?: string; // ISO string
  duration?: number; // minutes
  agenda?: string;
  password?: string;
}

export interface ZoomMeetingResponse {
  id: string;
  joinUrl: string;
  startUrl: string;
  password?: string;
  hostEmail?: string;
  topic: string;
  duration?: number;
}

class ZoomService {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private secretToken: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || 'stlSMMQiRE-Y-3Gy-yMPCw';
    this.clientId = process.env.ZOOM_CLIENT_ID || '2bl3CsPGQBu1FZkcvzArA';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || 'Ol8TovXUbrfEyRtL5Hq1A8nkPb5XwueI';
    this.secretToken = process.env.ZOOM_SECRET_TOKEN || 'VHfvyaglRIW8MuGXCNYC8A';
  }

  /**
   * Obtain a valid Server-to-Server OAuth Access Token from Zoom
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Zoom OAuth failed (${res.status}): ${errorText}`);
      }

      const data = await res.json() as { access_token: string; expires_in: number; token_type: string };
      this.cachedToken = data.access_token;
      this.tokenExpiresAt = now + (data.expires_in * 1000);
      return this.cachedToken;
    } catch (error) {
      console.error('[ZoomService] Error obtaining OAuth token:', error);
      throw error;
    }
  }

  /**
   * Create a new Zoom meeting under the authorized account
   */
  public async createMeeting(params: ZoomMeetingParams): Promise<ZoomMeetingResponse> {
    try {
      const token = await this.getAccessToken();

      const payload: any = {
        topic: params.topic || 'Trade Nexus Meeting',
        type: params.type || 2, // 2 = scheduled
        duration: params.duration || 60,
        timezone: 'Asia/Kolkata',
        agenda: params.agenda || 'Trade Nexus Live Meeting',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          jbh_time: 0,
          mute_upon_entry: false,
          waiting_room: false,
          audio: 'both',
          auto_recording: 'none',
          meeting_authentication: false,
        },
      };

      if (params.startTime) {
        payload.start_time = params.startTime;
      }
      if (params.password) {
        payload.password = params.password;
      }

      const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Zoom create meeting failed (${res.status}): ${errorText}`);
      }

      const data = await res.json() as any;

      return {
        id: String(data.id),
        joinUrl: data.join_url,
        startUrl: data.start_url || data.join_url,
        password: data.password || '',
        hostEmail: data.host_email || '',
        topic: data.topic || params.topic,
        duration: data.duration,
      };
    } catch (error) {
      console.error('[ZoomService] Error creating Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Delete an existing Zoom meeting
   */
  public async deleteMeeting(meetingId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 204 || res.status === 200 || res.status === 404) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ZoomService] Error deleting meeting:', error);
      return false;
    }
  }
}

export const zoomService = new ZoomService();
