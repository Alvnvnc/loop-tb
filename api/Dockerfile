FROM python:3.12-slim

WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 \
    LOOPTB_CONFIG=/app/model_config.json \
    HF_HOME=/app/.hf

RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart timm transformers pillow numpy matplotlib

COPY main.py model_config.json ./
COPY models ./models

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]