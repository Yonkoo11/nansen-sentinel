#!/usr/bin/env zsh
set -e

VOICE_ID="nPczCjzI2devNBz1zQrb"
MODEL="eleven_multilingual_v2"
AUDIO_DIR="video/audio"
mkdir -p "$AUDIO_DIR"

# Clips — same text as VOICEOVER_CLIPS.md
typeset -A clips
clips=(
  "01-hero"     "Nansen Sentinel. Real-time smart money intelligence. Right now, labeled wallets are net short twenty million dollars on Bitcoin. Four traders. Eighteen short trades."
  "02-expand"   "Click any row to see who's behind it. These are Nansen's labeled wallets. Names, positions, dollar amounts. Not aggregates from an API. Individual trades."
  "03-alerts"   "The scoring engine cross-references four signals. Netflow dumps. Perp shorts. DEX sells. Exchange inflows. When multiple signals fire on the same token. That's a high-confidence warning."
  "04-drift"    "Case study. The Drift Protocol hack on April first. Ninety-two percent TVL drop. Twenty-three million dollars gone in hours. We ran Nansen's data through the engine."
  "05-findings" "Custody vaults lost thirty million tokens. Bybit hot wallet gained twenty-eight million. Wintermute sold a hundred and fifty-five K. But here's the honest part. All of this happened after the crash. Not before. The early warning thesis is not proven for this event."
  "06-methodology" "Sixty-five API calls. Nine endpoint types. Three chains. Solana, Ethereum, Base. Zero percent false positive rate on Solana. Two percent on Ethereum. Nansen Sentinel."
)

order=("01-hero" "02-expand" "03-alerts" "04-drift" "05-findings" "06-methodology")

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

  # Verify it's audio, not error JSON
  if file "$outfile" | grep -q "MPEG\|Audio\|audio"; then
    dur=$(ffprobe -i "$outfile" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null || echo "?")
    echo "  OK  ${dur}s"
  else
    echo "  FAIL — not audio:"
    head -c 200 "$outfile"
    echo
    rm -f "$outfile"
    exit 1
  fi
done

echo "Audio generation complete."
