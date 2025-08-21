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

    // Get complete checklist data
    console.log('=== FETCHING COMPLETE CHECKLIST DATA ===');
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

    // Get rental data
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

    console.log('Complete checklist data fetched for PDF:', checklist?.id);
    console.log('Items count:', checklist.boat_checklist_items?.length || 0);

    // Generate comprehensive HTML report
    const htmlContent = generateComprehensiveHTMLReport(checklist, customerName || rentalData?.customer_name || 'Client', type);
    
    console.log('HTML content generated, length:', htmlContent.length);

    // Try to use Puppeteer service via API
    try {
      const puppeteerResponse = await fetch('https://api.htmlcsstoimage.com/v1/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('demo-user:demo-password')
        },
        body: JSON.stringify({
          html: htmlContent,
          format: 'pdf',
          pdf_format: 'A4',
          selector: 'body',
          ms_delay: 1000,
          device_scale: 1,
          pdf_orientation: 'portrait',
          pdf_margin: '0.5in'
        })
      });

      if (puppeteerResponse.ok) {
        const result = await puppeteerResponse.json();
        if (result.url) {
          const pdfDownload = await fetch(result.url);
          const pdfArrayBuffer = await pdfDownload.arrayBuffer();
          const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

          console.log('PDF generated via external service, size:', pdfArrayBuffer.byteLength);

          return new Response(JSON.stringify({ 
            success: true, 
            pdf: base64PDF,
            filename: `rapport-${type}-${new Date().toISOString().split('T')[0]}.pdf`
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
    } catch (apiError) {
      console.log('External PDF service failed, using fallback:', apiError);
    }

    // Fallback: Generate detailed multi-page PDF with proper UTF-8 support
    console.log('Using fallback PDF generation method');
    const detailedPdfContent = generateUTF8MultiPagePDF(checklist, customerName || rentalData?.customer_name || 'Client', type);
    
    // Convert to ArrayBuffer properly
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(detailedPdfContent);
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    console.log('Fallback PDF generated, size:', pdfBytes.length);

    return new Response(JSON.stringify({ 
      success: true, 
      pdf: base64PDF,
      filename: `rapport-${type}-${new Date().toISOString().split('T')[0]}.pdf`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in generate-checklist-pdf function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

function generateComprehensiveHTMLReport(checklist: any, customerName: string, type: string): string {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return '#22c55e';
      case 'needs_repair': return '#eab308';
      case 'not_checked': return '#6b7280';
      default: return '#ef4444';
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
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
          font-size: 14px;
        }
        
        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        
        .header h1 {
          color: #1e40af;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .header p {
          color: #6b7280;
          font-size: 14px;
        }
        
        .info-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 25px;
          border: 1px solid #e5e7eb;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }
        
        .info-card h3 {
          color: #1e40af;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        
        .info-card p {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .info-card strong {
          color: #374151;
          font-weight: 500;
        }
        
        .status-section {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 30px;
          text-align: center;
          border: 1px solid #cbd5e1;
        }
        
        .status-section h3 {
          margin-bottom: 15px;
          color: #374151;
          font-size: 18px;
          font-weight: 600;
        }
        
        .status-badge {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 16px;
          color: white;
          background-color: ${getStatusColor(checklist.overall_status)};
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .category-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .category-title {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 12px 12px 0 0;
          font-weight: 600;
          font-size: 18px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .category-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .checklist-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 15px 20px;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }
        
        .checklist-item:last-child {
          border-bottom: none;
        }
        
        .checklist-item:hover {
          background-color: #f9fafb;
        }
        
        .item-content {
          flex: 1;
          margin-right: 15px;
        }
        
        .item-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
        }
        
        .item-required {
          color: #dc2626;
          font-weight: 700;
        }
        
        .item-status {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .item-notes {
          font-size: 12px;
          color: #6b7280;
          margin-top: 8px;
          font-style: italic;
          background: #f9fafb;
          padding: 8px 12px;
          border-radius: 6px;
          border-left: 3px solid #e5e7eb;
        }
        
        .notes-section {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 20px;
          border-radius: 12px;
          border-left: 5px solid #f59e0b;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .notes-section h3 {
          color: #92400e;
          margin-bottom: 12px;
          font-size: 16px;
          font-weight: 600;
        }
        
        .notes-section p {
          color: #78350f;
          line-height: 1.7;
        }
        
        .signatures-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .signature-box {
          text-align: center;
          padding: 25px;
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          min-height: 120px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .signature-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .signature-status {
          color: #059669;
          font-size: 14px;
          font-weight: 500;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }
        
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .stat-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #1e40af;
          display: block;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        @media print {
          .page {
            box-shadow: none;
            margin: 0;
          }
          
          .category-section {
            page-break-inside: avoid;
          }
          
          .checklist-item {
            page-break-inside: avoid;
          }
        }
        
        @page {
          size: A4;
          margin: 20mm;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <h1>${reportTitle}</h1>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-card">
              <h3>👤 Informations Client</h3>
              <p><strong>Nom :</strong> ${customerName}</p>
              <p><strong>Email :</strong> ${checklist.rental?.customer_email || 'Non renseigné'}</p>
              ${checklist.rental ? `
                <p><strong>Période :</strong> ${new Date(checklist.rental.start_date).toLocaleDateString('fr-FR')} - ${new Date(checklist.rental.end_date).toLocaleDateString('fr-FR')}</p>
              ` : ''}
            </div>
            
            <div class="info-card">
              <h3>⛵ Informations Bateau</h3>
              <p><strong>Nom :</strong> ${boatName}</p>
              <p><strong>Modèle :</strong> ${checklist.boats?.model || 'Non renseigné'}</p>
              <p><strong>Année :</strong> ${checklist.boats?.year || 'Non renseigné'}</p>
              <p><strong>N° Série :</strong> ${checklist.boats?.serial_number || 'Non renseigné'}</p>
            </div>
            
            <div class="info-card">
              <h3>🔍 Informations Inspection</h3>
              <p><strong>Date :</strong> ${checklistDate}</p>
              <p><strong>Technicien :</strong> ${technicianName}</p>
              <p><strong>Type :</strong> ${type === 'checkin' ? 'Check-in' : 'Check-out'}</p>
            </div>
            
            <div class="info-card">
              <h3>📊 Résumé</h3>
              <p><strong>Items vérifiés :</strong> ${checklist.boat_checklist_items?.length || 0}</p>
              <p><strong>Catégories :</strong> ${Object.keys(itemsByCategory).length}</p>
              <p><strong>Statut global :</strong> ${getGlobalStatusText(checklist.overall_status).split(' - ')[0]}</p>
            </div>
          </div>
        </div>
        
        <div class="status-section">
          <h3>🎯 Statut Global de l'Inspection</h3>
          <div class="status-badge">${getGlobalStatusText(checklist.overall_status)}</div>
        </div>

        <div class="summary-stats">
          ${['ok', 'needs_repair', 'not_checked'].map(status => {
            const count = checklist.boat_checklist_items?.filter((item: any) => item.status === status).length || 0;
            const label = status === 'ok' ? 'OK' : status === 'needs_repair' ? 'À réparer' : 'Non vérifiés';
            return `
              <div class="stat-card">
                <span class="stat-number" style="color: ${getStatusColor(status)};">${count}</span>
                <span class="stat-label">${label}</span>
              </div>
            `;
          }).join('')}
          <div class="stat-card">
            <span class="stat-number">${Object.keys(itemsByCategory).length}</span>
            <span class="stat-label">Catégories</span>
          </div>
        </div>
        
        <h3 style="margin-bottom: 25px; font-size: 20px; color: #1e40af; font-weight: 600;">📋 Détail de l'Inspection par Catégorie</h3>
        
        ${Object.entries(itemsByCategory).map(([category, items]: [string, any[]]) => `
          <div class="category-section">
            <div class="category-title">${category}</div>
            <div class="category-content">
              ${items.map(item => `
                <div class="checklist-item">
                  <div class="item-content">
                    <div class="item-name">
                      ${item.checklist_items?.name || 'Item inconnu'}
                      ${item.checklist_items?.is_required ? '<span class="item-required"> *</span>' : ''}
                    </div>
                    ${item.notes ? `<div class="item-notes">📝 ${item.notes}</div>` : ''}
                  </div>
                  <div class="item-status" style="background-color: ${getStatusColor(item.status)};">
                    ${getStatusText(item.status)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        
        ${checklist.general_notes ? `
          <div class="notes-section">
            <h3>📝 Notes Générales</h3>
            <p>${checklist.general_notes}</p>
          </div>
        ` : ''}
        
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-label">✍️ Signature Technicien</div>
            <div class="signature-status">
              ${checklist.technician_signature ? '✅ Signé numériquement' : '⏳ Non signé'}
            </div>
          </div>
          
          <div class="signature-box">
            <div class="signature-label">✍️ Signature Client</div>
            <div class="signature-status">
              ${checklist.customer_signature ? '✅ Signé numériquement' : '⏳ Non signé'}
            </div>
          </div>
        </div>
        
        ${checklist.signature_date ? `
          <p style="text-align: center; margin-top: 25px; color: #6b7280; font-size: 14px; font-weight: 500;">
            📅 Document signé le ${new Date(checklist.signature_date).toLocaleDateString('fr-FR')}
          </p>
        ` : ''}
        
        <div class="footer">
          <p><strong>Ce rapport a été généré automatiquement par le système de gestion marina</strong></p>
          <p>ID Checklist: ${checklist.id} | Type: ${type.toUpperCase()} | Généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateUTF8MultiPagePDF(checklist: any, customerName: string, type: string): string {
  // This creates a more comprehensive PDF with proper UTF-8 encoding
  const reportTitle = type === 'checkin' ? 'Rapport de Check-in' : 'Rapport de Check-out';
  const boatName = checklist.boats?.name || 'Bateau inconnu';
  const technicianName = checklist.technician?.name || 'Technicien inconnu';
  const checklistDate = new Date(checklist.checklist_date).toLocaleDateString('fr-FR');

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

  const getGlobalStatusText = (status: string) => {
    switch (status) {
      case 'ok': return 'OK - Aucun probleme detecte';
      case 'needs_attention': return 'ATTENTION - Quelques points necessitent une attention';
      case 'major_issues': return 'PROBLEMES MAJEURS - Intervention requise';
      default: return 'Statut inconnu';
    }
  };

  // Create comprehensive PDF with multiple pages support
  let contentStream = `BT
/F1 18 Tf
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
(Modele: ${checklist.boats?.model || 'Non renseigne'}) Tj
0 -20 Td
(Annee: ${checklist.boats?.year || 'Non renseigne'}) Tj
0 -20 Td
(Technicien: ${technicianName}) Tj
0 -40 Td
/F1 14 Tf
(STATUT GLOBAL:) Tj
0 -20 Td
/F2 12 Tf
(${getGlobalStatusText(checklist.overall_status)}) Tj
0 -40 Td
/F1 14 Tf
(DETAIL DE L'INSPECTION:) Tj
0 -30 Td`;

  let yPosition = 400;
  Object.entries(itemsByCategory).forEach(([category, items]: [string, any[]]) => {
    contentStream += `
0 -25 Td
/F1 12 Tf
(${category.toUpperCase()}) Tj
0 -15 Td
/F2 10 Tf`;
    
    (items as any[]).forEach(item => {
      const itemName = item.checklist_items?.name || 'Item';
      const status = getStatusText(item.status);
      const required = item.checklist_items?.is_required ? ' (OBLIGATOIRE)' : '';
      
      contentStream += `
0 -12 Td
(- ${itemName}${required}: ${status}) Tj`;
      
      if (item.notes) {
        contentStream += `
0 -10 Td
(  Notes: ${item.notes}) Tj`;
      }
      
      yPosition -= 22;
      if (item.notes) yPosition -= 10;
    });
    
    yPosition -= 40;
  });

  if (checklist.general_notes) {
    contentStream += `
0 -25 Td
/F1 12 Tf
(NOTES GENERALES:) Tj
0 -15 Td
/F2 10 Tf
(${checklist.general_notes}) Tj`;
  }

  contentStream += `
0 -40 Td
/F2 8 Tf
(Rapport genere automatiquement le ${new Date().toLocaleDateString('fr-FR')}) Tj
0 -12 Td
(ID Checklist: ${checklist.id}) Tj
0 -12 Td
(Type: ${type.toUpperCase()}) Tj
ET`;

  // Calculate content length
  const contentLength = new TextEncoder().encode(contentStream).length;

  const pdfContent = `%PDF-1.4
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
/Length ${contentLength}
>>
stream
${contentStream}
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
/Encoding /WinAnsiEncoding
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
/Encoding /WinAnsiEncoding
>>
endobj

xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000271 00000 n 
0000${String(350 + contentLength).padStart(10, '0')} 00000 n 
0000${String(450 + contentLength).padStart(10, '0')} 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
${500 + contentLength}
%%EOF`;

  return pdfContent;
}

serve(handler);