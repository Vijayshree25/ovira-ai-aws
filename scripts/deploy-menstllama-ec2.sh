#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Ovira AI — MenstLLaMA / SLM EC2 Deployment Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Run this on a fresh Ubuntu 22.04 EC2 t3.medium or t3.large instance.
# After running, the SLM will be accessible at http://[EC2_IP]:8080
#
# Usage:
#   chmod +x deploy-menstllama-ec2.sh
#   ./deploy-menstllama-ec2.sh
#
# Prerequisites:
#   - EC2 instance with Ubuntu 22.04 AMI
#   - Security group allowing inbound TCP 8080
#   - At least 8 GB RAM (t3.large recommended for 7B model)
#   - At least 10 GB free disk for the quantised model
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "═══════════════════════════════════════════════════════════"
echo "  Ovira AI — MenstLLaMA EC2 Setup"
echo "═══════════════════════════════════════════════════════════"

# ─── 1. Install system dependencies ──────────────────────────────────────────

echo ""
echo "▸ Step 1/5: Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv git wget build-essential

# ─── 2. Install Python inference stack ───────────────────────────────────────

echo ""
echo "▸ Step 2/5: Installing Python packages..."
pip3 install llama-cpp-python flask flask-cors requests huggingface_hub

# ─── 3. Download quantised model ────────────────────────────────────────────

echo ""
echo "▸ Step 3/5: Downloading quantised model from HuggingFace..."
echo "  (This may take 5-15 minutes depending on bandwidth)"

mkdir -p /home/ubuntu/models

python3 -c "
from huggingface_hub import hf_hub_download

# NOTE: Update repo_id when the actual MenstLLaMA GGUF is published.
# The paper is by Chiranjeevi Pippiri et al. — search 'MenstLLaMA' on HuggingFace.
# Current default: Mistral-7B-Instruct Q4_K_M (good general-purpose fallback).
model_path = hf_hub_download(
    repo_id='TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
    filename='mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    local_dir='/home/ubuntu/models'
)
print(f'✓ Model downloaded to: {model_path}')
"

# ─── 4. Create Flask inference server ────────────────────────────────────────

echo ""
echo "▸ Step 4/5: Creating inference server..."

cat > /home/ubuntu/ovira-slm-server.py << 'PYEOF'
"""
Ovira AI — MenstLLaMA / SLM Inference Server
Runs on EC2, serves menstrual-health-specialised completions via HTTP.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from llama_cpp import Llama
import json
import time
import os

app = Flask(__name__)
CORS(app)

# ─── Load model once at startup (takes 30-60 seconds on CPU) ────────────────

MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    "/home/ubuntu/models/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
)
N_THREADS = int(os.environ.get("N_THREADS", "2"))

print(f"Loading model from {MODEL_PATH} with {N_THREADS} threads...")
llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=2048,
    n_threads=N_THREADS,
    verbose=False,
)
print("✓ Model loaded!")

# ─── System prompt ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Aria, an empathetic menstrual health companion \
specialised in Indian women's health. You have deep knowledge of:
- Menstrual cycle phases and symptoms
- PCOS, endometriosis, dysmenorrhea
- Indian dietary practices and their effect on menstrual health
- Cultural sensitivity around periods in Indian context

Rules:
1. Never diagnose or prescribe
2. Always recommend consulting a doctor for medical concerns
3. Be warm, empathetic, and non-judgmental
4. Consider Indian diet and lifestyle in advice
5. Keep responses to 2-3 paragraphs"""

# ─── Routes ─────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Liveness / readiness probe."""
    return jsonify({"status": "ok", "model": "MenstLLaMA-EC2"})


@app.route("/chat", methods=["POST"])
def chat():
    """
    Inference endpoint.
    Body: { "message": str, "userContext": str }
    Returns: { "response": str, "model": str, "latency_ms": int }
    """
    data = request.json or {}
    user_message = data.get("message", "")
    user_context = data.get("userContext", "")

    if not user_message:
        return jsonify({"error": "message is required"}), 400

    # Build Mistral-Instruct chat template
    context_block = f"\n\nUser Health Context: {user_context}" if user_context else ""
    prompt = (
        f"[INST] <<SYS>>{SYSTEM_PROMPT}{context_block}<</SYS>>\n\n"
        f"{user_message} [/INST]"
    )

    start = time.time()
    response = llm(
        prompt,
        max_tokens=400,
        temperature=0.7,
        stop=["[INST]", "</s>"],
    )
    latency_ms = int((time.time() - start) * 1000)

    return jsonify({
        "response": response["choices"][0]["text"].strip(),
        "model": "MenstLLaMA-EC2",
        "latency_ms": latency_ms,
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"Starting Ovira SLM server on port {port}...")
    app.run(host="0.0.0.0", port=port)
PYEOF

echo "✓ Server script created at /home/ubuntu/ovira-slm-server.py"

# ─── 5. Create systemd service for auto-restart ─────────────────────────────

echo ""
echo "▸ Step 5/5: Creating systemd service..."

sudo tee /etc/systemd/system/ovira-slm.service > /dev/null << 'SVCEOF'
[Unit]
Description=Ovira SLM Inference Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/usr/bin/python3 /home/ubuntu/ovira-slm-server.py
Restart=always
RestartSec=10
Environment="MODEL_PATH=/home/ubuntu/models/mistral-7b-instruct-v0.2.Q4_K_M.gguf"
Environment="N_THREADS=2"
Environment="PORT=8080"

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable ovira-slm
sudo systemctl start ovira-slm

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ MenstLLaMA server running on port 8080"
echo ""
echo "  Next steps:"
echo "  1. Note your EC2 public IP"
echo "  2. Add to your .env.local:"
echo "     MENSTLLAMA_EC2_URL=http://[EC2_PUBLIC_IP]:8080"
echo "  3. Verify: curl http://localhost:8080/health"
echo "═══════════════════════════════════════════════════════════"
