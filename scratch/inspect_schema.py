import os
import sys
import requests
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("Missing env vars")
        return

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}"
    }

    try:
        # Fetch PostgREST schema description
        res = requests.get(url + "/rest/v1/", headers=headers)
        if res.status_code == 200:
            schema = res.json()
            print("Paths exposed by PostgREST:")
            for path in schema.get("paths", {}).keys():
                print(path)
        else:
            print(f"Failed to fetch schema: {res.status_code} {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
