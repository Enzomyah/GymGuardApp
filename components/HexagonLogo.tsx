import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon, Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate
} from 'react-native-reanimated';

interface HexagonLogoProps {
  size?: number;
  color?: string;
}

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedView = Animated.createAnimatedComponent(View);

export const HexagonLogo: React.FC<HexagonLogoProps> = ({ 
  size = 100, 
  color = '#E63946' 
}) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: interpolate(pulse.value, [1, 1.15], [0.3, 0.6]),
    };
  });

  const animatedHexStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(pulse.value, [1, 1.15], [1, 1.05]) }],
    };
  });

  // Calculate hexagon points for a regular hexagon
  const strokeWidth = 3;
  const halfSize = size / 2;
  const r = halfSize - strokeWidth;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = halfSize + r * Math.cos(angle);
    const y = halfSize + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  const pointsString = points.join(' ');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background Glow */}
      <AnimatedView 
        style={[
          styles.glow, 
          { width: size, height: size, backgroundColor: color },
          animatedGlowStyle
        ]} 
      />
      
      <Animated.View style={animatedHexStyle}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Main Hexagon Border */}
          <Polygon
            points="50,5 93.3,30 93.3,70 50,95 6.7,70 6.7,30"
            fill="none"
            stroke={color}
            strokeWidth="6"
          />
          {/* Stylized 'G' Logo (Hexagonal Style matching Appicon.png) */}
          <Polygon
            points="70,38 50,26 30,38 30,62 50,74 70,62 70,50 50,50 50,56 64,56 64,59 50,67 36,59 36,41 50,33 64,41"
            fill={color}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 100, // Should be large enough to be a circle
    filter: 'blur(15px)', // Note: standard RN doesn't support filter, we'll use shadow instead for native
    // For universal support, we can use shadow props
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
});
