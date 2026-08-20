import { splitName, type Admin } from './marevo.ts';

/**
 * Normalized booking payload shared by the inbound webhook (Marevo pushes)
 * and the pull mode (Corail reads the Marevo Booking REST API).
 */
export interface NormalizedBooking {
  booking_ref: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_postal_code?: string | null;
  customer_country?: string | null;
  boat_external_id?: string | null;
  boat_name?: string | null;
  base_name?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  rental_notes?: string | null;
  special_instructions?: string | null;
}

export function isUuid(v?: string | null): boolean {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function toIso(v?: string | null): string | null {
  if (!v) return null;
  const d = new Date(v.length === 10 ? `${v}T12:00:00Z` : v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function resolveBoat(admin: Admin, b: NormalizedBooking) {
  if (isUuid(b.boat_external_id)) {
    const { data } = await admin
      .from('boats')
      .select('id, name, status, base_id')
      .eq('id', b.boat_external_id!)
      .maybeSingle();
    if (data) return data;
  }
  if (b.boat_name) {
    const { data } = await admin
      .from('boats')
      .select('id, name, status, base_id')
      .ilike('name', b.boat_name)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function resolveBaseId(admin: Admin, b: NormalizedBooking, boatBaseId?: string | null) {
  if (boatBaseId) return boatBaseId;
  if (b.base_name) {
    const { data } = await admin
      .from('bases')
      .select('id')
      .ilike('name', `%${b.base_name}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data.id as string;
  }
  const { data } = await admin.from('bases').select('id').order('name').limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

export async function upsertCustomer(admin: Admin, b: NormalizedBooking, baseId: string) {
  let first = b.customer_first_name ?? null;
  let last = b.customer_last_name ?? null;
  if (!first || !last) {
    const split = splitName(b.customer_name ?? `${first ?? ''} ${last ?? ''}`);
    first = first || split.first;
    last = last || split.last;
  }

  if (b.customer_email) {
    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .eq('email', b.customer_email)
      .limit(1)
      .maybeSingle();
    if (existing) {
      await admin
        .from('customers')
        .update({
          first_name: first,
          last_name: last,
          phone: b.customer_phone ?? undefined,
          address: b.customer_address ?? undefined,
          city: b.customer_city ?? undefined,
          postal_code: b.customer_postal_code ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return existing.id as string;
    }
  }

  const { data: created, error } = await admin
    .from('customers')
    .insert({
      base_id: baseId,
      first_name: first,
      last_name: last,
      email: b.customer_email ?? null,
      phone: b.customer_phone ?? null,
      address: b.customer_address ?? null,
      city: b.customer_city ?? null,
      postal_code: b.customer_postal_code ?? null,
      country: b.customer_country ?? undefined,
      notes: 'Client importé depuis Marevo Booking',
      created_by_name: 'Marevo Booking',
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}

export interface ApplyResult {
  checkin_form_id: string | null;
  customer_id: string;
  boat_id: string | null;
  boat_assigned: boolean;
  created: boolean;
}

/** Creates or updates the customer file + administrative check-in form for a booking. */
export async function applyBooking(admin: Admin, b: NormalizedBooking): Promise<ApplyResult> {
  const boat = await resolveBoat(admin, b);
  const baseId = await resolveBaseId(admin, b, boat?.base_id ?? null);
  if (!baseId) throw new Error('no_base_available');

  const customerId = await upsertCustomer(admin, b, baseId);
  const canAssign = !!boat && boat.status === 'available';

  const formPayload: Record<string, unknown> = {
    base_id: baseId,
    customer_id: customerId,
    boat_id: canAssign ? boat!.id : null,
    suggested_boat_id: boat?.id ?? null,
    is_boat_assigned: canAssign,
    planned_start_date: toIso(b.planned_start_date),
    planned_end_date: toIso(b.planned_end_date),
    rental_notes: b.rental_notes ?? null,
    special_instructions: b.special_instructions ?? null,
    status: canAssign ? 'ready' : 'draft',
    marevo_booking_id: b.booking_ref,
    marevo_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let existing: { id: string; status: string | null } | null = null;
  if (b.booking_ref) {
    const { data } = await admin
      .from('administrative_checkin_forms')
      .select('id, status')
      .eq('marevo_booking_id', b.booking_ref)
      .maybeSingle();
    existing = data as typeof existing;
  }

  let formId: string | null = null;
  if (existing) {
    formId = existing.id;
    // Never overwrite a form already used by a technician (boat assignment is immutable)
    if (existing.status === 'used' || existing.status === 'completed') {
      delete formPayload.boat_id;
      delete formPayload.suggested_boat_id;
      delete formPayload.is_boat_assigned;
      delete formPayload.status;
    }
    const { error } = await admin.from('administrative_checkin_forms').update(formPayload).eq('id', formId);
    if (error) throw error;
  } else {
    const { data, error } = await admin
      .from('administrative_checkin_forms')
      .insert(formPayload)
      .select('id')
      .single();
    if (error) throw error;
    formId = data.id as string;
  }

  return {
    checkin_form_id: formId,
    customer_id: customerId,
    boat_id: boat?.id ?? null,
    boat_assigned: canAssign,
    created: !existing,
  };
}

/** Expires the check-in form linked to a cancelled booking. */
export async function cancelBooking(admin: Admin, bookingRef: string) {
  const { data: form } = await admin
    .from('administrative_checkin_forms')
    .select('id, status')
    .eq('marevo_booking_id', bookingRef)
    .maybeSingle();
  if (form && form.status !== 'used' && form.status !== 'completed') {
    await admin
      .from('administrative_checkin_forms')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', form.id);
  }
  return (form as { id: string } | null)?.id ?? null;
}
