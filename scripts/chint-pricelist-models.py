"""CHINT model list from the IEC price list (Oct 2025) -> CSV for the library importer.

Prices are deliberately NOT read. Only what identifies a product and its electrical
rating: series, model, poles, rated current, breaking capacity, sensitivity, etc.
Each row cites the price-list page. Dimensions come later from CHINT's own catalogues.

Run: python3 scripts/chint-pricelist-models.py > product-pdfs/chint-models.csv
"""
import csv, sys

SRC = "IEC CHINT price list Oct 2025 (product-pdfs/IEC-CHINT PL OCT 2025.pdf)"
COLS = ["brand", "type", "series", "part_number", "name", "poles", "rating", "icu", "curve", "sensitivity",
        "rating_ac3", "kw_ac3", "aux", "range", "function", "ratio", "source_title", "source_page"]
rows = []


def add(type_, series, part, name, page, **v):
    r = {"brand": "CHINT", "type": type_, "series": series, "part_number": part, "name": name, "source_title": SRC, "source_page": page}
    r.update({k: ("" if x is None else x) for k, x in v.items()})
    rows.append(r)


# ---- MCB (p.4) ----
def mcb(model, poles, amps, icu, curve="C", page="4"):
    for a in amps:
        add("MCB", model[:-1] if model.endswith(("C", "H")) and model[-2].isdigit() else model, f"{model} {poles}P {a}A",
            f"{model} {poles}P {a} A, curve {curve}, {icu} kA", page, poles=poles, rating=a, icu=icu, curve=curve)

std = [1, 2, 3, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63]
for p in (1, 2, 3, 4):
    mcb("NXB-63C", p, std, 6)
mcb("NXB-125C", 4, [100, 125], 6)
for p, amps in ((1, std), (2, std), (3, std), (4, std)):
    mcb("NXB-63H", p, amps, 10)

# ---- DC MCB (p.5) ----
for p in (2, 4):
    for a in std:
        add("MCB", "NB1-63DC", f"NB1-63DC {p}P {a}A", f"NB1-63DC DC MCB {p}P {a} A", "5", poles=p, rating=a, function="DC")
add("MCB", "DZ158-125", "DZ158-125 2P 125A", "DZ158-125 DC MCB 2P 125 A", "5", poles=2, rating=125, function="DC")

# ---- DIN changeover switch (p.5) ----
for p in (1, 2):
    for a in (32, 63):
        add("Switch-disconnector", "NZK1", f"NZK1-32 {p}P {a}A", f"NZK1 changeover switch {p}P {a} A (DIN)", "5", poles=p, rating=a)

# ---- RCBO / RCCB (p.6) ----
for p in (2, 4):
    for a in (6, 10, 16, 20, 25, 32, 40, 50, 63):
        for s in (30, 300):
            add("RCCB / RCBO", "NXBLE-63", f"NXBLE-63 {p}P {a}A {s}mA", f"NXBLE-63 RCBO {p}P {a} A {s} mA", "6", poles=p, rating=a, sensitivity=s, icu=6)
for s in (30, 300):
    add("RCCB / RCBO", "NXBLE-63", f"NXBLE-63 4P 100A {s}mA", f"NXBLE-63 RCBO 4P 100 A {s} mA", "6", poles=4, rating=100, sensitivity=s, icu=6)
for p in (2, 4):
    for a in (25, 40, 63):
        for s in (30, 300):
            add("RCCB / RCBO", "NL1-63", f"NL1-63 {p}P {a}A {s}mA", f"NL1-63 RCCB {p}P {a} A {s} mA", "6", poles=p, rating=a, sensitivity=s)

# ---- Surge arresters (p.7) ----
for p, imax in ((2, 40), (4, 40), (4, 65), (4, 100)):
    add("Surge protective device", "NU6-II", f"NU6-II {p}P {imax}kA", f"NU6-II AC SPD {p}P In {imax} kA", "7", poles=p, function=f"AC SPD, nominal discharge {imax} kA")
for p, v, note in ((2, "750V", "ungrounded PV"), (2, "1200/1500V", "grounded PV"), (4, "1200/1500V", "ungrounded PV")):
    add("Surge protective device", "EX9UEP (NOARK)", f"EX9UEP {p}P {v}", f"EX9UEP DC SPD {p}P {v}, {note}", "7", poles=p, function=f"DC SPD {v}, 40 kA, {note}")

# ---- MCCB fixed thermal-magnetic (p.8-9) ----
def mccb(frame, ver, poles, amps, icu, page, series=None):
    model = f"NXM-{frame}{ver}"
    for a in amps:
        add("MCCB", series or f"NXM-{frame}", f"{model} {poles}P {a}A", f"NXM-{frame} {ver} {poles}P {a} A, fixed, thermal-magnetic, {icu} kA",
            page, poles=poles, rating=a, icu=icu)

mccb("125", "S", 3, [16, 20, 25, 32, 40, 50, 63, 80, 100, 125], 25, "8")
mccb("160", "S", 3, [160], 35, "8")
mccb("250", "S", 3, [200, 225, 250], 35, "8")
mccb("400", "S", 3, [320, 400], 50, "8")
mccb("630", "S", 3, [500, 630], 50, "8")
mccb("800", "S", 3, [800], 50, "8")
mccb("1000", "S", 3, [1000], 50, "8")
mccb("1600", "S", 3, [1250, 1600], 50, "8")
mccb("125", "H", 3, [15, 20, 25, 32, 40, 50, 63, 80, 100, 125], 50, "8")
mccb("250", "H", 3, [160, 200, 225, 250], 50, "8")
mccb("400", "H", 3, [320, 400], 70, "8")
mccb("630", "H", 3, [500, 630], 70, "8")
mccb("800", "H", 3, [800], 70, "8")
mccb("1000", "H", 3, [1000], 70, "8")
mccb("1600", "H", 3, [1250, 1600], 70, "8")
mccb("125", "S", 4, [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160], 25, "9")
mccb("250", "S", 4, [200, 225, 250], 36, "9")
mccb("400", "S", 4, [320, 400], 50, "9")
mccb("630", "S", 4, [500, 630], 50, "9")
mccb("800", "S", 4, [800], 50, "9")
mccb("1000", "S", 4, [1000], 50, "9")
mccb("1600", "S", 4, [1250, 1600], 50, "9")
mccb("125", "H", 4, [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160], 50, "9")
mccb("250", "H", 4, [200, 225, 250], 50, "9")
mccb("400", "H", 4, [320, 400], 70, "9")
mccb("630", "H", 4, [500, 630], 70, "9")
mccb("800", "H", 4, [800], 70, "9")
mccb("1000", "H", 4, [1000], 70, "9")
mccb("1600", "H", 4, [1250, 1600], 70, "9")

# ---- MCCB adjustable NXMS (p.10) ----
for poles in (3, 4):
    for model, amps, icu in (("NXMS-160F", [32, 40, 63, 100, 125, 160], 36), ("NXMS-250F", [200, 250], 36), ("NXMS-400F", [400], 50),
                             ("NXMS-630F", [630], 50), ("NXMS-1000S", [800, 1000], 50), ("NXMS-1600S", [1250, 1600], 50)):
        for a in amps:
            add("MCCB", model[:-1], f"{model} {poles}P {a}A", f"{model} {poles}P {a} A, adjustable thermal-magnetic, {icu} kA", "10",
                poles=poles, rating=a, icu=icu, trip_unit="adjustable TM")

# ---- MCCB HV (p.11) ----
for f in (250, 400, 630):
    add("MCCB", "NM8N-HV", f"NM8N-{f}HVS TM 3P", f"NM8N-{f}HVS TM 3P {f} A, up to AC 1150 V (Icu 50 kA at 800 V)", "11", poles=3, rating=f)

# ---- ACB (p.12-13) ----
for poles, sets in ((3, (("NXA-16", [1000, 1250, 1600], 50), ("NXA-20", [2000], 80), ("NXA-32", [2500, 3200], 80), ("NXA-40", [4000], 80), ("NXA-63", [5000, 6300], 120))),
                    (4, (("NXA-16", [1000, 1250, 1600], 50), ("NXA-20", [2000], 80), ("NXA-32", [2500, 3200], 80), ("NXA-40", [4000], 80)))):
    for model, amps, icu in sets:
        for a in amps:
            add("ACB", model, f"{model} {poles}P {a}A", f"{model} {poles}P {a} A, {icu} kA (fixed or draw-out: choose version)", "12", poles=poles, rating=a, icu=icu)
for model, a in (("NA8-2500HV", 1200), ("NA8-2500HV", 1600), ("NA8-2500HV", 2500), ("NA8-4000HV", 4000), ("NA8-7500HV", 7500)):
    add("ACB", "NA8-HV", f"{model} 3P {a}A", f"{model} 3P {a} A, 800-1150 V AC, 65 kA", "13", poles=3, rating=a, icu=65)

# ---- Contactors (p.14-15) ----
c3 = [("09", "4", "1NO+1NC"), ("12", "5.5", "1NO+1NC"), ("18", "7.5", "1NO+1NC"), ("25", "11", "1NO+1NC"), ("32", "15", "1NO+1NC"),
      ("38", "18.5", "1NO+1NC"), ("40", "18.5", "1NO+1NC"), ("50", "22", "1NO+1NC"), ("65", "30", "1NO+1NC"), ("75", "37", "1NO+1NC"),
      ("85", "37", "1NO+1NC"), ("100", "45", "1NO+1NC"), ("120", "55", ""), ("160", "75", ""), ("185", "90", ""), ("225", "110", ""),
      ("265", "132", ""), ("330", "160", ""), ("400", "200", ""), ("630", "335", "")]
for n, kw, aux in c3:
    add("Contactor", "NXC", f"NXC-{n} 3P", f"NXC-{n} contactor 3P, AC-3 {int(n)} A", "14", poles=3, rating_ac3=int(n), kw_ac3=kw, aux=aux)
c4 = [("NXC", "09", 4), ("NXC", "12", 5.5), ("NXC", "25", 11), ("NXC", "40", 18.5), ("NXC", "50", 22), ("NXC", "65", 30), ("NXC", "80", 37),
      ("NXC", "95", 45), ("NC2", "115", 55), ("NC2", "150", 75), ("NC2", "185", 90), ("NC2", "225", 110), ("NC2", "265", 132),
      ("NC2", "330", 160), ("NC2", "400", 200), ("NC2", "630", 335)]
for s, n, kw in c4:
    add("Contactor", s, f"{s}-{n} 4P", f"{s}-{n} contactor 4P, AC-3 {int(n)} A", "15", poles=4, rating_ac3=int(n), kw_ac3=kw)

# ---- Thermal overload relays (p.17) ----
for model, rng in (("NXR-25", ["0.63-1.0", "1.0-1.6", "1.6-2.5", "2.5-4", "4-6", "5.5-8", "7-10", "9-13", "12-18", "17-25"]), ("NXR-38", ["23-32", "30-38"]),
                   ("NXR-100", ["37-50", "48-65", "63-80", "80-100"]), ("NXR-200", ["80-160", "125-250"]), ("NXR-630", ["200-400", "315-630"])):
    for r in rng:
        add("Overload relay", "NXR", f"{model} {r}A", f"{model} thermal overload relay {r} A", "17", range=f"{r} A")

# ---- Manual motor starters (p.18) ----
for model, icu, r in (("NS2-25", 100, "0.4-0.63"), ("NS2-25", 100, "0.63-1"), ("NS2-25", 100, "1-1.6"), ("NS2-25", 100, "1.6-2.5"), ("NS2-25", 100, "2.5-4"),
                      ("NS2-25", 100, "4-6.3"), ("NS2-25", 100, "6-10"), ("NS2-25", 15, "9-14"), ("NS2-25", 15, "13-18"), ("NS2-25", 15, "20-25"),
                      ("NS2-80B", 15, "25-40"), ("NS2-80B", 15, "40-63"), ("NS2-80B", 15, "56-80")):
    add("Motor starter (MPCB)", "NS2", f"{model} {r}A", f"{model} manual motor starter {r} A, {icu} kA", "18", range=f"{r} A", icu=icu)

# ---- DOL starters (p.19) ----
for model, r in (("NQ3-5.5P", "0.63-1"), ("NQ3-5.5P", "1-1.6"), ("NQ3-5.5P", "1.6-2.5"), ("NQ3-5.5P", "2.5-4"), ("NQ3-5.5P", "4-6"),
                 ("NQ3-5.5P", "5.5-8"), ("NQ3-5.5P", "9-13"), ("NQ3-11P", "12-18"), ("NQ3-11P", "17-25")):
    add("Motor starter (MPCB)", "NQ3", f"{model} {r}A", f"{model} DOL starter IP55, {r} A", "19", range=f"{r} A", function="DOL starter (enclosed)")

# ---- Relays and timers (p.19-22) ----
for m, fn, p in (("NJYB3-4", "Under/over voltage + phase failure, 3ph 3W", "19"), ("NJYB3-5", "Under/over voltage + phase failure & sequence, 3ph 3W", "19"),
                 ("NJYB3-11", "Under/over voltage + phase failure, 1/3ph 3W", "19"), ("NJYB3-12", "Under/over voltage + phase failure & sequence, 3ph 4W", "19"),
                 ("NJBK7-800T/400", "Motor protection relay 80-400 A", "20"), ("NJBK7-800T/800", "Motor protection relay 200-800 A", "20"),
                 ("NJMC1 16A", "Pulse relay 16 A 1P, 230 VAC", "20"), ("NJMC1 32A", "Pulse relay 32 A 1P, 230 VAC", "20"),
                 ("NJJ3", "Digital counting relay 100-240 V", "20"), ("JDM15G", "Analog counting relay 100-240 V", "20"),
                 ("JQX-10F 2Z", "Power relay 8-pin round, 2CO 10 A", "21"), ("JQX-10F 3Z", "Power relay 11-pin round, 3CO 10 A", "21"),
                 ("JQX-13F(D) 2Z", "Power relay 8-pin flat, 2CO 10 A", "21"), ("JQX-22F 4Z", "Power relay 14-pin flat, 4CO 5 A", "21"),
                 ("JSZ3C-B", "On-delay timer, 8-pin, 220 VAC", "22"), ("JSZ3Y", "Star-delta timer 30 s, 220 VAC", "22"),
                 ("JSZ3A-A", "Multi-range on-delay timer, 220 VAC", "22"), ("JSZ3A-G", "On-delay timer up to 24 h, 220 VAC", "22"),
                 ("JKF8-6", "Power factor controller, 6 steps", "25"), ("JKF8-12", "Power factor controller, 12 steps", "25")):
    series = "JSZ3" if m.startswith("JSZ3") else "JQX" if m.startswith("JQX") else m.split("-")[0].split(" ")[0]
    add("Relay / timer", series, m, fn, p, function=fn)
for m, fn in (("CZF08A-E round", "Socket for JQX-10F 2Z"), ("CZF11A-E", "Socket for JQX-10F 3Z"), ("CZF08A-E flat", "Socket for JQX-13F(D) 2Z"),
              ("CZF14A-E", "Socket for JQX-22F"), ("CZS08X-E", "Timer socket")):
    add("Other component", "Relay sockets", m, fn, "21", function=fn)
for m, a, contacts in (("NCH8-20 1NO+1NC", 20, "1NO+1NC"), ("NCH8-20 2NO+2NC", 20, "2NO+2NC"), ("NCH8-25 2NO+2NC", 25, "2NO+2NC"), ("NCH8-40 1NO+1NC", 40, "1NO+1NC")):
    add("Contactor", "NCH8 modular", m, f"Modular contactor {a} A AC-1, {contacts}", "21", rating_ac3=a, aux=contacts)

# ---- CTs (p.23) ----
for model, ratios in (("BH-0.66 40 I B", ["30/5", "50/5", "75/5"]), ("BH-0.66 40 I", ["100/5", "150/5", "200/5", "250/5", "300/5", "400/5"]),
                      ("BH-0.66 60 I", ["500/5", "600/5", "800/5", "1000/5"]), ("BH(SDH)-0.66 60 II", ["500/5", "600/5", "800/5", "1000/5", "1200/5"]),
                      ("BH(SDH)-0.66 100 II", ["1500/5", "2000/5"]), ("BH(SDH)-0.66 120 II", ["2500/5", "4000/5"])):
    for r in ratios:
        add("Current transformer", model, f"{model} {r}A", f"CT {model} {r} A", "23", ratio=r)

# ---- Capacitors (p.24) ----
for m, kvar in (("NWC6-0.45-5-3", 5), ("NWC6-0.45-12-3", 12), ("NWC6-0.45-25-3", 25), ("NWC6-0.45-40-3", 40),
                ("BZMJ-0.4-5-3", 7.5), ("BZMJ-0.4-12-3", 12), ("BZMJ-0.4-25-3", 25), ("BZMJ-0.4-50-3", 50)):
    add("Capacitor", m.split("-")[0], m, f"PFC capacitor {kvar} kVAr 415/440 V", "24", function=f"{kvar} kVAr")

# ---- Load break / changeover switches (p.26) ----
for a in (125, 160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500):
    add("Switch-disconnector", "NH40", f"NH40-{a}/3C", f"NH40 load break switch 3P {a} A", "26", poles=3, rating=a)
for m, a in (("NH40-125/4CS", 125), ("NH40-160/4CS", 160), ("NH40-250/4CS", 250), ("NH40-400/4CS", 400), ("NH40-630/4CS", 630),
             ("NH40-1000/4CS", 1000), ("NH40-1250/4CS", 1250), ("NH40-1600/4CS", 1600)):
    add("Switch-disconnector", "NH40 changeover", m, f"NH40 manual changeover switch 4P {a} A", "26", poles=4, rating=a, function="changeover I-0-II")

# ---- ATS (p.27) ----
for m, a in (("NXZM-125S/4B", 100), ("NXZM-160S/4B", 160), ("NXZM-250S/4B", 250), ("NXZM-400S/4B", 400), ("NXZM-630S/4B", 630), ("NXZM-800S/4B", 800)):
    add("Transfer switch (ATS)", "NXZM", m, f"NXZM ATS 4P up to {a} A", "27", poles=4, rating=a)

# ---- Fuses (p.28) ----
for a in (10, 16, 25, 32, 63, 100, 125, 160, 250, 315, 400, 500, 630, 800, 1000, 1250):
    add("Fuse / fuse base", "RT36 (HRT36)", f"HRT36 {a}A", f"RT36 knife fuse link {a} A", "28", rating=a)
for a in (160, 250, 400, 630, 1250):
    add("Fuse / fuse base", "RT36 (HRT36)", f"HRT36 base {a}A", f"RT36 fuse base up to {a} A", "28", rating=a, function="fuse base")
add("Fuse / fuse base", "RT28", "RT28 holder 1P 32A", "RT28 cylindrical fuse holder 1P 32 A", "28", rating=32, function="fuse holder")

# ---- Meters (p.29) ----
for m, fn in (("DM96U", "Digital AC voltmeter 0-600 V"), ("DM961", "Digital AC ammeter 0-999/5 A"), ("NP96-V", "Analogue AC voltmeter 0-500 V"),
              ("NP96-A", "Analogue AC ammeter, CT operated"), ("PD6663S4", "Digital 3-phase analyser 96x96, RS485"), ("PD7777-8H", "Harmonic multi-function meter")):
    add("Meter", m[:2], m, fn, "29", function=fn)

# ---- Pilot devices (p.30) ----
for col in ("Red", "Green", "Yellow", "Blue"):
    add("Pushbutton / pilot light / selector", "ND16", f"ND16-22D/4 {col}", f"Indicator light 22 mm {col}, 220 VAC", "30", function="indicator light", colour=col)
    add("Pushbutton / pilot light / selector", "ND9", f"ND9-22D/4 {col}", f"Indicator light 22 mm {col}, 220 VAC", "30", function="indicator light", colour=col)
for m, fn in (("NP2-BA31", "Pushbutton green 1NO"), ("NP2-BA41", "Pushbutton red 1NC"), ("NP2-BW3361", "Illuminated pushbutton green 1NO"),
              ("NP2-BW3462", "Illuminated pushbutton red 1NC"), ("NP2-BS542", "Mushroom head 40 mm 1NC"), ("NP2-BE101", "Contact block NO"),
              ("NP2-BE102", "Contact block NC"), ("NP2-BJ21", "Selector 2-position 1NO"), ("NP2-BJ33", "Selector 3-position 2NO"),
              ("NP8-11XD/21 2pos", "Illuminated selector 2-position 1NO+1NC"), ("NP8-11XD/21 3pos", "Illuminated selector 3-position 2NO+1NC")):
    add("Pushbutton / pilot light / selector", m[:3], m, fn, "30", function=fn)
for m, fn in (("LW32-20LH3", "Ammeter selector 4-position"), ("LW32-20YH5", "Voltmeter selector 7-position"), ("LW32-20-1", "Auto-Off-Manual 20 A"),
              ("LW32-63-4", "Manual changeover I-O-II 32 A"), ("LW32-63-2", "Phase selector 2P 4-position 63 A")):
    add("Switch-disconnector", "LW32 cam switch", m, fn, "30", function=fn)

# ---- VFDs (p.31) ----
for m, kw, inp in (("NVF3-0.75/D2", 0.75, "1ph 220V"), ("NVF3-1.5/D2", 1.5, "1ph 220V"), ("NVF3-0.75/S2", 0.75, "3ph 220V"), ("NVF3-1.5/S2", 1.5, "3ph 220V"),
                   *[(f"NVF7-{k}/S4", float(k), "3ph 380V") for k in ("0.75", "1.5", "2.2", "3.7", "5.5", "7.5", "11", "15", "18", "22", "30", "37", "45", "55", "75", "90", "110", "132", "160", "185", "200")]):
    add("Drive (VFD)", m.split("-")[0], m, f"{m.split('-')[0]} VFD {kw} kW, input {inp}", "31", function=f"{kw} kW, input {inp}")

w = csv.DictWriter(sys.stdout, fieldnames=COLS + ["trip_unit", "colour"], extrasaction="ignore")
w.writeheader()
for r in rows:
    w.writerow(r)
print(f"{len(rows)} rows", file=sys.stderr)
