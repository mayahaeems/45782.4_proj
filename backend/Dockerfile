FROM python:3.11-slim

WORKDIR /app

# install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy app code
COPY . .

# create uploads directory
RUN mkdir -p instance/uploads/products instance/uploads/categories instance/uploads/users instance/uploads/general

EXPOSE 3000

CMD ["python", "run.py"]