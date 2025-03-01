import requests
import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_make_call(phone_number=None, instructions=None, first_message=None, voice_id=None):
    """
    Test the make-call API endpoint
    
    Args:
        phone_number: Phone number to call (defaults to a test number if not provided)
        instructions: Instructions for the AI assistant (defaults to a test script if not provided)
        first_message: First message the assistant will say (optional)
        voice_id: Voice ID to use (optional)
    """
    # API endpoint URL - adjust if your server is running on a different host/port
    API_BASE_URL = os.getenv("API_BASE_URL")
    url = API_BASE_URL + "/make-call"
    
    # Use provided values or defaults
    phone_number = phone_number or "+13479695538"  # Replace with your test number
    
    instructions = instructions or """
        You are a customer service representative for a tech company.
        The customer is calling about a problem with their internet service.
        Be helpful but slightly confused. Occasionally mention strange things
        that have nothing to do with the conversation.
        Your name is Alex from technical support.
    """
    
    first_message = first_message or "Hello, thank you for calling tech support. My name is Alex. How can I help you today?"
    voice_id = voice_id or "nova"
    
    # Prepare the payload
    payload = {
        "phone_number": phone_number,
        "instructions": instructions,
        "first_message": first_message,
        "voice_id": voice_id
    }
    
    # Print request details
    print("\n===== TEST MAKE-CALL API =====")
    print("\nRequest URL:", url)
    print("\nRequest Payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        # Make the API request
        print("\nSending request...")
        response = requests.post(url, json=payload)
        
        # Print response status
        print(f"\nResponse Status: {response.status_code}")
        
        # Parse and print the response
        try:
            result = response.json()
            print("\nResponse Body:")
            print(json.dumps(result, indent=2))
            
            if response.status_code == 200 and result.get("success"):
                print("\n✅ SUCCESS: Call initiated successfully!")
                print(f"Call ID: {result.get('call_id')}")
            else:
                print("\n❌ ERROR: Failed to initiate call")
                
        except json.JSONDecodeError:
            print("\nResponse is not valid JSON:")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ ERROR: Request failed: {str(e)}")
        
    print("\n==============================\n")

if __name__ == "__main__":
    # Check if arguments were provided
    if len(sys.argv) > 1:
        # Get phone number from command line
        phone_number = sys.argv[1]
        
        # Get optional instructions
        instructions = sys.argv[2] if len(sys.argv) > 2 else None
        
        # Get optional first message
        first_message = sys.argv[3] if len(sys.argv) > 3 else None
        
        # Get optional voice ID
        voice_id = sys.argv[4] if len(sys.argv) > 4 else None
        
        test_make_call(phone_number, instructions, first_message, voice_id)
    else:
        # No arguments provided, use defaults
        print("No arguments provided. Using default test values.")
        print("Usage: python test_make_call.py [phone_number] [instructions] [first_message] [voice_id]")
        test_make_call() 