import csv, collections, re

rows = list(csv.DictReader(open(r"client-review/07_full_migration_preview.csv", encoding="utf-8")))
sources_raw = list(csv.DictReader(open(r"client-review/02_sources_for_client.csv", encoding="utf-8")))

def canon_service(s):
    s = (s or "").strip().upper().replace("&", "AND")
    s = re.sub(r"\s+", " ", s)
    aliases = {
        "HAULING AND SPREADING": "HAULING AND SPREADING",
        "SPREADING ONLY": "SPREADING ONLY",
        "SPREADING": "SPREADING ONLY",
        "MATERIAL ONLY": "MATERIAL ONLY",
        "HAUL BACK": "HAUL BACK",
        "BACKHAUL": "HAUL BACK",
        "BACK HAUL": "HAUL BACK",
        "HOURLY": "HOURLY",
        "HAULING": "HAULING",
        "HAULING ONLY": "HAULING ONLY",
    }
    return aliases.get(s, "")

def norm_base(b):
    b = (b or "").strip().upper().replace("ASPAHLT", "ASPHALT")
    b = re.sub(r"\s+", " ", b)
    merges = {
        "AG LIME": "AGLIME",
        "AG-LIME": "AGLIME",
        "SCREENING": "SCREENINGS",
        '1" CLN': '1" CLEAN',
        "HAULBACK": "HAUL BACK",
        "MILLINGS": "MILLING",
        "HAULING MILLINGS": "MILLING",
        "TYPE 5": "TYPE 5 BASE",
        "TYPE V BASE": "TYPE 5 BASE",
        "RIPRAP": "RIP RAP",
        "SKIDSTEER": "SKID STEER",
        "PLANTMOVE": "PLANT MOVE",
        "EDGE TRTMNT": "EDGE TREATMENT",
        "MASONARY SAND": "MASONRY SAND",
        "OVERSIZE GRAVEL": "OVERSIZED GRAVEL",
    }
    return merges.get(b, b)

SKIP_BASES = {"HAUL", "1/4", "MISTAKE ON WRONG RATE FOR INVOICE#17863", "ADJ-ERROR", "ADJUSTMENT-PMT"}
JUNK = {
    "MISTAKE ON WRONG RATE FOR INVOICE#17863",
    "ADJ-ERROR",
    "ADJUSTMENT-PMT",
    "JOB 23002.2 ACCIDENT 1000002",
    "ACCIDENT DOWN TIME",
    "CAREER DAY",
    "TIRE",
    "CALIBRATE",
    "OVER 20 TON",
    "UNDER 18 TON",
    "CC FEE",
    "CREDIT CARD FEE",
}

pure = collections.Counter()
ex = collections.defaultdict(list)
for r in rows:
    base = norm_base(r["ProposedBase"])
    svc = canon_service(r["Service"])
    if not base or base in SKIP_BASES:
        continue
    name = ("%s (%s)" % (base, svc)) if svc else base
    pure[name] += int(r["LoadCount"] or 0)
    if len(ex[name]) < 3:
        ex[name].append(r["LegacyDescription"])

def canon_source(tag):
    t = tag.strip().upper().replace(".", "")
    t = re.sub(r"\s+", " ", t)
    rules = [
        (r"^ICM[-\s]?DONIPHAN$|^ICM[-\s]?DNPHN$|^DONIPHAN/ICM$|^DON$", "ICM Doniphan", "ICM-DON"),
        (r"^DONIPHAN$", "Doniphan", "DON"),
        (r"^BLUEWING[-\s]?PB$|^BLUEWING PB$|^BW$", "Bluewing PB", "BW-PB"),
        (r"^VB BLUEWING$|^BLUEWING[-\s]?VB$|^BLUEWING$|^VB$|^VBS$", "Bluewing VB", "BW-VB"),
        (r"^BLUEWING[-\s]?DON$", "Bluewing Doniphan", "BW-DON"),
        (r"^BASE\s?ROCK(?: FRTLND)?$|^BASEROCK$|^BR$", "Base Rock", "BR"),
        (r"^BRENDA\s?KAY$|^BRENDAKAY$|^BK$|^BRENDA$", "Brenda Kay", "BK"),
        (r"^IRON MNT$|^IRON MTN$", "Iron Mountain", "IM"),
        (r"^ICM[-\s]?W\s*PLAINS$|^ICM[-\s]?WP$|^WEST PLAINS$|^WP$", "West Plains / ICM", "WP"),
        (r"^FRUITLAND(?: ASPHALT)?$", "Fruitland", "FRUIT"),
        (r"^DEXTER(?: SAND)?$", "Dexter", "DEX"),
        (r"^COLT(?: R & L| R&L)?$", "Colt", "COLT"),
        (r"^CQ$|^CAPE QUARRY$|^CAP QUARRIES$", "Cape Quarry", "CQ"),
        (r"^SEMO(?: CONCRETE| STONE| LAND DESIGNS)?$", "SEMO", "SEMO"),
        (r"^BUTLER(?: HILL|HILL)?$", "Butler", "BUTLER"),
        (r"^ICM[-\s]?ARAB$|^ARAB$", "Arab", "ARAB"),
        (r"^ICM[-\s]?HOUSTON$", "ICM Houston", "ICM-HOU"),
        (r"^ICM[-\s]?WS$", "ICM WS", "ICM-WS"),
        (r"^ICM$", "ICM", "ICM"),
        (r"^WS(?: & STRACK)?$", "WS", "WS"),
        (r"^STRACK(?:-RED)?$", "Strack", "STRACK"),
        (r"^HL$", "Heartland", "HL"),
        (r"^HEARTLAND$", "Heartland", "HL"),
        (r"^CC(?:-VB)?$", "CC", "CC"),
        (r"^FISCHER(?: QUARRY)?$", "Fischer Quarry", "FISCHER"),
        (r"^ROBERTSON$", "Robertson", "ROB"),
        (r"^CAPITAL$", "Capital", "CAP"),
        (r"^MANSFIELD$", "Mansfield", "MANS"),
        (r"^FARMINGTON$", "Farmington", "FARM"),
        (r"^PEACHSTREET$|^PB$", "Peachstreet", "PEACH"),
        (r"^JACKSON QUARRY$", "Jackson Quarry", "JQ"),
        (r"^DELTA(?: DEXTER)?$", "Delta", "DELTA"),
        (r"^CANE CREEK$", "Cane Creek", "CANE"),
        (r"^WILLOW$", "Willow", "WILLOW"),
        (r"^SCAGGS$", "Scaggs", "SCAGGS"),
        (r"^MINERAL AREA$", "Mineral Area", "MIN"),
        (r"^PRAIRIE STATE$", "Prairie State", "PS"),
        (r"^ELLSINORE$", "Ellsinore", "ELL"),
        (r"^MALDEN$", "Malden", "MAL"),
        (r"^SAND PIT$|^PITS$", "Sand Pit", "PIT"),
        (r"^GADS HILL$|^GH$", "Gads Hill", "GH"),
        (r"^END DUMP$", "End Dump", "ED"),
        (r"^PLANT$", "Plant", "PLANT"),
        (r"^CENTRAL STONE$|^CS$", "Central Stone", "CS"),
        (r"^CERTAINTEED$", "CertainTeed", "CT"),
        (r"^DYERSBURG$", "Dyersburg", "DYER"),
        (r"^ESS$", "ESS", "ESS"),
        (r"^GRAY.?S POINT$", "Grays Point", "GP"),
        (r"^NAPA$", "Napa", "NAPA"),
        (r"^HEAVY HAUL$", "Heavy Haul", "HH"),
        (r"^PER KYLE$", "Per Kyle", "KYLE"),
        (r"^HAY BALES$", "Hay Bales", "HAY"),
        (r"^TRAP$", "Trap", "TRAP"),
        (r"^ROCK$", "Rock (tag)", "ROCK"),
        (r"^DRTY$", "Dexter Dirty grade", "DRTY"),
        (r"^CLN$", "Dexter Clean grade", "CLN"),
    ]
    for pat, name, short in rules:
        if re.match(pat, t):
            return name, short
    return tag.strip().title(), tag.strip().upper()[:12]

src = {}
for s in sources_raw:
    name, short = canon_source(s["SourceTag"])
    if name not in src:
        src[name] = {"short": short, "loads": 0, "tags": []}
    src[name]["loads"] += int(s["TotalLoadCount"])
    src[name]["tags"].append(s["SourceTag"])

out_lt = "client-review/seed_loadtypes_with_services.csv"
with open(out_lt, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["ProposedDescription", "TotalLoadCount", "ExampleLegacyDescriptions", "ClientAction", "Notes"])
    for name, c in sorted(pure.items(), key=lambda x: (-x[1], x[0])):
        action = "DELETE" if any(j in name for j in JUNK) else ("REVIEW" if c < 5 else "KEEP")
        notes = "Low volume" if c < 5 and action == "REVIEW" else ""
        w.writerow([name, c, " | ".join(ex[name]), action, notes])

out_src = "client-review/seed_sources.csv"
with open(out_src, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Name", "ShortName", "TotalLoadCount", "AliasTags", "ClientAction", "Notes"])
    for name, d in sorted(src.items(), key=lambda x: (-x[1]["loads"], x[0])):
        action = "REVIEW" if d["loads"] < 10 else "KEEP"
        w.writerow([name, d["short"], d["loads"], " | ".join(d["tags"]), action, ""])

print("wrote", len(pure), "loadtypes and", len(src), "sources")
