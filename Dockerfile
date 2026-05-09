# Dockerfile

# ---- Frontend build stage ----
FROM node:23-slim AS frontend-build
WORKDIR /app
# Copy package files first for layer caching
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend install
# Copy full project so Tailwind can scan Django templates
COPY . .
RUN npm --prefix frontend run build

# ---- App stage ----
FROM python:3.12

RUN apt-get update && apt-get install nginx --yes

COPY requirements/base.txt requirements/base.txt
COPY requirements/production.txt requirements/production.txt
RUN pip install --no-cache-dir -r requirements/production.txt

COPY deploy/nginx.conf /etc/nginx/sites-enabled/default

# Mounts the application code to the image
COPY . app
WORKDIR /app

# Copy the built frontend assets into static/dist/
COPY --from=frontend-build /app/static/dist /app/static/dist

EXPOSE 8080

# runs the production server
CMD ["/app/deploy/entrypoint.sh"]
