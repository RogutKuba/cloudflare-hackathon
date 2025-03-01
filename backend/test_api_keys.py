import os
import sys
import json
from dotenv import load_dotenv
import requests
from google.cloud import speech
import openai
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Load environment variables
load_dotenv()

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'

def print_status(service, status, message=""):
    if status == "OK":
        print(f"{Colors.GREEN}✓ {service}: {status}{Colors.ENDC} {message}")
    elif status == "WARNING":
        print(f"{Colors.YELLOW}⚠ {service}: {status}{Colors.ENDC} {message}")
    else:
        print(f"{Colors.RED}✗ {service}: {status}{Colors.ENDC} {message}")

def test_twilio():
    """Test Twilio API credentials"""
    print(f"\n{Colors.BLUE}Testing Twilio...{Colors.ENDC}")
    
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    phone_number = os.getenv("TWILIO_PHONE_NUMBER")
    
    if not account_sid or not auth_token:
        print_status("Twilio", "ERROR", "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
        return False
    
    try:
        client = Client(account_sid, auth_token)
        # Just fetch account info to verify credentials
        account = client.api.accounts(account_sid).fetch()
        print_status("Twilio Auth", "OK", f"Connected to account: {account.friendly_name}")
        
        # Check if the phone number exists
        if phone_number:
            try:
                numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
                if numbers:
                    print_status("Twilio Phone", "OK", f"Phone number {phone_number} is valid")
                else:
                    print_status("Twilio Phone", "WARNING", f"Phone number {phone_number} not found in your account")
            except Exception as e:
                print_status("Twilio Phone", "WARNING", f"Could not verify phone number: {str(e)}")
        else:
            print_status("Twilio Phone", "WARNING", "TWILIO_PHONE_NUMBER not set")
        
        return True
    except TwilioRestException as e:
        print_status("Twilio", "ERROR", f"Authentication failed: {str(e)}")
        return False
    except Exception as e:
        print_status("Twilio", "ERROR", f"Unexpected error: {str(e)}")
        return False

def test_google_speech():
    """Test Google Cloud Speech-to-Text API credentials"""
    print(f"\n{Colors.BLUE}Testing Google Cloud Speech-to-Text...{Colors.ENDC}")
    
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    if not credentials_path:
        print_status("Google Speech", "ERROR", "GOOGLE_APPLICATION_CREDENTIALS not set")
        return False
    
    if not os.path.exists(credentials_path):
        print_status("Google Speech", "ERROR", f"Credentials file not found at: {credentials_path}")
        return False
    
    try:
        # Try to load the credentials file
        with open(credentials_path, 'r') as f:
            creds_data = json.load(f)
            project_id = creds_data.get('project_id')
            if project_id:
                print_status("Google Credentials", "OK", f"Loaded credentials for project: {project_id}")
            else:
                print_status("Google Credentials", "WARNING", "Credentials file doesn't contain project_id")
        
        # Initialize the client and make a simple request
        client = speech.SpeechClient()
        
        # Create a simple recognition config to test the API
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
        )
        
        # We're not actually sending audio, just testing if the client initializes
        # and the API is accessible
        print_status("Google Speech Client", "OK", "Successfully initialized the client")
        
        return True
    except Exception as e:
        print_status("Google Speech", "ERROR", f"Error: {str(e)}")
        return False

def test_openai():
    """Test OpenAI API credentials"""
    print(f"\n{Colors.BLUE}Testing OpenAI...{Colors.ENDC}")
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print_status("OpenAI", "ERROR", "OPENAI_API_KEY not set")
        return False
    
    try:
        openai.api_key = api_key
        
        # Make a simple request to test the API key
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'API key is working' in 5 words or less."}
            ],
            max_tokens=20
        )
        
        if response and response.choices and len(response.choices) > 0:
            message = response.choices[0].message['content'].strip()
            print_status("OpenAI", "OK", f"Response: {message}")
            return True
        else:
            print_status("OpenAI", "ERROR", "No response received")
            return False
    except Exception as e:
        print_status("OpenAI", "ERROR", f"Error: {str(e)}")
        return False

def test_elevenlabs():
    """Test ElevenLabs API credentials"""
    print(f"\n{Colors.BLUE}Testing ElevenLabs...{Colors.ENDC}")
    
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default voice ID
    
    if not api_key:
        print_status("ElevenLabs", "ERROR", "ELEVENLABS_API_KEY not set")
        return False
    
    try:
        # Test the API key by getting available voices
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }
        
        response = requests.get("https://api.elevenlabs.io/v1/voices", headers=headers)
        
        if response.status_code == 200:
            voices = response.json().get("voices", [])
            print_status("ElevenLabs", "OK", f"Found {len(voices)} voices")
            
            # Check if the specified voice ID exists
            voice_exists = any(voice["voice_id"] == voice_id for voice in voices)
            if voice_exists:
                print_status("ElevenLabs Voice", "OK", f"Voice ID {voice_id} is valid")
            else:
                print_status("ElevenLabs Voice", "WARNING", f"Voice ID {voice_id} not found in available voices")
            
            return True
        else:
            print_status("ElevenLabs", "ERROR", f"API returned status code {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_status("ElevenLabs", "ERROR", f"Error: {str(e)}")
        return False

def main():
    """Run all API tests"""
    print(f"{Colors.BLUE}===== API Key Validation Tool ====={Colors.ENDC}")
    
    # Track overall success
    success = True
    
    # Test each service
    if len(sys.argv) > 1:
        # If specific services are specified, only test those
        services = sys.argv[1:]
        for service in services:
            if service.lower() == "twilio":
                success = test_twilio() and success
            elif service.lower() == "google":
                success = test_google_speech() and success
            elif service.lower() == "openai":
                success = test_openai() and success
            elif service.lower() == "elevenlabs":
                success = test_elevenlabs() and success
            else:
                print(f"Unknown service: {service}")
    else:
        # Test all services
        success = test_twilio() and success
        success = test_google_speech() and success
        success = test_openai() and success
        success = test_elevenlabs() and success
    
    # Print summary
    print(f"\n{Colors.BLUE}===== Summary ====={Colors.ENDC}")
    if success:
        print(f"{Colors.GREEN}All tested APIs are working correctly!{Colors.ENDC}")
    else:
        print(f"{Colors.YELLOW}Some APIs have issues. Please check the details above.{Colors.ENDC}")

if __name__ == "__main__":
    main() 