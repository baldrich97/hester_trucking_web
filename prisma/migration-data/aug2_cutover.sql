-- Aug 2 Sources cutover: schema + seed helpers
-- Run on production Aug 2 AFTER client approves seed CSVs.
-- Review paths: prisma/migration-data/client-review/seed_sources.csv
--               prisma/migration-data/client-review/seed_loadtypes_with_services.csv

-- 1) Add SourceID columns (safe to run before Aug 2 deploy)
ALTER TABLE Loads
  ADD COLUMN SourceID INT NULL,
  ADD INDEX FK_Loads_Sources (SourceID),
  ADD CONSTRAINT FK_Loads_Sources FOREIGN KEY (SourceID) REFERENCES Sources(ID)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE Jobs
  ADD COLUMN SourceID INT NULL,
  ADD INDEX FK_Jobs_Sources (SourceID),
  ADD CONSTRAINT FK_Jobs_Sources FOREIGN KEY (SourceID) REFERENCES Sources(ID)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE Weeklies
  ADD COLUMN SourceID INT NULL,
  ADD INDEX FK_Weeklies_Sources (SourceID),
  ADD CONSTRAINT FK_Weeklies_Sources FOREIGN KEY (SourceID) REFERENCES Sources(ID)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- 2) Insert Sources from client-approved seed_sources.csv (KEEP rows only)
-- Example:
-- INSERT INTO Sources (Name, ShortName) VALUES ('Fruitland', 'FRUIT');

-- 3) Start clean LoadTypes at ID 10000
ALTER TABLE LoadTypes AUTO_INCREMENT = 10000;

-- 4) Insert LoadTypes from client-approved seed_loadtypes_with_services.csv (KEEP rows only)
-- Example:
-- INSERT INTO LoadTypes (Description, Deleted) VALUES ('ASPHALT', 0);
