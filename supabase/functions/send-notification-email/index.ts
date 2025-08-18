import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  recipientName: string;
  title: string;
  message: string;
  orderId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, recipientName, title, message, orderId, priority }: NotificationEmailRequest = await req.json();

    console.log('Sending notification email:', { to, title, priority, orderId });

    // Determine email template based on priority
    const getPriorityColor = (p: string) => {
      switch (p) {
        case 'urgent': return '#dc2626'; // red-600
        case 'high': return '#ea580c'; // orange-600
        case 'normal': return '#2563eb'; // blue-600
        default: return '#6b7280'; // gray-500
      }
    };

    const getPriorityLabel = (p: string) => {
      switch (p) {
        case 'urgent': return 'URGENT';
        case 'high': return 'PRIORITÉ ÉLEVÉE';
        case 'normal': return 'PRIORITÉ NORMALE';
        default: return 'INFO';
      }
    };

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: ${getPriorityColor(priority)}; color: white; padding: 20px; text-align: center; }
            .priority-badge { background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .content { padding: 30px; }
            .message { font-size: 16px; line-height: 1.6; color: #374151; margin: 20px 0; }
            .order-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
            .cta-button { display: inline-block; background: ${getPriorityColor(priority)}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="priority-badge">${getPriorityLabel(priority)}</div>
              <h1 style="margin: 15px 0 5px 0; font-size: 24px;">${title}</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; margin-bottom: 10px;">Bonjour ${recipientName},</p>
              
              <div class="message">
                ${message}
              </div>
              
              ${orderId !== 'automation-summary' ? `
                <div class="order-info">
                  <strong>Commande concernée :</strong> ${orderId}<br>
                  <strong>Heure de notification :</strong> ${new Date().toLocaleString('fr-FR')}
                </div>
              ` : ''}
              
              ${priority === 'urgent' || priority === 'high' ? `
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${Deno.env.get('SUPABASE_URL')}/dashboard" class="cta-button">
                    Voir le tableau de bord
                  </a>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                Cette notification a été générée automatiquement par le système de workflow.
                Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur système.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">
                Système de Gestion d'Inventaire - Notifications automatiques<br>
                <small>Ne pas répondre à ce message</small>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Système de Workflow <workflow@resend.dev>",
      to: [to],
      subject: `[${getPriorityLabel(priority)}] ${title}`,
      html: emailHTML,
      tags: [
        { name: 'type', value: 'workflow-notification' },
        { name: 'priority', value: priority },
        { name: 'order_id', value: orderId }
      ]
    });

    console.log("Notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      recipient: to,
      priority
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});