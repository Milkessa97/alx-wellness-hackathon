import os
import json
import uuid
from datetime import datetime, date, timezone
from groq import Groq
from dotenv import load_dotenv

# Initialize groq client
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def default_action_plan() -> list[dict]:
    return [
        {"id": str(uuid.uuid4()), "text": "Take 5 deep breaths", "category": "breathing", "done": False},
        {"id": str(uuid.uuid4()), "text": "Write down 3 things you are grateful for", "category": "journaling", "done": False},
        {"id": str(uuid.uuid4()), "text": "Go for a 10-minute walk", "category": "movement", "done": False}
    ]

async def generate_action_plan(user_id: str, db) -> list[dict]:
    # 1. Fetch last 3 rows from assessments table ordered by taken_at DESC for this user_id
    res = db.table("assessments").select("score, tier, taken_at").eq("user_id", user_id).order("taken_at", desc=True).limit(3).execute()
    
    # 2. If no rows: return default_action_plan()
    if not res.data:
        return default_action_plan()
    
    assessments = res.data
    
    # 3. Compute trend:
    trend = "stable"
    if len(assessments) >= 2:
        # assessments is ordered DESC, so assessments[0] is the latest, assessments[-1] is the oldest
        latest_score = assessments[0].get("score", 0)
        oldest_score = assessments[-1].get("score", 0)
        if latest_score < oldest_score:
            trend = "improving"
        elif latest_score > oldest_score:
            trend = "worsening"
            
    # 4 & 5. Build user prompt string with each score/tier/date, trend, and weekday/weekend
    today = date.today()
    day_of_week = today.strftime("%A")
    is_weekend = today.weekday() >= 5
    day_type = "weekend" if is_weekend else "weekday (job day)"
    
    context_str = f"User has taken {len(assessments)} assessments recently.\n"
    for i, a in enumerate(assessments):
        context_str += f"- Assessment {i+1} (Date: {a.get('taken_at')}): Score={a.get('score')}, Tier={a.get('tier')}\n"
    context_str += f"Trend: {trend}.\n"
    context_str += f"Today is {day_of_week}, which is a {day_type}. Please tailor the activities to suit a {day_type}.\n"
    
    user_prompt = f"Please generate a personalized action plan based on the following context:\n{context_str}"
    
    # Call Groq
    if not groq_client:
        return default_action_plan()
        
    system_prompt = (
        "You are a compassionate mental wellness coach. Respond ONLY with a valid JSON array, "
        "no prose, no markdown fences. 3-5 items each: "
        '{"id": "uuid4", "text": "string", "category": "breathing|journaling|movement|social|mindfulness|sleep", "done": false}. '
        "Actions under 15 min. Match intensity to PHQ-9 tier. No medication or diagnosis."
    )
    
    try:
        completion = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=500,
        )
        response_text = completion.choices[0].message.content.strip()
        
        # Remove markdown fences if model accidentally includes them
        if response_text.startswith("```"):
            lines = response_text.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()
            if response_text.lower().startswith("json"):
                response_text = response_text[4:].strip()
                
        parsed = json.loads(response_text)
        
        # Validate the structure minimally
        if not isinstance(parsed, list):
            raise ValueError("Response is not a JSON array")
        
        # Ensure ids and done status
        for item in parsed:
            if "id" not in item:
                item["id"] = str(uuid.uuid4())
            item["done"] = False
            
    except Exception as e:
        print(f"Error parsing Groq response or calling Groq: {e}")
        parsed = default_action_plan()
        
    # 7. Upsert into action_plans
    plan_date_str = today.isoformat()
    now_str = datetime.now(timezone.utc).isoformat()
    
    action_plan_record = {
        "user_id": user_id,
        "plan_date": plan_date_str,
        "items": parsed,
        "generated_at": now_str
    }
    
    try:
        # Supabase Python client upsert
        db.table("action_plans").upsert(action_plan_record, on_conflict="user_id,plan_date").execute()
    except Exception as e:
        print(f"Error upserting action plan: {e}")
        # fallback, just return the parsed plan anyway

    # 8. Return items list
    return parsed
