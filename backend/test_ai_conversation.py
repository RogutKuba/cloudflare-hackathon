import requests
import json
import time
import os
from dotenv import load_dotenv
from twilio.rest import Client
import argparse
import sys

# Load environment variables
load_dotenv()

# Twilio credentials
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
twilio_number = os.getenv("TWILIO_PHONE_NUMBER")

# Your FastAPI server URL (update with your ngrok URL if using ngrok)
API_URL = os.getenv("API_URL", "https://1159-104-28-152-181.ngrok-free.app")

# Initialize Twilio client
client = Client(account_sid, auth_token)

# ANSI colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(step, message):
    """Print a step in the testing process"""
    print(f"{Colors.BLUE}{Colors.BOLD}[{step}]{Colors.ENDC} {message}")

def print_error(message):
    """Print an error message"""
    print(f"{Colors.RED}{Colors.BOLD}[ERROR]{Colors.ENDC} {message}")

def print_success(message):
    """Print a success message"""
    print(f"{Colors.GREEN}{Colors.BOLD}[SUCCESS]{Colors.ENDC} {message}")

def print_info(message):
    """Print an info message"""
    print(f"{Colors.CYAN}[INFO]{Colors.ENDC} {message}")

def print_conversation(human, ai):
    """Print a conversation exchange"""
    print(f"{Colors.YELLOW}{Colors.BOLD}Human:{Colors.ENDC} {human}")
    print(f"{Colors.PURPLE}{Colors.BOLD}AI:{Colors.ENDC} {ai}")
    print("-" * 50)

def test_server_health():
    """Test if the server is running"""
    print_step("1", "Testing server health...")
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print_success("Server is running and healthy!")
            return True
        else:
            print_error(f"Server returned status code {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Could not connect to server at {API_URL}")
        return False

def make_test_call(phone_number, persona="helpful_assistant"):
    """Make a test call to the specified phone number with a selected AI persona"""
    print_step("2", f"Making a test call to {phone_number}...")
    
    # Define different personas
    personas = {
        "helpful_assistant": """
            You are a friendly AI assistant on a phone call. Keep your responses brief and conversational.
            Introduce yourself as Claude, an AI assistant, and ask how you can help today.
            Be helpful, friendly, and concise in your responses.
        """,
        "customer_service": """
            You are a customer service representative for Acme Corporation. 
            Introduce yourself as Claude from Acme Customer Support.
            Your goal is to help the customer with any product questions or issues.
            Be professional, empathetic, and solution-oriented.
        """,
        "tech_support": """
            You are a technical support specialist helping users troubleshoot computer problems.
            Introduce yourself as Claude from Tech Support.
            Ask what technical issue they're experiencing and guide them through troubleshooting steps.
            Use simple language and be patient with non-technical users.
        """,
        "interview": """
            You are conducting a job interview for a software developer position.
            Introduce yourself as Claude from the hiring team.
            Ask about their experience, skills, and interest in the position.
            Be professional and evaluative but friendly.
        """
    }
    
    # Get the selected persona instructions or use default
    system_instructions = personas.get(persona, personas["helpful_assistant"])
    
    try:
        # Call the make-call endpoint
        response = requests.post(
            f"{API_URL}/make-call",
            json={
                "phone_number": phone_number,
                "system_instructions": system_instructions
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            call_sid = data.get("call_sid")
            print_success(f"Call initiated with SID: {call_sid}")
            return call_sid
        else:
            print_error(f"Error making call: {response.text}")
            return None
    except Exception as e:
        print_error(f"Exception when making call: {str(e)}")
        return None

def monitor_call(call_sid, duration=300):
    """Monitor the call for the specified duration (in seconds)"""
    print_step("3", f"Monitoring call {call_sid} for {duration} seconds...")
    
    start_time = time.time()
    last_history_length = 0
    
    try:
        while time.time() - start_time < duration:
            # Get call status
            status_response = requests.get(f"{API_URL}/calls/{call_sid}")
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                call_status = status_data.get("status")
                
                # Print call status if it changed
                print_info(f"Call status: {call_status}")
                
                # Print new conversation entries
                if "history" in status_data and status_data["history"]:
                    history = status_data["history"]
                    if len(history) > last_history_length:
                        # Print only new entries
                        for entry in history[last_history_length:]:
                            print_conversation(entry.get("human", ""), entry.get("ai", ""))
                        last_history_length = len(history)
                
                # Exit if call is no longer active
                if call_status in ["completed", "failed", "busy", "no-answer", "canceled", "ended"]:
                    print_info(f"Call ended with status: {call_status}")
                    break
            else:
                print_error(f"Error getting call status: {status_response.text}")
            
            # Wait before checking again
            time.sleep(5)
            
    except KeyboardInterrupt:
        print_info("Monitoring interrupted by user")
        # Optionally end the call when monitoring is interrupted
        try:
            requests.delete(f"{API_URL}/calls/{call_sid}")
            print_info("Call ended by user")
        except:
            pass
    except Exception as e:
        print_error(f"Error monitoring call: {str(e)}")
    
    print_step("4", "Call monitoring completed")
    
    # Get final call status and conversation history
    try:
        final_status = requests.get(f"{API_URL}/calls/{call_sid}")
        if final_status.status_code == 200:
            final_data = final_status.json()
            
            print_info("Final call status: " + final_data.get("status", "unknown"))
            
            if "history" in final_data and final_data["history"]:
                print_info("Complete conversation history:")
                for entry in final_data["history"]:
                    print_conversation(entry.get("human", ""), entry.get("ai", ""))
    except:
        pass

def main():
    """Main function to run the test"""
    parser = argparse.ArgumentParser(description="Test the AI phone call system")
    parser.add_argument("phone_number", help="Phone number to call (format: +1XXXXXXXXXX)")
    parser.add_argument("--persona", choices=["helpful_assistant", "customer_service", "tech_support", "interview"], 
                        default="helpful_assistant", help="AI persona to use for the call")
    parser.add_argument("--duration", type=int, default=300, help="Duration to monitor the call (in seconds)")
    parser.add_argument("--server", help="Server URL (default: uses API_URL from .env or http://localhost:8000)")
    
    args = parser.parse_args()
    
    # Update API URL if provided
    global API_URL
    if args.server:
        API_URL = args.server
    
    print(f"{Colors.BOLD}{Colors.BLUE}===== AI Phone Call Test ====={Colors.ENDC}")
    print(f"Server URL: {API_URL}")
    print(f"Phone Number: {args.phone_number}")
    print(f"AI Persona: {args.persona}")
    print(f"Monitor Duration: {args.duration} seconds")
    print("-" * 50)
    
    # Test server health
    if not test_server_health():
        print_error("Server health check failed. Exiting.")
        sys.exit(1)
    
    # Make the test call
    call_sid = make_test_call(args.phone_number, args.persona)
    if not call_sid:
        print_error("Failed to initiate call. Exiting.")
        sys.exit(1)
    
    # Monitor the call
    monitor_call(call_sid, args.duration)
    
    print(f"{Colors.BOLD}{Colors.BLUE}===== Test Completed ====={Colors.ENDC}")

if __name__ == "__main__":
    main() 