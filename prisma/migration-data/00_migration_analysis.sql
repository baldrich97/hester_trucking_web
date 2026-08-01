-- =============================================================================
-- Load type / source / service migration — ANALYSIS & STAGING (run in DataGrip)
-- Run AFTER schema adds: Loads.SourceID, Loads.ServiceModifierID, ServiceModifiers
-- Review all SELECT results before running any UPDATE/INSERT sections at the bottom.
--
-- Uses SUBSTRING_INDEX / LIKE only (no REGEXP_SUBSTR) for MySQL 5.7+ / MariaDB.
--
-- Orphan load types (0 loads): see orphan_load_types_report.txt (49 IDs).
-- ID 102 is a bad multi-product string — exclude from tag parsing / migration.
--
-- EXPORT NAMING (save under prisma/migration-data/query-results/):
--   Run this entire script in ONE DataGrip session (temp tables).
--   Export each SELECT result with header row as CSV using the filenames below.
--
--   00_orphan_load_types.csv          <- section 0
--   01a_row_kind_counts.csv           <- section 1 (summary)
--   01b_manual_review.csv
--   01c_double_paren.csv
--   02_full_classified.csv            <- section 2 (MASTER — all parsed rows)
--   02a_tag1_misclassified.csv
--   02b_hourly_with_tags.csv
--   03_source_candidates.csv
--   04_service_candidates.csv
--   05_base_name_dedup.csv
--   06_classified_with_load_counts.csv
--
-- Minimum set if you only want a few: 02_full_classified + 03 + 04 + 06
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Load types with no non-deleted loads (safe to skip in migration)
-- -----------------------------------------------------------------------------
SELECT lt.ID, lt.Description, lt.Deleted
FROM LoadTypes lt
LEFT JOIN Loads l ON l.LoadTypeID = lt.ID
    AND (l.Deleted IS NULL OR l.Deleted = 0)
WHERE l.ID IS NULL
ORDER BY lt.ID;

-- -----------------------------------------------------------------------------
-- 1) Parse every LoadTypes.Description into base name + up to 2 parenthetical tags
-- Excludes zero-load types and known-bad IDs (102).
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_load_type_parse;
CREATE TEMPORARY TABLE tmp_load_type_parse AS
SELECT
    lt.ID AS OldLoadTypeID,
    lt.Description,
    lt.Deleted,
    -- Text before the first '(' (or full string if no parens)
    TRIM(
        CASE
            WHEN lt.Description LIKE '%(%' THEN SUBSTRING_INDEX(lt.Description, '(', 1)
            ELSE lt.Description
        END
    ) AS BaseName,
    -- First (...)
    CASE
        WHEN lt.Description LIKE '%(%' THEN TRIM(
            SUBSTRING_INDEX(
                SUBSTRING_INDEX(CONCAT(lt.Description, ')'), '(', 2),
                ')',
                1
            )
        )
        ELSE NULL
    END AS Tag1,
    -- Second (...), if present
    CASE
        WHEN (LENGTH(lt.Description) - LENGTH(REPLACE(lt.Description, '(', ''))) >= 2
            AND LOCATE(')', lt.Description) > 0
        THEN TRIM(
            SUBSTRING_INDEX(
                SUBSTRING_INDEX(
                    CONCAT(TRIM(SUBSTRING(lt.Description, LOCATE(')', lt.Description) + 1)), ')'),
                    '(',
                    2
                ),
                ')',
                1
            )
        )
        ELSE NULL
    END AS Tag2,
    CASE
        WHEN lt.Description LIKE 'HOURLY%' THEN 'hourly_family'
        WHEN (
            lt.Description LIKE '%HAULING%'
            OR lt.Description LIKE '%SPREADING%'
            OR lt.Description LIKE '%MATERIAL ONLY%'
            OR lt.Description LIKE '%HAUL BACK%'
            OR lt.Description LIKE '%BACKHAUL%'
            OR lt.Description LIKE '%BACK HAUL%'
            OR lt.Description LIKE '%MAT & HAUL%'
            OR lt.Description LIKE '%MAT, HAUL%'
            OR lt.Description LIKE '%SPRDNG%'
            OR lt.Description LIKE '% SPRD%'
        )
        AND lt.Description NOT LIKE '%(%(%'
            THEN 'service_in_name'
        ELSE 'material'
    END AS RowKind,
    -- Second product after ')' without a second '(' (e.g. ID 102: two sizes in one string)
    CASE
        WHEN LOCATE(')', lt.Description) > 0
            AND TRIM(SUBSTRING(lt.Description, LOCATE(')', lt.Description) + 1)) LIKE '%"%'
            AND TRIM(SUBSTRING(lt.Description, LOCATE(')', lt.Description) + 1)) NOT LIKE '(%'
        THEN 1
        ELSE 0
    END AS NeedsManualReview
FROM LoadTypes lt
WHERE lt.ID NOT IN (102)  -- multi-product garbage row; 0 loads
  AND EXISTS (
      SELECT 1 FROM Loads l
      WHERE l.LoadTypeID = lt.ID
        AND (l.Deleted IS NULL OR l.Deleted = 0)
  );

-- How many rows have parenthetical tags?
SELECT RowKind, COUNT(*) AS Cnt
FROM tmp_load_type_parse
GROUP BY RowKind
ORDER BY Cnt DESC;

-- Rows that need manual review (multi-product text, odd parens)
SELECT OldLoadTypeID, Description, BaseName, Tag1, Tag2, RowKind
FROM tmp_load_type_parse
WHERE NeedsManualReview = 1
ORDER BY Description;

-- Double-paren rows (source + service or similar) — review manually
SELECT OldLoadTypeID, Description, BaseName, Tag1, Tag2, RowKind
FROM tmp_load_type_parse
WHERE Tag2 IS NOT NULL
ORDER BY Description;

-- -----------------------------------------------------------------------------
-- 2) Classify Tag1 / Tag2 (heuristic — adjust CASE list after review)
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_load_type_classified;
CREATE TEMPORARY TABLE tmp_load_type_classified AS
SELECT
    p.*,
    CASE
        WHEN p.Tag1 IS NULL THEN NULL
        WHEN p.RowKind = 'hourly_family' THEN 'hourly_context'
        WHEN UPPER(p.Tag1) LIKE 'SPREADING%'
            OR UPPER(p.Tag1) LIKE '%SPREADING%'
            OR UPPER(p.Tag1) LIKE 'HAULING%'
            OR UPPER(p.Tag1) LIKE '%HAULING%'
            OR UPPER(p.Tag1) LIKE 'MATERIAL%'
            OR UPPER(p.Tag1) LIKE '%MATERIAL ONLY%'
            OR UPPER(p.Tag1) LIKE 'HAUL %'
            OR UPPER(p.Tag1) LIKE 'MAT %'
            OR UPPER(p.Tag1) LIKE 'MAT,%'
            OR UPPER(p.Tag1) LIKE '%SPRD%'
            OR UPPER(p.Tag1) LIKE '%HAUL BACK%'
            OR UPPER(p.Tag1) LIKE '%BACKHAUL%'
            OR UPPER(p.Tag1) LIKE '%HAUL%ONLY%'
            THEN 'service'
        WHEN UPPER(p.Tag1) IN ('STOCKPILE', 'SHOP', 'STRAIGHT', 'VBR', 'SANDP') THEN 'context'
        ELSE 'source'
    END AS Tag1Kind,
    CASE
        WHEN p.Tag2 IS NULL THEN NULL
        WHEN UPPER(p.Tag2) LIKE 'SPREADING%'
            OR UPPER(p.Tag2) LIKE '%SPREADING%'
            OR UPPER(p.Tag2) LIKE 'HAULING%'
            OR UPPER(p.Tag2) LIKE '%HAULING%'
            OR UPPER(p.Tag2) LIKE 'MATERIAL%'
            OR UPPER(p.Tag2) LIKE '%MATERIAL ONLY%'
            OR UPPER(p.Tag2) LIKE 'HAUL %'
            OR UPPER(p.Tag2) LIKE 'MAT %'
            OR UPPER(p.Tag2) LIKE 'MAT,%'
            OR UPPER(p.Tag2) LIKE '%SPRD%'
            OR UPPER(p.Tag2) LIKE '%HAUL BACK%'
            OR UPPER(p.Tag2) LIKE '%BACKHAUL%'
            OR UPPER(p.Tag2) LIKE '%HAUL%'
            THEN 'service'
        ELSE 'source'
    END AS Tag2Kind
FROM tmp_load_type_parse p;

-- *** MASTER EXPORT: every in-scope load type, parsed + classified ***
SELECT
    OldLoadTypeID,
    Description,
    Deleted,
    BaseName,
    Tag1,
    Tag1Kind,
    Tag2,
    Tag2Kind,
    RowKind,
    NeedsManualReview
FROM tmp_load_type_classified
ORDER BY OldLoadTypeID;

-- Rows where Tag1 was classified as source but looks like service (review)
SELECT OldLoadTypeID, Description, BaseName, Tag1, Tag1Kind, Tag2, Tag2Kind
FROM tmp_load_type_classified
WHERE Tag1Kind = 'source'
  AND (UPPER(Tag1) LIKE '%HAUL%' OR UPPER(Tag1) LIKE '%SPREAD%' OR UPPER(Tag1) LIKE '%ONLY%')
ORDER BY Description;

-- Hourly family — Tag1 should NOT become a Source
SELECT OldLoadTypeID, Description, Tag1, Tag1Kind
FROM tmp_load_type_classified
WHERE RowKind = 'hourly_family' AND Tag1 IS NOT NULL
ORDER BY Description;

-- -----------------------------------------------------------------------------
-- 3) Distinct source candidates (from tags classified as source)
-- -----------------------------------------------------------------------------
SELECT DISTINCT
    UPPER(TRIM(Tag1)) AS SourceCandidate
FROM tmp_load_type_classified
WHERE Tag1Kind = 'source' AND Tag1 IS NOT NULL
UNION
SELECT DISTINCT UPPER(TRIM(Tag2))
FROM tmp_load_type_classified
WHERE Tag2Kind = 'source' AND Tag2 IS NOT NULL
ORDER BY SourceCandidate;

-- -----------------------------------------------------------------------------
-- 4) Service modifier candidates
-- -----------------------------------------------------------------------------
SELECT DISTINCT Tag1 AS ServiceCandidate
FROM tmp_load_type_classified
WHERE Tag1Kind = 'service'
UNION
SELECT DISTINCT Tag2
FROM tmp_load_type_classified
WHERE Tag2Kind = 'service'
UNION
SELECT Description
FROM tmp_load_type_classified
WHERE RowKind = 'service_in_name'
ORDER BY ServiceCandidate;

-- -----------------------------------------------------------------------------
-- 5) Base load type dedup preview (how many legacy IDs collapse to one base name)
-- -----------------------------------------------------------------------------
SELECT
    BaseName,
    COUNT(*) AS LegacyVariantCount,
    GROUP_CONCAT(OldLoadTypeID ORDER BY OldLoadTypeID) AS LegacyIDs
FROM tmp_load_type_classified
GROUP BY BaseName
HAVING COUNT(*) > 1
ORDER BY LegacyVariantCount DESC, BaseName
LIMIT 100;

-- -----------------------------------------------------------------------------
-- 6) Load volume by legacy ID (join to your export or live Loads table)
-- -----------------------------------------------------------------------------
SELECT
    c.OldLoadTypeID,
    c.Description,
    c.BaseName,
    c.Tag1,
    c.Tag1Kind,
    c.Tag2,
    c.Tag2Kind,
    COUNT(l.ID) AS LoadCount
FROM tmp_load_type_classified c
LEFT JOIN Loads l ON l.LoadTypeID = c.OldLoadTypeID
    AND (l.Deleted IS NULL OR l.Deleted = 0)
GROUP BY c.OldLoadTypeID, c.Description, c.BaseName, c.Tag1, c.Tag1Kind, c.Tag2, c.Tag2Kind
ORDER BY LoadCount DESC;

-- =============================================================================
-- SEED DATA (run after ServiceModifiers / Sources tables exist)
-- =============================================================================

-- Suggested ServiceModifiers (normalize variants in app later)
/*
INSERT INTO ServiceModifiers (Name, ShortName) VALUES
('Hauling', 'H'),
('Spreading', 'S'),
('Hauling and Spreading', 'H+S'),
('Spreading Only', 'SO'),
('Hauling Only', 'HO'),
('Material Only', 'MO'),
('Haul Back', 'HB'),
('Backhaul', 'BH');
*/

-- Sources: use DISTINCT query from section 3, then INSERT with canonical Name + ShortName
-- Example normalizations to apply in a spreadsheet before INSERT:
--   WS, CC, ARAB, VB, CQ, DEXTER, FRUITLAND, ROBERTSON, DONIPHAN
--   ICM-DONIPHAN / ICM DONIPHAN / DON -> Doniphan (ICM)
--   BLUEWING-PB / BLUEWING PB / BW -> Bluewing
--   BASEROCK / BASE ROCK -> Base Rock
--   BRENDA KAY / BRENDAKAY / BK -> Brenda Kay
--   HEARTLAND, HEARTLAND, FISCHER QUARRY, SEMO, CAP QUARRIES, etc.

-- =============================================================================
-- APPLY (only after review + schema migration — DO NOT run blindly)
-- =============================================================================

/*
-- Staging map: old LoadType ID -> new canonical LoadType ID + FKs
CREATE TABLE IF NOT EXISTS LoadTypeMigrationMap (
    OldLoadTypeID INT PRIMARY KEY,
    NewLoadTypeID INT NOT NULL,
    SourceID INT NULL,
    ServiceModifierID INT NULL
);

-- 1) Upsert canonical LoadTypes by BaseName (lowest legacy ID wins or MIN(ID))
-- 2) Fill LoadTypeMigrationMap from tmp_load_type_classified + Sources/ServiceModifiers
-- 3) UPDATE Loads SET LoadTypeID = m.NewLoadTypeID, SourceID = m.SourceID, ServiceModifierID = m.ServiceModifierID
--    FROM LoadTypeMigrationMap m WHERE Loads.LoadTypeID = m.OldLoadTypeID;
-- 4) Soft-delete or merge unused LoadTypes rows
-- 5) Rebuild SourceLoadTypes from Loads WHERE SourceID IS NOT NULL
*/
