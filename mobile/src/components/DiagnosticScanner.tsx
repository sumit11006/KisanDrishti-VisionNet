import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Types
interface DiagnosticResult {
  diseaseName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  treatment: {
    organic: string[];
    chemical: string[];
  };
}

export default function DiagnosticScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical'>('organic');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  const cameraRef = useRef<any>(null);
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo.uri);
    }
  };

  const retakePicture = () => {
    setPhotoUri(null);
    setResult(null);
  };

  const uploadAndDiagnose = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate wasm compression and upload
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      setIsUploading(false);
      setResult({
        diseaseName: 'Tomato Late Blight',
        confidence: 0.95,
        severity: 'high',
        symptoms: ['Dark brown spots on leaves', 'White fuzzy growth on undersides', 'Rotten fruit'],
        treatment: {
          organic: ['Remove and destroy infected plants', 'Apply copper-based fungicide', 'Ensure good air circulation'],
          chemical: ['Apply Chlorothalonil', 'Apply Mancozeb', 'Follow label instructions carefully'],
        }
      });
    }, 2500);
  };

  const [selectedCropSample, setSelectedCropSample] = useState<string>('Tomato');

  const SAMPLE_CROPS = [
    { name: 'Tomato (Late Blight)', type: 'Tomato', img: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400' },
    { name: 'Wheat (Rust)', type: 'Wheat', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400' },
    { name: 'Rice (Blast)', type: 'Rice', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
  ];

  const renderConfidenceBadge = (confidence: number, severity: string) => {
    const color = severity === 'high' ? '#f44336' : severity === 'medium' ? '#ff9800' : '#4caf50';
    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{(confidence * 100).toFixed(0)}% Match - {severity.toUpperCase()} RISK</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <ScrollView contentContainerStyle={styles.scannerPrompt}>
          <View style={styles.scannerHeader}>
            <Icon name="camera-iris" size={48} color="#2E7D32" />
            <Text style={styles.scannerTitle}>Multimodal AI Crop Scanner</Text>
            <Text style={styles.scannerSubtitle}>Powered by Gemini 1.5 Pro & BRICS Pathogen Database</Text>
          </View>

          <View style={styles.sampleSection}>
            <Text style={styles.sampleSectionTitle}>Select a Sample Crop to Diagnose:</Text>
            <View style={styles.sampleRow}>
              {SAMPLE_CROPS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.sampleCard}
                  onPress={() => {
                    setPhotoUri(sample.img);
                    setSelectedCropSample(sample.type);
                  }}
                >
                  <Image source={{ uri: sample.img }} style={styles.sampleImage} />
                  <Text style={styles.sampleText}>{sample.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.uploadBox}>
            <Icon name="cloud-upload-outline" size={36} color="#4CAF50" />
            <Text style={styles.uploadBoxTitle}>Or Upload from Your Field</Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { marginTop: 12 }]}
              onPress={() => {
                setPhotoUri(SAMPLE_CROPS[0].img);
              }}
            >
              <Text style={styles.buttonTextLight}>Choose Photo / Capture</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.resultContainer}>
          <Image source={{ uri: photoUri }} style={[styles.previewImage, isTablet && styles.previewImageTablet]} />
          
          {!result && !isUploading && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.button} onPress={retakePicture}>
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={uploadAndDiagnose}>
                <Text style={styles.buttonTextLight}>Analyze with Gemini</Text>
              </TouchableOpacity>
            </View>
          )}

          {isUploading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Analyzing... {uploadProgress}%</Text>
              <Text style={styles.subLoadingText}>Compressing image (WebP via Wasm)</Text>
            </View>
          )}

          {result && (
            <View style={styles.diagnosisCard}>
              <View style={styles.headerRow}>
                <Text style={styles.diseaseTitle}>{result.diseaseName}</Text>
                <TouchableOpacity onPress={() => Alert.alert('Voice Advisory', 'Playing diagnosis advisory...')}>
                  <Icon name="volume-high" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
              {renderConfidenceBadge(result.confidence, result.severity)}

              <Text style={styles.sectionTitle}>Symptoms</Text>
              {result.symptoms.map((sym, idx) => (
                <Text key={idx} style={styles.listItem}>• {sym}</Text>
              ))}

              <Text style={styles.sectionTitle}>Treatment Plan</Text>
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'organic' && styles.activeTab]} 
                  onPress={() => setActiveTab('organic')}
                >
                  <Text style={[styles.tabText, activeTab === 'organic' && styles.activeTabText]}>Organic</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'chemical' && styles.activeTab]} 
                  onPress={() => setActiveTab('chemical')}
                >
                  <Text style={[styles.tabText, activeTab === 'chemical' && styles.activeTabText]}>Chemical</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.treatmentList}>
                {result.treatment[activeTab].map((step, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.accordion}
                    onPress={() => setExpandedStep(expandedStep === idx ? null : idx)}
                  >
                    <View style={styles.accordionHeader}>
                      <Text style={styles.stepTitle}>Step {idx + 1}</Text>
                      <Icon name={expandedStep === idx ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                    </View>
                    {expandedStep === idx && <Text style={styles.stepContent}>{step}</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.miniMapContainer}>
                <Text style={styles.sectionTitle}>Micro-climate Risk Alerts</Text>
                <View style={styles.alertRow}>
                   <Icon name="weather-partly-snowy" size={30} color="#00BCD4" />
                   <Icon name="weather-sunny-alert" size={30} color="#FF9800" />
                   <Icon name="bug" size={30} color="#E91E63" />
                </View>
              </View>

              <TouchableOpacity style={styles.button} onPress={retakePicture}>
                <Text style={styles.buttonText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Offline Queue Indicator */}
      {offlineQueueCount > 0 && (
        <View style={styles.queueIndicator}>
          <Icon name="cloud-off-outline" size={16} color="#fff" />
          <Text style={styles.queueText}>{offlineQueueCount} pending uploads</Text>
        </View>
      )}

      {/* Floating Voice Input Button */}
      {!result && !isUploading && (
        <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Voice Input', 'Describe symptoms...')}>
          <Icon name="microphone" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F8E9',
  },
  scannerPrompt: {
    padding: 20,
    alignItems: 'center',
  },
  scannerHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  scannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 8,
  },
  scannerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  sampleSection: {
    width: '100%',
    marginBottom: 24,
  },
  sampleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sampleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  sampleImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  uploadBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#A5D6A7',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
    marginTop: 8,
  },
  cameraTablet: {
    flex: 0.8,
    alignSelf: 'center',
    width: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 20,
  },
  cameraControls: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#F1F8E9',
  },
  previewImage: {
    width: '100%',
    height: 300,
  },
  previewImageTablet: {
    height: 500,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextLight: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
  },
  subLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  diagnosisCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diseaseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  listItem: {
    fontSize: 15,
    color: '#555',
    marginLeft: 8,
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 15,
    color: '#555',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  treatmentList: {
    marginBottom: 16,
  },
  accordion: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontWeight: '600',
    color: '#333',
  },
  stepContent: {
    marginTop: 8,
    color: '#555',
  },
  miniMapContainer: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  queueIndicator: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  queueText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  }
});
