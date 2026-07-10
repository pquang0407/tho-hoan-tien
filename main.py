import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from config.limiter import limiter
from routes.redirect import router as redirect_router
from routes.webhook import router as webhook_router
from routes.admin import router as admin_router
from routes.user import router as user_router

# 1. Initialize FastAPI app
app = FastAPI()

# 2. Attach Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# 3. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tho-hoan-tien.vercel.app",
        "https://www.tho-hoantien.com",
        "https://tho-hoantien.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Mount Modular Routers
app.include_router(redirect_router)
app.include_router(webhook_router)
app.include_router(admin_router)
app.include_router(user_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)