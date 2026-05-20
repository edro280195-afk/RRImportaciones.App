-- ============================================================================
-- CORRECCIONES FISCALES — 2026-05-16
-- Base: Excel TABULADOR_2026 oficial + auditoría de BD Neon
--
-- INSTRUCCIONES:
--   1. Conectarse a Neon (dev o prod) con psql o DBeaver.
--   2. Ejecutar bloque por bloque, verificando los SELECT antes y después.
--   3. Aplicar primero en dev, validar, luego en prod.
--   4. Este script es IDEMPOTENTE: puede ejecutarse más de una vez sin daño.
-- ============================================================================


-- ============================================================================
-- 1.1  ParametrosFiscales — POST_2017
--      ID confirmado en BD: 6ea5286c-edbf-4acf-aa71-c5f70464bfb4
--      Problema: Igi=NULL, Dta=NULL, PrevFijo=0 → generaba IGI=$0 silencioso
-- ============================================================================

-- Verificar estado ANTES:
SELECT
    "Id", "Regimen", "Igi", "Dta", "DtaFijo",
    "PrevFijo", "PrvFijo", "Iva", "Activo"
FROM "ParametrosFiscales"
WHERE "Id" = '6ea5286c-edbf-4acf-aa71-c5f70464bfb4';

-- Aplicar corrección:
UPDATE "ParametrosFiscales"
SET
    "Igi"     = 0.10,
    "Dta"     = 0.008,
    "DtaFijo" = NULL,
    "PrevFijo" = 161.00,
    "PrvFijo"  = 0.00,
    "Iva"      = 0.16
WHERE "Id"     = '6ea5286c-edbf-4acf-aa71-c5f70464bfb4'
  AND "Regimen" = 'POST_2017';  -- guard de seguridad: no toca otros registros

-- Verificar estado DESPUÉS:
SELECT
    "Id", "Regimen", "Igi", "Dta", "DtaFijo",
    "PrevFijo", "PrvFijo", "Iva"
FROM "ParametrosFiscales"
WHERE "Id" = '6ea5286c-edbf-4acf-aa71-c5f70464bfb4';


-- ============================================================================
-- 1.2  ParametrosFiscales — PRE_2016
--      ID confirmado en BD: 0e7cdb44-80f9-418b-a1ec-dc3e3dc9b0fd
--      Verificación: si los valores ya son correctos, el UPDATE afecta 0 filas.
-- ============================================================================

-- Verificar estado ANTES:
SELECT
    "Id", "Regimen", "Igi", "Dta", "DtaFijo",
    "PrevFijo", "PrvFijo", "Iva", "Activo"
FROM "ParametrosFiscales"
WHERE "Id" = '0e7cdb44-80f9-418b-a1ec-dc3e3dc9b0fd';

-- Aplicar (solo si los valores difieren de lo esperado):
UPDATE "ParametrosFiscales"
SET
    "Igi"      = 0.50,
    "Dta"      = NULL,
    "DtaFijo"  = 408.00,
    "PrevFijo" = 240.00,
    "PrvFijo"  = 290.00,
    "Iva"      = 0.16
WHERE "Id"     = '0e7cdb44-80f9-418b-a1ec-dc3e3dc9b0fd'
  AND "Regimen" = 'PRE_2016'
  AND (
      "Igi"      IS DISTINCT FROM 0.50
   OR "DtaFijo"  IS DISTINCT FROM 408.00
   OR "PrevFijo" IS DISTINCT FROM 240.00
   OR "PrvFijo"  IS DISTINCT FROM 290.00
   OR "Iva"      IS DISTINCT FROM 0.16
  );

-- Verificar estado DESPUÉS:
SELECT
    "Id", "Regimen", "Igi", "Dta", "DtaFijo",
    "PrevFijo", "PrvFijo", "Iva"
FROM "ParametrosFiscales"
WHERE "Id" = '0e7cdb44-80f9-418b-a1ec-dc3e3dc9b0fd';


-- ============================================================================
-- 1.3  HonorariosConfig — poblar tabla (actualmente vacía)
--      Idempotente: solo inserta si no existe cada régimen.
-- ============================================================================

INSERT INTO "HonorariosConfig" ("Id", "TipoMercancia", "Regimen", "Monto", "Activo")
SELECT gen_random_uuid(), 'VEHICULO', 'POST_2017', 18000.00, true
WHERE NOT EXISTS (
    SELECT 1 FROM "HonorariosConfig"
    WHERE "TipoMercancia" = 'VEHICULO' AND "Regimen" = 'POST_2017'
);

INSERT INTO "HonorariosConfig" ("Id", "TipoMercancia", "Regimen", "Monto", "Activo")
SELECT gen_random_uuid(), 'VEHICULO', 'PRE_2016', 22000.00, true
WHERE NOT EXISTS (
    SELECT 1 FROM "HonorariosConfig"
    WHERE "TipoMercancia" = 'VEHICULO' AND "Regimen" = 'PRE_2016'
);

INSERT INTO "HonorariosConfig" ("Id", "TipoMercancia", "Regimen", "Monto", "Activo")
SELECT gen_random_uuid(), 'VEHICULO', 'AMPARO', 0.00, true
WHERE NOT EXISTS (
    SELECT 1 FROM "HonorariosConfig"
    WHERE "TipoMercancia" = 'VEHICULO' AND "Regimen" = 'AMPARO'
);

-- Verificar:
SELECT "TipoMercancia", "Regimen", "Monto", "Activo"
FROM "HonorariosConfig"
ORDER BY "Regimen";


-- ============================================================================
-- 1.4  TabuladoresAmparo — agregar categoría LUJO
--      Precios 2026 (provisionales, confirmar con dirección antes de producción).
--      Idempotente: solo inserta si no existe la combinación año+categoría.
-- ============================================================================

INSERT INTO "TabuladoresAmparo" ("Id", "AnnoModelo", "Categoria", "PrecioMxn", "Notas")
SELECT
    gen_random_uuid(), 2019, 'LUJO', 79000.00,
    'Categoría LUJO — precio provisional, confirmar con dirección'
WHERE NOT EXISTS (
    SELECT 1 FROM "TabuladoresAmparo"
    WHERE "AnnoModelo" = 2019 AND "Categoria" = 'LUJO'
);

INSERT INTO "TabuladoresAmparo" ("Id", "AnnoModelo", "Categoria", "PrecioMxn", "Notas")
SELECT
    gen_random_uuid(), 2020, 'LUJO', 81000.00,
    'Categoría LUJO — precio provisional, confirmar con dirección'
WHERE NOT EXISTS (
    SELECT 1 FROM "TabuladoresAmparo"
    WHERE "AnnoModelo" = 2020 AND "Categoria" = 'LUJO'
);

INSERT INTO "TabuladoresAmparo" ("Id", "AnnoModelo", "Categoria", "PrecioMxn", "Notas")
SELECT
    gen_random_uuid(), 2021, 'LUJO', 83000.00,
    'Categoría LUJO — precio provisional, confirmar con dirección'
WHERE NOT EXISTS (
    SELECT 1 FROM "TabuladoresAmparo"
    WHERE "AnnoModelo" = 2021 AND "Categoria" = 'LUJO'
);

-- Verificar resultado completo de TabuladoresAmparo:
SELECT "AnnoModelo", "Categoria", "PrecioMxn", "Notas"
FROM "TabuladoresAmparo"
ORDER BY "Categoria", "AnnoModelo";
