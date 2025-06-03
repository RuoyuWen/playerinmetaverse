from main import app

# This file is for gunicorn compatibility
# gunicorn will look for 'app' variable in app.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 