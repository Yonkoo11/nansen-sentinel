#!/usr/bin/env zsh
set -e

VOICE_ID="nPczCjzI2devNBz1zQrb"
MODEL="eleven_multilingual_v2"
AUDIO_DIR="video/audio"

typeset -A clips
clips=(
  "04-drift-forensics" "Forensic case study. The Drift Protocol hack. We traced thirty million tokens leaving custody vaults. Twenty-eight million flowing to Bybit. Forty consecutive sells on April first. Zero buys. Nansen's labels showed exactly who moved what. When."
  "05-methodology"     "Four signal types. Each weighted and scored. False positive rate. Zero percent on Solana. Two percent on Ethereum. Calibrated against fifty tokens per chain."
  "06-closer"          "Sixty-five API calls. Nine endpoint types. Three chains. Built with the Nansen CLI. Nansen Sentinel."
)

order=("04-drift-forensics" "05-methodology" "06-closer")

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
