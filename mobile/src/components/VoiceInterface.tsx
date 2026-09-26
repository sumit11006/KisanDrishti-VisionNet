import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu',
  'Gujarati', 'Malayalam', 'Kannada', 'Odia', 'Punjabi', 'Assamese',
  'Maithili', 'Sanskrit', 'Santali', 'Kashmiri', 'Nepali', 'Sindhi',
  'Dogri', 'Konkani', 'Manipuri', 'Bodo'
];

export default function VoiceInterface() {
  const [selectedLang, setSelectedLang] = useState('Hindi');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTranscription('');
      // Simulate real-time transcription
      let mockText = 'आपकी फसल में नाइट्रोजन की कमी दिख रही है।';
      let i = 0;
      const interval = setInterval(() => {
        setTranscription(mockText.substring(0, i));
        i++;
        if (i > mockText.length) {
          clearInterval(interval);
          setIsRecording(false);
        }
      }, 100);
    } else {
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container} accessible={true}>
      <Text style={styles.title} accessibilityRole="header">Voice Advisory Interface</Text>
      
      <View style={styles.langSelector}>
        <Text style={styles.label}>Language: </Text>
        <Picker
          selectedValue={selectedLang}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedLang(itemValue)}
          accessibilityLabel="Select Language"
        >
          {LANGUAGES.map(lang => (
            <Picker.Item key={lang} label={lang} value={lang} />
          ))}
        </Picker>
      </View>

      <View style={styles.recordingArea}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
        <TouchableOpacity 
          style={[styles.micButton, isRecording && styles.micButtonRecording]} 
          onPress={toggleRecording}
          accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
          accessibilityHint="Hold to speak your agricultural query"
        >
          <Icon name={isRecording ? "stop" : "microphone"} size={40} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {isRecording && <Text style={styles.recordingStatus}>Listening... (Auto-detecting)</Text>}

      <ScrollView style={styles.transcriptionBox}>
        <Text style={styles.transcriptionText}>
          {transcription || 'Tap the microphone to speak...'}
        </Text>
      </ScrollView>

      {transcription.length > 0 && (
        <View style={styles.playbackControls}>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback} accessibilityLabel="Play audio response">
            <Icon name={isPlaying ? "pause" : "play"} size={24} color="#4CAF50" />
            <Text style={styles.playText}>{isPlaying ? "Pause" : "Play Advisory"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="speedometer" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  picker: {
    flex: 1,
    height: 50,
  },
  recordingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    marginBottom: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  micButtonRecording: {
    backgroundColor: '#F44336',
  },
  recordingStatus: {
    textAlign: 'center',
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transcriptionBox: {
    flex: 1,
    backgroundColor: '#F1F8E9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  transcriptionText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 10,
  },
  playText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  }
});
