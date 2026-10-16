import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ExportPeriod = 'all' | 'this_month' | 'last_month' | { month: number, year: number };

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (filterType: ExportPeriod) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ExportModal({ visible, onClose, onExport }: ExportModalProps) {
  const now = new Date();
  const thisMonthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(now.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const [mode, setMode] = useState<'main' | 'custom'>('main');
  const [customYear, setCustomYear] = useState(now.getFullYear());

  const handleClose = () => {
    setMode('main');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          
          {mode === 'main' ? (
            <>
              <Text style={styles.title}>Export Logbook</Text>
              <Text style={styles.subtitle}>Select the period you want to export to PDF.</Text>
              
              <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionBtn} onPress={() => onExport('this_month')}>
                  <Text style={styles.optionTitle}>This Month</Text>
                  <Text style={styles.optionSubtitle}>{thisMonthStr}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.optionBtn} onPress={() => onExport('last_month')}>
                  <Text style={styles.optionTitle}>Last Month</Text>
                  <Text style={styles.optionSubtitle}>{lastMonthStr}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionBtn} onPress={() => setMode('custom')}>
                  <Text style={styles.optionTitle}>Custom Month...</Text>
                  <Text style={styles.optionSubtitle}>Pick any specific month and year</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { borderColor: '#555' }]} onPress={() => onExport('all')}>
                  <Text style={styles.optionTitle}>All Time</Text>
                  <Text style={styles.optionSubtitle}>Complete Database (All Members)</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => setMode('main')} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Select Month</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.yearSelector}>
                <TouchableOpacity onPress={() => setCustomYear(y => y - 1)} style={styles.yearBtn}>
                  <Ionicons name="chevron-back" size={20} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.yearText}>{customYear}</Text>
                <TouchableOpacity onPress={() => setCustomYear(y => y + 1)} style={styles.yearBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.monthsGrid}>
                {MONTHS.map((m, idx) => (
                  <TouchableOpacity 
                    key={m} 
                    style={styles.monthBox}
                    onPress={() => {
                      onExport({ month: idx, year: customYear });
                      setMode('main');
                    }}
                  >
                    <Text style={styles.monthText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.cancelBtn, { marginTop: 16 }]} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

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
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: { 
    color: '#A8A8A8', 
    fontSize: 14, 
    marginBottom: 20,
    textAlign: 'center'
  },
  optionsContainer: { 
    flexDirection: 'column', 
    gap: 12, 
    marginBottom: 20 
  },
  optionBtn: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)' 
  },
  optionTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  optionSubtitle: { 
    color: '#A8A8A8', 
    fontSize: 12, 
    marginTop: 4 
  },
  cancelBtn: { 
    padding: 16, 
    alignItems: 'center', 
    backgroundColor: 'rgba(230, 57, 70, 0.1)', 
    borderRadius: 12 
  },
  cancelText: { 
    color: '#E63946', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  yearBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8
  },
  yearText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between'
  },
  monthBox: {
    width: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8
  },
  monthText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15
  }
});
