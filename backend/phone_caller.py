import os
import time
import json
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, WebSocket, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Twilio for call handling
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.request_validator import RequestValidator

# Google Cloud Speech-to-Text
from google.cloud import speech
from google.cloud.speech import RecognitionConfig, StreamingRecognitionConfig
from google.cloud.speech import SpeechContext
import google.api_core.exceptions

# OpenAI for AI response generation
import openai

# ElevenLabs for text-to-speech
import requests
import websockets

# Load environment variables
load_dotenv()

# API keys and credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")  # Path to your Google credentials JSON file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default voice ID

# Initialize clients
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
twilio_validator = RequestValidator(TWILIO_AUTH_TOKEN)
speech_client = speech.SpeechClient()  # Google Speech client
openai.api_key = OPENAI_API_KEY

# FastAPI app
app = FastAPI(title="AI-Powered Phone Call System")

# Store conversation state
conversations = {}

# Pydantic models
class CallRequest(BaseModel):
    phone_number: str
    system_instructions: Optional[str] = None

class CallResponse(BaseModel):
    call_sid: str
    status: str

# ==================== SPEECH-TO-TEXT (GOOGLE) ====================

async def transcribe_audio_stream(audio_stream, call_sid):
    """
    Transcribe audio stream using Google Speech-to-Text streaming API
    
    Args:
        audio_stream: Audio stream from Twilio
        call_sid: The Twilio call SID
        
    Returns:
        Transcription results via callback
    """
    try:
        # Configure audio stream for Google Speech-to-Text
        # Twilio sends audio as 8kHz mulaw, we need to specify this
        config = RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.MULAW,
            sample_rate_hertz=8000,
            language_code="en-US",
            enable_automatic_punctuation=True,
            model="phone_call",  # Optimized for phone calls
            use_enhanced=True,  # Use enhanced model for better accuracy
        )
        
        streaming_config = StreamingRecognitionConfig(
            config=config,
            interim_results=False  # We only want final results for lower latency
        )
        
        # Create a generator that yields audio chunks
        def audio_generator():
            for chunk in audio_stream:
                yield chunk
        
        # Create a generator that yields StreamingRecognizeRequest objects
        def request_generator():
            # First request to configure the API
            yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)
            
            # Subsequent requests with audio data
            for chunk in audio_generator():
                yield speech.StreamingRecognizeRequest(audio_content=chunk)
        
        # Process audio stream with Google Speech-to-Text
        responses = speech_client.streaming_recognize(request_generator())
        
        for response in responses:
            if not response.results:
                continue
                
            # Get the most likely transcript
            result = response.results[0]
            if not result.is_final:
                continue
                
            transcript = result.alternatives[0].transcript
            
            if transcript:
                print(f"Transcribed: {transcript}")
                
                # Process the transcript with AI
                if call_sid in conversations:
                    # Get the system instructions for this call
                    system_instructions = conversations[call_sid].get("system_instructions")
                    
                    # Process with AI
                    ai_response = process_with_ai_agent(transcript, system_instructions)
                    
                    # Convert AI response to speech
                    audio_content = text_to_speech(ai_response, call_sid)
                    
                    # Store in conversation history
                    if "history" not in conversations[call_sid]:
                        conversations[call_sid]["history"] = []
                        
                    conversations[call_sid]["history"].append({
                        "human": transcript,
                        "ai": ai_response,
                        "timestamp": time.time()
                    })
                    
                    # Send the audio to Twilio
                    conversations[call_sid]["current_response"] = ai_response
                    if audio_content:
                        conversations[call_sid]["current_audio"] = audio_content
            
    except google.api_core.exceptions.GoogleAPIError as e:
        print(f"Google Speech API error: {str(e)}")
    except Exception as e:
        print(f"Error in transcription: {str(e)}")

# ==================== AI RESPONSE GENERATION (GPT-3.5) ====================

def process_with_ai_agent(input_text, system_instructions=None):
    """
    Process input text with GPT-3.5 Turbo and return the AI's response
    
    Args:
        input_text: The text to process (from speech-to-text)
        system_instructions: Optional system instructions for the AI
        
    Returns:
        output_text: The AI's response text (to be sent to text-to-speech)
    """
    if not system_instructions:
        system_instructions = """
        You are an AI assistant on a phone call. Keep your responses concise, 
        conversational, and natural-sounding. Respond directly to the caller's 
        questions or statements. Avoid unnecessary explanations or verbose language.
        """
    
    try:
        # Create conversation history for context
        messages = [
            {"role": "system", "content": system_instructions},
            {"role": "user", "content": input_text}
        ]
        
        # Call the OpenAI API with GPT-3.5 Turbo
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # Using the fastest model for low latency
            messages=messages,
            temperature=0.7,
            max_tokens=150,  # Keeping responses shorter for faster TTS
            stream=False  # Set to True if implementing streaming
        )
        
        # Extract the response text
        output_text = response.choices[0].message['content'].strip()
        return output_text
        
    except Exception as e:
        print(f"Error processing with AI agent: {str(e)}")
        # Return a fallback response in case of error
        return "I'm sorry, I couldn't process that properly. Could you please repeat?"

# ==================== TEXT-TO-SPEECH (ELEVENLABS) ====================

def text_to_speech(text, call_sid=None):
    """
    Convert text to speech using ElevenLabs API
    
    Args:
        text: The text to convert to speech
        call_sid: Optional call SID for tracking
        
    Returns:
        audio_content: The generated audio content
    """
    try:
        # ElevenLabs API endpoint
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}/stream"
        
        # Request headers
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        # Request body
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }
        
        # Make the API call
        response = requests.post(url, json=data, headers=headers, stream=True)
        
        if response.status_code == 200:
            # Collect audio data
            audio_data = bytearray()
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    audio_data.extend(chunk)
            
            print(f"Generated {len(audio_data)} bytes of audio")
            return bytes(audio_data)
        else:
            print(f"Error from ElevenLabs API: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error in text-to-speech: {str(e)}")
        return None

# ==================== CALL HANDLING ENDPOINTS ====================

@app.post("/incoming-call")
async def handle_incoming_call(request: Request):
    """Handle incoming Twilio calls"""
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    
    # Initialize conversation state
    conversations[call_sid] = {
        "status": "in-progress",
        "system_instructions": """
        You are a helpful AI assistant on a phone call. Keep your responses concise,
        conversational, and natural-sounding. Your goal is to assist the caller
        with their questions or concerns.
        """,
        "start_time": time.time()
    }
    
    # Create TwiML response
    response = VoiceResponse()
    response.say("Hello! I'm your AI assistant. How can I help you today?")
    
    # Set up streaming
    response.connect().stream(url=f"{request.base_url}stream/{call_sid}")
    
    return Response(content=str(response), media_type="application/xml")

@app.post("/make-call")
async def make_outbound_call(call_request: CallRequest, request: Request):
    """Initiate an outbound call with Twilio"""
    try:
        # Create the call
        call = twilio_client.calls.create(
            to=call_request.phone_number,
            from_=TWILIO_PHONE_NUMBER,
            url=f"{request.base_url}outbound-call-handler",
            status_callback=f"{request.base_url}call-status"
        )
        
        call_sid = call.sid
        
        # Initialize conversation state
        conversations[call_sid] = {
            "status": "initiated",
            "system_instructions": call_request.system_instructions or """
            You are a helpful AI assistant on a phone call. Keep your responses concise,
            conversational, and natural-sounding. Your goal is to assist the caller
            with their questions or concerns.
            """,
            "start_time": time.time()
        }
        
        return CallResponse(call_sid=call_sid, status="initiated")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making call: {str(e)}")

@app.post("/outbound-call-handler")
async def handle_outbound_call(request: Request):
    """Handle the outbound call once it's answered"""
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    
    # Update conversation status
    if call_sid in conversations:
        conversations[call_sid]["status"] = "in-progress"
    
    # Create TwiML response
    response = VoiceResponse()
    response.say("Hello! This is an AI assistant calling. How can I help you today?")
    
    # Set up streaming
    response.connect().stream(url=f"{request.base_url}stream/{call_sid}")
    
    return Response(content=str(response), media_type="application/xml")

@app.post("/call-status")
async def handle_call_status(request: Request):
    """Handle Twilio call status callbacks"""
    try:
        # Get the raw body instead of parsing as form
        body = await request.body()
        body_str = body.decode('utf-8')
        
        # Parse the URL-encoded form data manually
        form_data = {}
        for pair in body_str.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                from urllib.parse import unquote_plus
                form_data[key] = unquote_plus(value)
        
        call_sid = form_data.get("CallSid")
        call_status = form_data.get("CallStatus")
        
        if call_sid in conversations:
            conversations[call_sid]["status"] = call_status
            
            # Clean up completed calls after some time
            if call_status in ["completed", "failed", "busy", "no-answer", "canceled"]:
                # In a production app, you might want to store the conversation in a database
                # before removing it from memory
                pass
        
        return JSONResponse({"status": "success"})
    except Exception as e:
        print(f"Error handling call status: {str(e)}")
        return JSONResponse({"status": "error", "message": str(e)})

# ==================== AUDIO STREAMING ENDPOINTS ====================

@app.websocket("/stream/{call_sid}")
async def stream_endpoint(websocket: WebSocket, call_sid: str):
    """
    Handle bi-directional audio streaming with Twilio
    """
    print(f"WebSocket connection established for call {call_sid}")
    await websocket.accept()
    
    if call_sid not in conversations:
        conversations[call_sid] = {
            "status": "in-progress",
            "state": "LISTENING",
            "start_time": time.time()
        }
    
    # Set a flag to track if this is the first response
    conversations[call_sid]["first_response_sent"] = False
    
    try:
        # Create a simple event to signal when to end
        end_event = asyncio.Event()
        
        # Set up concurrent tasks
        receive_task = asyncio.create_task(receive_audio(websocket, call_sid, end_event))
        send_task = asyncio.create_task(send_audio(websocket, call_sid, end_event))
        heartbeat_task = asyncio.create_task(send_heartbeat(websocket, call_sid, end_event))
        
        # Wait for any task to complete or the end event to be set
        done, pending = await asyncio.wait(
            [receive_task, send_task, heartbeat_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Set the end event to signal other tasks to finish
        end_event.set()
        
        # Wait for remaining tasks to complete with a timeout
        await asyncio.wait(pending, timeout=5.0)
        
        # Cancel any tasks that are still running
        for task in pending:
            if not task.done():
                task.cancel()
                
        print(f"WebSocket connection closing for call {call_sid}")
            
    except Exception as e:
        print(f"Error in stream_endpoint: {str(e)}")
    finally:
        print(f"WebSocket connection closed for call {call_sid}")
        if websocket.client_state != websocket.client_state.DISCONNECTED:
            await websocket.close()

async def send_heartbeat(websocket: WebSocket, call_sid: str, end_event: asyncio.Event):
    """Send periodic heartbeats to keep the connection alive"""
    try:
        while not end_event.is_set():
            try:
                # Send a minimal heartbeat every 5 seconds
                await websocket.send_bytes(b'\x00')
                print(f"Heartbeat sent for call {call_sid}")
            except Exception as e:
                print(f"Error sending heartbeat: {str(e)}")
                # If we can't send a heartbeat, the connection might be dead
                end_event.set()
                break
                
            # Wait for 5 seconds or until the end event is set
            try:
                await asyncio.wait_for(end_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                # Timeout is expected, just continue
                pass
    except Exception as e:
        print(f"Error in heartbeat task: {str(e)}")
        end_event.set()

async def send_audio(websocket: WebSocket, call_sid: str, end_event: asyncio.Event):
    """Send AI-generated audio back to Twilio"""
    try:
        while not end_event.is_set():
            # Check if there's a new response to send
            if (call_sid in conversations and 
                "current_audio" in conversations[call_sid] and
                conversations[call_sid].get("current_audio") is not None):
                
                audio_data = conversations[call_sid]["current_audio"]
                
                # Log that we're about to send audio
                print(f"Sending {len(audio_data)} bytes of audio for call {call_sid}")
                
                try:
                    # Send the audio in chunks
                    chunk_size = 1024
                    for i in range(0, len(audio_data), chunk_size):
                        if end_event.is_set():
                            break
                            
                        chunk = audio_data[i:i+chunk_size]
                        await websocket.send_bytes(chunk)
                        
                        # Small delay between chunks to avoid overwhelming the connection
                        await asyncio.sleep(0.01)
                    
                    # Mark that we've sent at least one response
                    conversations[call_sid]["first_response_sent"] = True
                    print(f"Audio sent successfully for call {call_sid}")
                    
                except Exception as e:
                    print(f"Error sending audio: {str(e)}")
                    end_event.set()
                    break
                
                # Clear the current audio
                conversations[call_sid]["current_audio"] = None
                
                # Go back to listening state
                conversations[call_sid]["state"] = "LISTENING"
                print(f"Now listening again for call {call_sid}")
            
            # Sleep briefly to avoid tight looping
            await asyncio.sleep(0.1)
            
    except Exception as e:
        print(f"Error in send_audio: {str(e)}")
        end_event.set()

async def receive_audio(websocket: WebSocket, call_sid: str, end_event: asyncio.Event):
    """Receive audio from Twilio and process it with end-of-speech detection"""
    try:
        # Create a buffer for audio chunks
        audio_buffer = []
        
        # Speech detection parameters
        silence_threshold = 500
        min_speech_duration = 5
        end_of_speech_silence = 15
        
        # State tracking
        is_speaking = False
        speech_chunks = 0
        silence_chunks = 0
        last_activity_time = time.time()
        
        # Process incoming audio
        while not end_event.is_set():
            try:
                # Use a timeout to prevent blocking forever
                message = await asyncio.wait_for(websocket.receive_bytes(), timeout=1.0)
                last_activity_time = time.time()
                
                # Add chunk to buffer
                audio_buffer.append(message)
                
                # Voice activity detection
                audio_energy = sum(abs(b) for b in message) / len(message)
                is_silent = audio_energy < silence_threshold
                
                # State machine for speech detection
                if not is_silent:  # Speech detected
                    silence_chunks = 0
                    if not is_speaking:
                        speech_chunks += 1
                        if speech_chunks >= min_speech_duration:
                            is_speaking = True
                            print(f"User started speaking in call {call_sid}")
                else:  # Silence detected
                    if is_speaking:
                        silence_chunks += 1
                        if silence_chunks >= end_of_speech_silence:
                            is_speaking = False
                            speech_chunks = 0
                            
                            print(f"User finished speaking in call {call_sid}, processing speech...")
                            
                            # Process the complete utterance
                            utterance_buffer = audio_buffer.copy()
                            audio_buffer = []  # Clear buffer for next utterance
                            
                            # Process speech in a separate task
                            asyncio.create_task(
                                process_complete_utterance(utterance_buffer, call_sid)
                            )
                    else:
                        speech_chunks = 0
                
                # Prevent buffer from growing too large
                if not is_speaking and len(audio_buffer) > 100:
                    audio_buffer = audio_buffer[-50:]
                    
            except asyncio.TimeoutError:
                # Check for inactivity timeout (30 seconds)
                if time.time() - last_activity_time > 30:
                    print(f"Inactivity timeout for call {call_sid}")
                    end_event.set()
                    break
                continue
                
            except Exception as e:
                print(f"Error receiving audio: {str(e)}")
                end_event.set()
                break
                
    except Exception as e:
        print(f"Error in receive_audio: {str(e)}")
        end_event.set()

async def process_complete_utterance(audio_buffer, call_sid):
    """Process a complete utterance after end-of-speech is detected"""
    try:
        # Only process if we're in LISTENING state
        if call_sid not in conversations:
            return
            
        current_state = conversations[call_sid].get("state", "LISTENING")
        if current_state != "LISTENING":
            print(f"Skipping processing - already in {current_state} state for call {call_sid}")
            return
            
        # Update state
        conversations[call_sid]["state"] = "PROCESSING"
        
        # Transcribe the complete utterance
        transcript = await transcribe_audio(audio_buffer, call_sid)
        
        if transcript and transcript.strip():
            print(f"Transcribed for call {call_sid}: {transcript}")
            
            # Get the system instructions
            system_instructions = conversations[call_sid].get("system_instructions")
            
            # Process with AI
            ai_response = process_with_ai_agent(transcript, system_instructions)
            print(f"AI response for call {call_sid}: {ai_response}")
            
            # Convert AI response to speech
            audio_content = text_to_speech(ai_response, call_sid)
            
            if audio_content:
                print(f"Generated {len(audio_content)} bytes of audio for call {call_sid}")
                
                # Store in conversation history
                if "history" not in conversations[call_sid]:
                    conversations[call_sid]["history"] = []
                    
                conversations[call_sid]["history"].append({
                    "human": transcript,
                    "ai": ai_response,
                    "timestamp": time.time()
                })
                
                # Queue the audio for sending
                conversations[call_sid]["current_response"] = ai_response
                conversations[call_sid]["current_audio"] = audio_content
                conversations[call_sid]["state"] = "RESPONDING"
            else:
                print(f"Failed to generate audio for call {call_sid}")
                conversations[call_sid]["state"] = "LISTENING"
        else:
            print(f"No valid transcript for call {call_sid}")
            conversations[call_sid]["state"] = "LISTENING"
                
    except Exception as e:
        print(f"Error processing utterance for call {call_sid}: {str(e)}")
        if call_sid in conversations:
            conversations[call_sid]["state"] = "LISTENING"

async def transcribe_audio(audio_buffer, call_sid):
    """Transcribe a complete audio utterance using Google Speech-to-Text"""
    try:
        # Configure speech recognition
        config = RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.MULAW,
            sample_rate_hertz=8000,
            language_code="en-US",
            enable_automatic_punctuation=True,
            model="phone_call",
            use_enhanced=True,
        )
        
        # Concatenate all audio chunks
        audio_content = b''.join(audio_buffer)
        
        # Create audio object
        audio = speech.RecognitionAudio(content=audio_content)
        
        # Perform synchronous speech recognition
        response = speech_client.recognize(config=config, audio=audio)
        
        # Extract transcript
        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript
            
        return transcript
        
    except Exception as e:
        print(f"Error in transcription: {str(e)}")
        return ""

# ==================== UTILITY ENDPOINTS ====================

@app.get("/calls/{call_sid}")
async def get_call_info(call_sid: str):
    """Get information about a specific call"""
    if call_sid not in conversations:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Return call information (excluding binary audio data)
    call_info = {k: v for k, v in conversations[call_sid].items() if k != "current_audio"}
    return call_info

@app.delete("/calls/{call_sid}")
async def end_call(call_sid: str):
    """End an ongoing call"""
    if call_sid not in conversations:
        raise HTTPException(status_code=404, detail="Call not found")
    
    try:
        # End the call via Twilio API
        twilio_client.calls(call_sid).update(status="completed")
        conversations[call_sid]["status"] = "ended"
        return {"status": "success", "message": "Call ended"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ending call: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": time.time()}

# ==================== MAIN APPLICATION ====================

if __name__ == "__main__":
    # Run the FastAPI app with uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
