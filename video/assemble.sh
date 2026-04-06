#!/usr/bin/env zsh
set -e
setopt +o nomatch

COMPOSITES_DIR="video/composites"
AUDIO_DIR="video/audio"
MUSIC="video/music/bg.mp3"
SEGS_DIR="video/segments"
OUTPUT="video/nansen-sentinel-demo.mp4"

mkdir -p "$SEGS_DIR"

# Timing constants
VFADE_IN=0.2
AUDIO_DELAY=0.5
BREATH=0.3
VFADE_OUT=0.2
GAP=0.3

CLIPS=("01-hero" "02-expand" "03-alerts" "04-drift" "05-findings" "06-methodology")

# Clean old segments
rm -f "$SEGS_DIR"/*.mp4

echo "=== Building segments ==="

for clip in "${CLIPS[@]}"; do
  COMPOSITE="$COMPOSITES_DIR/$clip.png"
  AUDIO="$AUDIO_DIR/$clip.mp3"

  if [[ ! -f "$COMPOSITE" ]] || [[ ! -f "$AUDIO" ]]; then
    echo "SKIP $clip (missing files)"
    continue
  fi

  # Get audio duration
  ADUR=$(ffprobe -i "$AUDIO" -show_entries format=duration -v quiet -of csv="p=0")

  # Calculate total segment duration
  # fade_in + beat + audio + breath + fade_out
  TOTAL=$(echo "$VFADE_IN + $AUDIO_DELAY + $ADUR + $BREATH + $VFADE_OUT" | bc)

  # Fade-out start for video
  FO_START=$(echo "$TOTAL - $VFADE_OUT" | bc)

  # Audio fade-out start (fade last 0.25s of audio)
  AFO_START=$(echo "$AUDIO_DELAY + $ADUR - 0.25" | bc)

  SEG="$SEGS_DIR/$clip.mp4"
  echo "SEG  $clip  audio=${ADUR}s  total=${TOTAL}s"

  ffmpeg -y \
    -loop 1 -i "$COMPOSITE" \
    -i "$AUDIO" \
    -filter_complex "
      anullsrc=r=44100:cl=stereo,atrim=0:${AUDIO_DELAY}[silence];
      [silence][1:a]concat=n=2:v=0:a=1[joined];
      [joined]afade=t=in:st=${AUDIO_DELAY}:d=0.15,afade=t=out:st=${AFO_START}:d=0.25,apad=whole_dur=${TOTAL}[a];
      [0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fade=t=in:st=0:d=${VFADE_IN},fade=t=out:st=${FO_START}:d=${VFADE_OUT}[v]
    " \
    -map "[v]" -map "[a]" \
    -t "$TOTAL" \
    -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
    -c:a aac -b:a 128k \
    -r 30 "$SEG" 2>/dev/null

  echo "  OK"
done

# Create black gap segment
echo "=== Creating gap segment ==="
ffmpeg -y \
  -f lavfi -i "color=c=black:s=1920x1080:d=$GAP:r=30" \
  -f lavfi -i "anullsrc=r=44100:cl=stereo" \
  -t "$GAP" \
  -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  "$SEGS_DIR/gap.mp4" 2>/dev/null

# Build concat list
echo "=== Concatenating ==="
CONCAT_FILE="$SEGS_DIR/concat.txt"
rm -f "$CONCAT_FILE"

for i in {1..${#CLIPS[@]}}; do
  clip="${CLIPS[$i]}"
  echo "file '${clip}.mp4'" >> "$CONCAT_FILE"
  if [[ $i -lt ${#CLIPS[@]} ]]; then
    echo "file 'gap.mp4'" >> "$CONCAT_FILE"
  fi
done

# Concat with re-encode (no -c copy, avoids drift)
NOMUSIC="$SEGS_DIR/nomusic.mp4"
ffmpeg -y \
  -f concat -safe 0 -i "$CONCAT_FILE" \
  -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -r 30 "$NOMUSIC" 2>/dev/null

# Get total duration
TOTAL_DUR=$(ffprobe -i "$NOMUSIC" -show_entries format=duration -v quiet -of csv="p=0")
echo "Video without music: ${TOTAL_DUR}s"

# Mix with background music
echo "=== Mixing background music ==="
ffmpeg -y \
  -i "$NOMUSIC" \
  -i "$MUSIC" \
  -filter_complex "
    [1:a]aloop=loop=-1:size=44100*120,atrim=0:${TOTAL_DUR},volume=0.08[bg];
    [0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[mixed]
  " \
  -map "0:v" -map "[mixed]" \
  -c:v copy \
  -c:a aac -b:a 128k \
  "$OUTPUT" 2>/dev/null

FINAL_DUR=$(ffprobe -i "$OUTPUT" -show_entries format=duration -v quiet -of csv="p=0")
FSIZE=$(du -h "$OUTPUT" | cut -f1)
echo ""
echo "=== DONE ==="
echo "Output: $OUTPUT"
echo "Duration: ${FINAL_DUR}s"
echo "Size: $FSIZE"
