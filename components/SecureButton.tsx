import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, TextStyle } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate
} from 'react-native-reanimated';

interface SecureButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  disabled?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const SecureButton: React.FC<SecureButtonProps> = ({ 
  onPress, 
  title, 
  style,
  disabled = false
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.5);

  React.useEffect(() => {
    if (disabled) {
      glow.value = withTiming(0);
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [disabled]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: glow.value,
      opacity: withTiming(disabled ? 0.6 : 1),
    };
  });

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.8}
      onPressIn={() => !disabled && (scale.value = withSpring(0.96))}
      onPressOut={() => scale.value = withSpring(1)}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, style, animatedStyle]}
    >
      <Text style={styles.text}>{title}</Text>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#E63946',
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
