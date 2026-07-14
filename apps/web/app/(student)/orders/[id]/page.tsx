import React from 'react';
import OrderTrackingDetailClient from './OrderTrackingDetailClient';

export function generateStaticParams() {
  // Pre-render a placeholder static route so that output: 'export' config compiles successfully.
  // Capacitor handles client-side dynamic route switching automatically.
  return [{ id: 'placeholder' }];
}

export default function OrderTrackingDetailPage() {
  return <OrderTrackingDetailClient />;
}
