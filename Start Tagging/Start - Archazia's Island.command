#!/bin/bash
cd "/Users/benjamindacy/Desktop/Ben/Buisness Projects/ready set ink/Documents/829git"

echo "=== Archazia's Island ==="
echo ""
echo "Step 1: downloading card art (skips anything already downloaded)..."
python3 art-tools/download_set_images.py --set "Archazia's Island" --with-variants

echo ""
echo "Step 2: tagging with the local AI (skips anything already tagged)..."
python3 art-tools/tag_art.py --set "Archazia's Island" --model "gemma4:12b"

echo ""
echo "=== Done with Archazia's Island for now ==="
echo "Double-click this same file again anytime to keep going or check for new cards."
echo ""
echo "Press Enter to close this window."
read
