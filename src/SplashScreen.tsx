import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, Animated } from 'react-native';
import { Colors } from '../colors';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animación de la barra de carga durante 5 segundos
    Animated.timing(progress, {
      toValue: 100,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo o Imagen de Bienvenida */}
        <Image 
          source={require('../assets/bienvenida/screen.jpeg')} 
          style={styles.image} 
          resizeMode="cover"
        />
        
        <View style={styles.overlay}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>MARATÓN MIJOVI S.R.L.</Text>
          </View>
          
          <Text style={styles.title}>Sistema Oficial de Gestión</Text>
          <Text style={styles.subtitle}>Cargando módulos y sincronizando eventos...</Text>

          {/* Barra de Carga Animada */}
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: widthInterpolated }]} />
          </View>

          {/* Firma Profesional del Desarrollador */}
          <View style={styles.devCard}>
            <Text style={styles.devName}>Manuel Lus</Text>
            <Text style={styles.devRole}>Desarrollador de Aplicaciones Móviles & Backend</Text>
            <Text style={styles.devCallToAction}>🚀 ¿Necesitas una app profesional para tu empresa? ¡Contáctame!</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%', padding: 24, paddingBottom: 40 },
  badgeContainer: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  badgeText: { color: Colors.white, fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  title: { color: Colors.white, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#AAAAAA', fontSize: 13, textAlign: 'center', marginBottom: 30 },
  progressBarTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 40 },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  devCard: { backgroundColor: 'rgba(17, 17, 17, 0.9)', borderWidth: 1, borderColor: '#333', padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  devName: { color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  devRole: { color: Colors.primary, fontWeight: '600', fontSize: 12, marginBottom: 8 },
  devCallToAction: { color: '#CCCCCC', fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});