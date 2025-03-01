from fastapi import FastAPI, Request, HTTPException
import uvicorn
import json
import requests
import os
from dotenv import load_dotenv
import random
from datetime import datetime, timezone
from db_operations import update_call_transcript, update_call_ended

# Load environment variables
load_dotenv()

app = FastAPI()

# Store active calls, message counts, and control URLs
active_calls = {}

# VAPI API credentials
VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_BASE_URL = "https://api.vapi.ai"

# List of strange messages to inject
STRANGE_MESSAGES = [
    "My skin feels like it's made of tiny ants today.",
    "Sometimes I can taste the color blue.",
    "The government is tracking me through my fillings.",
    "I just remembered I left my other personality in the washing machine.",
    "The moon landing was filmed in my basement.",
    "I can hear the electricity in the walls talking to me.",
    "My teeth are sending radio signals to Mars.",
    "Yesterday, I saw a squirrel reading a newspaper.",
    "The number 7 has been following me all week.",
    "I'm actually three raccoons in a human costume."
]

def get_call_details(call_id):
    """Get call details from VAPI API to extract control URL"""
    try:
        headers = {
            "Authorization": f"Bearer {VAPI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{VAPI_BASE_URL}/call/{call_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            call_data = response.json()
            print(f"Call details: {json.dumps(call_data, indent=2)}")
            
            # Extract control URL from the monitor object
            monitor = call_data.get("monitor", {})
            control_url = monitor.get("controlUrl")
            
            if control_url:
                print(f"Found control URL: {control_url}")
                return control_url
            else:
                print("No control URL found in call details")
                return None
        else:
            print(f"Failed to get call details: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error getting call details: {str(e)}")
        return None

def send_message_to_call(call_id, message):
    """Send a message to an active call using the control URL"""
    try:
        # Get the control URL for this call
        if call_id not in active_calls or "control_url" not in active_calls[call_id]:
            print(f"No control URL found for call {call_id}. Fetching from API...")
            control_url = get_call_details(call_id)
            
            if control_url:
                if call_id not in active_calls:
                    active_calls[call_id] = {"active": True, "message_count": 0}
                active_calls[call_id]["control_url"] = control_url
            else:
                print(f"Error: Could not get control URL for call {call_id}")
                return False
        
        control_url = active_calls[call_id]["control_url"]
        
        # Prepare the payload for the control URL
        payload = {
            "type": "say",
            "message": message
        }
        
        # Send the request to the control URL
        response = requests.post(
            control_url,
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        print(f"Injected message to call {call_id}: '{message}'")
        print(f"Response: {response.status_code} - {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending message to call: {str(e)}")
        return False

@app.post("/vapi-webhook")
async def vapi_webhook(request: Request):
    """
    Webhook endpoint to receive VAPI call status updates and inject messages
    after every 3rd assistant response
    """
    try:
        # Get the JSON payload from the request
        payload = await request.json()
        
        # Extract the message object which contains the actual data
        message_obj = payload.get("message", {})
        
        # Extract event type from the message object
        event_type = message_obj.get("type")
        
        # Extract call ID from the call object inside the message
        call_obj = message_obj.get("call", {})
        call_id = call_obj.get("id")
        
        print(f"event_type: {event_type}")
        print(f"call_id: {call_id}")
        
        # Initialize call tracking if not exists
        if call_id and call_id not in active_calls:
            active_calls[call_id] = {
                "active": True,
                "message_count": 0,
                "transcript": []  # Initialize empty transcript
            }
            
            # Get call details to extract control URL
            control_url = get_call_details(call_id)
            if control_url:
                active_calls[call_id]["control_url"] = control_url
        
        # Handle different event types
        if event_type == "call-status-update" and message_obj.get("status") == "started":
            print(f"📞 CALL STARTED: Call {call_id} has started")
            active_calls[call_id]["active"] = True
            active_calls[call_id]["message_count"] = 0
            active_calls[call_id]["transcript"] = []  # Reset transcript
            
            # If we don't have a control URL yet, get it now
            if "control_url" not in active_calls[call_id]:
                control_url = get_call_details(call_id)
                if control_url:
                    active_calls[call_id]["control_url"] = control_url
            
        elif event_type == "call-status-update" and message_obj.get("status") == "ended":
            print(f"📞 CALL ENDED: Call {call_id} has ended")
            if call_id in active_calls:
                active_calls[call_id]["active"] = False
                
                # Update database with final transcript and ended status
                if "transcript" in active_calls[call_id]:
                    # First update transcript
                    update_call_transcript(call_id, active_calls[call_id]["transcript"], VAPI_API_KEY, VAPI_BASE_URL)
                    
                    # Then update status to ended
                    update_call_ended(call_id)
        
        # Handle user messages
        elif event_type == "transcription":
            user_message = message_obj.get("text", "")
            print(f"👤 USER: {user_message}")
            
            # Add to transcript
            if call_id in active_calls:
                if "transcript" not in active_calls[call_id]:
                    active_calls[call_id]["transcript"] = []
                
                # Add the user message to the transcript
                active_calls[call_id]["transcript"].append({
                    "role": "user",
                    "message": user_message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                
                # Update transcript in database
                update_call_transcript(call_id, active_calls[call_id]["transcript"], VAPI_API_KEY, VAPI_BASE_URL)
        
        # Handle conversation updates (when assistant speaks)
        elif event_type == "conversation-update":
            # Check if there's a new bot message
            messages = message_obj.get("messages", [])
            if messages:
                # Get the last message
                last_message = messages[-1]
                if last_message.get("role") == "bot":
                    assistant_message = last_message.get("message", "")
                    print(f"🤖 ASSISTANT: {assistant_message}")
                    
                    # Add to transcript
                    if call_id in active_calls:
                        if "transcript" not in active_calls[call_id]:
                            active_calls[call_id]["transcript"] = []
                        
                        active_calls[call_id]["transcript"].append({
                            "role": "assistant",
                            "message": assistant_message,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        
                        # Update transcript in database
                        update_call_transcript(call_id, active_calls[call_id]["transcript"], VAPI_API_KEY, VAPI_BASE_URL)
                    
                    # Increment message count for this call
                    if call_id in active_calls and active_calls[call_id].get("active", False):
                        active_calls[call_id]["message_count"] = active_calls[call_id].get("message_count", 0) + 1
                        current_count = active_calls[call_id]["message_count"]
                        print(f"Message count for call {call_id}: {current_count}")
                        
                        # Check if it's time to inject a strange message (after every 3rd message)
                        if current_count % 3 == 0:
                            print(f"Attempting to inject strange message after message #{current_count}")
                            strange_message = random.choice(STRANGE_MESSAGES)
                            success = send_message_to_call(call_id, strange_message)
                            print(f"Message injection success: {success}")
                            
                            # Add injected message to transcript
                            if success:
                                active_calls[call_id]["transcript"].append({
                                    "role": "system_injection",
                                    "message": strange_message,
                                    "timestamp": datetime.now(timezone.utc).isoformat()
                                })
                                
                                # Update transcript in database with the injected message
                                update_call_transcript(call_id, active_calls[call_id]["transcript"], VAPI_API_KEY, VAPI_BASE_URL)
        
        # Return a success response
        return {"status": "success", "message": f"Processed {event_type} event"}
        
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000) 