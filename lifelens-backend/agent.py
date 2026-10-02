import os
from typing import TypedDict
from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
from langgraph.graph import StateGraph

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-pro")

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Incident(BaseModel):
    description: str
    location: str

class AgentState(TypedDict):
    description: str
    location: str
    severity: str
    hospital: str
    ambulance: str
    eta: str

def severity_agent(state: AgentState):
    prompt = f"""
    Analyze this emergency and classify severity as LOW, MEDIUM, or HIGH.
    Incident: {state['description']}
    Location: {state['location']}
    """
    res = model.generate_content(prompt)
    state["severity"] = res.text.strip()
    return state

def hospital_agent(state: AgentState):
    if "HIGH" in state["severity"]:
        state["hospital"] = "Government Trauma Care Hospital"
    else:
        state["hospital"] = "Nearest General Hospital"
    return state

def ambulance_agent(state: AgentState):
    state["ambulance"] = "Ambulance Unit A-12"
    state["eta"] = "7 minutes"
    return state

graph = StateGraph(AgentState)
graph.add_node("severity_agent", severity_agent)
graph.add_node("hospital_agent", hospital_agent)
graph.add_node("ambulance_agent", ambulance_agent)

graph.set_entry_point("severity_agent")
graph.add_edge("severity_agent", "hospital_agent")
graph.add_edge("hospital_agent", "ambulance_agent")

lifelens_agent = graph.compile()

@app.post("/report")
def report_incident(incident: Incident):
    try:
        initial_state = {
            "description": incident.description,
            "location": incident.location,
            "severity": "",
            "hospital": "",
            "ambulance": "",
            "eta": ""
        }

        result = lifelens_agent.invoke(initial_state)

        return {
            "severity": result["severity"],
            "assigned_hospital": result["hospital"],
            "ambulance": result["ambulance"],
            "eta": result["eta"]
        }

    except Exception as e:
        print("ERROR:", e)
        return {"error": str(e)}
