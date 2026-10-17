-- Script de Corrección Faltante Generado
BEGIN;

UPDATE product_sizes SET stock = 0 WHERE id = '8f016b74-3e6c-4726-b9e0-43e9eff1e150'; -- NIKE SPORT (Talla: 40, Stock anterior: 1)
UPDATE product_sizes SET stock = 0 WHERE id = '21cc2ebc-9023-416d-9964-c834dee4e206'; -- NIKE SPORT (Talla: 38.5, Stock anterior: 1)
UPDATE product_sizes SET stock = 2 WHERE id = '8a37333d-137a-4384-89ff-0f9f15c12897'; -- LEGGING NIKE NOIR (Talla: XXL, Stock anterior: 3)
UPDATE product_sizes SET stock = 2 WHERE id = '7deeee4a-4ad5-4ede-beba-57a4c0804dfa'; -- Legging nike noir (Talla: L, Stock anterior: 3)
UPDATE product_sizes SET stock = 0 WHERE id = '6fc3d61f-aa07-4535-a8a5-204b7b367158'; -- NIKE CHEST SWOOSH T SHIRT (Talla: L, Stock anterior: 1)
UPDATE product_sizes SET stock = 1 WHERE id = '6f00fbeb-5007-458e-894c-50d4f28688d9'; -- T-shirt Nike (Talla: L, Stock anterior: 2)
UPDATE product_sizes SET stock = 1 WHERE id = 'd665aa7e-b50a-4352-890d-59276dab401e'; -- pantalon adidas noir (Talla: XXL, Stock anterior: 3)
UPDATE product_sizes SET stock = 0 WHERE id = '04cfca89-82cc-42fe-b01c-a2671aa48f3f'; -- Adidas Originals (Talla: L, Stock anterior: 1)

COMMIT;
