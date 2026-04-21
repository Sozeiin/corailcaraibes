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
    console.log('=== PDF GENERATION REQUEST START ===');
    console.log('Request body:', requestBody);
    
    const { checklistId, customerName, type }: ChecklistPDFRequest = requestBody;

    if (!checklistId) {
      console.error('❌ Missing checklistId');
      return new Response(JSON.stringify({ error: 'Missing checklistId' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('🔍 Processing PDF request for checklist:', checklistId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get complete checklist data with detailed logging
    console.log('📋 Fetching checklist data...');
    const { data: checklistData, error: checklistError } = await supabase
      .from('boat_checklists')
      .select(`
        *,
        boats(name, model, serial_number, year, base_id),
        technician:profiles!boat_checklists_technician_id_fkey(name, email)
      `)
      .eq('id', checklistId)
      .single();

    if (checklistError) {
      console.error('❌ Checklist fetch error:', checklistError);
      return new Response(JSON.stringify({ error: `Failed to fetch checklist: ${checklistError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Resolve the base timezone for this boat (Martinique / Guadeloupe / Paris...)
    let baseTimezone = 'America/Martinique';
    if (checklistData?.boats?.base_id) {
      const { data: baseRow } = await supabase
        .from('bases')
        .select('timezone')
        .eq('id', checklistData.boats.base_id)
        .maybeSingle();
      if (baseRow?.timezone) baseTimezone = baseRow.timezone;
    }
    console.log('🌍 Using base timezone:', baseTimezone);

    // Get all checklist items separately to avoid nesting issues
    console.log('📋 Fetching checklist items...');
    const { data: checklistItems, error: itemsError } = await supabase
      .from('boat_checklist_items')
      .select(`
        *,
        checklist_items(name, category, is_required)
      `)
      .eq('checklist_id', checklistId)
      .order('item_id');

    
    if (itemsError) {
      console.error('❌ Checklist items fetch error:', itemsError);
      return new Response(JSON.stringify({ error: `Failed to fetch checklist items: ${itemsError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('✅ Checklist data fetched:', {
      id: checklistData.id,
      itemsCount: checklistItems?.length || 0,
      boatName: checklistData.boats?.name,
      technicianName: checklistData.technician?.name,
      hasTexhnnicianSignature: !!checklistData.technician_signature,
      hasCustomerSignature: !!checklistData.customer_signature,
      technicianSignatureUrl: checklistData.technician_signature,
      customerSignatureUrl: checklistData.customer_signature
    });

    console.log('🔍 All items found:', checklistItems?.map(item => ({
      name: item.checklist_items?.name,
      category: item.checklist_items?.category,
      status: item.status
    })) || []);

    // Get rental data
    console.log('🏠 Fetching rental data...');
    const { data: rentalData } = await supabase
      .from('boat_rentals')
      .select('customer_name, customer_email, start_date, end_date')
      .eq('boat_id', checklistData.boat_id)
      .gte('end_date', new Date(checklistData.checklist_date).toISOString().split('T')[0])
      .lte('start_date', new Date(checklistData.checklist_date).toISOString().split('T')[0])
      .maybeSingle();

    console.log('✅ Rental data:', rentalData ? 'Found' : 'Not found');

    const checklist = {
      ...checklistData,
      rental: rentalData,
      boat_checklist_items: checklistItems || []
    };

    // Group items by category for analysis
    const itemsByCategory = checklist.boat_checklist_items?.reduce((acc: any, item: any) => {
      const category = item.checklist_items?.category || 'Autre';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {}) || {};

    console.log('📊 Categories found:', Object.keys(itemsByCategory));
    console.log('📊 Items per category:', Object.entries(itemsByCategory).map(([cat, items]: [string, any]) => `${cat}: ${items.length}`));

    // Log signature information for debugging
    console.log('🖼️ Signature debugging:');
    console.log('- Technician signature:', checklist.technician_signature);
    console.log('- Customer signature:', checklist.customer_signature);
    console.log('- Has technician signature:', !!checklist.technician_signature);
    console.log('- Has customer signature:', !!checklist.customer_signature);

    // Instead of generating a PDF, return comprehensive HTML that can be printed as PDF
    const printableHTML = generatePrintableHTML(checklist, customerName || rentalData?.customer_name || 'Client', type, baseTimezone);
    
    console.log('✅ HTML generated, length:', printableHTML.length);

    return new Response(JSON.stringify({ 
      success: true, 
      html: printableHTML,
      filename: `rapport-${type}-${new Date().toISOString().split('T')[0]}.html`,
      itemsCount: checklist.boat_checklist_items?.length || 0,
      categoriesCount: Object.keys(itemsByCategory).length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in generate-checklist-pdf function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

// Function to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log('🖼️ Fetching image:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error('❌ Failed to fetch image:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = response.headers.get('content-type') || 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('❌ Error fetching image:', error);
    return null;
  }
}

function timezoneLabel(tz: string): string {
  switch (tz) {
    case 'America/Martinique': return 'Martinique';
    case 'America/Guadeloupe': return 'Guadeloupe';
    case 'Europe/Paris': return 'Paris';
    default: return tz.split('/').pop() || tz;
  }
}

function fmtDateInTz(date: Date | string | null | undefined, tz: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

function fmtDateTimeInTz(date: Date | string | null | undefined, tz: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d);
}

function generatePrintableHTML(checklist: any, customerName: string, type: string, baseTimezone: string = 'America/Martinique'): string {
  const boatName = checklist.boats?.name || 'Bateau inconnu';
  const technicianName = checklist.technician?.name || 'Technicien inconnu';
  const checklistDate = fmtDateInTz(checklist.checklist_date, baseTimezone);
  const tzLabel = timezoneLabel(baseTimezone);
  const reportTitle = type === 'checkin' ? 'Rapport de Check-in' : 'Rapport de Check-out';

  console.log('🔧 Starting HTML generation in timezone', baseTimezone);
  console.log('📦 Checklist items received:', checklist.boat_checklist_items?.length || 0);

  // Group items by category with detailed logging
  const itemsByCategory = checklist.boat_checklist_items?.reduce((acc: any, item: any) => {
    const category = item.checklist_items?.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {}) || {};

  console.log('📊 Categories in HTML generation:', Object.keys(itemsByCategory));
  console.log('📊 Items per category in HTML:', Object.entries(itemsByCategory).map(([cat, items]: [string, any]) => `${cat}: ${items.length}`));

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok': return '✅ OK';
      case 'needs_repair': return '⚠️ À réparer';
      case 'not_checked': return '⏹️ Non vérifié';
      default: return '❌ Problème';
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
      case 'ok': return '✅ OK - Aucun problème détecté';
      case 'needs_attention': return '⚠️ ATTENTION - Quelques points nécessitent une attention';
      case 'major_issues': return '🚨 PROBLÈMES MAJEURS - Intervention requise';
      default: return '❓ Statut inconnu';
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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
          font-size: 12px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          page-break-after: avoid;
        }
        
        .header h1 {
          color: #1e40af;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .info-section {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
          page-break-inside: avoid;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .info-card h3 {
          color: #1e40af;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        
        .info-card p {
          margin: 5px 0;
          font-size: 12px;
        }
        
        .status-section {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          text-align: center;
          page-break-inside: avoid;
        }
        
        .status-badge {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          color: white;
          background-color: ${getStatusColor(checklist.overall_status)};
        }
        
        .category-section {
          margin-bottom: 25px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .category-title {
          background: #2563eb;
          color: white;
          padding: 12px 15px;
          border-radius: 8px 8px 0 0;
          font-weight: bold;
          font-size: 14px;
        }
        
        .category-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        
        .checklist-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px 15px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .checklist-item:last-child {
          border-bottom: none;
        }
        
        .item-content {
          flex: 1;
          margin-right: 10px;
        }
        
        .item-name {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 3px;
        }
        
        .item-required {
          color: #dc2626;
          font-weight: bold;
        }
        
        .item-status {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          color: white;
          white-space: nowrap;
        }
        
        .item-notes {
          font-size: 10px;
          color: #6b7280;
          margin-top: 5px;
          font-style: italic;
          background: #f9fafb;
          padding: 5px 8px;
          border-radius: 4px;
        }
        
        .notes-section {
          background: #fef3c7;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .signatures-section {
          margin-top: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          page-break-inside: avoid;
        }
        
        .signature-box {
          text-align: center;
          padding: 20px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          min-height: 80px;
          background: #f9fafb;
        }
        
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .stat-card {
          background: white;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        
        .stat-number {
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
          display: block;
        }
        
        .stat-label {
          font-size: 10px;
          color: #6b7280;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 10px;
          page-break-inside: avoid;
        }
        
        @media print {
          body {
            font-size: 11px;
          }
          
          .container {
            max-width: none;
            padding: 10px;
          }
          
          .category-section {
            page-break-inside: avoid;
          }
          
          .checklist-item {
            page-break-inside: avoid;
          }
          
          .info-section, .status-section, .notes-section, .signatures-section {
            page-break-inside: avoid;
          }
        }
        
        @page {
          size: A4;
          margin: 1cm;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${reportTitle}</h1>
          <p>Généré le ${fmtDateTimeInTz(new Date(), baseTimezone)} (heure ${tzLabel})</p>
        </div>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-card">
              <h3>👤 Informations Client</h3>
              <p><strong>Nom :</strong> ${customerName}</p>
              <p><strong>Email :</strong> ${checklist.rental?.customer_email || 'Non renseigné'}</p>
              ${checklist.rental ? `
                <p><strong>Période :</strong> ${fmtDateInTz(checklist.rental.start_date, baseTimezone)} - ${fmtDateInTz(checklist.rental.end_date, baseTimezone)}</p>
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
              <p><strong>Date :</strong> ${checklistDate} <span style="color:#6b7280;">(heure ${tzLabel})</span></p>
              <p><strong>Technicien :</strong> ${technicianName}</p>
              <p><strong>Type :</strong> ${type === 'checkin' ? 'Check-in' : 'Check-out'}</p>
            </div>
            
            <div class="info-card">
              <h3>📊 Résumé</h3>
              <p><strong>Items vérifiés :</strong> ${checklist.boat_checklist_items?.length || 0}</p>
              <p><strong>Catégories :</strong> ${Object.keys(itemsByCategory).length}</p>
              <p><strong>Statut :</strong> ${getGlobalStatusText(checklist.overall_status).split(' - ')[0]}</p>
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
        
        <h3 style="margin-bottom: 20px; font-size: 16px; color: #1e40af; font-weight: bold;">📋 Détail de l'Inspection par Catégorie</h3>
        
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
            <div style="font-weight: bold; margin-bottom: 10px;">✍️ Signature Technicien</div>
            <div>
              ${checklist.technician_signature ? `
                <img src="${checklist.technician_signature}" alt="Signature technicien" style="max-width: 200px; max-height: 80px; border: 1px solid #e5e7eb; border-radius: 4px;">
                <div style="margin-top: 5px; font-size: 10px; color: #6b7280;">✅ Signé numériquement</div>
              ` : `
                <div style="color: #6b7280;">⏳ Non signé</div>
              `}
            </div>
          </div>
          
          <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px;">✍️ Signature Client</div>
            <div>
              ${checklist.customer_signature ? `
                <img src="${checklist.customer_signature}" alt="Signature client" style="max-width: 200px; max-height: 80px; border: 1px solid #e5e7eb; border-radius: 4px;">
                <div style="margin-top: 5px; font-size: 10px; color: #6b7280;">✅ Signé numériquement</div>
              ` : `
                <div style="color: #6b7280;">⏳ Non signé</div>
              `}
            </div>
          </div>
        </div>
        
        ${checklist.signature_date ? `
          <p style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; font-weight: 500;">
            📅 Document signé le ${fmtDateTimeInTz(checklist.signature_date, baseTimezone)} (heure ${tzLabel})
          </p>
        ` : ''}
        
        <div class="footer">
          <p><strong>Ce rapport a été généré automatiquement par le système de gestion marina</strong></p>
          <p>ID Checklist: ${checklist.id} | Type: ${type.toUpperCase()} | ${checklist.boat_checklist_items?.length || 0} items vérifiés</p>
          <p>Généré le ${fmtDateTimeInTz(new Date(), baseTimezone)} (heure ${tzLabel})</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);