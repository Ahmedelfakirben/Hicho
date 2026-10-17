import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = 'https://zeqootmdlfpospbwwzuh.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW9vdG1kbGZwb3NwYnd3enVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NjEyNCwiZXhwIjoyMDgxMzcyMTI0fQ.GExvcYW5-Au_Wp01YgaljD46JCk0nRDXxBHy6jNs0VM';

const supabase = createClient(CLOUD_URL, CLOUD_SERVICE_KEY);

async function checkStock() {
    // Checking a few IDs from the SQL script
    const idsToCheck = [
        'ecd9af60-f258-4f0d-8e75-d3272634f7ed', // Survéte VIOLET ADIDAS  IY6591 (L)
        '5bce033f-6214-41fe-96d2-82f8be5d6385', // adidas Sportswear Future Icons 3-Stripes Half-Zip Sweatshirt  IW8544 (M)
        '3d7ec4d4-78d0-4c54-8615-679a61a69c8a', // NIKE Grade-School Dunk Low HJ9202 001 (37.5)
    ];

    const { data, error } = await supabase
        .from('product_sizes')
        .select('id, size_name, stock, product_id, products(name)')
        .in('id', idsToCheck);

    if (error) {
        console.error("Error reading:", error);
    } else {
        console.table(data.map(d => ({
            name: d.products?.name,
            size: d.size_name,
            stock: d.stock
        })));
    }
}

checkStock();
