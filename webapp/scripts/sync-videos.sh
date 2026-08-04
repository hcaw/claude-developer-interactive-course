#!/usr/bin/env bash
# Upload the rendered course videos to object storage.
#
#   Free stack: Cloudflare R2   (VIDEO_S3_ENDPOINT set — R2 speaks the S3 API)
#   AWS-day:    S3 + CloudFront (VIDEO_S3_ENDPOINT unset)
#
# The layout under videos/ is module-N/<id>.mp4 and must not change: the manifest stores that
# relative path and the app just prefixes NEXT_PUBLIC_VIDEO_BASE_URL (adr/2026-08-01-02).
#
# Usage:
#   VIDEO_BUCKET=stackdrop-course-videos \
#   VIDEO_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com \
#   ./scripts/sync-videos.sh [--dry-run]

set -euo pipefail

cd "$(dirname "$0")/.."

# Pick up VIDEO_* and AWS_* from .env.local then .env, without clobbering anything already
# exported. Same precedence Next.js uses, so the script and the app never read different files.
# AWS_* is included so the R2 token can live alongside the bucket config instead of only in the
# shell — a real shell export or ~/.aws profile still wins, since we skip anything already set.
for envfile in .env.local .env; do
  [[ -f $envfile ]] || continue
  while IFS='=' read -r key value; do
    [[ $key =~ ^(VIDEO_|AWS_) ]] || continue
    [[ -n ${!key:-} ]] && continue
    export "$key=${value%$'\r'}"
  done < <(grep -E '^(VIDEO_|AWS_)[A-Z0-9_]+=' "$envfile" || true)
done

: "${VIDEO_BUCKET:?set VIDEO_BUCKET (e.g. stackdrop-course-videos)}"

SRC="../output/"
[[ -d $SRC ]] || { echo "No $SRC — render the videos first (see README)." >&2; exit 1; }

if [[ -n ${VIDEO_S3_ENDPOINT:-} ]]; then
  # R2 rejects the extra integrity headers newer AWS CLI v2 releases send by default.
  export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
  export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
  # R2 has its own region names and rejects AWS ones. Without this the CLI inherits whatever is
  # in ~/.aws/config (e.g. eu-north-1) and every call fails with InvalidRegionName.
  export AWS_DEFAULT_REGION=auto
  export AWS_REGION=auto
  # Ignore any ambient profile: the R2 keys come from the environment, and a stray AWS_PROFILE
  # pointing at a real AWS account would otherwise be used instead.
  unset AWS_PROFILE
fi

echo "Syncing $(find "$SRC" -name '*.mp4' | wc -l | tr -d ' ') videos -> s3://$VIDEO_BUCKET/videos/"
echo "  endpoint: ${VIDEO_S3_ENDPOINT:-<default AWS S3>}"

aws s3 sync "$SRC" "s3://$VIDEO_BUCKET/videos/" \
  --exclude '*' --include '*.mp4' \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "video/mp4" \
  ${VIDEO_S3_ENDPOINT:+--endpoint-url "$VIDEO_S3_ENDPOINT"} \
  "$@"

echo
echo "Done. Verify a Range request returns 206:"
echo "  curl -I -H 'Range: bytes=0-1023' \"\$NEXT_PUBLIC_VIDEO_BASE_URL/module-1/m1-01-orientation.mp4\""
