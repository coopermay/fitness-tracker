FROM python:3.12-slim

# uv, copied from its official image (same version as used in development)
COPY --from=ghcr.io/astral-sh/uv:0.12.21 /uv /bin/uv

# Use the image's Python rather than downloading one; precompile .pyc for faster startup
ENV UV_PYTHON_DOWNLOADS=never \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install dependencies first, in their own layer, so code changes don't
# reinstall everything on rebuild.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev

COPY . .

EXPOSE 8000

# Apply any pending migrations, then start the API.
CMD ["sh", "-c", "uv run --no-sync alembic upgrade head && exec uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port 8000"]
