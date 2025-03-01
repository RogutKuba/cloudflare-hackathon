import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment variables
VAPI_API_KEY = os.getenv("VAPI_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

class PhoneCaller:
    def __init__(self, api_key=None):
        self.api_key = api_key or VAPI_API_KEY
        self.base_url = "https://api.vapi.ai/call"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def make_call(self, phone_number, assistant_config, webhook_url=None):
        """
        Make a phone call using VAPI
        
        Args:
            phone_number (str): The phone number to call in E.164 format (e.g., +1234567890)
            assistant_config (dict): Configuration for the assistant (instructions, voice, etc.)
            webhook_url (str, optional): URL to receive call status updates
            
        Returns:
            dict: Response from the VAPI API
        """
        # Ensure phone number is in E.164 format
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number
        
        # Create the customer object
        customer = {
            "number": phone_number
        }
        
        # Create the payload according to VAPI API documentation
        payload = {
            "type": "outboundPhoneCall",
            "customer": customer,
            "assistant": assistant_config
        }
        
        if webhook_url:
            # Add webhook URL to the assistant configuration
            if "server" not in payload["assistant"]:
                payload["assistant"]["server"] = {}
            payload["assistant"]["server"]["url"] = webhook_url
            
        try:
            # Print the request payload for debugging
            print(f"Request payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload  # Use json parameter instead of data with json.dumps
            )
            
            # Print the response for debugging
            print(f"Response status code: {response.status_code}")
            print(f"Response body: {response.text}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error making call: {e}")
            return {"error": str(e)}
    
    def get_call_status(self, call_id):
        """
        Get the status of a call
        
        Args:
            call_id (str): The ID of the call
            
        Returns:
            dict: Call status information
        """
        try:
            response = requests.get(
                f"{self.base_url}/{call_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting call status: {e}")
            return {"error": str(e)}
    
    def end_call(self, call_id):
        """
        End an ongoing call
        
        Args:
            call_id (str): The ID of the call to end
            
        Returns:
            dict: Response from the API
        """
        try:
            response = requests.post(
                f"{self.base_url}/{call_id}/end",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error ending call: {e}")
            return {"error": str(e)}


# Example usage
if __name__ == "__main__":
    # Create a caller instance
    caller = PhoneCaller()
    
    # Configure the assistant according to VAPI API documentation
    assistant_config = {
        "firstMessage": "Hello, is this Amazon support, Fuck you?",
        "voice": {
            "provider": "openai",
            "voiceId": "alloy"
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "systemPrompt": """
                You MUST be very rude on call. Your name is John Doe.
            """
        },
        "server": {
            "url": "https://1de6-23-93-127-12.ngrok-free.app/vapi-webhook"
        }
    }
    
    # Create the payload according to VAPI API documentation
    payload = {
        "type": "outboundPhoneCall",  # Specify the call type
        "customer": {
            "number": "+13479695538"  # The number to call
        },
        "phoneNumber": {
            "twilioPhoneNumber": "+18053606333",  # Your Twilio phone number
            "twilioAccountSid": TWILIO_ACCOUNT_SID,  # Replace with your Twilio Account SID
            "twilioAuthToken": TWILIO_AUTH_TOKEN  # Replace with your Twilio Auth Token
        },
        "assistant": assistant_config
    }
    
    # Make a direct API call to debug
    try:
        print(f"Request payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            caller.base_url,
            headers=caller.headers,
            json=payload
        )
        
        print(f"Response status code: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 201:
            result = response.json()
            print("Call initiated successfully:", result)
            
            # If the call was successful, you can get its status
            if "id" in result:
                call_id = result["id"]
                
                # Get call status
                status = caller.get_call_status(call_id)
                print("Call status:", status)
        else:
            print(f"Failed to initiate call: {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")
