import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BRICSDataShareModal({ visible, onClose }: Props) {
  const [toggles, setToggles] = useState({
    pest: true,
    soil: true,
    crop: false,
    regen: true,
    climate: false,
  });
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles({ ...toggles, [key]: !toggles[key] });
  };

  const handleSubmit = () => {
    if (!consent) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }, 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {!success ? (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={styles.title}>BRICS AgriN Data Sharing</Text>
                <TouchableOpacity onPress={onClose}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.description}>
                Contribute your farm's anonymized data to the BRICS agricultural network. Help build global climate resilience and regenerative models across partner nations.
              </Text>

              <View style={styles.flagsContainer}>
                <Text style={styles.flag}>🇧🇷</Text>
                <Text style={styles.flag}>🇷🇺</Text>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.flag}>🇨🇳</Text>
                <Text style={styles.flag}>🇿🇦</Text>
                <Text style={styles.flag}>🇪🇹</Text>
                <Text style={styles.flag}>🇪🇬</Text>
                <Text style={styles.flag}>🇮🇷</Text>
                <Text style={styles.flag}>🇦🇪</Text>
              </View>

              <View style={styles.toggleGroup}>
                <Text style={styles.groupTitle}>Select Data to Share (Anonymized)</Text>
                
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Pest/Disease Observations</Text>
                  <Switch value={toggles.pest} onValueChange={() => handleToggle('pest')} trackColor={{ true: '#4CAF50' }} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Soil Health Baselines</Text>
                  <Switch value={toggles.soil} onValueChange={() => handleToggle('soil')} trackColor={{ true: '#4CAF50' }} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Crop Variety Performance</Text>
                  <Switch value={toggles.crop} onValueChange={() => handleToggle('crop')} trackColor={{ true: '#4CAF50' }} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Regenerative Practice Outcomes</Text>
                  <Switch value={toggles.regen} onValueChange={() => handleToggle('regen')} trackColor={{ true: '#4CAF50' }} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Climate Adaptation Strategies</Text>
                  <Switch value={toggles.climate} onValueChange={() => handleToggle('climate')} trackColor={{ true: '#4CAF50' }} />
                </View>
              </View>

              <View style={styles.partnerLogos}>
                <Text style={styles.partnerText}>Partners: IIT Delhi, ICAR, EMBRAPA, ARC, CAAS, RAS, EIAR, ECAD, ICBA</Text>
              </View>

              <TouchableOpacity style={styles.consentRow} onPress={() => setConsent(!consent)}>
                <Icon name={consent ? "checkbox-marked" : "checkbox-blank-outline"} size={24} color="#4CAF50" />
                <Text style={styles.consentText}>
                  I agree to the <Text style={styles.linkText}>Data Sovereignty Terms</Text>. Data remains owned by the farmer.
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitButton, !consent && styles.submitButtonDisabled]} 
                  onPress={handleSubmit}
                  disabled={!consent || isSubmitting}
                >
                  <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Contribute Data'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={80} color="#4CAF50" />
              <Text style={styles.successTitle}>Thank You!</Text>
              <Text style={styles.successDesc}>Your contribution strengthens global food security.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 15,
  },
  flagsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
  },
  flag: {
    fontSize: 24,
  },
  toggleGroup: {
    backgroundColor: '#F9FBE7',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  toggleLabel: {
    fontSize: 15,
    color: '#444',
  },
  partnerLogos: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  partnerText: {
    fontSize: 12,
    color: '#388E3C',
    textAlign: 'center',
    fontWeight: '600',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  consentText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: '#555',
  },
  linkText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1.5,
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
});
