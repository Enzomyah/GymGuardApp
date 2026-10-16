import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  FadeIn
} from 'react-native-reanimated';
import { HexagonLogo } from './HexagonLogo';

interface AuthSplashScreenProps {
  onFinish?: () => void;
  statusText?: string;
}

export const AuthSplashScreen: React.FC<AuthSplashScreenProps> = ({ 
  onFinish, 
  statusText = "Authenticating..." 
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );

    // Finish splash animation after 1.5s
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const spinnerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Top: Icon */}
        <Animated.View entering={FadeIn.delay(200)}>
          <HexagonLogo size={80} />
        </Animated.View>

        {/* Middle: Typography */}
        <Animated.View style={styles.textContainer} entering={FadeIn.delay(600)}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitleText}>
              Gym
              <Text style={styles.brandSyncText}>Guard</Text>
            </Text>
          </View>
          <Text style={styles.subtitleText}>ADMIN PORTAL</Text>
        </Animated.View>

        {/* Lower Middle: Loading Indicator */}
        <Animated.View style={styles.loaderContainer} entering={FadeIn.delay(1000)}>
          <Animated.View style={[styles.spinnerWrapper, spinnerStyle]}>
            <ActivityIndicator size="small" color="#E63946" />
          </Animated.View>
          
          {/* Subtle Glow below spinner */}
          <View style={styles.spinnerGlow} />
        </Animated.View>

        {/* Bottom: Status Text */}
        <Animated.View style={styles.statusContainer} entering={FadeIn.delay(1400)}>
          <Text style={styles.statusText}>{statusText}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
  },
  brandTitleText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F5F5F5',
    letterSpacing: -1,
  },
  brandSyncText: {
    color: '#E63946',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A8A8',
    letterSpacing: 4,
    marginTop: 4,
    marginLeft: 4, // Offset slightly to center with the brand text visual weight
  },
  loaderContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrapper: {
    padding: 10,
  },
  spinnerGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E63946',
    opacity: 0.15,
    filter: 'blur(10px)',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  statusContainer: {
    marginTop: 20,
  },
  statusText: {
    fontSize: 12,
    color: '#A8A8A8',
    fontWeight: '400',
  },
});
