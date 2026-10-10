#!/bin/bash
# One button. Always runs against the repo THIS file lives in (it sits in
# tools/), so it can never drift onto a different, stale checkout.
cd "$(dirname "$0")/.."
# The tagger moved from art-tools/ to tools/art-tools/ on 2026-10-10. Bring
# along any progress a pre-move run left behind (it is not in git).
for x in set-outputs overnight-run.log; do
  if [ -e "art-tools/$x" ] && [ ! -e "tools/art-tools/$x" ]; then mv "art-tools/$x" "tools/art-tools/$x"; fi
done
rmdir art-tools 2>/dev/null
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
python3 tools/art-tools/run_everything.py --model "gemma4:12b"
echo ""
echo "All done (or stopped). Press Enter to close."
read
