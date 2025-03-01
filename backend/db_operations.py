from sqlalchemy import create_engine, Column, String, Integer, DateTime, JSON, MetaData, Table, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone, timedelta
import json
import os
import requests
import uuid
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
metadata = MetaData()

# Define the calls table
calls = Table(
    'calls', 
    metadata,
    Column('id', String, primary_key=True),
    Column('created_at', DateTime, nullable=False, default=datetime.now(timezone.utc)),
    Column('status', String, nullable=False),
    Column('started_at', DateTime, nullable=False),
    Column('ended_at', DateTime, nullable=True),
    Column('duration', Integer, nullable=False, default=0),
    Column('recording_url', String, nullable=False, default=""),
    Column('persona', String, nullable=False, default="default"),
    Column('target', String, nullable=False, default="unknown"),
    Column('transcript', JSON, nullable=False, default=[])
)

def get_call_details_full(call_id, api_key, base_url):
    """Get complete call details from VAPI API"""
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{base_url}/call/{call_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get call details: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error getting call details: {str(e)}")
        return None

def update_call_transcript(call_id, transcript, api_key=None, base_url=None):
    """Update the transcript for a call in the database using SQLAlchemy"""
    try:
        # Create a new session
        db = SessionLocal()
        
        # Check if call exists - using text() for SQL statements
        result = db.execute(
            text("SELECT id FROM calls WHERE id = :call_id"),
            {"call_id": call_id}
        ).fetchone()
        
        if result:
            # Update existing call transcript
            db.execute(
                text("UPDATE calls SET transcript = :transcript WHERE id = :call_id"),
                {"transcript": json.dumps(transcript), "call_id": call_id}
            )
            db.commit()
            print(f"Updated transcript for call {call_id}")
        else:
            # Get call details for a new record if API credentials provided
            call_details = None
            if api_key and base_url:
                call_details = get_call_details_full(call_id, api_key, base_url)
            
            # Set default values
            started_at = datetime.now(timezone.utc)
            # Set ended_at to a future date for active calls
            ended_at = datetime.now(timezone.utc) + timedelta(hours=1)
            recording_url = ""
            persona = "default"
            target = "unknown"
            
            # Extract data from call details if available
            if call_details:
                if call_details.get("startTime"):
                    started_at_str = call_details.get("startTime")
                    started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
                recording_url = call_details.get("recordingUrl", "")
                persona = call_details.get("assistant", {}).get("name", "default")
                target = call_details.get("to", "unknown")
            
            # Insert new call
            db.execute(
                text("""
                INSERT INTO calls 
                (id, status, started_at, ended_at, duration, recording_url, persona, target, transcript)
                VALUES (:id, :status, :started_at, :ended_at, :duration, :recording_url, :persona, :target, :transcript)
                """),
                {
                    "id": call_id,
                    "status": "in-progress",
                    "started_at": started_at,
                    "ended_at": ended_at,
                    "duration": 0,
                    "recording_url": recording_url,
                    "persona": persona,
                    "target": target,
                    "transcript": json.dumps(transcript)
                }
            )
            db.commit()
            print(f"Created new call record for {call_id}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"Error updating call transcript: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def update_call_ended(call_id):
    """Update call status to ended and calculate duration"""
    try:
        db = SessionLocal()
        
        # First check if the call exists
        result = db.execute(
            text("SELECT id, started_at FROM calls WHERE id = :call_id"),
            {"call_id": call_id}
        ).fetchone()
        
        if not result:
            print(f"Call {call_id} not found in database")
            db.close()
            return False
        
        # Get the current time for ended_at
        ended_at = datetime.now(timezone.utc)
        
        # Update the call record
        db.execute(
            text("""
            UPDATE calls 
            SET status = :status, 
                ended_at = :ended_at,
                duration = EXTRACT(EPOCH FROM (:ended_at - started_at))::integer
            WHERE id = :call_id
            """),
            {
                "status": "ended",
                "ended_at": ended_at,
                "call_id": call_id
            }
        )
        db.commit()
        db.close()
        print(f"Updated call {call_id} status to ended")
        return True
    except Exception as e:
        print(f"Error updating call status: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_db_operations():
    """
    Test function to verify database operations are working correctly.
    This function simulates a call lifecycle with transcript updates.
    """
    import uuid
    import time
    
    # Generate a test call ID
    test_call_id = f"test-{uuid.uuid4()}"
    print(f"\n🧪 TESTING DATABASE OPERATIONS with call ID: {test_call_id}")
    
    try:
        # Step 1: Create a new call with initial transcript
        initial_transcript = [
            {
                "role": "assistant",
                "content": "Hello, how can I help you today?",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        print("Step 1: Creating new call record...")
        success = update_call_transcript(test_call_id, initial_transcript)
        if not success:
            print("❌ Failed to create initial call record")
            return False
        
        # Verify the call was created
        db = SessionLocal()
        call = db.execute(
            text("SELECT id, transcript FROM calls WHERE id = :call_id"),
            {"call_id": test_call_id}
        ).fetchone()
        
        if not call:
            print("❌ Call record not found after creation")
            db.close()
            return False
        
        print(f"✅ Call record created successfully")
        
        # Handle transcript which might be a string or already parsed JSON
        transcript_data = call[1]
        if isinstance(transcript_data, str):
            transcript_data = json.loads(transcript_data)
        
        print(f"   Initial transcript: {transcript_data}")
        
        # Step 2: Update the transcript with a user message
        time.sleep(1)  # Small delay to simulate real conversation
        updated_transcript = initial_transcript + [
            {
                "role": "user",
                "content": "I need help with my order",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        print("\nStep 2: Updating transcript with user message...")
        success = update_call_transcript(test_call_id, updated_transcript)
        if not success:
            print("❌ Failed to update transcript")
            db.close()
            return False
        
        # Verify the transcript was updated
        call = db.execute(
            text("SELECT transcript FROM calls WHERE id = :call_id"),
            {"call_id": test_call_id}
        ).fetchone()
        
        # Handle transcript which might be a string or already parsed JSON
        transcript_data = call[0]
        if isinstance(transcript_data, str):
            transcript_data = json.loads(transcript_data)
        
        if len(transcript_data) != 2:
            print(f"❌ Transcript not updated correctly. Expected 2 messages, got {len(transcript_data)}")
            db.close()
            return False
        
        print(f"✅ Transcript updated successfully")
        print(f"   Updated transcript: {transcript_data}")
        
        # Step 3: Update with assistant response and injected message
        time.sleep(1)
        final_transcript = updated_transcript + [
            {
                "role": "assistant",
                "content": "I'd be happy to help with your order. What seems to be the problem?",
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "role": "assistant",
                "content": "My skin feels like it's made of tiny ants today.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "injected": True
            }
        ]
        
        print("\nStep 3: Updating transcript with assistant response and injected message...")
        success = update_call_transcript(test_call_id, final_transcript)
        if not success:
            print("❌ Failed to update transcript with final messages")
            db.close()
            return False
        
        # Verify the transcript was updated
        call = db.execute(
            text("SELECT transcript FROM calls WHERE id = :call_id"),
            {"call_id": test_call_id}
        ).fetchone()
        
        # Handle transcript which might be a string or already parsed JSON
        transcript_data = call[0]
        if isinstance(transcript_data, str):
            transcript_data = json.loads(transcript_data)
        
        if len(transcript_data) != 4:
            print(f"❌ Final transcript not updated correctly. Expected 4 messages, got {len(transcript_data)}")
            db.close()
            return False
        
        print(f"✅ Final transcript updated successfully")
        print(f"   Final transcript: {transcript_data}")
        
        # Step 4: End the call
        print("\nStep 4: Ending the call...")
        success = update_call_ended(test_call_id)
        if not success:
            print("❌ Failed to end call")
            db.close()
            return False
        
        # Verify call was ended
        call = db.execute(
            text("SELECT status, ended_at, duration FROM calls WHERE id = :call_id"),
            {"call_id": test_call_id}
        ).fetchone()
        
        if call[0] != "ended" or call[1] is None or call[2] <= 0:
            print(f"❌ Call not ended correctly. Status: {call[0]}, Ended at: {call[1]}, Duration: {call[2]}")
            db.close()
            return False
        
        print(f"✅ Call ended successfully")
        print(f"   Status: {call[0]}")
        print(f"   Ended at: {call[1]}")
        print(f"   Duration: {call[2]} seconds")
        
        # Clean up - delete test call
        print("\nCleaning up - deleting test call...")
        db.execute(
            text("DELETE FROM calls WHERE id = :call_id"),
            {"call_id": test_call_id}
        )
        db.commit()
        
        # Verify deletion
        call = db.execute(
            text("SELECT id FROM calls WHERE id = :call_id"),
            {"call_id": test_call_id}
        ).fetchone()
        
        if call:
            print("❌ Failed to delete test call")
            db.close()
            return False
        
        print("✅ Test call deleted successfully")
        db.close()
        
        print("\n🎉 ALL TESTS PASSED! Database operations are working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Add this at the end of the file to run the test when the module is executed directly
if __name__ == "__main__":
    test_db_operations()


