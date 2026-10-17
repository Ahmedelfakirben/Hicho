import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const CLOUD_URL = 'https://zeqootmdlfpospbwwzuh.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW9vdG1kbGZwb3NwYnd3enVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NjEyNCwiZXhwIjoyMDgxMzcyMTI0fQ.GExvcYW5-Au_Wp01YgaljD46JCk0nRDXxBHy6jNs0VM';

const supabase = createClient(CLOUD_URL, CLOUD_SERVICE_KEY);

const rawReturnsData = [
    { prod: "Koupit Svetr adidas Originals Athletic Dept Knitted", size: "L", qty: 1 },
    { prod: "NIKE SPORT", size: "40", qty: 1 },
    { prod: "NIKE SPORT", size: "38.5", qty: 1 },
    { prod: "Survéte VIOLET ADIDAS  IY6591", size: "L", qty: 1 },
    { prod: "LEGGING NIKE NOIR", size: "XXL", qty: 1 },
    { prod: "adidas Sportswear Future Icons 3-Stripes...", size: "M", qty: 1 },
    { prod: "PANTALON NIKE ROSE", size: "XL", qty: 1 },
    { prod: "NIKE Grade-School Dunk Low HJ9202 001", size: "37.5", qty: 1 },
    { prod: "Legging nike noir", size: "L", qty: 1 },
    { prod: "t shirt", size: "Sans Taille", qty: 1 },
    { prod: "Veste adidas noir IU2516", size: "L", qty: 1 },
    { prod: "LEGGINGE ADIDAS NOIR", size: "M", qty: 1 },
    { prod: "CAPUCHE ADIDAS GRIS JI8776", size: "L", qty: 1 },
    { prod: "t shirt", size: "Sans Taille", qty: 1 },
    { prod: "Jordan Jumpman Track Jacket & Pants Set...", size: "12mois", qty: 1 },
    { prod: "T-shirt Nike T100", size: "XXL", qty: 1 },
    { prod: "Chaussettes adidas RUFFLE CREW 2P", size: "Sans Taille", qty: 1 },
    { prod: "Bouteille ADIDAS 500ml", size: "3", qty: 1 },
    { prod: "t shirt", size: "Sans Taille", qty: 1 },
    { prod: "t shirt", size: "L", qty: 1 },
    { prod: "я Adidas Run It Jacket Il7230", size: "M", qty: 1 },
    { prod: "PA?TALON ADIDAS GRIS VIOLET JN6992", size: "XL", qty: 1 },
    { prod: "Pantalon nike noir", size: "XL", qty: 1 },
    { prod: "Ensemble enfants mickey mouse", size: "Sans Taille", qty: 1 },
    { prod: "TSHIRT ADIDAS ZNE BLANC", size: "XXL", qty: 1 },
    { prod: "adidas Adicolor Classics Firebird Track Pants", size: "Xs", qty: 1 },
    { prod: "adidas Adilette Aqua IF0894", size: "40", qty: 1 },
    { prod: "t shirt", size: "L", qty: 1 },
    { prod: "T-shirt adidas bleu IW2704", size: "L", qty: 1 },
    { prod: "t shirt", size: "L", qty: 1 },
    { prod: "Chort adidas beige IT9816", size: "S", qty: 1 },
    { prod: "Power crop IM2707", size: "XS", qty: 1 },
    { prod: "T-shirt adidas blanc", size: "XL", qty: 1 },
    { prod: "Nike Big Logo Tee", size: "XL", qty: 1 },
    { prod: "T SHIRT LONG SLEEF", size: "L", qty: 1 },
    { prod: "chort Under Armour", size: "S", qty: 1 },
    { prod: "UNDER ARMOUR Men's UA Velocity 2.0...", size: "M", qty: 1 },
    { prod: "PANTALON NIKE ROSE", size: "L", qty: 1 },
    { prod: "T-shirt adidas bleu KE1294", size: "L", qty: 1 },
    { prod: "T-shirt adidas vert JX3285", size: "XXL", qty: 1 },
    { prod: "Adidas SLYN SANDAL", size: "38", qty: 1 },
    { prod: "198484314253", size: "L", qty: 1 },
    { prod: "T-shirt Nike", size: "L", qty: 1 },
    { prod: "Under Armour UA SpeedPocket 7”...", size: "L", qty: 1 },
    { prod: "t-shirt UNDER ARMOUR noir", size: "XXL", qty: 1 },
    { prod: "Challenger Extra 22L Small Sports Bag", size: "22L", qty: 1 },
    { prod: "Ensembles puma", size: "M", qty: 1 },
    { prod: "Buy Nike Sportswear Windrunner...", size: "L", qty: 1 },
    { prod: "T-shirt adidas jaune IS0306", size: "XL", qty: 1 },
    { prod: "T-shirt ADIDAS ROSE", size: "M", qty: 1 },
    { prod: "LEGGINSY DAMSKIE ADIDAS ESSENTIALS...", size: "M", qty: 1 },
    { prod: "T-SHIRT ADIDAS MARROC", size: "Sans Taille", qty: 1 },
    { prod: "pantalon adidas noir", size: "XXL", qty: 1 },
    { prod: "Chemise nike", size: "M", qty: 1 },
    { prod: "T-shirt adidas noir", size: "L", qty: 1 },
    { prod: "T-shirt nike", size: "Sans Taille", qty: 1 },
    { prod: "T-shirt adidas blanc cassé IS3607", size: "XXL", qty: 1 },
    { prod: "Nike Bag Gym", size: "Sans Taille", qty: 1 },
    { prod: "Veste adidas noir IU2516", size: "XL", qty: 1 },
    { prod: "T-shirt adidas noir y", size: "M", qty: 1 },
    { prod: "T-shirt adidas noir IW4563", size: "M", qty: 1 },
    { prod: "adidas Originals Firebird Tp...", size: "L", qty: 1 },
    { prod: "Adidas ALL SZN Loose IY6784 M...", size: "M", qty: 1 },
    { prod: "PONTALON ADIDAS", size: "Sans Taille", qty: 1 },
    { prod: "Adidas Kids White & Black Logo...", size: "Sans Taille", qty: 1 },
    { prod: "HM8968 ADI LK BOS SET KIDS...", size: "3-4ans", qty: 1 },
    { prod: "T-shirt blue  nike", size: "XL", qty: 1 },
    { prod: "Under Armour Men's Velocity 2.0...", size: "S", qty: 1 },
    { prod: "chort Under Armour", size: "S", qty: 1 },
    { prod: "Sandale adidas beige JP5183", size: "39", qty: 1 },
    { prod: "T-shirt adidas rose JP0114", size: "XL", qty: 1 },
    { prod: "LEGGINGE ADIDAS NOIR", size: "L", qty: 1 },
    { prod: "LEGGINGE ADIDAS NOIR", size: "XL", qty: 1 },
    { prod: "pantalon adidas noir", size: "XXL", qty: 1 },
    { prod: "MAXI DRESSE IK0439", size: "Sans Taille", qty: 1 },
    { prod: "ADIDAS GRIS ROSE", size: "M", qty: 1 },
    { prod: "adidas Zip Up Vest Kadın Krem Yelek", size: "M", qty: 1 },
    { prod: "SLYN Sandal adidas noir PAA IH6119", size: "38", qty: 1 },
    { prod: "T-shirt nike blanc HV3992-100", size: "M", qty: 1 },
    { prod: "Legging adidas vert JL6231", size: "XXL", qty: 1 },
    { prod: "T-shirt adidas noir IB8273", size: "XL", qty: 1 },
    { prod: "Shop adidas Women's Galaxy 6...", size: "38", qty: 1 },
    { prod: "T-SHIRT UNDER", size: "L", qty: 1 },
    { prod: "Ensembles puma", size: "M", qty: 1 },
    { prod: "Adidas Originals", size: "L", qty: 1 },
    { prod: "Pantalon adidas beige IY2130", size: "XL", qty: 1 },
    { prod: "T-shirt adidas blanc cassée JJ4020", size: "L", qty: 1 },
    { prod: "MAXI DRESSE IK0439", size: "Sans Taille", qty: 1 },
    { prod: "LEGGINGE ADIDAS NOIR", size: "L", qty: 1 },
    { prod: "PONTALON ADIDAS", size: "Sans Taille", qty: 1 },
    { prod: "NIKE SPORT", size: "38.5", qty: 1 },
    { prod: "NIKE SPORT", size: "40", qty: 1 },
    { prod: "t shirt", size: "XL", qty: 1 },
    { prod: "t shirt", size: "Sans Taille", qty: 1 },
    { prod: "t shirt", size: "Sans Taille", qty: 1 }
];

async function generateSql() {
    let sqlContent = `-- Script de Corrección de Stock Generado
-- Basado en la auditoría del 03/10/2026

BEGIN;

`;

    console.log(`Generando SQL para ${rawReturnsData.length} productos...`);

    let foundCount = 0;
    let notFoundCount = 0;

    for (const item of rawReturnsData) {
        // Encontrar producto
        let prodNameMatch = item.prod;
        if (prodNameMatch.endsWith("...")) {
            prodNameMatch = prodNameMatch.slice(0, -3);
        }

        const { data: products } = await supabase
            .from('products')
            .select('id, name, stock')
            .ilike('name', `${prodNameMatch}%`);

        if (!products || products.length === 0) {
            console.log(`⚠️ Producto no encontrado: ${item.prod}`);
            sqlContent += `-- ⚠️ Producto no encontrado: ${item.prod}\n`;
            notFoundCount++;
            continue;
        }

        const product = products[0];

        if (item.size === 'Sans Taille' || !item.size) {
            // Actualizar stock de producto sin tallas
            const newStock = Math.max(0, (product.stock || 0) - item.qty);
            if ((product.stock || 0) > 0) {
                sqlContent += `UPDATE products SET stock = ${newStock} WHERE id = '${product.id}'; -- ${product.name} (Stock anterior: ${product.stock})\n`;
                foundCount++;
            }
        } else {
            // Producto con talla
            const { data: sizes } = await supabase
                .from('product_sizes')
                .select('id, size_name, stock')
                .eq('product_id', product.id)
                .ilike('size_name', item.size);

            if (!sizes || sizes.length === 0) {
                 console.log(`⚠️ Talla no encontrada: ${item.prod} - ${item.size}`);
                 sqlContent += `-- ⚠️ Talla no encontrada: ${item.prod} - ${item.size}\n`;
                 notFoundCount++;
                 continue;
            }

            const sizeRecord = sizes[0];
            const newStock = Math.max(0, (sizeRecord.stock || 0) - item.qty);
            if ((sizeRecord.stock || 0) > 0) {
                sqlContent += `UPDATE product_sizes SET stock = ${newStock} WHERE id = '${sizeRecord.id}'; -- ${product.name} (Talla: ${sizeRecord.size_name}, Stock anterior: ${sizeRecord.stock})\n`;
                foundCount++;
            }
        }
    }

    sqlContent += `\nCOMMIT;\n`;

    fs.writeFileSync('correccion_stock_auditoria.sql', sqlContent);
    console.log(`\n✅ Script SQL generado con éxito: correccion_stock_auditoria.sql`);
    console.log(`- Registros a actualizar: ${foundCount}`);
    console.log(`- Advertencias (no encontrados): ${notFoundCount}`);
}

generateSql();
