import os
import json
import asyncio
import uuid
import time
from datetime import datetime, timezone
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import concurrent.futures

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# OpenAI API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Thread pool for CPU-bound tasks
thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=5)

async def analyze_user_behavior(call_id, transcript, call_start_time):
    """
    Analyze user behavior in the transcript and log events for rude or inappropriate behavior
    
    Args:
        call_id: The ID of the call
        transcript: The full transcript array
        call_start_time: The timestamp when the call started
    """
    print(f"🔍 Starting user behavior analysis for call {call_id}")
    print(f"📝 Transcript length: {len(transcript)}")
    
    # Run the analysis in a thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        thread_pool,
        _analyze_user_behavior_sync,
        call_id,
        transcript,
        call_start_time
    )
    print(f"✅ Completed user behavior analysis for call {call_id}")

def _analyze_user_behavior_sync(call_id, transcript, call_start_time):
    """Synchronous function to analyze user behavior (runs in thread pool)"""
    try:
        print(f"🧵 Thread: Starting user behavior analysis for call {call_id}")
        
        # Filter for user messages only
        user_messages = [msg for msg in transcript if msg.get("role") == "user"]
        print(f"👤 Found {len(user_messages)} user messages in transcript")
        
        if not user_messages:
            print("⚠️ No user messages found in transcript, skipping analysis")
            return
        
        # Get the last user message
        last_user_msg = user_messages[-1]
        print(f"📝 Last user message: '{last_user_msg.get('message')}'")
        
        # Calculate time into call
        msg_timestamp = datetime.fromisoformat(last_user_msg.get("timestamp").replace('Z', '+00:00'))
        start_time = datetime.fromisoformat(call_start_time.replace('Z', '+00:00')) if isinstance(call_start_time, str) else call_start_time
        time_into_call = int((msg_timestamp - start_time).total_seconds())
        print(f"⏱️ Message time into call: {time_into_call} seconds")
        
        # Analyze the message for rudeness or inappropriate behavior
        print(f"🧠 Sending message to LLM for analysis: '{last_user_msg.get('message')}'")
        analysis = analyze_message_with_llm(last_user_msg.get("message"), "user_behavior")
        
        if not analysis:
            print("⚠️ LLM analysis returned no results")
            return
            
        print(f"📊 Analysis results: {json.dumps(analysis, indent=2)}")
            
        # If the analysis detected an issue, log it as an event
        if analysis.get("issue_detected", False):
            event_id = str(uuid.uuid4())
            epoch = int(time.time())
            print(f"⚠️ Issue detected: {analysis.get('issue_type')} - {analysis.get('description')}")
            
            # Create database session
            db = SessionLocal()
            
            # Insert the event
            print(f"💾 Logging event to database with ID {event_id}")
            db.execute(
                text("""
                INSERT INTO call_events 
                (id, call_id, timestamp, epoch, time_into_call, type, description)
                VALUES (:id, :call_id, :timestamp, :epoch, :time_into_call, :type, :description)
                """),
                {
                    "id": event_id,
                    "call_id": call_id,
                    "timestamp": msg_timestamp,
                    "epoch": epoch,
                    "time_into_call": time_into_call,
                    "type": analysis.get("issue_type", "inappropriate_behavior"),
                    "description": analysis.get("description", "Inappropriate user behavior detected")
                }
            )
            
            db.commit()
            db.close()
            
            print(f"✅ Logged user behavior event for call {call_id}: {analysis.get('description')}")
        else:
            print(f"✅ No issues detected in user message")
    
    except Exception as e:
        print(f"❌ Error analyzing user behavior: {str(e)}")
        import traceback
        traceback.print_exc()

async def score_conversation_quality(call_id, transcript, call_start_time):
    """
    Score the quality of the conversation if the user was a customer support agent
    
    Args:
        call_id: The ID of the call
        transcript: The full transcript array
        call_start_time: The timestamp when the call started
    """
    print(f"🔍 Starting conversation quality scoring for call {call_id}")
    print(f"📝 Transcript length: {len(transcript)}")
    
    # Run the scoring in a thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        thread_pool,
        _score_conversation_quality_sync,
        call_id,
        transcript,
        call_start_time
    )
    print(f"✅ Completed conversation quality scoring for call {call_id}")

def _score_conversation_quality_sync(call_id, transcript, call_start_time):
    """Synchronous function to score conversation quality (runs in thread pool)"""
    try:
        print(f"🧵 Thread: Starting conversation quality scoring for call {call_id}")
        
        if not transcript:
            print("⚠️ Empty transcript, skipping scoring")
            return
            
        # Calculate time into call
        now = datetime.now(timezone.utc)
        start_time = datetime.fromisoformat(call_start_time.replace('Z', '+00:00')) if isinstance(call_start_time, str) else call_start_time
        call_duration = int((now - start_time).total_seconds())
        print(f"⏱️ Current call duration: {call_duration} seconds")
        
        # Analyze the full transcript for conversation quality
        print(f"🧠 Sending transcript to LLM for quality analysis ({len(transcript)} messages)")
        analysis = analyze_transcript_with_llm(transcript, "conversation_quality")
        
        if not analysis:
            print("⚠️ LLM analysis returned no results")
            return
            
        print(f"📊 Quality analysis results: {json.dumps(analysis, indent=2)}")
            
        # Get the politeness score
        politeness_score = analysis.get("politeness_score", 5.0)
        print(f"📈 Politeness score: {politeness_score}/10")
        
        # Create a new score record
        score_id = str(uuid.uuid4())
        epoch = int(time.time())
        
        # Create database session
        db = SessionLocal()
        
        # Insert the score
        print(f"💾 Logging score to database with ID {score_id}")
        db.execute(
            text("""
            INSERT INTO call_scores 
            (id, call_id, timestamp, epoch, politeness_score)
            VALUES (:id, :call_id, :timestamp, :epoch, :politeness_score)
            """),
            {
                "id": score_id,
                "call_id": call_id,
                "timestamp": now,
                "epoch": epoch,
                "politeness_score": politeness_score
            }
        )
        
        db.commit()
        db.close()
        
        print(f"✅ Logged conversation quality score for call {call_id}: {politeness_score}/10")
    
    except Exception as e:
        print(f"❌ Error scoring conversation quality: {str(e)}")
        import traceback
        traceback.print_exc()

def analyze_message_with_llm(message, analysis_type):
    """
    Analyze a single message using an LLM
    
    Args:
        message: The message text to analyze
        analysis_type: The type of analysis to perform
        
    Returns:
        dict: Analysis results
    """
    try:
        print(f"🧠 LLM analysis started for type: {analysis_type}")
        
        if analysis_type == "user_behavior":
            prompt = f"""
            You are an AI that analyzes customer service conversations.
            
            Analyze the following message from a user who is pretending to be a customer service representative.
            Determine if the message contains any of the following issues:
            - Rudeness or unprofessional language
            - Interrupting the conversation flow
            - Providing incorrect information
            - Using inappropriate tone
            - Not acting like a professional customer support agent
            
            User message: "{message}"
            
            Respond in JSON format with the following structure:
            {{
                "issue_detected": true/false,
                "issue_type": "rudeness|interruption|misinformation|inappropriate_tone|unprofessional",
                "description": "Brief description of the issue",
                "severity": 1-10 (where 10 is most severe)
            }}
            
            If no issues are detected, set "issue_detected" to false and leave the other fields empty.
            """
            print(f"📝 Generated user behavior analysis prompt (length: {len(prompt)})")
        else:
            print(f"⚠️ Unknown analysis type: {analysis_type}")
            return None
            
        # Call OpenAI API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        payload = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }
        
        print(f"🌐 Calling OpenAI API with model: {payload['model']}")
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print(f"✅ OpenAI API call successful, received {len(content)} characters")
            return json.loads(content)
        else:
            print(f"❌ Error calling OpenAI API: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error in analyze_message_with_llm: {str(e)}")
        return None

def analyze_transcript_with_llm(transcript, analysis_type):
    """
    Analyze the full transcript using an LLM
    
    Args:
        transcript: The full transcript array
        analysis_type: The type of analysis to perform
        
    Returns:
        dict: Analysis results
    """
    try:
        print(f"🧠 Transcript analysis started for type: {analysis_type}")
        print(f"📝 Transcript length: {len(transcript)} messages")
        
        if analysis_type == "conversation_quality":
            # Format the transcript for the prompt
            formatted_transcript = ""
            for msg in transcript:
                role = msg.get("role", "unknown")
                message = msg.get("message", "")
                formatted_transcript += f"{role.upper()}: {message}\n\n"
            
            print(f"📝 Formatted transcript length: {len(formatted_transcript)} characters")
            
            prompt = f"""
            You are an AI that evaluates customer service quality.
            
            Below is a transcript of a conversation where the human is pretending to be a customer service representative and the assistant is the customer.
            
            Evaluate how well the human is performing as a customer service representative based on:
            - Politeness and professionalism
            - Helpfulness and problem-solving
            - Clear communication
            - Appropriate responses to customer needs
            
            Transcript:
            {formatted_transcript}
            
            Respond in JSON format with the following structure:
            {{
                "politeness_score": 0-10 (where 10 is excellent),
                "helpfulness_score": 0-10,
                "communication_score": 0-10,
                "overall_score": 0-10,
                "strengths": ["strength1", "strength2"],
                "areas_for_improvement": ["area1", "area2"],
                "summary": "Brief evaluation summary"
            }}
            """
            print(f"📝 Generated conversation quality prompt (length: {len(prompt)})")
        else:
            print(f"⚠️ Unknown analysis type: {analysis_type}")
            return None
            
        # Call OpenAI API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        payload = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }
        
        print(f"🌐 Calling OpenAI API with model: {payload['model']}")
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print(f"✅ OpenAI API call successful, received {len(content)} characters")
            return json.loads(content)
        else:
            print(f"❌ Error calling OpenAI API: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error in analyze_transcript_with_llm: {str(e)}")
        return None

# Main function to process a transcript
async def process_transcript(call_id, transcript, call_start_time, message_count):
    """
    Process a transcript for analysis and scoring
    
    Args:
        call_id: The ID of the call
        transcript: The full transcript array
        call_start_time: The timestamp when the call started
        message_count: The current message count
    """
    try:
        print(f"🔄 Processing transcript for call {call_id}")
        print(f"📝 Transcript length: {len(transcript)}")
        print(f"🔢 Current message count: {message_count}")
        
        # Always analyze the latest user message for inappropriate behavior
        print(f"🔍 Starting user behavior analysis")
        await analyze_user_behavior(call_id, transcript, call_start_time)
        
        # Score the conversation quality every 3 messages
        if message_count > 0 and message_count-1 % 2 == 0:
            print(f"📊 Starting conversation quality scoring (message count: {message_count})")
            await score_conversation_quality(call_id, transcript, call_start_time)
        else:
            print(f"⏭️ Skipping conversation quality scoring (message count: {message_count})")
            
        print(f"✅ Completed transcript processing for call {call_id}")
            
    except Exception as e:
        print(f"❌ Error processing transcript: {str(e)}")
        import traceback
        traceback.print_exc() 