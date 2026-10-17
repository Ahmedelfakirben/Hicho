import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const CLOUD_URL = 'https://zeqootmdlfpospbwwzuh.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW9vdG1kbGZwb3NwYnd3enVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NjEyNCwiZXhwIjoyMDgxMzcyMTI0fQ.GExvcYW5-Au_Wp01YgaljD46JCk0nRDXxBHy6jNs0VM';

const supabase = createClient(CLOUD_URL, CLOUD_SERVICE_KEY);

async function restoreTodayData() {
  console.log('📦 Leyendo archivo de respaldo de hoy (today_orders_backup_2026-10-03.json)...');
  const raw = fs.readFileSync('today_orders_backup_2026-10-03.json', 'utf8');
  const backup = JSON.parse(raw);

  if (backup.orders && backup.orders.length > 0) {
    console.log(`⏳ Insertando ${backup.orders.length} pedidos de hoy...`);
    const { error: errOrders } = await supabase.from('orders').upsert(backup.orders);
    if (errOrders) console.error('Error insertando órdenes:', errOrders);
    else console.log('✅ Órdenes restauradas correctamente.');
  }

  if (backup.order_items && backup.order_items.length > 0) {
    console.log(`⏳ Insertando ${backup.order_items.length} ítems de pedidos...`);
    const { error: errItems } = await supabase.from('order_items').upsert(backup.order_items);
    if (errItems) console.error('Error insertando order_items:', errItems);
    else console.log('✅ ítems de pedido restaurados correctamente.');
  }

  if (backup.cash_withdrawals && backup.cash_withdrawals.length > 0) {
    console.log(`⏳ Insertando ${backup.cash_withdrawals.length} retiros de caja...`);
    const { error: errWithdrawals } = await supabase.from('cash_withdrawals').upsert(backup.cash_withdrawals);
    if (errWithdrawals) console.error('Error insertando cash_withdrawals:', errWithdrawals);
    else console.log('✅ Retiros de caja restaurados correctamente.');
  }

  if (backup.order_returns && backup.order_returns.length > 0) {
    console.log(`⏳ Insertando ${backup.order_returns.length} devoluciones...`);
    const { error: errReturns } = await supabase.from('order_returns').upsert(backup.order_returns);
    if (errReturns) console.error('Error insertando order_returns:', errReturns);
    else console.log('✅ Devoluciones restauradas correctamente.');
  }

  console.log('🎉 Restauración de la actividad de hoy completada exitosamente.');
}

restoreTodayData();
