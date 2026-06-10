/**
 * UPlan — OCR Scanner Component
 * Renders the UI for scanning receipts and capturing OCR data
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Modal, Platform } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useOCR, type OCRResult } from '../hooks/useOCR';
import { useTheme } from '../hooks/useTheme';
import { UPlanColors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface OCRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (data: OCRResult) => void;
}

export default function OCRScanner({ visible, onClose, onScanComplete }: OCRScannerProps) {
  const { theme, isDark } = useTheme();
  const { pickAndScan, takePhotoAndScan, loading, error, clearResult } = useOCR();

  const handlePickAndScan = async () => {
    const result = await pickAndScan();
    if (result) {
      onScanComplete(result);
      onClose();
    }
  };

  const handleTakePhotoAndScan = async () => {
    const result = await takePhotoAndScan();
    if (result) {
      onScanComplete(result);
      onClose();
    }
  };

  const handleClose = () => {
    clearResult();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Scan QRIS Receipt</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={UPlanColors.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Analyzing receipt with AI...
              </Text>
            </View>
          ) : (
            <View style={styles.actionsContainer}>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                Upload or take a photo of your QRIS receipt. Our AI will extract the merchant and amount automatically.
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border }]} onPress={handleTakePhotoAndScan}>
                <LinearGradient
                  colors={[UPlanColors.primary, UPlanColors.primaryLight]}
                  style={styles.actionBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <FontAwesome6 name="camera" size={24} color="#fff" />
                  <Text style={styles.actionBtnText}>Take a Photo</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} onPress={handlePickAndScan}>
                <View style={[styles.actionBtnGradient, { backgroundColor: 'transparent' }]}>
                  <FontAwesome6 name="image" size={24} color={UPlanColors.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Choose from Gallery</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    minHeight: 300,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 16, fontSize: 14, fontWeight: '600' },

  actionsContainer: { gap: 16 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 8, textAlign: 'center' },
  
  errorBox: { backgroundColor: UPlanColors.dangerSubtle, padding: 12, borderRadius: 8, marginBottom: 8 },
  errorText: { color: UPlanColors.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  actionBtn: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  actionBtnGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, 
    paddingVertical: 18 
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
