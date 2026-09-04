#!/bin/bash
cd "/Users/benjamindacy/Desktop/Ben/Buisness Projects/ready set ink/Documents/829git"

echo "=== The First Chapter ==="
echo ""
echo "Step 1: downloading card art (skips anything already downloaded)..."
python3 art-tools/download_set_images.py --set "The First Chapter" --with-variants

echo ""
echo "Step 2: tagging with the local AI (skips anything already tagged)..."
python3 art-tools/tag_art.py --set "The First Chapter" --model "gemma4:12b"

echo ""
echo "=== Done with The First Chapter for now ==="
echo "Double-click this same file again anytime to keep going or check for new cards."
echo ""
echo "Press Enter to close this window."
read
