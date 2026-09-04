#!/usr/bin/env python3
"""
Download card art for one Lorcana set from card-db.json's cached image URLs.

Usage:
    python3 art-tools/download_set_images.py --list-sets
    python3 art-tools/download_set_images.py --set "First Chapter"
    python3 art-tools/download_set_images.py --set 1

Writes:
    art-cache/<set-slug>/<sanitized card name>.png (or .avif if sips unavailable)
    art-cache/<set-slug>/manifest.json  -> {filename: "Exact Card Name - Version"}
"""
import argparse, json, os, re, sys, time, urllib.request, subprocess, shutil, ssl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "card-db.json")
CACHE_ROOT = os.path.join(ROOT, "art-cache")

def build_ssl_context():
    """Use certifi's CA bundle if available -- fixes the classic macOS
    python.org SSL_CERTIFICATE_VERIFY_FAILED error without needing the user
    to `export SSL_CERT_FILE=...` by hand every terminal session, which
    matters for an unattended/overnight run."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return None

SSL_CONTEXT = build_ssl_context()


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def card_key(c):
    return f"{c['n']} - {c['v']}" if c.get('v') else c['n']


# Rarities that carry genuinely different artwork from the base printing.
# (Common/Uncommon/Rare/Super Rare/Legendary reprints reuse the same art --
# only these get their own alt-art entry.)
ALT_ART_RARITIES = {"Enchanted", "Special", "Epic", "Iconic"}


def variant_key(c, rarity):
    base = card_key(c)
    return f"{base} ({rarity})"


def load_db():
    with open(DB_PATH) as f:
        return json.load(f)


def resolve_set(db, spec):
    sets = db['sets']
    if spec in sets:
        return spec, sets[spec]['name']
    for code, meta in sets.items():
        if meta['name'].lower() == spec.lower():
            return code, meta['name']
    for code, meta in sets.items():
        if spec.lower() in meta['name'].lower():
            return code, meta['name']
    return None, None


def pillow_avif_available():
    try:
        from PIL import Image
        import pillow_avif  # noqa: F401
        return True
    except Exception:
        return False


def sips_available():
    return shutil.which('sips') is not None


def convert_with_pillow(src, dst):
    try:
        from PIL import Image
        import pillow_avif  # noqa: F401
        Image.open(src).convert('RGB').save(dst)
        return True
    except Exception:
        return False


def convert_with_sips(src, dst):
    try:
        subprocess.run(['sips', '-s', 'format', 'png', src, '--out', dst],
                        check=True, capture_output=True)
        return True
    except Exception:
        return False


def convert_to_png(src, dst):
    """Try Pillow (+pillow-avif-plugin) first -- works on any machine,
    including the sandboxed shell Cowork runs commands in. Fall back to
    macOS's built-in sips if Pillow's avif support isn't installed."""
    if pillow_avif_available() and convert_with_pillow(src, dst):
        return True
    if sips_available() and convert_with_sips(src, dst):
        return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', help='Set name or set code, e.g. "First Chapter" or 1')
    ap.add_argument('--list-sets', action='store_true')
    ap.add_argument('--large', action='store_true', help='Use large images (imgL) instead of normal (img)')
    ap.add_argument('--force', action='store_true', help='Re-download even if a file already exists')
    ap.add_argument('--limit', type=int, help='Only download the first N cards of the set (for testing)')
    ap.add_argument('--with-variants', action='store_true', help='Also download Enchanted/Special/Epic/Iconic alt-art printings as separate entries')
    args = ap.parse_args()

    db = load_db()

    if args.list_sets:
        for code, meta in sorted(db['sets'].items(), key=lambda x: x[1]['d']):
            n = sum(1 for c in db['cards'] if c['s'] == code)
            print(f"{code:>3}  {meta['name']:<40} {n} cards")
        return

    if not args.set:
        ap.error('--set is required (or use --list-sets)')

    code, name = resolve_set(db, args.set)
    if not code:
        print(f"No set matches '{args.set}'. Try --list-sets.", file=sys.stderr)
        sys.exit(1)

    cards = [c for c in db['cards'] if c['s'] == code]
    if args.limit:
        cards = cards[:args.limit]
    if not cards:
        print(f"Set '{name}' has no cards in card-db.json.", file=sys.stderr)
        sys.exit(1)

    slug = slugify(name)
    out_dir = os.path.join(CACHE_ROOT, slug)
    os.makedirs(out_dir, exist_ok=True)

    convert = pillow_avif_available() or sips_available()
    if not convert:
        print("Note: no avif->png converter available (tried pillow-avif-plugin "
              "and macOS sips). Images will stay in .avif -- most vision models "
              "via Ollama want jpg/png. Fix with: "
              "pip3 install pillow pillow-avif-plugin", file=sys.stderr)

    # (key, url) pairs: base printing for every card, plus alt-art variants
    # when --with-variants is set.
    jobs = []
    for c in cards:
        key = card_key(c)
        url = c.get('imgL') if args.large else c.get('img')
        jobs.append((key, url))
        if args.with_variants:
            seen_rarities = set()
            for p in (c.get('pr') or []):
                if p.get('s') != code:
                    continue
                rarity = p.get('r')
                if rarity not in ALT_ART_RARITIES:
                    continue
                vurl = p.get('l') if args.large else p.get('i')
                if not vurl or vurl == url:
                    continue  # same art as base, not worth a duplicate download
                if rarity in seen_rarities:
                    continue  # only one alt-art entry per rarity per card
                seen_rarities.add(rarity)
                jobs.append((variant_key(c, rarity), vurl))

    manifest = {}
    ok, failed = 0, []
    for i, (key, url) in enumerate(jobs, 1):
        if not url:
            failed.append(key)
            continue
        fname_base = slugify(key)
        avif_path = os.path.join(out_dir, fname_base + '.avif')
        final_path = os.path.join(out_dir, fname_base + ('.png' if convert else '.avif'))

        if os.path.exists(final_path) and not args.force:
            manifest[os.path.basename(final_path)] = key
            ok += 1
            continue

        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=20, context=SSL_CONTEXT) as resp, open(avif_path, 'wb') as f:
                f.write(resp.read())
        except Exception as e:
            print(f"  FAILED download: {key} ({e})", file=sys.stderr)
            failed.append(key)
            continue

        if convert:
            if convert_to_png(avif_path, final_path):
                os.remove(avif_path)
            else:
                final_path = avif_path
                print(f"  sips conversion failed for {key}, kept .avif", file=sys.stderr)

        manifest[os.path.basename(final_path)] = key
        ok += 1
        if i % 25 == 0 or i == len(jobs):
            print(f"  {i}/{len(jobs)}...")
        time.sleep(0.08)

    with open(os.path.join(out_dir, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)

    print(f"\nSet: {name}  ({code})")
    print(f"Downloaded/cached: {ok}/{len(jobs)}" + (f'  ({len(cards)} base + {len(jobs)-len(cards)} alt-art)' if args.with_variants else ''))
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed[:10])}{'...' if len(failed) > 10 else ''}")
    print(f"Images: {out_dir}")
    print(f"Manifest: {os.path.join(out_dir, 'manifest.json')}")
    print(f"\nNext: python3 art-tools/tag_art.py --set \"{name}\"")


if __name__ == '__main__':
    main()
