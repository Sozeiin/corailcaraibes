import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChecklistReportRequest {
  checklistId: string;
  recipientEmail: string;
  customerName: string;
  boatName: string;
  type: 'checkin' | 'checkout';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('=== DEBUT EDGE FUNCTION ===');
    console.log('Request body:', requestBody);
    
    const { checklistId, recipientEmail, customerName, boatName, type } = requestBody;

    // Test 1: Vérifier les paramètres
    if (!checklistId || !recipientEmail) {
      console.error('Missing required fields:', { checklistId, recipientEmail });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('=== TEST 1: Paramètres OK ===');

    // Test 2: Vérifier la clé Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log('=== TEST 2: Clé Resend ===');
    console.log('Has Resend key:', !!resendApiKey);
    console.log('Key length:', resendApiKey?.length || 0);
    console.log('Key prefix:', resendApiKey?.substring(0, 10) + '...');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found');
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Test 3: Initialiser Resend
    console.log('=== TEST 3: Initialisation Resend ===');
    const resend = new Resend(resendApiKey);
    console.log('Resend initialized successfully');

    // Test 4: Email simple sans HTML complexe
    console.log('=== TEST 4: Envoi email simple ===');
    
    const simpleEmailContent = `
      <h1>Test Email de Checklist</h1>
      <p>Ceci est un email de test pour vérifier que l'envoi fonctionne.</p>
      <p><strong>Client:</strong> ${customerName}</p>
      <p><strong>Bateau:</strong> ${boatName}</p>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>ID Checklist:</strong> ${checklistId}</p>
    `;

    console.log('About to send email...');
    console.log('From: Marina Reports <service.technique@corail.corailapp.fr>');
    console.log('To:', recipientEmail);
    console.log('Subject: Test Rapport', type);

    const emailResponse = await resend.emails.send({
      from: "Marina Reports <service.technique@corail.corailapp.fr>",
      to: [recipientEmail],
      subject: `Test Rapport ${type} - ${boatName}`,
      html: simpleEmailContent,
    });

    console.log('=== RESEND RESPONSE ===');
    console.log('Full response:', JSON.stringify(emailResponse, null, 2));
    console.log('Response type:', typeof emailResponse);
    console.log('Response keys:', Object.keys(emailResponse || {}));

    if (emailResponse.error) {
      console.error('Resend returned error:', emailResponse.error);
      return new Response(JSON.stringify({ 
        error: 'Resend error', 
        details: emailResponse.error 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('=== EMAIL ENVOYÉ AVEC SUCCÈS ===');
    console.log('Email ID:', emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      debug: {
        hasApiKey: !!resendApiKey,
        emailResponse: emailResponse
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("=== ERREUR DANS EDGE FUNCTION ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Full error:", JSON.stringify(error, null, 2));
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      name: error.name
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

function generateHTMLReport(checklist: any, boatName: string, customerName: string, type: string): string {
  const statusLabels = {
    'ok': 'OK ✅',
    'needs_repair': 'Réparation nécessaire ❌',
    'not_checked': 'Non vérifié ⚠️'
  };

  const overallStatusLabels = {
    'ok': 'Excellent ✅',
    'needs_attention': 'Attention requise ⚠️',
    'major_issues': 'Problèmes majeurs ❌'
  };

  const groupedItems = checklist.boat_checklist_items.reduce((acc: any, item: any) => {
    const category = item.checklist_items.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const categoriesHTML = Object.entries(groupedItems).map(([category, items]: [string, any]) => `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">
        ${category}
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Élément</th>
            <th style="text-align: center; padding: 8px; border: 1px solid #e5e7eb;">Status</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">
                ${item.checklist_items.name}
                ${item.checklist_items.is_required ? '<span style="color: #dc2626;">*</span>' : ''}
              </td>
              <td style="text-align: center; padding: 8px; border: 1px solid #e5e7eb;">
                ${statusLabels[item.status] || item.status}
              </td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">
                ${item.notes || '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rapport ${type === 'checkin' ? 'Check-in' : 'Check-out'}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-card { padding: 15px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #2563eb; }
        .overall-status { text-align: center; padding: 15px; margin: 20px 0; border-radius: 8px; font-weight: bold; }
        .status-ok { background-color: #dcfce7; color: #166534; }
        .status-attention { background-color: #fef3c7; color: #92400e; }
        .status-issues { background-color: #fee2e2; color: #991b1b; }
        .signature-section { margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rapport ${type === 'checkin' ? 'Check-in' : 'Check-out'}</h1>
        <p>Bateau: <strong>${boatName}</strong></p>
        <p>Date: ${new Date(checklist.checklist_date).toLocaleDateString('fr-FR')}</p>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <h3>Client</h3>
          <p><strong>Nom:</strong> ${customerName}</p>
        </div>
        <div class="info-card">
          <h3>Technicien</h3>
          <p><strong>Nom:</strong> ${checklist.profiles?.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${checklist.profiles?.email || 'N/A'}</p>
        </div>
      </div>

      <div class="overall-status status-${checklist.overall_status === 'ok' ? 'ok' : checklist.overall_status === 'needs_attention' ? 'attention' : 'issues'}">
        <h2>État Général: ${overallStatusLabels[checklist.overall_status] || checklist.overall_status}</h2>
      </div>

      <h2>Détail de l'inspection</h2>
      ${categoriesHTML}

      <div class="signature-section">
        <h3>Signatures</h3>
        <p>Ce rapport a été généré automatiquement et signé électroniquement.</p>
        ${checklist.signature_date ? `<p><strong>Signature technicien:</strong> ${new Date(checklist.signature_date).toLocaleString('fr-FR')}</p>` : ''}
        ${checklist.customer_signature_date ? `<p><strong>Signature client:</strong> ${new Date(checklist.customer_signature_date).toLocaleString('fr-FR')}</p>` : ''}
      </div>

      <div class="footer">
        <p>Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
        <p>Marina Management System</p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);