import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RenewModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (months: number) => void;
  memberName: string;
}

export function RenewModal({ visible, onClose, onConfirm, memberName }: RenewModalProps) {
  const options = [1, 2, 3, 6, 12];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Renew Membership</Text>
          <Text style={styles.subtitle}>How many months to add for {memberName}?</Text>
          
          <View style={styles.optionsContainer}>
            {options.map(months => (
              <TouchableOpacity key={months} style={styles.optionBtn} onPress={() => onConfirm(months)}>
                <Text style={styles.optionText}>{months} Month{months > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  dialog: { 
    backgroundColor: '#1E1E1E', 
    padding: 24, 
    borderRadius: 16, 
    width: '100%', 
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  title: { 
    color: '#FFF', 
    fontSize: 20, 
    fontWeight: '800', 
    marginBottom: 8 
  },
  subtitle: { 
    color: '#A8A8A8', 
    fontSize: 14, 
    marginBottom: 20 
  },
  optionsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 20 
  },
  optionBtn: { 
    flexGrow: 1,
    minWidth: '45%', 
    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(76, 175, 80, 0.3)' 
  },
  optionText: { 
    color: '#4CAF50', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  cancelBtn: { 
    padding: 16, 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12
  },
  cancelText: { 
    color: '#FFF', 
    fontSize: 15, 
    fontWeight: '700' 
  }
});
