#!/bin/bash
# One button. Always runs against wherever THIS file actually lives, so it
# never again drifts onto a different, stale checkout -- see the note in
# "Start Tagging/old (stale checkout)/" for what that cost us once already.
cd "$(dirname "$0")"
echo "=================================================="
echo " Ready Set Ink -- overnight art tagger"
echo " Downloads art, tags it with your local Ollama"
echo " (gemma4:12b), and checks for hidden Mickeys --"
echo " every set, one after another."
echo ""
echo " Additive only: never touches a card you (or a"
echo " past run) already tagged by hand. Safe to leave"
echo " running overnight, and safe to close this window"
echo " any time -- double-click this file again later to"
echo " pick up exactly where it left off."
echo "=================================================="
echo ""
python3 art-tools/run_everything.py --model "gemma4:12b"
echo ""
echo "All done (or stopped). Press Enter to close."
read
