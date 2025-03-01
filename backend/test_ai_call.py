import requests
import json
import time

# Your FastAPI server URL
API_URL = "https://1159-104-28-152-181.ngrok-free.app"

# Your phone number
your_number = "+13479695538"

# Sample system instructions
system_instructions = """
You are a friendly AI assistant on a phone call. Keep your responses brief and conversational.
Introduce yourself as an AI assistant and ask how you can help today.
"""

def make_ai_call():
    print(f"Making an AI-powered call to {your_number}...")
    
    # Call the make-call endpoint
    response = requests.post(
        f"{API_URL}/make-call",
        json={
            "phone_number": your_number,
            "system_instructions": system_instructions
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        call_sid = data.get("call_sid")
        print(f"Call initiated with SID: {call_sid}")
        
        # Monitor the call status
        for _ in range(20):
            time.sleep(5)
            status_response = requests.get(f"{API_URL}/calls/{call_sid}")
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"Call status: {status_data.get('status')}")
                
                # Print conversation history if available
                if "history" in status_data and status_data["history"]:
                    print("\nConversation so far:")
                    for entry in status_data["history"]:
                        print(f"Human: {entry.get('human')}")
                        print(f"AI: {entry.get('ai')}")
                        print("---")
                
                if status_data.get("status") in ["completed", "failed", "busy", "no-answer", "canceled", "ended"]:
                    break
            else:
                print(f"Error getting call status: {status_response.text}")
        
        print("Test completed!")
    else:
        print(f"Error making call: {response.text}")

if __name__ == "__main__":
    make_ai_call() 