import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = 'https://zeqootmdlfpospbwwzuh.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW9vdG1kbGZwb3NwYnd3enVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NjEyNCwiZXhwIjoyMDgxMzcyMTI0fQ.GExvcYW5-Au_Wp01YgaljD46JCk0nRDXxBHy6jNs0VM';

const supabase = createClient(CLOUD_URL, CLOUD_SERVICE_KEY);

async function checkNike() {
    const { data: products } = await supabase
        .from('products')
        .select('id, name, stock')
        .ilike('name', '%NIKE SPORT%');

    if (products && products.length > 0) {
        for (const p of products) {
            const { data: sizes } = await supabase
                .from('product_sizes')
                .select('id, size_name, stock')
                .eq('product_id', p.id);
            
            console.log(`Product: ${p.name} (ID: ${p.id})`);
            console.table(sizes);
        }
    } else {
        console.log("No NIKE SPORT found");
    }
}

checkNike();
