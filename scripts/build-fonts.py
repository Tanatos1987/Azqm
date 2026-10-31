"""Builds the theme fonts in assets/fonts (python scripts/build-fonts.py; needs `pip install fonttools`).

Each family is cut from its Google Fonts variable font at the weights the app uses, subset to the scripts of the
app's eight languages (Latin + Latin Extended-A for de/es/fr/it/tr, Cyrillic for bg/ru), with only the OpenType
features React Native applies plus tnum/lnum (fontVariant), and without hinting (Android doesn't use it). The
Bulgarian language system is removed from GSUB/GPOS: with it a phone set to Bulgarian shows the Bulgarian letter
forms (д like g, т like m), which read as hand-written. Check: shaping Bulgarian and Russian gives the same glyphs.

Playfair Display has a Reserved Font Name, so the modified files are named AzqmSerif (OFL 1.1, condition 3).
The variable fonts are downloaded from github.com/google/fonts into scripts/.font-src (not committed).
"""
import json
import os
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", ".font-src")
OUT = os.path.join(ROOT, "assets", "fonts")

WEIGHT_NAMES = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold"}

# family name in the app, google/fonts directory, variable font file, weights, other axes pinned
FAMILIES = [
    ("Inter", "inter", "Inter[opsz,wght].ttf", [400, 500, 600, 700], {"opsz": 14}),
    ("Onest", "onest", "Onest[wght].ttf", [600, 700, 800], {}),
    ("Manrope", "manrope", "Manrope[wght].ttf", [400, 500, 600, 700, 800], {}),
    ("Tektur", "tektur", "Tektur[wdth,wght].ttf", [600, 700, 800], {"wdth": 100}),
    ("Montserrat", "montserrat", "Montserrat[wght].ttf", [400, 500, 600, 700], {}),
    # Headings only (h2/h3 700, h1 800): these two are the largest files, so no 600.
    ("AzqmSerif", "playfairdisplay", "PlayfairDisplay[wght].ttf", [700, 800], {}),
    ("Unbounded", "unbounded", "Unbounded[wght].ttf", [700, 800], {}),
    ("Exo2", "exo2", "Exo2[wght].ttf", [400, 500, 600, 700], {}),
    ("WixMadeforDisplay", "wixmadefordisplay", "WixMadeforDisplay[wght].ttf", [600, 700, 800], {}),
]

UNICODES = [
    "U+0020-007E", "U+00A0-017F", "U+0192", "U+0218-021B", "U+02B9-02BC", "U+02C6-02C7", "U+02D8-02DD",
    "U+0300-0308", "U+030A-030C", "U+0327-0328", "U+0400-045F", "U+0490-0491", "U+1E9E", "U+2000-206F", "U+20AC",
    "U+20B4", "U+20BA", "U+20BD", "U+2116", "U+2122", "U+2190-2199", "U+2212", "U+2215", "U+2219", "U+221E",
    "U+2248", "U+2260", "U+2264-2265", "U+25B2", "U+25BC", "U+25CF", "U+2713-2714",
]

# What React Native's text stack applies by default, plus tnum/lnum for fontVariant: no stylistic sets, small caps
# or character variants (Inter and Montserrat carry hundreds of those glyphs).
FEATURES = ["ccmp", "locl", "mark", "mkmk", "kern", "liga", "clig", "calt", "rlig", "rvrn", "tnum", "lnum", "pnum"]


def fetch(directory, filename):
    path = os.path.join(SRC, filename)
    if not os.path.exists(path):
        api = f"https://api.github.com/repos/google/fonts/contents/ofl/{directory}"
        listing = json.loads(urllib.request.urlopen(urllib.request.Request(api, headers={"User-Agent": "azqm"}), timeout=60).read())
        url = next(e["download_url"] for e in listing if e["name"] == filename)
        with open(path, "wb") as fh:
            fh.write(urllib.request.urlopen(url, timeout=120).read())
    return path


def strip_bulgarian(font):
    removed = []
    for tag in ("GSUB", "GPOS"):
        if tag not in font:
            continue
        for sr in font[tag].table.ScriptList.ScriptRecord:
            if sr.ScriptTag != "cyrl":
                continue
            keep = [ls for ls in sr.Script.LangSysRecord if ls.LangSysTag != "BGR "]
            if len(keep) != len(sr.Script.LangSysRecord):
                removed.append(tag)
                sr.Script.LangSysRecord = keep
                sr.Script.LangSysCount = len(keep)
    return removed


def set_names(font, family, weight):
    style = WEIGHT_NAMES[weight]
    name = font["name"]
    for rec in list(name.names):
        if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 25):
            name.removeNames(nameID=rec.nameID)
    ribbi = style in ("Regular", "Bold")
    name.setName(family if ribbi else f"{family} {style}", 1, 3, 1, 0x409)
    name.setName(style if ribbi else "Regular", 2, 3, 1, 0x409)
    name.setName(f"{family}-{style};azqm", 3, 3, 1, 0x409)
    name.setName(f"{family} {style}", 4, 3, 1, 0x409)
    name.setName(f"{family}-{style}", 6, 3, 1, 0x409)
    name.setName(family, 16, 3, 1, 0x409)
    name.setName(style, 17, 3, 1, 0x409)
    font["OS/2"].usWeightClass = weight


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(SRC, exist_ok=True)
    opts = subset.Options()
    opts.layout_features = FEATURES
    opts.layout_scripts = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.hinting = False
    opts.notdef_outline = True
    opts.glyph_names = False
    unicodes = subset.parse_unicodes(",".join(u.replace("U+", "") for u in UNICODES))
    total = 0
    for family, directory, filename, weights, pins in FAMILIES:
        # Subset the variable font once, then cut each weight out of the small file.
        var = TTFont(fetch(directory, filename))
        sub = subset.Subsetter(options=opts)
        sub.populate(unicodes=unicodes)
        sub.subset(var)
        for w in weights:
            static = instancer.instantiateVariableFont(var, {"wght": w, **pins}, inplace=False)
            removed = strip_bulgarian(static)
            set_names(static, family, w)
            out = os.path.join(OUT, f"{family}_{w}{WEIGHT_NAMES[w]}.ttf")
            static.save(out)
            total += os.path.getsize(out)
            print(f"{os.path.basename(out):36} {os.path.getsize(out) // 1024:4} KB  BGR removed from {removed or '-'}")
    print(f"total {total // 1024} KB")


if __name__ == "__main__":
    main()
