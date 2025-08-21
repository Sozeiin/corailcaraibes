import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChecklistPDFRequest {
  checklistId: string;
  customerName: string;
  type: 'checkin' | 'checkout';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('=== PDF GENERATION REQUEST ===');
    console.log('Request body:', requestBody);
    
    const { checklistId, customerName, type }: ChecklistPDFRequest = requestBody;

    if (!checklistId) {
      console.error('Missing checklistId');
      return new Response(JSON.stringify({ error: 'Missing checklistId' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

    // Get checklist data
    console.log('=== FETCHING CHECKLIST DATA FOR PDF ===');
    const { data: checklistData, error: checklistError } = await supabase
      .from('boat_checklists')
      .select(`
        *,
        boats(name, model, serial_number, year),
        technician:profiles!boat_checklists_technician_id_fkey(name, email),
        boat_checklist_items(
          *,
          checklist_items(name, category, is_required)
        )
      `)
      .eq('id', checklistId)
      .single();

    if (checklistError) {
      console.error('Checklist fetch error:', checklistError);
      return new Response(JSON.stringify({ error: `Failed to fetch checklist: ${checklistError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get potential rental data
    const { data: rentalData } = await supabase
      .from('boat_rentals')
      .select('customer_name, customer_email, start_date, end_date')
      .eq('boat_id', checklistData.boat_id)
      .gte('end_date', new Date(checklistData.checklist_date).toISOString().split('T')[0])
      .lte('start_date', new Date(checklistData.checklist_date).toISOString().split('T')[0])
      .maybeSingle();

    const checklist = {
      ...checklistData,
      rental: rentalData
    };

    console.log('Checklist data fetched successfully for PDF:', checklist?.id);

    // Use HTML CSS to PDF API service
    const htmlContent = generateDetailedHTMLReport(checklist, customerName || rentalData?.customer_name || 'Client', type);
    
    // Use htmlcsstoimage.com API for conversion
    const pdfResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa('7c5d87e2-7b45-4c1b-9a6a-1234567890ab:3f8d2e4a-1b2c-4d5e-8f9a-abcdef123456')}`
      },
      body: JSON.stringify({
        html: htmlContent,
        css: '',
        google_fonts: 'Roboto',
        format: 'pdf',
        width: 800,
        height: 1200
      })
    });

    if (!pdfResponse.ok) {
      console.log('HTML to PDF service failed, using fallback method');
      
      // Fallback: Create a comprehensive text-based PDF
      const detailedPdfContent = generateDetailedTextPDF(checklist, customerName || rentalData?.customer_name || 'Client', type);
      const encoder = new TextEncoder();
      const pdfBuffer = encoder.encode(detailedPdfContent);
      const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

      return new Response(JSON.stringify({ 
        success: true, 
        pdf: base64PDF,
        filename: `rapport-${type}-${new Date().toISOString().split('T')[0]}.pdf`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = await pdfResponse.json();
    
    if (result.url) {
      // Download the generated PDF
      const pdfDownload = await fetch(result.url);
      const pdfArrayBuffer = await pdfDownload.arrayBuffer();
      const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

      return new Response(JSON.stringify({ 
        success: true, 
        pdf: base64PDF,
        filename: `rapport-${type}-${new Date().toISOString().split('T')[0]}.pdf`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error('PDF generation failed');

  } catch (error: any) {
    console.error("Error in generate-checklist-pdf function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

function generateDetailedHTMLReport(checklist: any, customerName: string, type: string): string {
  const boatName = checklist.boats?.name || 'Bateau inconnu';
  const technicianName = checklist.technician?.name || 'Technicien inconnu';
  const checklistDate = new Date(checklist.checklist_date).toLocaleDateString('fr-FR');
  const reportTitle = type === 'checkin' ? 'Rapport de Check-in' : 'Rapport de Check-out';

  // Group items by category
  const itemsByCategory = checklist.boat_checklist_items?.reduce((acc: any, item: any) => {
    const category = item.checklist_items?.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {}) || {};

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok': return '✓ OK';
      case 'needs_repair': return '⚠ À réparer';
      case 'not_checked': return '○ Non vérifié';
      default: return '✗ Problème';
    }
  };

  const getGlobalStatusText = (status: string) => {
    switch (status) {
      case 'ok': return 'OK - Aucun problème détecté';
      case 'needs_attention': return 'ATTENTION - Quelques points nécessitent une attention';
      case 'major_issues': return 'PROBLÈMES MAJEURS - Intervention requise';
      default: return 'Statut inconnu';
    }
  };

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Roboto', Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1e40af; margin-bottom: 10px; }
        .info-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .category { margin-bottom: 25px; }
        .category-title { background: #2563eb; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; font-weight: bold; }
        .category-content { background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 15px; }
        .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .item:last-child { border-bottom: none; }
        .item-status { font-weight: bold; }
        .notes { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reportTitle}</h1>
        <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      </div>
      
      <div class="info-section">
        <div class="info-grid">
          <div>
            <h3>Client</h3>
            <p><strong>Nom:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${checklist.rental?.customer_email || 'Non renseigné'}</p>
            ${checklist.rental ? `<p><strong>Période:</strong> ${new Date(checklist.rental.start_date).toLocaleDateString('fr-FR')} - ${new Date(checklist.rental.end_date).toLocaleDateString('fr-FR')}</p>` : ''}
          </div>
          <div>
            <h3>Bateau</h3>
            <p><strong>Nom:</strong> ${boatName}</p>
            <p><strong>Modèle:</strong> ${checklist.boats?.model || 'Non renseigné'}</p>
            <p><strong>Année:</strong> ${checklist.boats?.year || 'Non renseigné'}</p>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <h3>Résumé de l'inspection</h3>
        <p><strong>Date:</strong> ${checklistDate}</p>
        <p><strong>Technicien:</strong> ${technicianName}</p>
        <p><strong>Type:</strong> ${type === 'checkin' ? 'Check-in' : 'Check-out'}</p>
        <div class="status-badge" style="background: ${checklist.overall_status === 'ok' ? '#22c55e' : checklist.overall_status === 'needs_attention' ? '#eab308' : '#ef4444'}; color: white;">
          ${getGlobalStatusText(checklist.overall_status)}
        </div>
      </div>
      
      <h3>Détail par catégorie</h3>
      ${Object.entries(itemsByCategory).map(([category, items]: [string, any[]]) => `
        <div class="category">
          <div class="category-title">${category}</div>
          <div class="category-content">
            ${items.map(item => `
              <div class="item">
                <span>${item.checklist_items?.name || 'Item inconnu'}${item.checklist_items?.is_required ? ' *' : ''}</span>
                <span class="item-status">${getStatusText(item.status)}</span>
              </div>
              ${item.notes ? `<div style="font-size: 12px; color: #6b7280; margin-top: 5px;"><em>${item.notes}</em></div>` : ''}
            `).join('')}
          </div>
        </div>
      `).join('')}
      
      ${checklist.general_notes ? `
        <div class="notes">
          <h3>Notes Générales</h3>
          <p>${checklist.general_notes}</p>
        </div>
      ` : ''}
      
      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280;">
        <p>Rapport généré automatiquement - ID: ${checklist.id}</p>
        ${checklist.signature_date ? `<p>Document signé le ${new Date(checklist.signature_date).toLocaleDateString('fr-FR')}</p>` : ''}
      </div>
    </body>
    </html>
  `;
}

function generateDetailedTextPDF(checklist: any, customerName: string, type: string): string {
  const boatName = checklist.boats?.name || 'Bateau inconnu';
  const technicianName = checklist.technician?.name || 'Technicien inconnu';
  const checklistDate = new Date(checklist.checklist_date).toLocaleDateString('fr-FR');
  const reportTitle = type === 'checkin' ? 'Rapport de Check-in' : 'Rapport de Check-out';

  // Group items by category
  const itemsByCategory = checklist.boat_checklist_items?.reduce((acc: any, item: any) => {
    const category = item.checklist_items?.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {}) || {};

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok': return 'OK';
      case 'needs_repair': return 'A REPARER';
      case 'not_checked': return 'NON VERIFIE';
      default: return 'PROBLEME';
    }
  };

  // Create detailed PDF content
  let pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
/F2 6 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 2000
>>
stream
BT
/F1 16 Tf
50 750 Td
(${reportTitle}) Tj
0 -30 Td
/F2 12 Tf
(Date: ${checklistDate}) Tj
0 -20 Td
(Client: ${customerName}) Tj
0 -20 Td
(Bateau: ${boatName}) Tj
0 -20 Td
(Technicien: ${technicianName}) Tj
0 -40 Td
/F1 14 Tf
(DETAIL DE L'INSPECTION:) Tj
0 -30 Td
/F2 10 Tf`;

  let yPosition = 600;
  Object.entries(itemsByCategory).forEach(([category, items]: [string, any[]]) => {
    pdfContent += `
0 -25 Td
/F1 12 Tf
(${category.toUpperCase()}) Tj
0 -15 Td
/F2 10 Tf`;
    
    (items as any[]).forEach(item => {
      const status = getStatusText(item.status);
      pdfContent += `
0 -12 Td
(- ${item.checklist_items?.name || 'Item'}: ${status}) Tj`;
      if (item.notes) {
        pdfContent += `
0 -10 Td
(  Notes: ${item.notes}) Tj`;
      }
    });
  });

  if (checklist.general_notes) {
    pdfContent += `
0 -25 Td
/F1 12 Tf
(NOTES GENERALES:) Tj
0 -15 Td
/F2 10 Tf
(${checklist.general_notes}) Tj`;
  }

  pdfContent += `
0 -40 Td
(Rapport genere le ${new Date().toLocaleDateString('fr-FR')}) Tj
0 -15 Td
(ID Checklist: ${checklist.id}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000271 00000 n 
0000002350 00000 n 
0000002420 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
2485
%%EOF`;

  return pdfContent;
}

serve(handler);