#!/usr/bin/env zsh
set -e

VOICE_ID="nPczCjzI2devNBz1zQrb"
MODEL="eleven_multilingual_v2"
AUDIO_DIR="video/audio"
mkdir -p "$AUDIO_DIR"

typeset -A clips
clips=(
  "01-hero"            "This is Nansen Sentinel. It shows what smart money is doing right now on Hyperliquid perps. BTC for example. Four labeled wallets, net short twenty million dollars."
  "02-expand"          "You can click into any of these to see the actual trades. Who opened what, how much, which direction. These aren't aggregated numbers. Each row is a real trade from a Nansen-labeled wallet."
  "03-alerts"          "Under the hood there's a scoring engine watching for four things at once. Netflow dumps, perp shorts, DEX sells, and exchange inflows. If two or more of those line up on the same token, the confidence goes up."
  "04-drift-forensics" "We ran a full forensic analysis on the Drift Protocol hack from April first. Using Nansen's token holders and flows data, we traced thirty million tokens out of custody vaults and twenty-eight million flowing into Bybit. Forty consecutive sells that day. Not a single buy."
  "05-methodology"     "To make sure the signals aren't just noise, we calibrated against fifty tokens per chain. Solana came back at zero false positives. Ethereum at two percent."
  "06-closer"          "Sixty-five API calls across nine endpoints and three chains. All built on the Nansen CLI. This is Nansen Sentinel."
)

order=("01-hero" "02-expand" "03-alerts" "04-drift-forensics" "05-methodology" "06-closer")

for clip in "${order[@]}"; do
  outfile="$AUDIO_DIR/$clip.mp3"
  if [[ -f "$outfile" ]]; then
    echo "SKIP $clip (exists)"
    continue
  fi

  text="${clips[$clip]}"
  echo "GEN  $clip (${#text} chars)"

  curl -s "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"$text\",
      \"model_id\": \"$MODEL\",
      \"voice_settings\": {
        \"stability\": 0.82,
        \"similarity_boost\": 0.65,
        \"style\": 0.03,
        \"use_speaker_boost\": true
      }
    }" \
    -o "$outfile"

  if file "$outfile" | grep -q "MPEG\|Audio\|audio"; then
    dur=$(ffprobe -i "$outfile" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null || echo "?")
    echo "  OK  ${dur}s"
  else
    echo "  FAIL"
    head -c 200 "$outfile"
    rm -f "$outfile"
    exit 1
  fi
done

echo "Audio generation complete."
