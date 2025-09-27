import React from 'react';
import { Layout } from '@/components/Layout';
import { CheckinCheckoutOrderManager } from '@/components/checkin/CheckinCheckoutOrderManager';

export default function CheckinCheckoutManagement() {
  return (
    <Layout>
      <CheckinCheckoutOrderManager />
    </Layout>
  );
}