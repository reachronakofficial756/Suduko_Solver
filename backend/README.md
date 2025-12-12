# Sudoku Backend API

FastAPI backend for Suduko Master mobile app.

## Local Development

```bash
pip install -r requirements.txt
uvicorn fastapi_app:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/generate?difficulty=easy|medium|hard|expert` - Generate puzzle
- `POST /api/generate` - Generate puzzle (with body)
- `POST /api/solve` - Solve a puzzle
- `POST /api/hint` - Get a hint

## Deployment

See `../DEPLOYMENT_GUIDE.md` for deployment instructions.

