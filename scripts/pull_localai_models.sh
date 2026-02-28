#!/usr/bin/env bash
set -euo pipefail

# Add models here (name|url). One per line.
MODELS=(
  "tinyllama|https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
)

cd /models

for entry in "${MODELS[@]}"; do
  NAME="${entry%%|*}"
  URL="${entry#*|}"
  FILE="${NAME}.gguf"

  if [[ ! -f "$FILE" ]]; then
    echo "[localai-init] Downloading $NAME..."
    wget -O "$FILE" "$URL"
  else
    echo "[localai-init] $NAME already present"
  fi

  cat > "${NAME}.yaml" <<EOF
name: ${NAME}
model: ${FILE}
backend: llama
EOF

  echo "[localai-init] ${NAME} ready"
done

echo "[localai-init] Done."