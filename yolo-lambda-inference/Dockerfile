FROM python:3.10-slim

# Install system dependencies required for OpenCV and Ultralytics
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory in container
WORKDIR /app

# Copy all files into container
COPY . .

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose port used by Flask
EXPOSE 8080

# Start the Flask API
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "api:app"]
