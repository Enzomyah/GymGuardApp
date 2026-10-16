import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

interface QRCodeCardProps {
  memberId?: string;
  instruction?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ 
  memberId = "GG-8492-X", 
  instruction = "Scan this code to get started." 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <Image 
          source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(memberId)}` }} 
          style={styles.qrImage}
        />
      </View>
      <Text style={styles.instruction}>
        {instruction.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  qrWrapper: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  instruction: {
    color: '#A8A8A8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: 2,
    paddingHorizontal: 20,
  },
});
