FROM python:3.13-slim

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN pip install --no-cache-dir fastapi 'uvicorn[standard]' google-genai pandas pdfplumber pillow python-dotenv markitdown openpyxl python-multipart

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
