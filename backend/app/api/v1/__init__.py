from fastapi import APIRouter
from app.api.v1 import auth, devices

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(devices.router)
