/**
 * Audio Recorder Module
 * Handles audio recording, visualization, and processing for communication skills assessment
 */

class AudioRecorder {
    constructor(options = {}) {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.animationId = null;
        this.isRecording = false;
        this.hasPermission = null;
        this.onStateChange = options.onStateChange || (() => {});
        this.onAudioData = options.onAudioData || (() => {});
        this.onError = options.onError || (() => {});
        this.onVisualizationUpdate = options.onVisualizationUpdate || (() => {});
        
        this.initializeAudioContext();
    }

    /**
     * Initialize Web Audio API context
     */
    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        } catch (error) {
            console.error('Error initializing audio context:', error);
            this.onError('Audio context not supported in this browser');
        }
    }

    /**
     * Request microphone permission and initialize recording
     */
    async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });
            
            this.hasPermission = true;
            this.setupAudioProcessing(stream);
            this.onStateChange('permission_granted');
            return true;
            
        } catch (error) {
            console.error('Error requesting microphone permission:', error);
            this.hasPermission = false;
            this.onError('Microphone permission denied or not available');
            this.onStateChange('permission_denied');
            return false;
        }
    }

    /**
     * Setup audio processing pipeline
     */
    setupAudioProcessing(stream) {
        try {
            // Setup media recorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.getSupportedMimeType()
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processAudioData();
            };
            
            // Setup audio visualization
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
        } catch (error) {
            console.error('Error setting up audio processing:', error);
            this.onError('Failed to setup audio processing');
        }
    }

    /**
     * Get supported MIME type for audio recording
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/wav',
            'audio/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return 'audio/webm'; // Fallback
    }

    /**
     * Start recording audio
     */
    startRecording() {
        if (!this.hasPermission) {
            this.onError('Microphone permission not granted');
            return false;
        }
        
        if (this.isRecording) {
            console.warn('Already recording');
            return false;
        }
        
        try {
            this.audioChunks = [];
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            this.startVisualization();
            this.onStateChange('recording');
            return true;
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.onError('Failed to start recording');
            return false;
        }
    }

    /**
     * Stop recording audio
     */
    stopRecording() {
        if (!this.isRecording) {
            console.warn('Not recording');
            return false;
        }
        
        try {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopVisualization();
            this.onStateChange('stopped');
            return true;
            
        } catch (error) {
            console.error('Error stopping recording:', error);
            this.onError('Failed to stop recording');
            return false;
        }
    }

    /**
     * Start audio visualization
     */
    startVisualization() {
        const updateVisualization = () => {
            if (!this.isRecording) return;
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average volume
            const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
            
            // Normalize to 0-100 scale
            const normalizedVolume = Math.min(100, (average / 128) * 100);
            
            this.onVisualizationUpdate({
                volume: normalizedVolume,
                frequencyData: Array.from(this.dataArray)
            });
            
            this.animationId = requestAnimationFrame(updateVisualization);
        };
        
        updateVisualization();
    }

    /**
     * Stop audio visualization
     */
    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Process recorded audio data
     */
    async processAudioData() {
        try {
            const audioBlob = new Blob(this.audioChunks, { 
                type: this.mediaRecorder.mimeType 
            });
            
            // Convert to base64 for API submission
            const base64Audio = await this.blobToBase64(audioBlob);
            
            const audioData = {
                blob: audioBlob,
                base64: base64Audio,
                format: this.mediaRecorder.mimeType,
                duration: await this.getAudioDuration(audioBlob),
                size: audioBlob.size
            };
            
            this.onAudioData(audioData);
            this.onStateChange('processed');
            
        } catch (error) {
            console.error('Error processing audio data:', error);
            this.onError('Failed to process audio data');
        }
    }

    /**
     * Convert blob to base64
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data URL prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Get audio duration from blob
     */
    async getAudioDuration(blob) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            audio.addEventListener('error', () => {
                resolve(0); // Fallback duration
            });
            audio.src = URL.createObjectURL(blob);
        });
    }

    /**
     * Get current recording state
     */
    getState() {
        return {
            isRecording: this.isRecording,
            hasPermission: this.hasPermission,
            audioContextReady: this.audioContext?.state === 'running'
        };
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopRecording();
        this.stopVisualization();
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.audioChunks = [];
        this.hasPermission = null;
    }

    /**
     * Check browser compatibility
     */
    static checkBrowserCompatibility() {
        const compatibility = {
            mediaRecorder: typeof MediaRecorder !== 'undefined',
            audioContext: typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined',
            getUserMedia: typeof navigator?.mediaDevices?.getUserMedia !== 'undefined',
            fileReader: typeof FileReader !== 'undefined',
            blob: typeof Blob !== 'undefined'
        };
        
        compatibility.isCompatible = Object.values(compatibility).every(Boolean);
        
        return compatibility;
    }
}

// Export for use in other modules
export { AudioRecorder };

// Also export as default for compatibility
export default AudioRecorder;