# Use a lightweight stable Python version
FROM python:3.11-slim

# Set the working directory to the root of the container
WORKDIR /app

# Copy the requirements file from the backend folder
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all your project files into the container
COPY . .

# Hugging Face runs on port 7860 by default
EXPOSE 7860

# Start the FastAPI server exactly like you do locally
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]