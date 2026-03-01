#!/usr/bin/env bash
set -euo pipefail
MODELS=(
  "deepseek-coder:6.7b"
  "phi3"
  "llama3.1:8b"
  "qwen2.5-coder:7b"
)
echo "[ollama-init] Waiting briefly for Ollama..."
sleep 2
for model in "${MODELS[@]}"; do
  if ollama list | awk '{print $1}' | grep -qx "$model"; then
    echo "[ollama-init] $model already present"
  else
    echo "[ollama-init] Pulling $model..."
    ollama pull "$model"
  fi
done
echo "[ollama-init] Done."
