import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const CLOUD_URL = 'https://zeqootmdlfpospbwwzuh.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW9vdG1kbGZwb3NwYnd3enVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NjEyNCwiZXhwIjoyMDgxMzcyMTI0fQ.GExvcYW5-Au_Wp01YgaljD46JCk0nRDXxBHy6jNs0VM';

const supabase = createClient(CLOUD_URL, CLOUD_SERVICE_KEY);

const failedItems = [
    { prod: "NIKE SPORT", size: "40", qty: 1 },
    { prod: "NIKE SPORT", size: "38.5", qty: 1 },
    { prod: "LEGGING NIKE NOIR", size: "XXL", qty: 1 },
    { prod: "Legging nike noir", size: "L", qty: 1 },
    { prod: "t shirt", size: "L", qty: 3 }, // Multiplied by 3
    { prod: "T-shirt adidas blanc", size: "XL", qty: 1 },
    { prod: "PANTALON NIKE ROSE", size: "L", qty: 1 },
    { prod: "T-shirt Nike", size: "L", qty: 1 },
    { prod: "T-shirt ADIDAS ROSE", size: "M", qty: 1 },
    { prod: "pantalon adidas noir", size: "XXL", qty: 2 }, // Multiplied by 2
    { prod: "LEGGINGE ADIDAS NOIR", size: "XL", qty: 1 },
    { prod: "Adidas Originals", size: "L", qty: 1 }
];

async function generateRemainingSql() {
    let sqlContent = `-- Script de Corrección Faltante Generado\nBEGIN;\n\n`;
    let foundCount = 0;

    for (const item of failedItems) {
        // Encontrar todos los productos que coincidan de alguna forma
        const { data: products } = await supabase
            .from('products')
            .select('id, name, stock')
            .ilike('name', `%${item.prod}%`);

        if (!products || products.length === 0) {
            console.log(`❌ Ningún producto parecido a: ${item.prod}`);
            continue;
        }

        let sizeFound = false;

        for (const product of products) {
            const { data: sizes } = await supabase
                .from('product_sizes')
                .select('id, size_name, stock')
                .eq('product_id', product.id)
                .ilike('size_name', item.size);

            if (sizes && sizes.length > 0) {
                const sizeRecord = sizes[0];
                sizeFound = true;
                
                // Generar corrección
                const newStock = Math.max(0, (sizeRecord.stock || 0) - item.qty);
                if ((sizeRecord.stock || 0) > 0) {
                    sqlContent += `UPDATE product_sizes SET stock = ${newStock} WHERE id = '${sizeRecord.id}'; -- ${product.name} (Talla: ${sizeRecord.size_name}, Stock anterior: ${sizeRecord.stock})\n`;
                    foundCount++;
                } else {
                     console.log(`⚠️ Talla encontrada pero stock ya es <= 0: ${product.name} - ${item.size} (Stock: ${sizeRecord.stock})`);
                }
                break; // Stop looking in other products if we found the size in one
            }
        }

        if (!sizeFound) {
             console.log(`❌ Talla no encontrada en ningún producto similar: ${item.prod} - ${item.size}`);
        }
    }

    sqlContent += `\nCOMMIT;\n`;

    fs.writeFileSync('correccion_faltantes.sql', sqlContent);
    console.log(`\n✅ SQL de faltantes generado: correccion_faltantes.sql`);
    console.log(`- Registros a actualizar encontrados: ${foundCount}`);
}

generateRemainingSql();
