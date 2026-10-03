/**
 * WhatsApp Business Cloud API Integration for MERU MOBILE SHOP
 * Production Decoupled Notification Architecture
 */

export interface WhatsAppSendResult {
  status: 'sent' | 'failed' | 'not_configured';
  messageId?: string;
  error?: string;
  timestamp: string;
}

export class WhatsAppService {
  private apiUrl: string;
  private token: string | undefined;
  private phoneNumberId: string | undefined;

  constructor() {
    this.token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiUrl = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  public isConfigured(): boolean {
    return Boolean(this.token && this.phoneNumberId);
  }

  public getStatusText(): 'CONFIGURED' | 'NOT CONFIGURED' {
    return this.isConfigured() ? 'CONFIGURED' : 'NOT CONFIGURED';
  }

  /**
   * Send Congratulations Message to customer's normalized 10-digit mobile
   * Decoupled from prize allocation - never throws or rolls back draw result
   */
  public async sendWinnerCongratulations(params: {
    customerName: string;
    mobile10Digits: string;
    giftName: string;
    giftNameHi?: string;
    entryId: string;
    condition?: string;
  }): Promise<WhatsAppSendResult> {
    const timestamp = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        status: 'not_configured',
        error: 'WhatsApp Business API credentials not configured in environment variables (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)',
        timestamp
      };
    }

    const recipient = `91${params.mobile10Digits}`;
    const conditionText = params.condition ? `\n(नियम व शर्त: ${params.condition})` : '';

    const messageBody = `🎉 Congratulations ${params.customerName}!

आपने MERU MOBILE SHOP Lucky Draw में जीता है:

🎁 ${params.giftNameHi || params.giftName}${conditionText}

आपका Entry ID:
${params.entryId}

अपना gift प्राप्त करने के लिए Meru Mobile Shop पर यह Entry ID या अपना मोबाइल नंबर दिखाएं।

MERU MOBILE SHOP
Tyoda Road, Ganj Basoda
Near Pawan Automobile / Old Bus Stand
Vidisha, MP – 464221

WhatsApp/Contact:
9340259168 / 9584672211

धन्यवाद ❤️`;

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody
          }
        })
      });

      const data: any = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        return {
          status: 'sent',
          messageId: data.messages[0].id,
          timestamp
        };
      } else {
        return {
          status: 'failed',
          error: data.error?.message || 'Failed delivering WhatsApp message via Meta Cloud API',
          timestamp
        };
      }
    } catch (err: any) {
      return {
        status: 'failed',
        error: err.message || 'Network error attempting WhatsApp delivery',
        timestamp
      };
    }
  }
}

export const whatsapp = new WhatsAppService();
