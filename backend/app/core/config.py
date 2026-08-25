import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "ChemAI 3D - AI-Powered Chemistry System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    GEMINI_API_KEY: str = ""
    LLM_API_KEY: str = ""
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemini-1.5-flash"

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"

    model_config = SettingsConfigDict(
        env_file=[
            str(BACKEND_DIR / ".env"),
            str(ROOT_DIR / ".env"),
            "backend/.env",
            ".env",
        ],
        extra="ignore"
    )

    @property
    def active_api_key(self) -> str:
        return self.GEMINI_API_KEY.strip() or self.LLM_API_KEY.strip()


settings = Settings()
