import base64
import json
import random
import re
import io
from datetime import datetime
from typing import Dict, Any, Optional
import speech_recognition as sr
from pydub import AudioSegment
from models.transcription_models import (
    TranscriptionEvaluationInput, 
    TranscriptionEvaluationOutput,
    CommunicationHistoryInput,
    CommunicationHistoryOutput
)

class TranscriptionService:
    def __init__(self):
        # Initialize any required dependencies here
        pass
    
    async def evaluate_transcription(self, input_data: TranscriptionEvaluationInput) -> TranscriptionEvaluationOutput:
        """
        Evaluate audio transcription and provide communication analysis
        """
        try:
            # Use speech recognition to transcribe audio
            transcription = self._transcribe_audio(input_data.audioData, input_data.format)
            
            # Analyze the transcription for communication skills
            analysis_results = self._analyze_communication_skills(transcription)
            
            return TranscriptionEvaluationOutput(
                transcription=transcription,
                clarity=analysis_results["clarity"],
                confidence=analysis_results["confidence"],
                articulation=analysis_results["articulation"],
                feedback=analysis_results["feedback"],
                suggestions=analysis_results["suggestions"],
                analysis=analysis_results["detailed_analysis"]
            )
            
        except Exception as e:
            # If anything fails, provide a fallback response
            return TranscriptionEvaluationOutput(
                transcription="Unable to transcribe audio. Please try again.",
                clarity=50,
                confidence=50,
                articulation=50,
                feedback="There was an error processing your audio. Please check your microphone and try again.",
                suggestions="Ensure your microphone is working properly and you're speaking clearly.",
                analysis={"error": str(e)}
            )
    
    def _transcribe_audio(self, audio_data: str, audio_format: str = "webm") -> str:
        """
        Transcribe audio using SpeechRecognition library with enhanced audio quality handling
        """
        try:
            # Convert audio data to bytes
            audio_bytes = base64.b64decode(audio_data)
            
            print(f"🔊 Processing audio format: {audio_format}")
            print(f"📊 Audio data size: {len(audio_bytes)} bytes")
            
            # Check if audio data is too small (likely empty or corrupted)
            if len(audio_bytes) < 1000:  # Less than 1KB is suspicious
                print(f"⚠️ Audio data too small: {len(audio_bytes)} bytes")
                return "Audio recording appears to be empty or too short. Please ensure you speak for at least 2-3 seconds."
            
            # Initialize speech recognition
            r = sr.Recognizer()
            
            # Configure recognizer for better sensitivity
            r.energy_threshold = 300  # Lower threshold for quieter speech
            r.dynamic_energy_threshold = True
            r.pause_threshold = 0.8  # Shorter pause threshold
            
            # Clean format string
            clean_format = audio_format.split(';')[0].split('/')[1] if '/' in audio_format else audio_format.split(';')[0]
            print(f"🎵 Clean audio format: {clean_format}")
            
            # Try to process audio with multiple methods
            transcription = self._process_audio_with_multiple_methods(audio_bytes, clean_format, r)
            
            return transcription
                
        except Exception as e:
            print(f"❌ Error in audio transcription: {e}")
            return f"Error processing audio: {str(e)}"
    
    def _process_audio_with_multiple_methods(self, audio_bytes, clean_format, recognizer):
        """
        Try multiple methods to process and transcribe audio
        """
        temp_files = []
        
        try:
            # Method 1: Direct processing with conversion
            transcription = self._try_direct_processing(audio_bytes, clean_format, recognizer, temp_files)
            if transcription and not self._is_fallback_message(transcription):
                return transcription
            
            # Method 2: Enhanced audio processing
            transcription = self._try_enhanced_processing(audio_bytes, clean_format, recognizer, temp_files)
            if transcription and not self._is_fallback_message(transcription):
                return transcription
            
            # Method 3: Simple fallback
            transcription = self._try_simple_fallback(audio_bytes, recognizer)
            if transcription and not self._is_fallback_message(transcription):
                return transcription
            
            # If all methods fail, return the fallback message
            return "I couldn't understand what you said. Please try again with these tips:\n\n1. **Speak clearly and at a normal pace** - Not too fast, not too slow\n2. **Reduce background noise** - Move to a quieter room if possible\n3. **Get closer to the microphone** - About 6-12 inches away\n4. **Speak for 3-5 seconds** - Longer recordings work better\n5. **Try simple sentences** like 'Hello, my name is John and I like programming'\n\nClick the record button and try again!"
            
        finally:
            # Clean up temporary files
            import os
            for filename in temp_files:
                try:
                    if os.path.exists(filename):
                        os.remove(filename)
                        print(f"🧹 Cleaned up: {filename}")
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to cleanup {filename}: {cleanup_error}")
    
    def _try_direct_processing(self, audio_bytes, clean_format, recognizer, temp_files):
        """
        Try direct audio processing with format conversion
        """
        try:
            print("🔄 Method 1: Direct processing with conversion")
            
            # Create a temporary file with the original audio data
            temp_filename = f"temp_audio_{clean_format}.{clean_format}"
            temp_files.append(temp_filename)
            
            with open(temp_filename, "wb") as f:
                f.write(audio_bytes)
            
            print(f"✅ Audio saved as: {temp_filename}")
            
            # For webm/ogg formats, try to convert to WAV using pydub (if ffmpeg is available)
            if clean_format.lower() in ['webm', 'ogg', 'mp4']:
                try:
                    print(f"🔄 Converting {clean_format} to WAV...")
                    
                    # Test if ffmpeg is available
                    import subprocess
                    try:
                        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
                        print("✅ ffmpeg is available")
                        
                        # Load the audio file
                        audio = AudioSegment.from_file(temp_filename, format=clean_format)
                        
                        # Export as WAV
                        wav_filename = f"temp_converted_{clean_format}.wav"
                        temp_files.append(wav_filename)
                        
                        audio.export(wav_filename, format="wav")
                        print(f"✅ Successfully converted to WAV: {wav_filename}")
                        
                        # Use the converted WAV file
                        temp_filename = wav_filename
                        clean_format = "wav"
                        
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        print("⚠️ ffmpeg not available, trying direct processing without conversion")
                        # Continue with original format
                    except Exception as conversion_error:
                        print(f"⚠️ Conversion failed: {conversion_error}")
                        # Continue with original format
                        
                except ImportError:
                    print("⚠️ pydub not available, trying direct processing")
                except Exception as conversion_error:
                    print(f"⚠️ Conversion setup failed: {conversion_error}")
                    # Continue with original format
            
            # Try to get audio info and transcribe
            try:
                with sr.AudioFile(temp_filename) as source:
                    print(f"📈 Audio sample rate: {source.SAMPLE_RATE}")
                    print(f"📈 Audio channels: {source.CHANNELS}")
                    
                    # Adjust for ambient noise
                    recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    
                    # Record the audio
                    audio_recorded = recognizer.record(source)
                    
                    # Calculate duration
                    duration = len(audio_recorded.frame_data) / (source.SAMPLE_RATE * source.SAMPLE_WIDTH * source.CHANNELS)
                    print(f"📊 Audio duration: {duration:.2f} seconds")
                    
                    # Check if duration is too short
                    if duration < 1.0:
                        return f"Audio recording is too short ({duration:.1f} seconds). Please speak for at least 2-3 seconds."
                    
                    # Try speech recognition
                    transcription = self._try_recognition_with_retries(recognizer, audio_recorded)
                    print(f"✅ Direct processing successful: '{transcription}'")
                    return transcription
                    
            except Exception as audio_error:
                print(f"⚠️ Audio processing failed: {audio_error}")
                # Try to create a simple WAV file as fallback
                return self._create_simple_wav_fallback(audio_bytes, recognizer, temp_files)
                
        except Exception as error:
            print(f"⚠️ Direct processing failed: {error}")
            return None
    
    def _create_simple_wav_fallback(self, audio_bytes, recognizer, temp_files):
        """
        Create a simple WAV file as fallback when direct processing fails
        """
        try:
            print("🔄 Creating simple WAV fallback...")
            
            wav_filename = "temp_simple_fallback.wav"
            temp_files.append(wav_filename)
            
            with open(wav_filename, "wb") as f:
                # Simple WAV header for 16kHz mono PCM
                sample_rate = 16000
                channels = 1
                bits_per_sample = 16
                
                # Calculate file sizes
                byte_rate = sample_rate * channels * bits_per_sample // 8
                block_align = channels * bits_per_sample // 8
                data_size = len(audio_bytes)
                file_size = 36 + data_size
                
                # Write WAV header
                f.write(b'RIFF')
                f.write(file_size.to_bytes(4, 'little'))
                f.write(b'WAVE')
                f.write(b'fmt ')
                f.write((16).to_bytes(4, 'little'))  # Subchunk1Size
                f.write((1).to_bytes(2, 'little'))   # AudioFormat (PCM)
                f.write(channels.to_bytes(2, 'little'))
                f.write(sample_rate.to_bytes(4, 'little'))
                f.write(byte_rate.to_bytes(4, 'little'))
                f.write(block_align.to_bytes(2, 'little'))
                f.write(bits_per_sample.to_bytes(2, 'little'))
                f.write(b'data')
                f.write(data_size.to_bytes(4, 'little'))
                f.write(audio_bytes)
            
            print(f"✅ Created simple WAV file: {wav_filename}")
            
            # Try to process the WAV file
            with sr.AudioFile(wav_filename) as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_recorded = recognizer.record(source)
            
            transcription = self._try_recognition_with_retries(recognizer, audio_recorded)
            print(f"✅ Simple WAV fallback successful: '{transcription}'")
            return transcription
            
        except Exception as error:
    
def _try_enhanced_processing(self, audio_bytes, clean_format, recognizer, temp_files):
"""
Try enhanced audio processing with pydub (if ffmpeg is available)
"""
try:
print(" Method 2: Enhanced audio processing")
            
# Check if ffmpeg is available
import subprocess
try:
subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
print(" ffmpeg is available for enhanced processing")
except (subprocess.CalledProcessError, FileNotFoundError):
print(" ffmpeg not available, skipping enhanced processing")
return None
            
# Create a temporary file
temp_filename = f"temp_enhanced_{clean_format}.{clean_format}"
temp_files.append(temp_filename)
                f.write(audio_bytes)
            
            # Load with pydub for enhancement
            audio = AudioSegment.from_file(temp_filename, format=clean_format)
            
            # Enhance audio quality
            print("🎚️ Enhancing audio quality...")
            
            # Increase volume if too quiet
            if audio.dBFS < -20:
                audio = audio + 6
                print("🔊 Increased audio volume")
            
            # Apply high-pass filter to reduce low-frequency noise
            audio = audio.high_pass_filter(200)
            print("🔇 Applied high-pass filter")
            
            # Export enhanced audio
            enhanced_filename = f"temp_enhanced_{clean_format}_enhanced.wav"
            temp_files.append(enhanced_filename)
            
            audio.export(enhanced_filename, format="wav")
            print(f"✅ Enhanced audio saved: {enhanced_filename}")
            
            # Try to transcribe enhanced audio
            with sr.AudioFile(enhanced_filename) as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_recorded = recognizer.record(source)
                
                transcription = self._try_recognition_with_retries(recognizer, audio_recorded)
                print(f"✅ Enhanced processing successful: '{transcription}'")
                return transcription
                
        except Exception as error:
            print(f"⚠️ Enhanced processing failed: {error}")
            return None
    
    def _try_simple_fallback(self, audio_bytes, recognizer):
        """
        Try simple fallback method
        """
        try:
            print("🔄 Method 3: Simple fallback")
            
            # Try to create a simple WAV file manually
            wav_path = "temp_simple_fallback.wav"
            
            with open(wav_path, "wb") as f:
                # Simple WAV header for 16kHz mono PCM
                sample_rate = 16000
                channels = 1
                bits_per_sample = 16
                
                # Calculate file sizes
                byte_rate = sample_rate * channels * bits_per_sample // 8
                block_align = channels * bits_per_sample // 8
                data_size = len(audio_bytes)
                file_size = 36 + data_size
                
                # Write WAV header
                f.write(b'RIFF')
                f.write(file_size.to_bytes(4, 'little'))
                f.write(b'WAVE')
                f.write(b'fmt ')
                f.write((16).to_bytes(4, 'little'))  # Subchunk1Size
                f.write((1).to_bytes(2, 'little'))   # AudioFormat (PCM)
                f.write(channels.to_bytes(2, 'little'))
                f.write(sample_rate.to_bytes(4, 'little'))
                f.write(byte_rate.to_bytes(4, 'little'))
                f.write(block_align.to_bytes(2, 'little'))
                f.write(bits_per_sample.to_bytes(2, 'little'))
                f.write(b'data')
                f.write(data_size.to_bytes(4, 'little'))
                f.write(audio_bytes)
            
            print(f"✅ Created simple WAV file: {wav_path}")
            
            # Try to process the WAV file
            with sr.AudioFile(wav_path) as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_recorded = recognizer.record(source)
            
            transcription = self._try_recognition_with_retries(recognizer, audio_recorded)
            print(f"✅ Simple fallback successful: '{transcription}'")
            
            # Clean up
            import os
            if os.path.exists(wav_path):
                os.remove(wav_path)
            
            return transcription
            
        except Exception as error:
            print(f"⚠️ Simple fallback failed: {error}")
            return None
    
    def _is_fallback_message(self, transcription):
        """
        Check if the transcription is a fallback message
        """
        fallback_patterns = [
            r"i couldn't understand what you said",
            r"please try again with these tips",
            r"audio recording appears to be empty",
            r"audio processing failed",
            r"could not understand audio",
            r"speech recognition service unavailable"
        ]
        
        return any(re.search(pattern, transcription.lower()) for pattern in fallback_patterns)
    
    def _try_recognition_with_retries(self, recognizer, audio_data) -> str:
        """
        Try speech recognition with multiple attempts and different methods
        """
        max_attempts = 3
        attempts = 0
        
        while attempts < max_attempts:
            try:
                print(f"🎤 Attempt {attempts + 1}/{max_attempts} - Google Speech Recognition...")
                
                # Try with different settings each attempt
                if attempts == 0:
                    # First attempt: standard
                    transcription = recognizer.recognize_google(audio_data)
                elif attempts == 1:
                    # Second attempt: with language hint and more sensitive settings
                    recognizer.energy_threshold = max(100, recognizer.energy_threshold - 50)
                    transcription = recognizer.recognize_google(audio_data, language="en-US")
                else:
                    # Third attempt: with show_all to get alternatives and even more sensitive
                    recognizer.energy_threshold = max(50, recognizer.energy_threshold - 30)
                    result = recognizer.recognize_google(audio_data, show_all=True)
                    if result and isinstance(result, list) and len(result) > 0:
                        transcription = result[0]['transcript']
                    else:
                        raise sr.UnknownValueError("No alternatives found")
                
                # Validate the transcription
                if self._is_valid_transcription(transcription):
                    print(f"✅ Google Speech Recognition successful: '{transcription}'")
                    return transcription
                else:
                    print(f"⚠️ Invalid transcription detected: '{transcription}'")
                    raise sr.UnknownValueError("Invalid transcription result")
                
            except sr.UnknownValueError:
                print(f"⚠️ Attempt {attempts + 1} failed: Could not understand audio")
                attempts += 1
                
                # Try to adjust audio settings between attempts
                if attempts < max_attempts:
                    print("🔧 Adjusting audio sensitivity...")
                    recognizer.energy_threshold = max(100, recognizer.energy_threshold - 50)
                    
            except sr.RequestError as e:
                print(f"⚠️ Google Speech Recognition request error: {e}")
                # For network errors, don't retry immediately
                return f"Speech recognition service unavailable. Please check your internet connection and try again. Error: {str(e)}"
                
            except Exception as e:
                print(f"❌ Unexpected recognition error: {e}")
                attempts += 1
        
        # If all attempts failed, try alternative recognition methods
        return self._try_alternative_recognition(recognizer, audio_data)
    
    def _is_valid_transcription(self, transcription):
        """
        Check if the transcription is valid (not just noise or fallback text)
        """
        if not transcription or not isinstance(transcription, str):
            return False
        
        # Remove extra whitespace and convert to lowercase
        cleaned = transcription.strip().lower()
        
        # Check if it's too short (likely just noise)
        if len(cleaned) < 2:
            return False
        
        # Check if it contains only random characters or numbers
        if re.match(r'^[^a-zA-Z]*$', cleaned):
            return False
        
        # Check if it's just repetitive characters
        if len(set(cleaned)) <= 2 and len(cleaned) > 5:
            return False
        
        # Check for common fallback patterns
        fallback_patterns = [
            r'^[^a-zA-Z]*$',  # No letters
            r'^[0-9\s\W]*$',  # Only numbers, spaces, and symbols
            r'^(.)\1{3,}$',  # Repeated single character
            r'^[aeiou\s]*$',  # Only vowels and spaces
        ]
        
        return not any(re.search(pattern, cleaned) for pattern in fallback_patterns)
    
    def _try_alternative_recognition(self, recognizer, audio_data) -> str:
        """
        Try alternative recognition methods when Google fails
        """
        try:
            print("🔄 Trying alternative recognition methods...")
            
            # Method 1: Try with different energy thresholds
            try:
                print("🔧 Trying with different energy thresholds...")
                original_threshold = recognizer.energy_threshold
                
                # Try with very low threshold
                recognizer.energy_threshold = 50
                transcription = recognizer.recognize_google(audio_data, language="en-US")
                
                if self._is_valid_transcription(transcription):
                    print(f"✅ Alternative recognition successful: '{transcription}'")
                    return transcription
                
                # Restore original threshold
                recognizer.energy_threshold = original_threshold
                
            except Exception as threshold_error:
                print(f"⚠️ Energy threshold adjustment failed: {threshold_error}")
            
            # Method 2: Try audio enhancement
            try:
                print("🎚️ Trying audio enhancement...")
                
                # Convert to AudioSegment for processing
                import io
                
                # Get raw audio data
                if hasattr(audio_data, 'get_raw_data'):
                    raw_data = audio_data.get_raw_data()
                else:
                    raw_data = audio_data.frame_data
                
                # Try to create a new audio segment with adjusted volume
                audio_segment = AudioSegment(
                    raw_data,
                    frame_rate=audio_data.sample_rate if hasattr(audio_data, 'sample_rate') else 16000,
                    sample_width=audio_data.sample_width if hasattr(audio_data, 'sample_width') else 2,
                    channels=audio_data.channel_count if hasattr(audio_data, 'channel_count') else 1
                )
                
                # Enhance audio
                audio_segment = audio_segment + 6  # Increase volume by 6dB
                audio_segment = audio_segment.high_pass_filter(300)  # Remove low-frequency noise
                
                # Export to bytes
                enhanced_audio_bytes = io.BytesIO()
                audio_segment.export(enhanced_audio_bytes, format="wav")
                enhanced_audio_bytes.seek(0)
                
                # Try recognition with enhanced audio
                with sr.AudioFile(enhanced_audio_bytes) as source:
                    enhanced_audio = recognizer.record(source)
                    
                transcription = recognizer.recognize_google(enhanced_audio, language="en-US")
                
                if self._is_valid_transcription(transcription):
                    print(f"✅ Enhanced recognition successful: '{transcription}'")
                    return transcription
                
            except Exception as enhance_error:
                print(f"⚠️ Audio enhancement failed: {enhance_error}")
            
            # Method 3: Try with different language settings
            try:
                print("🌍 Trying with different language settings...")
                
                # Try with different English variants
                for lang in ["en-GB", "en-AU", "en-IN"]:
                    try:
                        transcription = recognizer.recognize_google(audio_data, language=lang)
                        if self._is_valid_transcription(transcription):
                            print(f"✅ Recognition with {lang} successful: '{transcription}'")
                            return transcription
                    except:
                        continue
                        
            except Exception as lang_error:
                print(f"⚠️ Language variation attempts failed: {lang_error}")
                
        except Exception as e:
            print(f"❌ Alternative recognition failed: {e}")
        
        # If all alternative methods fail, return None to trigger fallback
        return None
    
    def _analyze_communication_skills(self, transcription: str) -> Dict[str, Any]:
        """
        Analyze transcription for communication skills
        """
        # Basic text analysis
        word_count = len(transcription.split())
        sentence_count = len(re.split(r'[.!?]+', transcription)) - 1
        avg_words_per_sentence = word_count / max(sentence_count, 1)
        
        # Check for communication keywords
        positive_keywords = [
            'effective', 'clear', 'good', 'excellent', 'confident', 'passionate',
            'important', 'essential', 'success', 'improve', 'better', 'understand'
        ]
        
        keyword_count = sum(1 for keyword in positive_keywords if keyword.lower() in transcription.lower())
        
        # Calculate scores based on analysis
        clarity_score = self._calculate_clarity_score(transcription, word_count, avg_words_per_sentence)
        confidence_score = self._calculate_confidence_score(transcription, keyword_count)
        articulation_score = self._calculate_articulation_score(transcription, word_count)
        
        # Generate feedback
        feedback = self._generate_feedback(clarity_score, confidence_score, articulation_score, transcription)
        suggestions = self._generate_suggestions(clarity_score, confidence_score, articulation_score)
        
        return {
            "clarity": clarity_score,
            "confidence": confidence_score,
            "articulation": articulation_score,
            "feedback": feedback,
            "suggestions": suggestions,
            "detailed_analysis": {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "avg_words_per_sentence": round(avg_words_per_sentence, 1),
                "keyword_count": keyword_count,
                "transcription_length": len(transcription)
            }
        }
    
    def _calculate_clarity_score(self, transcription: str, word_count: int, avg_words_per_sentence: float) -> int:
        """Calculate clarity score based on sentence structure and word choice"""
        base_score = 70
        
        # Bonus for good sentence length (not too short, not too long)
        if 10 <= avg_words_per_sentence <= 20:
            base_score += 10
        elif 5 <= avg_words_per_sentence <= 25:
            base_score += 5
        
        # Bonus for adequate word count
        if word_count >= 20:
            base_score += 10
        elif word_count >= 10:
            base_score += 5
        
        # Check for clarity indicators
        clarity_indicators = ['clear', 'understand', 'explain', 'simple', 'direct']
        clarity_bonus = sum(5 for indicator in clarity_indicators if indicator in transcription.lower())
        
        return min(100, base_score + clarity_bonus)
    
    def _calculate_confidence_score(self, transcription: str, keyword_count: int) -> int:
        """Calculate confidence score based on language and keywords"""
        base_score = 65
        
        # Bonus for positive keywords
        base_score += min(20, keyword_count * 3)
        
        # Check for confidence indicators
        confidence_indicators = ['believe', 'confident', 'excited', 'passionate', 'sure', 'certain']
        confidence_bonus = sum(5 for indicator in confidence_indicators if indicator in transcription.lower())
        
        # Check for hesitation words (reduces score)
        hesitation_words = ['um', 'uh', 'like', 'you know', 'actually', 'basically']
        hesitation_penalty = sum(3 for word in hesitation_words if word in transcription.lower())
        
        return max(0, min(100, base_score + confidence_bonus - hesitation_penalty))
    
    def _calculate_articulation_score(self, transcription: str, word_count: int) -> int:
        """Calculate articulation score based on vocabulary and structure"""
        base_score = 75
        
        # Bonus for varied vocabulary (simple check)
        unique_words = len(set(transcription.lower().split()))
        vocabulary_ratio = unique_words / max(word_count, 1)
        
        if vocabulary_ratio > 0.7:
            base_score += 15
        elif vocabulary_ratio > 0.6:
            base_score += 10
        elif vocabulary_ratio > 0.5:
            base_score += 5
        
        # Check for articulation indicators
        articulation_indicators = ['articulate', 'express', 'communicate', 'convey', 'present']
        articulation_bonus = sum(5 for indicator in articulation_indicators if indicator in transcription.lower())
        
        return min(100, base_score + articulation_bonus)
    
    def _generate_feedback(self, clarity: int, confidence: int, articulation: int, transcription: str) -> str:
        """Generate personalized feedback based on scores"""
        feedback_parts = []
        
        # Overall assessment
        average_score = (clarity + confidence + articulation) / 3
        
        if average_score >= 80:
            feedback_parts.append("Excellent communication skills! Your speech demonstrates strong clarity, confidence, and articulation.")
        elif average_score >= 70:
            feedback_parts.append("Good communication skills overall. You show solid fundamentals in your speech delivery.")
        elif average_score >= 60:
            feedback_parts.append("Your communication skills show potential. With some practice, you can improve significantly.")
        else:
            feedback_parts.append("There's room for improvement in your communication skills. Focus on the basics of clear speech.")
        
        # Specific feedback
        if clarity >= 80:
            feedback_parts.append("Your clarity is outstanding - you express ideas in a well-structured manner.")
        elif clarity >= 60:
            feedback_parts.append("Your clarity is good, though you could work on organizing your thoughts more cohesively.")
        else:
            feedback_parts.append("Focus on improving clarity by using simpler sentences and more direct language.")
        
        if confidence >= 80:
            feedback_parts.append("You speak with great confidence, which engages your audience effectively.")
        elif confidence >= 60:
            feedback_parts.append("Your confidence shows, but you could benefit from more assertive language.")
        else:
            feedback_parts.append("Work on building confidence through practice and positive self-talk.")
        
        if articulation >= 80:
            feedback_parts.append("Your articulation is excellent - you use varied vocabulary effectively.")
        elif articulation >= 60:
            feedback_parts.append("Good articulation, though expanding your vocabulary could enhance your speech.")
        else:
            feedback_parts.append("Focus on articulation by practicing with more diverse vocabulary and expressions.")
        
        return " ".join(feedback_parts)
    
    def _generate_suggestions(self, clarity: int, confidence: int, articulation: int) -> str:
        """Generate specific suggestions for improvement"""
        suggestions = []
        
        if clarity < 70:
            suggestions.append("• Practice organizing your thoughts before speaking")
            suggestions.append("• Use shorter, more direct sentences")
            suggestions.append("• Focus on one main idea at a time")
        
        if confidence < 70:
            suggestions.append("• Practice speaking in front of a mirror")
            suggestions.append("• Record yourself and review the playback")
            suggestions.append("• Start with smaller groups and gradually increase audience size")
        
        if articulation < 70:
            suggestions.append("• Read aloud regularly to improve pronunciation")
            suggestions.append("• Learn and use new words daily")
            suggestions.append("• Practice tongue twisters to improve dexterity")
        
        # General suggestions
        suggestions.append("• Seek feedback from others on your communication")
        suggestions.append("• Watch and learn from effective public speakers")
        suggestions.append("• Join a public speaking group or take a communication course")
        
        return "\n".join(suggestions)
    
    async def save_communication_history(self, input_data: CommunicationHistoryInput) -> CommunicationHistoryOutput:
        """
        Save communication evaluation history to database
        """
        try:
            # In a real implementation, you would save this to a database
            # For now, we'll simulate a successful save
            
            # Generate a unique ID for the history entry
            history_id = f"comm_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{input_data.student_register_number}"
            
            # Here you would typically save to a database like:
            # - MongoDB
            # - PostgreSQL
            # - MySQL
            # - Firebase
            
            # For demo purposes, we'll just log the data
            print(f"Saving communication history: {history_id}")
            print(f"Student: {input_data.student_register_number}")
            print(f"Scores - Clarity: {input_data.clarity}, Confidence: {input_data.confidence}, Articulation: {input_data.articulation}")
            
            return CommunicationHistoryOutput(
                success=True,
                message="Communication skills evaluation saved successfully!",
                history_id=history_id
            )
            
        except Exception as e:
            return CommunicationHistoryOutput(
                success=False,
                message=f"Failed to save communication history: {str(e)}",
                history_id=None
            )
