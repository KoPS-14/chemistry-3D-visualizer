import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_tutor_chat_endpoint_nucleophile():
    payload = {"message": "What is a nucleophile?"}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "Nucleophile" in data["reply"]
    assert "key_concepts" in data
    assert len(data["key_concepts"]) > 0
    assert data["suggested_visualize_prompt"] is not None


def test_tutor_chat_endpoint_sn1_vs_sn2():
    payload = {"message": "Explain SN1 vs SN2 mechanism"}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert ("S_N1" in data["reply"] or "SN1" in data["reply"]) and ("S_N2" in data["reply"] or "SN2" in data["reply"])


def test_tutor_chat_empty_message():
    payload = {"message": "   "}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 400
