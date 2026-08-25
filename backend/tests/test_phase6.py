import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.models import ChatResponse

client = TestClient(app)


def test_tutor_chat_empty_message():
    payload = {"message": "   "}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 400


def test_tutor_chat_missing_api_key_guidance():
    with patch("app.core.config.settings.GEMINI_API_KEY", ""):
        with patch("app.core.config.settings.LLM_API_KEY", ""):
            payload = {"message": "Why is carbon tetravalent?"}
            response = client.post("/api/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "error"
            assert "GEMINI_API_KEY" in data["answer"]


def test_tutor_chat_gemini_mocked_success():
    mock_chat_response = ChatResponse(
        status="success",
        answer="Carbon is tetravalent because it has 4 valence electrons in its outer shell.",
        reply="Carbon is tetravalent because it has 4 valence electrons in its outer shell."
    )

    with patch("app.core.config.settings.GEMINI_API_KEY", "mock_gemini_key_123"):
        with patch("app.ai.llm_service.LLMService._call_gemini_chat", return_value=mock_chat_response):
            payload = {
                "message": "Why is carbon tetravalent?",
                "history": [
                    {"role": "user", "content": "What is carbon?"},
                    {"role": "assistant", "content": "Carbon is an element with atomic number 6."}
                ]
            }
            response = client.post("/api/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert "tetravalent" in data["answer"]
            assert data["reply"] == data["answer"]
