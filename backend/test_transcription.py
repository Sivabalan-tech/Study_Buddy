#!/usr/bin/env python3
"""
Test script to verify transcription service functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.transcription_service import TranscriptionService

def test_transcription_service():
    """Test the transcription service with a simple audio sample"""
    print("🧪 Testing Transcription Service...")
    
    # Initialize the service
    service = TranscriptionService()
    
    # Test with a very small base64 audio sample (this will likely fail but show us the process)
    # This is just to test the service structure
    test_audio_data = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="  # Very small audio sample
    test_format = "webm"
    
    try:
        print("🔊 Testing with sample audio data...")
        result = service._transcribe_audio(test_audio_data, test_format)
        print(f"📝 Transcription result: {result}")
        
        # Check if it's a fallback message
        is_fallback = service._is_fallback_message(result)
        print(f"⚠️ Is fallback message: {is_fallback}")
        
        if not is_fallback:
            is_valid = service._is_valid_transcription(result)
            print(f"✅ Is valid transcription: {is_valid}")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_transcription_service()
