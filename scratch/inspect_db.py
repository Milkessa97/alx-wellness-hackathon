import os
import sys
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from database import get_supabase

def main():
    client = get_supabase()
    print("Testing connection...")
    try:
        # Check existing tables or rpc functions
        print("Tables check:")
        # We can try reading from a table to see if it exists
        tables = ["assessments", "milestones", "referrals", "help_seeking_pathways", "help_pathways"]
        for table in tables:
            try:
                res = client.table(table).select("*").limit(1).execute()
                print(f"Table '{table}': exists! Data: {res.data}")
            except Exception as e:
                print(f"Table '{table}': error/not exists? - {e}")
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    main()
